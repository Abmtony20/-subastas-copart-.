import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { crearEsquema } from './db.js';
import { sembrarSiVacia } from './seed.js';
import { router as authRouter } from './auth.js';
import { router as catalogosRouter } from './catalogos.js';
import { router as vehiculosRouter } from './vehiculos.js';
import { iniciarTiempoReal } from './tiempoReal.js';

await crearEsquema();
await sembrarSiVacia();

const app = express();
app.use(express.json({ limit: '25mb' }));

// Cada respuesta de la API incluye la hora del servidor para sincronizar los temporizadores.
app.use('/api', (_req, res, next) => {
  res.set('X-Server-Time', String(Date.now()));
  next();
});
app.get('/api/tiempo', (_req, res) => res.json({ ahora: Date.now() }));
app.use('/api/auth', authRouter);
app.use('/api/catalogos', catalogosRouter);
app.use('/api/vehiculos', vehiculosRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// Frontend (SPA) compilado por Vite.
const dist = fileURLToPath(new URL('../dist', import.meta.url));
app.use(express.static(dist));
app.use((_req, res) => res.sendFile('index.html', { root: dist }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const httpServer = createServer(app);
iniciarTiempoReal(httpServer);

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`API y sitio en http://localhost:${port}`));
