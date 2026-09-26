import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, sql } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'solo-para-desarrollo';

export const verificarToken = (token) => {
  try {
    return Number(jwt.verify(token, JWT_SECRET).id) || null;
  } catch {
    return null;
  }
};

const tokenDe = (req) => (req.headers.authorization || '').replace(/^Bearer /, '');

// Lee el usuario si viene token, pero no lo exige.
export function authOpcional(req, _res, next) {
  req.usuarioId = verificarToken(tokenDe(req));
  next();
}

export function requiereAuth(req, res, next) {
  req.usuarioId = verificarToken(tokenDe(req));
  if (!req.usuarioId) return res.status(401).json({ error: 'Debes iniciar sesión.' });
  next();
}

const firmar = (u) => ({
  token: jwt.sign({ id: Number(u.Id) }, JWT_SECRET, { expiresIn: '7d' }),
  usuario: { id: Number(u.Id), nombre: u.Nombre, apellido: u.Apellido, correo: u.Correo, telefono: u.Telefono },
});

export const claveSegura = (c) =>
  typeof c === 'string' && c.length >= 8 && /[A-Z]/.test(c) && /[a-z]/.test(c) && /\d/.test(c) && /[^A-Za-z0-9]/.test(c);

export const router = Router();

router.post('/registro', async (req, res) => {
  const { nombre, apellido, correo, telefono, clave } = req.body || {};
  const t = (x) => (typeof x === 'string' ? x.trim() : '');
  if (!t(nombre) || !t(apellido) || !t(correo) || !t(telefono)) return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  if (!/^\S+@\S+\.\S+$/.test(t(correo))) return res.status(400).json({ error: 'Correo electrónico inválido.' });
  if (!/^[\d\s+-]{8,15}$/.test(t(telefono))) return res.status(400).json({ error: 'Teléfono inválido.' });
  if (!claveSegura(clave)) return res.status(400).json({ error: 'La contraseña no cumple los requisitos de seguridad.' });

  try {
    const r = await pool.request()
      .input('nombre', sql.NVarChar(80), t(nombre))
      .input('apellido', sql.NVarChar(80), t(apellido))
      .input('correo', sql.NVarChar(160), t(correo).toLowerCase())
      .input('telefono', sql.NVarChar(20), t(telefono))
      .input('hash', sql.NVarChar(100), await bcrypt.hash(clave, 10))
      .query(`INSERT INTO Usuarios (Nombre, Apellido, Correo, Telefono, ClaveHash)
              OUTPUT INSERTED.* VALUES (@nombre, @apellido, @correo, @telefono, @hash)`);
    res.status(201).json(firmar(r.recordset[0]));
  } catch (e) {
    if (e.number === 2627 || e.number === 2601 || /UQ_Usuarios_Correo/.test(e.message)) {
      return res.status(409).json({ error: 'Ese correo ya está registrado.' });
    }
    throw e;
  }
});

router.post('/login', async (req, res) => {
  const { correo, clave } = req.body || {};
  const r = await pool.request()
    .input('correo', sql.NVarChar(160), String(correo || '').trim().toLowerCase())
    .query('SELECT * FROM Usuarios WHERE Correo = @correo');
  const u = r.recordset[0];
  if (!u || !(await bcrypt.compare(String(clave || ''), u.ClaveHash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  res.json(firmar(u));
});

router.get('/yo', requiereAuth, async (req, res) => {
  const r = await pool.request().input('id', sql.Int, req.usuarioId).query('SELECT * FROM Usuarios WHERE Id = @id');
  if (!r.recordset[0]) return res.status(401).json({ error: 'Sesión inválida.' });
  res.json(firmar(r.recordset[0]).usuario);
});
