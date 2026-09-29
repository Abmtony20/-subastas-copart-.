// Crea los 3 usuarios de prueba y vehículos de demostración (solo los que falten).
import bcrypt from 'bcryptjs';
import { pool, sql } from './db.js';
import { FOTOS_DEMO } from './fotosDemo.js';

export const USUARIOS = [
  { nombre: 'Ana', apellido: 'López', correo: 'ana.prueba@autopuja.test', telefono: '5550 1001', clave: 'Subasta#2026A' },
  { nombre: 'Bruno', apellido: 'Méndez', correo: 'bruno.prueba@autopuja.test', telefono: '5550 1002', clave: 'Subasta#2026B' },
  { nombre: 'Carla', apellido: 'Pérez', correo: 'carla.prueba@autopuja.test', telefono: '5550 1003', clave: 'Subasta#2026C' },
];

const H = 3600000;
const DEMO = [
  { anio: 2019, tipo: 'Pickup', marca: 'Toyota', modelo: 'Tacoma', motor: '3.5L V6', transmision: 'Automática', combustible: 'Gasolina', traccion: '4WD', cilindros: 6, danio: 'amarillo', precioBase: 85000, ini: -1, fin: 48 },
  { anio: 2021, tipo: 'Automóvil', marca: 'Honda', modelo: 'Civic', motor: '2.0L I4', transmision: 'CVT', combustible: 'Gasolina', traccion: 'FWD', cilindros: 4, danio: 'verde', precioBase: 60000, ini: -1, fin: 24 },
  { anio: 2017, tipo: 'SUV', marca: 'Ford', modelo: 'Explorer', motor: '2.3L EcoBoost', transmision: 'Automática', combustible: 'Gasolina', traccion: 'AWD', cilindros: 4, danio: 'rojo', precioBase: 20000, ini: -1, fin: 72 },
  { anio: 2020, tipo: 'Automóvil', marca: 'Tesla', modelo: 'Model 3', motor: 'Eléctrico dual', transmision: 'Automática', combustible: 'Eléctrico', traccion: 'AWD', cilindros: 1, danio: 'amarillo', precioBase: 120000, ini: 6, fin: 96 },
  { anio: 2018, tipo: 'Hatchback', marca: 'Mazda', modelo: 'Mazda 3', motor: '2.5L I4', transmision: 'Manual', combustible: 'Gasolina', traccion: 'FWD', cilindros: 4, danio: 'verde', precioBase: 45000, ini: -1, fin: 36 },
  { anio: 2016, tipo: 'Pickup', marca: 'Chevrolet', modelo: 'Silverado', motor: '5.3L V8', transmision: 'Automática', combustible: 'Gasolina', traccion: 'RWD', cilindros: 8, danio: 'rojo', precioBase: 30000, ini: -1, fin: 60 },
];

const fotos = (v) => FOTOS_DEMO[v.modelo];

export async function sembrarDatos() {
const ahora = Date.now();

for (const [i, u] of USUARIOS.entries()) {
  const existe = await pool.request().input('c', sql.NVarChar(160), u.correo).query('SELECT Id FROM Usuarios WHERE Correo = @c');
  if (existe.recordset[0]) {
    console.log(`• Usuario ya existía: ${u.correo}`);
    continue;
  }
  const r = await pool.request()
    .input('n', sql.NVarChar(80), u.nombre).input('a', sql.NVarChar(80), u.apellido)
    .input('c', sql.NVarChar(160), u.correo).input('t', sql.NVarChar(20), u.telefono)
    .input('h', sql.NVarChar(100), await bcrypt.hash(u.clave, 10))
    .query('INSERT INTO Usuarios (Nombre, Apellido, Correo, Telefono, ClaveHash) OUTPUT INSERTED.Id VALUES (@n, @a, @c, @t, @h)');
  const uid = r.recordset[0].Id;
  console.log(`✔ Usuario creado: ${u.correo}`);

  // Cada usuario publica 2 vehículos de demostración.
  for (const v of DEMO.slice(i * 2, i * 2 + 2)) {
    const galeria = fotos(v);
    const rv = await pool.request()
      .input('uid', sql.Int, uid).input('anio', sql.SmallInt, v.anio).input('tipo', sql.NVarChar(40), v.tipo)
      .input('marca', sql.NVarChar(60), v.marca).input('modelo', sql.NVarChar(60), v.modelo).input('motor', sql.NVarChar(60), v.motor)
      .input('tr', sql.NVarChar(20), v.transmision).input('co', sql.NVarChar(20), v.combustible).input('tc', sql.VarChar(3), v.traccion)
      .input('ci', sql.TinyInt, v.cilindros).input('da', sql.VarChar(10), v.danio).input('pb', sql.Int, v.precioBase)
      .input('ini', sql.BigInt, ahora + v.ini * H).input('fin', sql.BigInt, ahora + v.fin * H)
      .input('por', sql.VarChar(sql.MAX), galeria[0])
      .query(`INSERT INTO Vehiculos (UsuarioId, Anio, Tipo, Marca, Modelo, Motor, Transmision, Combustible, Traccion,
                Cilindros, Danio, PrecioBase, InicioMs, CierreMs, Portada)
              OUTPUT INSERTED.Id
              VALUES (@uid, @anio, @tipo, @marca, @modelo, @motor, @tr, @co, @tc, @ci, @da, @pb, @ini, @fin, @por)`);
    const vid = rv.recordset[0].Id;
    for (const [orden, datos] of galeria.entries()) {
      await pool.request().input('v', sql.Int, vid).input('o', sql.TinyInt, orden).input('d', sql.VarChar(sql.MAX), datos)
        .query('INSERT INTO Fotos (VehiculoId, Orden, Datos) VALUES (@v, @o, @d)');
    }
    console.log(`  ↳ Vehículo publicado: ${v.anio} ${v.marca} ${v.modelo}`);
  }
}

}

// Al iniciar el servidor: si la base está vacía, carga los datos de prueba.
export async function sembrarSiVacia() {
  const r = await pool.request().query('SELECT COUNT(*) AS n FROM Usuarios');
  if (Number(r.recordset[0].n) === 0) {
    console.log('Base de datos vacía: creando usuarios y vehículos de prueba…');
    await sembrarDatos();
  }
  await actualizarFotosDemo();
  await renovarSubastasDemo();
}

// Las subastas de las cuentas de prueba (@autopuja.test) se reabren cuando les quedan menos de
// 12 horas, para que siempre haya vehículos en vivo al evaluar el sitio. Se reinician sus ofertas.
// Los vehículos publicados por usuarios reales nunca se modifican.
export async function renovarSubastasDemo() {
  const ahora = Date.now();
  const r = await pool.request()
    .input('limite', sql.BigInt, ahora + 12 * H)
    .query(`SELECT v.Id, v.Modelo FROM Vehiculos v JOIN Usuarios u ON u.Id = v.UsuarioId
            WHERE u.Correo LIKE '%@autopuja.test' AND v.CierreMs < @limite`);
  for (const v of r.recordset) {
    const dias = 5 + (Number(v.Id) % 5); // entre 5 y 9 días, para que no cierren todas a la vez
    await pool.request()
      .input('id', sql.Int, v.Id)
      .input('ini', sql.BigInt, ahora - H)
      .input('fin', sql.BigInt, ahora + dias * 24 * H)
      .query('DELETE FROM Pujas WHERE VehiculoId = @id; UPDATE Vehiculos SET InicioMs = @ini, CierreMs = @fin WHERE Id = @id;');
    console.log(`Subasta de demostración reabierta: ${v.Modelo} (${dias} días).`);
  }
  return r.recordset.map((v) => Number(v.Id));
}

// Los vehículos de demostración creados antes tenían ilustraciones SVG; se reemplazan por
// fotografías reales sin tocar sus pujas ni sus datos.
async function actualizarFotosDemo() {
  const r = await pool.request().query(
    "SELECT Id, Modelo FROM Vehiculos WHERE Portada LIKE 'data:image/svg+xml%'");
  for (const v of r.recordset) {
    const galeria = FOTOS_DEMO[v.Modelo];
    if (!galeria) continue;
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx).input('id', sql.Int, v.Id).input('por', sql.VarChar(sql.MAX), galeria[0])
        .query('UPDATE Vehiculos SET Portada = @por WHERE Id = @id; DELETE FROM Fotos WHERE VehiculoId = @id;');
      for (const [orden, datos] of galeria.entries()) {
        await new sql.Request(tx).input('v', sql.Int, v.Id).input('o', sql.TinyInt, orden).input('d', sql.VarChar(sql.MAX), datos)
          .query('INSERT INTO Fotos (VehiculoId, Orden, Datos) VALUES (@v, @o, @d)');
      }
      await tx.commit();
      console.log(`Fotos reales asignadas al vehículo ${v.Id} (${v.Modelo}).`);
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
}
