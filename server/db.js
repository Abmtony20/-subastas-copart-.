import 'dotenv/config';
import { readFile } from 'node:fs/promises';

// Local (Windows): driver ODBC con autenticación de Windows (DB_DRIVER=msnodesqlv8).
// Azure SQL: driver tedious con usuario y contraseña SQL.
const usarOdbc = process.env.DB_DRIVER === 'msnodesqlv8';
const sql = (await import(usarOdbc ? 'mssql/msnodesqlv8.js' : 'mssql')).default;

const config = usarOdbc
  ? { connectionString: process.env.DB_CONNECTION_STRING }
  : {
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: { encrypt: true, trustServerCertificate: false },
      connectionTimeout: 30000,
      pool: { max: 10 },
    };

export { sql };
export let pool;

// Azure SQL sin servidor se pausa cuando no se usa y tarda ~1 minuto en reanudarse,
// así que la conexión se reintenta en vez de fallar al primer intento.
export async function conectar(intentos = 20) {
  for (let i = 1; ; i++) {
    try {
      pool = await new sql.ConnectionPool(config).connect();
      return pool;
    } catch (e) {
      console.error(`No se pudo conectar a la base de datos (intento ${i}/${intentos}): ${e.message}`);
      if (i >= intentos) throw e;
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

export async function crearEsquema() {
  const ddl = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.request().batch(ddl);
}
