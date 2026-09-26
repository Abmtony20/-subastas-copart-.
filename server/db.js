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
      pool: { max: 10 },
    };

export { sql };
export const pool = await new sql.ConnectionPool(config).connect();

export async function crearEsquema() {
  const ddl = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.request().batch(ddl);
}
