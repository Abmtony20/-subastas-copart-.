import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import firebaseConfig from './firebaseConfig.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Diferencia entre el reloj del cliente y el del servidor, para que todos
// los navegadores muestren el mismo temporizador.
let offset = 0;
onValue(ref(db, '.info/serverTimeOffset'), (s) => {
  offset = s.val() || 0;
});
export const serverNow = () => Date.now() + offset;
