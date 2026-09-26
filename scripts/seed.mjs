// Crea los 3 usuarios de prueba y algunos vehículos de demostración.
// Uso: npm run seed   (después de pegar tu configuración en src/firebaseConfig.js)
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut, updateProfile,
} from 'firebase/auth';
import { get, getDatabase, push, ref, set, update } from 'firebase/database';
import firebaseConfig from '../src/firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export const USUARIOS = [
  { nombre: 'Ana', apellido: 'López', correo: 'ana.prueba@autopuja.test', telefono: '5550 1001', clave: 'Subasta#2026A' },
  { nombre: 'Bruno', apellido: 'Méndez', correo: 'bruno.prueba@autopuja.test', telefono: '5550 1002', clave: 'Subasta#2026B' },
  { nombre: 'Carla', apellido: 'Pérez', correo: 'carla.prueba@autopuja.test', telefono: '5550 1003', clave: 'Subasta#2026C' },
];

const fotos = (tag, n = 6) =>
  Array.from({ length: n }, (_, i) => `https://loremflickr.com/960/600/${tag}?lock=${Math.abs(hash(tag)) % 1000 + i}`);
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

const H = 3600000;
const DEMO = [
  { anio: 2019, tipo: 'Pickup', marca: 'Toyota', modelo: 'Tacoma', motor: '3.5L V6', transmision: 'Automática', combustible: 'Gasolina', traccion: '4WD', cilindros: 6, danio: 'amarillo', precioBase: 85000, ini: -1 * H, fin: 48 * H, tag: 'pickup,truck' },
  { anio: 2021, tipo: 'Automóvil', marca: 'Honda', modelo: 'Civic', motor: '2.0L I4', transmision: 'CVT', combustible: 'Gasolina', traccion: 'FWD', cilindros: 4, danio: 'verde', precioBase: 60000, ini: -1 * H, fin: 24 * H, tag: 'sedan,car' },
  { anio: 2017, tipo: 'SUV', marca: 'Ford', modelo: 'Explorer', motor: '2.3L EcoBoost', transmision: 'Automática', combustible: 'Gasolina', traccion: 'AWD', cilindros: 4, danio: 'rojo', precioBase: 20000, ini: -1 * H, fin: 72 * H, tag: 'suv,car' },
  { anio: 2020, tipo: 'Automóvil', marca: 'Tesla', modelo: 'Model 3', motor: 'Eléctrico dual', transmision: 'Automática', combustible: 'Eléctrico', traccion: 'AWD', cilindros: 1, danio: 'amarillo', precioBase: 120000, ini: 6 * H, fin: 96 * H, tag: 'tesla,car' },
  { anio: 2018, tipo: 'Automóvil', marca: 'Mazda', modelo: 'Mazda 3', motor: '2.5L I4', transmision: 'Manual', combustible: 'Gasolina', traccion: 'FWD', cilindros: 4, danio: 'verde', precioBase: 45000, ini: -1 * H, fin: 36 * H, tag: 'hatchback,car' },
  { anio: 2016, tipo: 'Pickup', marca: 'Chevrolet', modelo: 'Silverado', motor: '5.3L V8', transmision: 'Automática', combustible: 'Gasolina', traccion: 'RWD', cilindros: 8, danio: 'rojo', precioBase: 30000, ini: -1 * H, fin: 60 * H, tag: 'chevrolet,truck' },
];

async function entrar(u) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, u.correo, u.clave);
    await updateProfile(user, { displayName: `${u.nombre} ${u.apellido}` });
    console.log(`✔ Usuario creado: ${u.correo}`);
    return user;
  } catch (e) {
    if (e.code !== 'auth/email-already-in-use') throw e;
    const { user } = await signInWithEmailAndPassword(auth, u.correo, u.clave);
    console.log(`• Usuario ya existía: ${u.correo}`);
    return user;
  }
}

const ahora = Date.now();

for (const [i, u] of USUARIOS.entries()) {
  const user = await entrar(u);
  await set(ref(db, `users/${user.uid}/perfil`), { nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: u.telefono });

  // Cada usuario publica 2 vehículos de demostración (solo la primera vez).
  const yaTiene = (await get(ref(db, `users/${user.uid}/seed`))).exists();
  if (!yaTiene) {
    for (const v of DEMO.slice(i * 2, i * 2 + 2)) {
      const { tag, ini, fin, ...datos } = v;
      const galeria = fotos(tag);
      const id = push(ref(db, 'vehiculos')).key;
      await update(ref(db), {
        [`vehiculos/${id}`]: {
          ...datos, ownerUid: user.uid, portada: galeria[0], numFotos: galeria.length,
          inicio: ahora + ini, cierre: ahora + fin, createdAt: ahora + i,
        },
        [`fotos/${id}`]: galeria,
      });
      console.log(`  ↳ Vehículo publicado: ${datos.anio} ${datos.marca} ${datos.modelo}`);
    }
    await set(ref(db, `users/${user.uid}/seed`), true);
  }
  await signOut(auth);
}

console.log('\nListo. Credenciales de prueba:');
USUARIOS.forEach((u) => console.log(`  ${u.correo}  /  ${u.clave}`));
process.exit(0);
