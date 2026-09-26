// Crea las tablas, los 3 usuarios de prueba y vehículos de demostración.
// Uso: npm run seed   (usa la conexión configurada en .env / variables de entorno)
import bcrypt from 'bcryptjs';
import { crearEsquema, pool, sql } from '../server/db.js';

export const USUARIOS = [
  { nombre: 'Ana', apellido: 'López', correo: 'ana.prueba@autopuja.test', telefono: '5550 1001', clave: 'Subasta#2026A' },
  { nombre: 'Bruno', apellido: 'Méndez', correo: 'bruno.prueba@autopuja.test', telefono: '5550 1002', clave: 'Subasta#2026B' },
  { nombre: 'Carla', apellido: 'Pérez', correo: 'carla.prueba@autopuja.test', telefono: '5550 1003', clave: 'Subasta#2026C' },
];

const H = 3600000;
const DEMO = [
  { anio: 2019, tipo: 'Pickup', marca: 'Toyota', modelo: 'Tacoma', motor: '3.5L V6', transmision: 'Automática', combustible: 'Gasolina', traccion: '4WD', cilindros: 6, danio: 'amarillo', precioBase: 85000, ini: -1, fin: 48, tag: 'pickup' },
  { anio: 2021, tipo: 'Automóvil', marca: 'Honda', modelo: 'Civic', motor: '2.0L I4', transmision: 'CVT', combustible: 'Gasolina', traccion: 'FWD', cilindros: 4, danio: 'verde', precioBase: 60000, ini: -1, fin: 24, tag: 'sedan' },
  { anio: 2017, tipo: 'SUV', marca: 'Ford', modelo: 'Explorer', motor: '2.3L EcoBoost', transmision: 'Automática', combustible: 'Gasolina', traccion: 'AWD', cilindros: 4, danio: 'rojo', precioBase: 20000, ini: -1, fin: 72, tag: 'suv' },
  { anio: 2020, tipo: 'Automóvil', marca: 'Tesla', modelo: 'Model 3', motor: 'Eléctrico dual', transmision: 'Automática', combustible: 'Eléctrico', traccion: 'AWD', cilindros: 1, danio: 'amarillo', precioBase: 120000, ini: 6, fin: 96, tag: 'tesla' },
  { anio: 2018, tipo: 'Hatchback', marca: 'Mazda', modelo: 'Mazda 3', motor: '2.5L I4', transmision: 'Manual', combustible: 'Gasolina', traccion: 'FWD', cilindros: 4, danio: 'verde', precioBase: 45000, ini: -1, fin: 36, tag: 'hatchback' },
  { anio: 2016, tipo: 'Pickup', marca: 'Chevrolet', modelo: 'Silverado', motor: '5.3L V8', transmision: 'Automática', combustible: 'Gasolina', traccion: 'RWD', cilindros: 8, danio: 'rojo', precioBase: 30000, ini: -1, fin: 60, tag: 'truck' },
];

// Ilustraciones SVG generadas aquí mismo (no dependen de servicios externos de imágenes).
const COLORES = { pickup: '#c0392b', sedan: '#2e86de', suv: '#27ae60', tesla: '#8e44ad', hatchback: '#e67e22', truck: '#34495e' };
const VISTAS = ['Vista lateral', 'Vista frontal', 'Vista trasera', 'Interior', 'Motor', 'Detalle de daño'];

function svgVehiculo(v, vista, i) {
  const color = COLORES[v.tag] || '#2e86de';
  const alto = v.tipo === 'Pickup' || v.tipo === 'SUV';
  const cabina = v.tipo === 'Pickup'
    ? '<path d="M300 250 L360 175 L520 175 L560 250 Z" fill="COLOR"/><rect x="560" y="215" width="190" height="35" fill="COLOR"/>'
    : `<path d="M250 250 L330 ${alto ? 165 : 180} L560 ${alto ? 165 : 180} L650 250 Z" fill="COLOR"/>`;
  const danio = { verde: '#1f9d57', amarillo: '#e8a800', rojo: '#dc3b32' }[v.danio];
  const cuerpo = `<g transform="translate(${(i % 3) * 12 - 12} 0)">
    ${cabina.replaceAll('COLOR', color)}
    <path d="M170 250 Q180 235 250 250 L760 250 Q800 255 800 300 L800 330 L170 330 Z" fill="${color}"/>
    <path d="M345 245 L380 190 L450 190 L450 245 Z M470 245 L470 190 L535 190 L555 245 Z" fill="#dff1ff" opacity=".9"/>
    <circle cx="300" cy="335" r="48" fill="#2b2b2b"/><circle cx="300" cy="335" r="22" fill="#bfc6d1"/>
    <circle cx="670" cy="335" r="48" fill="#2b2b2b"/><circle cx="670" cy="335" r="22" fill="#bfc6d1"/>
    <rect x="770" y="265" width="26" height="14" rx="4" fill="#ffe08a"/>
    ${i === 5 ? `<circle cx="600" cy="285" r="46" fill="none" stroke="${danio}" stroke-width="8" stroke-dasharray="14 8"/>` : ''}
  </g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf2ff"/><stop offset="1" stop-color="#fff7e0"/></linearGradient></defs>
    <rect width="960" height="600" fill="url(#g)"/>
    <rect y="380" width="960" height="220" fill="#dfe6f1"/>
    <g transform="translate(0 20)">${cuerpo}</g>
    <text x="40" y="70" font-family="Segoe UI, Arial" font-size="40" font-weight="700" fill="#1f2a3d">${v.anio} ${v.marca} ${v.modelo}</text>
    <text x="40" y="112" font-family="Segoe UI, Arial" font-size="26" fill="#5d6b82">${vista} · Foto ${i + 1} de 6</text>
    <text x="40" y="560" font-family="Segoe UI, Arial" font-size="22" fill="#5d6b82">Imagen ilustrativa de demostración</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

const fotos = (v) => VISTAS.map((vista, i) => svgVehiculo(v, vista, i));

await crearEsquema();
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

console.log('\nCredenciales de prueba:');
USUARIOS.forEach((u) => console.log(`  ${u.correo}  /  ${u.clave}`));
await pool.close();
