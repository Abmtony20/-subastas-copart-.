import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const destino = useLocation().state?.from || '/';

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(correo.trim(), clave);
      navigate(destino, { replace: true });
    } catch (ex) {
      setError(ex.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <form className="panel formulario-corto" onSubmit={enviar}>
      <h1>Iniciar sesión</h1>
      <p className="sub">Necesitas una cuenta para ofertar o publicar vehículos.</p>
      <label>Correo electrónico<input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} /></label>
      <label>Contraseña<input type="password" required value={clave} onChange={(e) => setClave(e.target.value)} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-pri btn-bloque" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
      <p className="sub">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
    </form>
  );
}
