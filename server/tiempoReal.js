import { Server } from 'socket.io';
import { verificarToken } from './auth.js';
import { estadoPuja } from './vehiculos.js';

let io;

export function iniciarTiempoReal(httpServer) {
  io = new Server(httpServer);

  // El token es opcional: los anónimos reciben montos pero nunca indicadores personales.
  io.use((socket, next) => {
    socket.data.uid = verificarToken(socket.handshake.auth?.token);
    next();
  });

  io.on('connection', (socket) => {
    socket.on('unirse', (vid) => socket.join(`v:${Number(vid)}`));
    socket.on('salir', (vid) => socket.leave(`v:${Number(vid)}`));
  });
}

// Envía la nueva oferta a todos al instante: el inventario recibe el monto y
// cada persona dentro de la subasta recibe además su propio estado (ganando / superado).
export async function notificarPuja(vehiculoId) {
  const e = await estadoPuja(vehiculoId);
  io.emit('inventario:puja', { vehiculoId, puja: e.puja });
  for (const s of await io.in(`v:${vehiculoId}`).fetchSockets()) {
    s.emit('puja', {
      vehiculoId,
      puja: e.puja,
      soyLider: !!s.data.uid && e.liderId === s.data.uid,
      participe: !!s.data.uid && e.participantes.has(s.data.uid),
    });
  }
  return e;
}

export function notificarInventario(vehiculoId) {
  io?.emit('inventario:cambio', { vehiculoId });
}
