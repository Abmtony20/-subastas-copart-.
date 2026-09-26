import { signOut } from 'firebase/auth';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { auth } from '../firebase.js';

export default function Navbar() {
  const { user, perfil } = useAuth();
  const navigate = useNavigate();

  async function salir() {
    await signOut(auth);
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="navbar-int">
        <Link to="/" className="logo">
          <span className="logo-icono">🚗</span> AutoPuja<span className="logo-gt">GT</span>
        </Link>
        <nav className="menu">
          <NavLink to="/" end>Inventario</NavLink>
          {user && <NavLink to="/publicar">Publicar vehículo</NavLink>}
          {user && <NavLink to="/mis-publicaciones">Mis publicaciones</NavLink>}
        </nav>
        <div className="sesion">
          {user ? (
            <>
              <span className="saludo">Hola, {perfil?.nombre || user.displayName || user.email}</span>
              <button className="btn btn-sec" onClick={salir}>Salir</button>
            </>
          ) : (
            <>
              <Link className="btn btn-sec" to="/login">Iniciar sesión</Link>
              <Link className="btn btn-pri" to="/registro">Regístrese</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
