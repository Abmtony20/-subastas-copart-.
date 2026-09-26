// Crea las tablas, los 3 usuarios de prueba y vehículos de demostración.
// Uso: npm run seed   (usa la conexión configurada en .env / variables de entorno)
import { crearEsquema, pool } from '../server/db.js';
import { USUARIOS, sembrarDatos } from '../server/seed.js';

await crearEsquema();
await sembrarDatos();
console.log('\nCredenciales de prueba:');
USUARIOS.forEach((u) => console.log(`  ${u.correo}  /  ${u.clave}`));
await pool.close();
