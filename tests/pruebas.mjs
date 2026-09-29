// Pruebas de extremo a extremo contra un servidor en ejecución (por defecto http://localhost:3000).
// Uso: npm start   (en otra terminal)   y luego   npm test
// Crea usuarios y vehículos de prueba con nombres únicos; no borra datos existentes.
import { io } from 'socket.io-client';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const sufijo = Date.now().toString(36);
let fallos = 0;
let total = 0;

function ok(condicion, descripcion, detalle = '') {
  total++;
  if (condicion) console.log(`  ✔ ${descripcion}`);
  else {
    fallos++;
    console.log(`  ✘ ${descripcion}${detalle ? `  →  ${detalle}` : ''}`);
  }
}

async function api(ruta, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${ruta}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const FOTO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/2019_Toyota_Tacoma_au_SIAM_2019.jpg/960px-2019_Toyota_Tacoma_au_SIAM_2019.jpg';

function vehiculo(extra = {}) {
  const ahora = Date.now();
  return {
    anio: 2018, tipo: 'Pickup', marca: 'Prueba', modelo: `Modelo-${sufijo}`, motor: '2.7L I4',
    transmision: 'Manual', combustible: 'Gasolina', traccion: '4WD', cilindros: 4, danio: 'amarillo',
    precioBase: 20000, inicio: ahora - 60000, cierre: ahora + 3600000,
    portada: FOTO, fotos: [FOTO, FOTO, FOTO, FOTO, FOTO], ...extra,
  };
}

async function registrar(nombre) {
  const r = await api('/auth/registro', {
    method: 'POST',
    body: { nombre, apellido: 'Prueba', correo: `${nombre.toLowerCase()}.${sufijo}@prueba.test`, telefono: '5555 0000', clave: 'Prueba#2026' },
  });
  return r.data;
}

function conectarSocket(token) {
  return new Promise((resolve) => {
    const s = io(BASE, { auth: { token }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
  });
}

function esperarEvento(socket, evento, ms = 5000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    socket.once(evento, (d) => { clearTimeout(t); resolve(d); });
  });
}

// ─────────────────────────────────────────────────────────────
console.log(`\nPruebas contra ${BASE}\n`);

console.log('SERIE I · Autenticación');
{
  let r = await api('/auth/registro', { method: 'POST', body: { nombre: 'X', apellido: 'Y', correo: `debil.${sufijo}@prueba.test`, telefono: '55550000', clave: 'abc12345' } });
  ok(r.status === 400, 'Rechaza contraseña insegura en el registro', `status ${r.status}`);
  r = await api('/auth/registro', { method: 'POST', body: { nombre: 'X', apellido: 'Y', correo: 'no-es-correo', telefono: '55550000', clave: 'Prueba#2026' } });
  ok(r.status === 400, 'Rechaza correo inválido', `status ${r.status}`);
  r = await api('/auth/registro', { method: 'POST', body: { nombre: '', apellido: 'Y', correo: `vacio.${sufijo}@prueba.test`, telefono: '55550000', clave: 'Prueba#2026' } });
  ok(r.status === 400, 'Rechaza registro con campos vacíos', `status ${r.status}`);
}
const vendedor = await registrar('Vendedor');
const postorA = await registrar('PostorA');
const postorB = await registrar('PostorB');
ok(vendedor.token && postorA.token && postorB.token, 'Registra usuarios válidos (nombre, apellido, correo, teléfono, contraseña)');
{
  const dup = await api('/auth/registro', { method: 'POST', body: { nombre: 'V', apellido: 'P', correo: `vendedor.${sufijo}@prueba.test`, telefono: '55550000', clave: 'Prueba#2026' } });
  ok(dup.status === 409, 'No permite registrar un correo repetido', `status ${dup.status}`);
  const malo = await api('/auth/login', { method: 'POST', body: { correo: `vendedor.${sufijo}@prueba.test`, clave: 'Incorrecta#1' } });
  ok(malo.status === 401, 'Login con contraseña incorrecta es rechazado', `status ${malo.status}`);
  const bueno = await api('/auth/login', { method: 'POST', body: { correo: `vendedor.${sufijo}@prueba.test`, clave: 'Prueba#2026' } });
  ok(bueno.status === 200 && bueno.data.token, 'Login correcto devuelve token');
  const lista = await api('/vehiculos');
  ok(lista.status === 200 && Array.isArray(lista.data), 'Anónimo puede ver el inventario');
  const pub = await api('/vehiculos', { method: 'POST', body: vehiculo() });
  ok(pub.status === 401, 'Anónimo NO puede publicar', `status ${pub.status}`);
  const mios = await api('/vehiculos/mios');
  ok(mios.status === 401, 'Anónimo NO puede ver "mis publicaciones"', `status ${mios.status}`);
  const falso = await api('/vehiculos', { method: 'POST', body: vehiculo(), token: 'token.falso.123' });
  ok(falso.status === 401, 'Token falsificado es rechazado', `status ${falso.status}`);
}

console.log('\nSERIE II · Publicación, galería y catálogo');
let vid;
{
  let r = await api('/vehiculos', { method: 'POST', token: vendedor.token, body: vehiculo({ fotos: [FOTO, FOTO, FOTO, FOTO] }) });
  ok(r.status === 400, 'Rechaza publicación con menos de 5 fotos', `status ${r.status}`);
  r = await api('/vehiculos', { method: 'POST', token: vendedor.token, body: vehiculo({ danio: 'morado' }) });
  ok(r.status === 400, 'Rechaza nivel de daño inválido', `status ${r.status}`);
  r = await api('/vehiculos', { method: 'POST', token: vendedor.token, body: vehiculo({ traccion: '2WD' }) });
  ok(r.status === 400, 'Rechaza tren de manejo fuera de AWD/FWD/RWD/4WD', `status ${r.status}`);
  r = await api('/vehiculos', { method: 'POST', token: vendedor.token, body: vehiculo({ marca: '' }) });
  ok(r.status === 400, 'Rechaza ficha técnica incompleta', `status ${r.status}`);
  r = await api('/vehiculos', { method: 'POST', token: vendedor.token, body: vehiculo({ cierre: Date.now() - 1000, inicio: Date.now() }) });
  ok(r.status === 400, 'Rechaza cierre anterior al inicio', `status ${r.status}`);
  r = await api('/vehiculos', { method: 'POST', token: vendedor.token, body: vehiculo() });
  ok(r.status === 201 && r.data.id, 'Publica vehículo válido');
  vid = r.data.id;

  const d = await api(`/vehiculos/${vid}`);
  const campos = ['anio', 'tipo', 'marca', 'modelo', 'motor', 'transmision', 'combustible', 'traccion', 'cilindros', 'danio', 'precioBase', 'inicio', 'cierre'];
  ok(campos.every((c) => d.data[c] !== undefined && d.data[c] !== ''), 'El detalle trae la ficha técnica completa');
  ok(d.data.fotos?.length >= 5, 'El detalle trae la galería (5+ fotos)', `${d.data.fotos?.length} fotos`);

  const mios = await api('/vehiculos/mios', { token: vendedor.token });
  ok(mios.data.some((v) => v.id === vid), 'Aparece en "mis publicaciones" del vendedor');
  const ajenos = await api('/vehiculos/mios', { token: postorA.token });
  ok(!ajenos.data.some((v) => v.id === vid), 'No aparece en "mis publicaciones" de otro usuario');

  const edit = await api(`/vehiculos/${vid}`, { method: 'PUT', token: vendedor.token, body: vehiculo({ motor: '2.8L Diésel', combustible: 'Diésel' }) });
  const tras = await api(`/vehiculos/${vid}`);
  ok(edit.status === 200 && tras.data.motor === '2.8L Diésel', 'El publicador puede editar su vehículo');
  const intruso = await api(`/vehiculos/${vid}`, { method: 'PUT', token: postorA.token, body: vehiculo() });
  ok(intruso.status === 403, 'Otro usuario NO puede editar el vehículo', `status ${intruso.status}`);

  const cat = await api('/catalogos');
  ok(cat.status === 200 && cat.data.tracciones?.length === 4 && cat.data.danios?.length === 3, 'Catálogos disponibles (tracción, daño, etc.)');
}

console.log('\nSERIE III · Reglas de puja y tiempo real');
{
  const sa = await conectarSocket(postorA.token);
  const sb = await conectarSocket(postorB.token);
  sa.emit('unirse', vid);
  sb.emit('unirse', vid);
  await espera(300);

  let r = await api(`/vehiculos/${vid}/pujas`, { method: 'POST', body: { monto: 30000 } });
  ok(r.status === 401, 'Anónimo NO puede ofertar', `status ${r.status}`);
  r = await api(`/vehiculos/${vid}/pujas`, { method: 'POST', token: vendedor.token, body: { monto: 30000 } });
  ok(r.status === 403, 'El publicador NO puede ofertar en su propio vehículo', `status ${r.status}`);
  r = await api(`/vehiculos/${vid}/pujas`, { method: 'POST', token: postorA.token, body: { monto: 19999 } });
  ok(r.status === 409, 'Rechaza oferta menor al precio base (Q 20,000)', `status ${r.status}`);

  const eventoB = esperarEvento(sb, 'puja');
  r = await api(`/vehiculos/${vid}/pujas`, { method: 'POST', token: postorA.token, body: { monto: 20000 } });
  ok(r.status === 201 && r.data.soyLider, 'Acepta oferta igual al precio base');
  const eb = await eventoB;
  ok(eb && eb.puja?.monto === 20000, 'El otro navegador recibe la nueva oferta al instante (sin recargar)');
  ok(eb && eb.soyLider === false, 'Al otro usuario NO se le marca como líder');

  r = await api(`/vehiculos/${vid}/pujas`, { method: 'POST', token: postorB.token, body: { monto: 20000 } });
  ok(r.status === 409, 'Rechaza oferta igual a la actual', `status ${r.status}`);
  r = await api(`/vehiculos/${vid}/pujas`, { method: 'POST', token: postorB.token, body: { monto: 21999 } });
  ok(r.status === 409, 'Rechaza oferta que no supera 10% (21,999 < 22,000)', `status ${r.status}`);

  const eventoA = esperarEvento(sa, 'puja');
  r = await api(`/vehiculos/${vid}/pujas`, { method: 'POST', token: postorB.token, body: { monto: 22000 } });
  ok(r.status === 201, 'Acepta oferta exactamente 10% mayor (22,000)');
  const ea = await eventoA;
  ok(ea && ea.soyLider === false && ea.participe === true, 'Postor A recibe en vivo el estado "Tu oferta ha sido superada"');

  const detalle = await api(`/vehiculos/${vid}`, { token: postorA.token });
  const texto = JSON.stringify(detalle.data);
  ok(!/"(lider|liderId|usuarioId|postor)"/i.test(texto) && !texto.includes(`postorb.${sufijo}`),
    'La API no revela quién hizo la oferta (solo monto y total)');
  ok(detalle.data.puja?.monto === 22000 && detalle.data.puja?.total === 2, 'El detalle muestra monto actual y número de ofertas');

  // Ofertas simultáneas: solo una de dos pujas iguales puede ganar.
  const [c1, c2] = await Promise.all([
    api(`/vehiculos/${vid}/pujas`, { method: 'POST', token: postorA.token, body: { monto: 24200 } }),
    api(`/vehiculos/${vid}/pujas`, { method: 'POST', token: postorA.token, body: { monto: 24200 } }),
  ]);
  ok([c1.status, c2.status].sort().join(',') === '201,409', 'Dos ofertas simultáneas iguales: solo una se acepta', `${c1.status}, ${c2.status}`);

  const noNumero = await api(`/vehiculos/${vid}/pujas`, { method: 'POST', token: postorB.token, body: { monto: '99999' } });
  ok(noNumero.status === 400, 'Rechaza monto que no es número entero', `status ${noNumero.status}`);

  sa.disconnect();
  sb.disconnect();
}
{
  // Subasta que aún no inicia y subasta ya cerrada.
  const futura = await api('/vehiculos', { method: 'POST', token: vendedor.token, body: vehiculo({ inicio: Date.now() + 3600000, cierre: Date.now() + 7200000 }) });
  let r = await api(`/vehiculos/${futura.data.id}/pujas`, { method: 'POST', token: postorA.token, body: { monto: 50000 } });
  ok(r.status === 409, 'Rechaza ofertas antes de la hora de inicio', `status ${r.status}`);

  const corta = await api('/vehiculos', { method: 'POST', token: vendedor.token, body: vehiculo({ inicio: Date.now() - 60000, cierre: Date.now() + 2000 }) });
  await espera(3000);
  r = await api(`/vehiculos/${corta.data.id}/pujas`, { method: 'POST', token: postorA.token, body: { monto: 50000 } });
  ok(r.status === 409, 'Rechaza ofertas después de la hora de cierre (oferta cerrada)', `status ${r.status}`);
  const d = await api(`/vehiculos/${corta.data.id}`);
  ok(d.data.puja === null && d.data.cierre < Date.now(), 'Subasta cerrada sin ofertas queda como desierta (sin puja)');

  const conPujas = await api(`/vehiculos/${vid}`, { method: 'PUT', token: vendedor.token, body: vehiculo({ precioBase: 1 }) });
  const tras = await api(`/vehiculos/${vid}`);
  ok(conPujas.status === 200 && tras.data.precioBase === 20000, 'Con ofertas registradas, el publicador no puede bajar el precio base');
}

console.log(`\nResultado: ${total - fallos}/${total} pruebas correctas${fallos ? ` · ${fallos} fallaron` : ''}\n`);
process.exit(fallos ? 1 : 0);
