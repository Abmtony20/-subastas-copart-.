import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase.js';

const REGLAS_CLAVE = [
  { ok: (c) => c.length >= 8, texto: 'Mínimo 8 caracteres' },
  { ok: (c) => /[A-Z]/.test(c), texto: 'Una mayúscula' },
  { ok: (c) => /[a-z]/.test(c), texto: 'Una minúscula' },
  { ok: (c) => /\d/.test(c), texto: 'Un número' },
  { ok: (c) => /[^A-Za-z0-9]/.test(c), texto: 'Un símbolo' },
];

export default function Registro() {
  const [d, setD] = useState({ nombre: '', apellido: '', correo: '', telefono: '', clave: '', clave2: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const cambiar = (c) => (e) => setD({ ...d, [c]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!/^[\d\s+-]{8,15}$/.test(d.telefono)) return setError('Ingresa un teléfono válido (8 dígitos o más).');
    if (!REGLAS_CLAVE.every((r) => r.ok(d.clave))) return setError('La contraseña no cumple los requisitos de seguridad.');
    if (d.clave !== d.clave2) return setError('Las contraseñas no coinciden.');
    setCargando(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, d.correo.trim(), d.clave);
      await updateProfile(user, { displayName: `${d.nombre} ${d.apellido}` });
      await set(ref(db, `users/${user.uid}/perfil`), {
        nombre: d.nombre.trim(),
        apellido: d.apellido.trim(),
        correo: d.correo.trim(),
        telefono: d.telefono.trim(),
      });
      navigate('/');
    } catch (ex) {
      setError(ex.code === 'auth/email-already-in-use' ? 'Ese correo ya está registrado.' : 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <form className="panel formulario-corto" onSubmit={enviar}>
      <h1>Crear cuenta</h1>
      <p className="sub">Regístrate para publicar y ofertar en subastas.</p>
      <div className="fila2">
        <label>Nombre<input required value={d.nombre} onChange={cambiar('nombre')} /></label>
        <label>Apellido<input required value={d.apellido} onChange={cambiar('apellido')} /></label>
      </div>
      <label>Correo electrónico<input type="email" required value={d.correo} onChange={cambiar('correo')} /></label>
      <label>Teléfono<input type="tel" required value={d.telefono} onChange={cambiar('telefono')} placeholder="5555 1234" /></label>
      <label>Contraseña<input type="password" required value={d.clave} onChange={cambiar('clave')} /></label>
      <ul className="reglas-clave">
        {REGLAS_CLAVE.map((r) => (
          <li key={r.texto} className={r.ok(d.clave) ? 'ok' : ''}>{r.ok(d.clave) ? '✔' : '○'} {r.texto}</li>
        ))}
      </ul>
      <label>Confirmar contraseña<input type="password" required value={d.clave2} onChange={cambiar('clave2')} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-pri btn-bloque" disabled={cargando}>{cargando ? 'Creando…' : 'Crear cuenta'}</button>
      <p className="sub">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
    </form>
  );
}
