import { Router } from 'express';
import { pool, sql } from './db.js';
import { authOpcional, requiereAuth } from './auth.js';
import { CATALOGOS } from './catalogos.js';
import { notificarInventario, notificarPuja } from './tiempoReal.js';

export const router = Router();

const SELECT_VEHICULO = `
  SELECT v.Id, v.UsuarioId, v.Anio, v.Tipo, v.Marca, v.Modelo, v.Motor, v.Transmision, v.Combustible,
         v.Traccion, v.Cilindros, v.Danio, v.PrecioBase, v.InicioMs, v.CierreMs, v.Portada, v.CreadoEn,
         p.Monto AS PujaMonto, p.Total AS PujaTotal,
         (SELECT COUNT(*) FROM Fotos f WHERE f.VehiculoId = v.Id) AS NumFotos
  FROM Vehiculos v
  OUTER APPLY (SELECT MAX(Monto) AS Monto, COUNT(*) AS Total FROM Pujas WHERE VehiculoId = v.Id) p`;

// Los drivers pueden devolver enteros como texto (ODBC); se normalizan a número.
const n = (x) => (x === null || x === undefined ? x : Number(x));

// El id de quien publicó sí se envía (para saber si soy el dueño); el de los postores nunca.
const aDTO = (r) => ({
  id: n(r.Id), ownerId: n(r.UsuarioId), anio: n(r.Anio), tipo: r.Tipo, marca: r.Marca, modelo: r.Modelo, motor: r.Motor,
  transmision: r.Transmision, combustible: r.Combustible, traccion: r.Traccion, cilindros: n(r.Cilindros),
  danio: r.Danio, precioBase: n(r.PrecioBase), inicio: Number(r.InicioMs), cierre: Number(r.CierreMs),
  portada: r.Portada, numFotos: n(r.NumFotos), createdAt: new Date(r.CreadoEn).getTime(),
  puja: n(r.PujaTotal) ? { monto: n(r.PujaMonto), total: n(r.PujaTotal) } : null,
});

// Oferta más alta, total de ofertas y quiénes han participado (solo uso interno del servidor).
export async function estadoPuja(vehiculoId) {
  const r = await pool.request().input('id', sql.Int, vehiculoId).query(`
    SELECT TOP 1 Monto, UsuarioId, (SELECT COUNT(*) FROM Pujas WHERE VehiculoId = @id) AS Total
      FROM Pujas WHERE VehiculoId = @id ORDER BY Monto DESC, Id DESC;
    SELECT DISTINCT UsuarioId FROM Pujas WHERE VehiculoId = @id;`);
  const top = r.recordsets[0][0];
  return {
    puja: top ? { monto: n(top.Monto), total: n(top.Total) } : null,
    liderId: top ? n(top.UsuarioId) : null,
    participantes: new Set(r.recordsets[1].map((x) => n(x.UsuarioId))),
  };
}

router.get('/', async (_req, res) => {
  const r = await pool.request().query(`${SELECT_VEHICULO} ORDER BY v.Id DESC`);
  res.json(r.recordset.map(aDTO));
});

router.get('/mios', requiereAuth, async (req, res) => {
  const r = await pool.request().input('uid', sql.Int, req.usuarioId)
    .query(`${SELECT_VEHICULO} WHERE v.UsuarioId = @uid ORDER BY v.Id DESC`);
  res.json(r.recordset.map(aDTO));
});

router.get('/:id', authOpcional, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Vehículo no encontrado.' });
  const r = await pool.request().input('id', sql.Int, id).query(`
    ${SELECT_VEHICULO} WHERE v.Id = @id;
    SELECT Datos FROM Fotos WHERE VehiculoId = @id ORDER BY Orden;`);
  const fila = r.recordsets[0][0];
  if (!fila) return res.status(404).json({ error: 'Vehículo no encontrado.' });
  const e = await estadoPuja(id);
  res.json({
    ...aDTO(fila),
    fotos: r.recordsets[1].map((f) => f.Datos),
    soyLider: !!req.usuarioId && e.liderId === req.usuarioId,
    participe: !!req.usuarioId && e.participantes.has(req.usuarioId),
  });
});

function validarVehiculo(b) {
  const texto = (x, max) => typeof x === 'string' && x.trim().length > 0 && x.trim().length <= max;
  const imagen = (x) => typeof x === 'string' && (/^data:image\/(jpeg|png|webp|svg\+xml);base64,/.test(x) || /^https:\/\//.test(x));
  if (!Number.isInteger(b.anio) || b.anio < 1950 || b.anio > 2030) return 'Año inválido (1950-2030).';
  if (!CATALOGOS.tipos.includes(b.tipo)) return 'Tipo de artículo inválido.';
  if (!texto(b.marca, 60) || !texto(b.modelo, 60) || !texto(b.motor, 60)) return 'Marca, modelo y motor son obligatorios.';
  if (!CATALOGOS.transmisiones.includes(b.transmision)) return 'Transmisión inválida.';
  if (!CATALOGOS.combustibles.includes(b.combustible)) return 'Tipo de combustible inválido.';
  if (!CATALOGOS.tracciones.includes(b.traccion)) return 'Tren de manejo inválido.';
  if (!Number.isInteger(b.cilindros) || b.cilindros < 1 || b.cilindros > 16) return 'Número de cilindros inválido.';
  if (!CATALOGOS.danios.some((d) => d.id === b.danio)) return 'Estado de daño inválido.';
  if (!Array.isArray(b.fotos) || b.fotos.length < 5) return 'Debes incluir mínimo 5 fotografías.';
  if (b.fotos.length > 12 || !b.fotos.every(imagen) || !imagen(b.portada)) return 'Fotografías inválidas.';
  if (!Number.isInteger(b.precioBase) || b.precioBase <= 0) return 'El precio base debe ser un entero mayor a 0.';
  if (!Number.isFinite(b.inicio) || !Number.isFinite(b.cierre) || b.cierre <= b.inicio) return 'La fecha de cierre debe ser posterior al inicio.';
  return null;
}

async function guardar(req, res, id) {
  const b = req.body || {};
  const error = validarVehiculo(b);
  if (error) return res.status(400).json({ error });

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    let precioBase = b.precioBase, inicio = b.inicio, cierre = b.cierre;
    if (id) {
      const actual = await new sql.Request(tx).input('id', sql.Int, id).query(`
        SELECT UsuarioId, PrecioBase, InicioMs, CierreMs,
               (SELECT COUNT(*) FROM Pujas WHERE VehiculoId = @id) AS Pujas
          FROM Vehiculos WITH (UPDLOCK) WHERE Id = @id`);
      const v = actual.recordset[0];
      if (!v) { await tx.rollback(); return res.status(404).json({ error: 'Vehículo no encontrado.' }); }
      if (n(v.UsuarioId) !== req.usuarioId) { await tx.rollback(); return res.status(403).json({ error: 'Solo el publicador puede editar este vehículo.' }); }
      // Con ofertas registradas no se permite cambiar las condiciones de la subasta.
      if (n(v.Pujas) > 0) { precioBase = n(v.PrecioBase); inicio = Number(v.InicioMs); cierre = Number(v.CierreMs); }
    }

    const q = new sql.Request(tx)
      .input('uid', sql.Int, req.usuarioId)
      .input('anio', sql.SmallInt, b.anio).input('tipo', sql.NVarChar(40), b.tipo)
      .input('marca', sql.NVarChar(60), b.marca.trim()).input('modelo', sql.NVarChar(60), b.modelo.trim())
      .input('motor', sql.NVarChar(60), b.motor.trim()).input('transmision', sql.NVarChar(20), b.transmision)
      .input('combustible', sql.NVarChar(20), b.combustible).input('traccion', sql.VarChar(3), b.traccion)
      .input('cilindros', sql.TinyInt, b.cilindros).input('danio', sql.VarChar(10), b.danio)
      .input('precio', sql.Int, precioBase).input('inicio', sql.BigInt, inicio).input('cierre', sql.BigInt, cierre)
      .input('portada', sql.VarChar(sql.MAX), b.portada);

    if (id) {
      await q.input('id', sql.Int, id).query(`
        UPDATE Vehiculos SET Anio=@anio, Tipo=@tipo, Marca=@marca, Modelo=@modelo, Motor=@motor,
          Transmision=@transmision, Combustible=@combustible, Traccion=@traccion, Cilindros=@cilindros,
          Danio=@danio, PrecioBase=@precio, InicioMs=@inicio, CierreMs=@cierre, Portada=@portada
        WHERE Id=@id;
        DELETE FROM Fotos WHERE VehiculoId=@id;`);
    } else {
      const r = await q.query(`
        INSERT INTO Vehiculos (UsuarioId, Anio, Tipo, Marca, Modelo, Motor, Transmision, Combustible, Traccion,
                               Cilindros, Danio, PrecioBase, InicioMs, CierreMs, Portada)
        OUTPUT INSERTED.Id
        VALUES (@uid, @anio, @tipo, @marca, @modelo, @motor, @transmision, @combustible, @traccion,
                @cilindros, @danio, @precio, @inicio, @cierre, @portada)`);
      id = n(r.recordset[0].Id);
    }

    for (const [orden, datos] of b.fotos.entries()) {
      await new sql.Request(tx)
        .input('vid', sql.Int, id).input('orden', sql.TinyInt, orden).input('datos', sql.VarChar(sql.MAX), datos)
        .query('INSERT INTO Fotos (VehiculoId, Orden, Datos) VALUES (@vid, @orden, @datos)');
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  notificarInventario(id);
  res.status(req.params.id ? 200 : 201).json({ id });
}

router.post('/', requiereAuth, (req, res) => guardar(req, res, null));
router.put('/:id', requiereAuth, (req, res) => guardar(req, res, Number(req.params.id)));

// Motor de subastas: toda la validación ocurre aquí, dentro de una transacción con bloqueo
// sobre el vehículo para que dos ofertas simultáneas no puedan pasar la misma validación.
const ERRORES_PUJA = {
  50001: [404, 'Vehículo no encontrado.'],
  50002: [403, 'No puedes ofertar en un vehículo que tú publicaste.'],
  50003: [409, 'La subasta aún no ha iniciado.'],
  50004: [409, 'La subasta ya finalizó: oferta cerrada.'],
  50005: [409, 'La oferta no puede ser menor al precio base.'],
  50006: [409, 'La oferta debe superar la oferta actual en al menos 10%.'],
};

router.post('/:id/pujas', requiereAuth, async (req, res) => {
  const id = Number(req.params.id);
  const monto = req.body?.monto;
  if (!Number.isInteger(monto) || monto <= 0) return res.status(400).json({ error: 'Ingresa un monto entero en quetzales.' });

  try {
    await pool.request()
      .input('vid', sql.Int, id).input('uid', sql.Int, req.usuarioId)
      .input('monto', sql.Int, monto).input('ahora', sql.BigInt, Date.now())
      .query(`
        SET XACT_ABORT ON;
        BEGIN TRAN;
          DECLARE @base INT, @ini BIGINT, @fin BIGINT, @owner INT, @actual INT;
          SELECT @base = PrecioBase, @ini = InicioMs, @fin = CierreMs, @owner = UsuarioId
            FROM Vehiculos WITH (UPDLOCK, HOLDLOCK) WHERE Id = @vid;
          IF @owner IS NULL THROW 50001, 'E50001', 1;
          IF @owner = @uid THROW 50002, 'E50002', 1;
          IF @ahora < @ini THROW 50003, 'E50003', 1;
          IF @ahora > @fin THROW 50004, 'E50004', 1;
          SELECT @actual = MAX(Monto) FROM Pujas WHERE VehiculoId = @vid;
          IF @monto < @base THROW 50005, 'E50005', 1;
          IF @actual IS NOT NULL AND CAST(@monto AS BIGINT) * 10 < CAST(@actual AS BIGINT) * 11 THROW 50006, 'E50006', 1;
          INSERT INTO Pujas (VehiculoId, UsuarioId, Monto) VALUES (@vid, @uid, @monto);
        COMMIT;`);
  } catch (e) {
    const conocido = ERRORES_PUJA[e.number] || ERRORES_PUJA[(String(e.message).match(/E(500\d\d)/) || [])[1]];
    if (conocido) return res.status(conocido[0]).json({ error: conocido[1] });
    throw e;
  }

  const estado = await notificarPuja(id);
  res.status(201).json({ puja: estado.puja, soyLider: true, participe: true });
});
