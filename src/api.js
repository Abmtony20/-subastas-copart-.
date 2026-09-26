import { io } from 'socket.io-client';

const CLAVE_TOKEN = 'autopuja_token';

export const getToken = () => {
  try { return localStorage.getItem(CLAVE_TOKEN); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(CLAVE_TOKEN, t) : localStorage.removeItem(CLAVE_TOKEN); } catch { /* sin almacenamiento */ }
  socket.auth = { token: t };
  socket.disconnect().connect(); // reconecta para que el servidor sepa quién soy
};

// Diferencia entre el reloj del navegador y el del servidor (para temporizadores idénticos).
let offset = 0;
export const serverNow = () => Date.now() + offset;

export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const inicio = Date.now();
  const res = await fetch(`/api${ruta}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const hora = Number(res.headers.get('X-Server-Time'));
  if (hora) offset = hora - (inicio + Date.now()) / 2;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Error de comunicación con el servidor.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const socket = io({ auth: { token: getToken() } });
