import { useEffect, useState } from 'react';
import { serverNow } from './api.js';

export const DANIOS = {
  verde: { nombre: 'Verde', desc: 'Daño menor / Limpio' },
  amarillo: { nombre: 'Amarillo', desc: 'Daño medio / Reparable' },
  rojo: { nombre: 'Rojo', desc: 'Daño severo / Salvamento' },
};
export const TIPOS = ['Automóvil', 'SUV', 'Pickup', 'Van', 'Camión', 'Motocicleta', 'Coupé', 'Hatchback'];
export const TRANSMISIONES = ['Automática', 'Manual', 'CVT'];
export const COMBUSTIBLES = ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'Gas LP'];
export const TRACCIONES = ['AWD', 'FWD', 'RWD', '4WD'];

export const fmtQ = (n) =>
  'Q ' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function estadoSubasta(v, puja, now) {
  if (now < v.inicio) return 'proxima';
  if (now <= v.cierre) return 'activa';
  return puja ? 'vendida' : 'desierta';
}

export const ETIQUETA_ESTADO = {
  proxima: 'Próximamente',
  activa: 'En vivo',
  vendida: 'Oferta cerrada · Vendido',
  desierta: 'Oferta cerrada · Desierta',
};

// Siguiente oferta válida: la base si no hay pujas, o +10% sobre la actual (en quetzales enteros).
export const ofertaMinima = (v, puja) => (puja ? Math.ceil((puja.monto * 11) / 10) : v.precioBase);

export function fmtRestante(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const p = (n) => String(n).padStart(2, '0');
  const hms = `${p(Math.floor((s % 86400) / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
  return d ? `${d}d ${hms}` : hms;
}

export const fmtFecha = (ms) =>
  new Date(ms).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });

export const aInputFecha = (ms) => {
  const d = new Date(ms);
  return new Date(ms - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function useNow() {
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Reduce la imagen y la convierte a JPEG base64 para guardarla en Realtime Database.
export function comprimirImagen(file, max = 1000, calidad = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', calidad));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Genera una miniatura a partir de un dataURL o URL (para la portada del listado).
export function miniatura(src, max = 480) {
  if (!src.startsWith('data:')) return Promise.resolve(src);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.6));
    };
    img.src = src;
  });
}
