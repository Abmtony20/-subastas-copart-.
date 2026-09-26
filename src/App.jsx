import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth.jsx';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Detalle from './pages/Detalle.jsx';
import Publicar from './pages/Publicar.jsx';
import MisPublicaciones from './pages/MisPublicaciones.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="contenedor">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/vehiculo/:id" element={<Detalle />} />
          <Route path="/publicar" element={<RequireAuth><Publicar /></RequireAuth>} />
          <Route path="/editar/:id" element={<RequireAuth><Publicar /></RequireAuth>} />
          <Route path="/mis-publicaciones" element={<RequireAuth><MisPublicaciones /></RequireAuth>} />
          <Route path="*" element={<p className="vacio">Página no encontrada.</p>} />
        </Routes>
      </main>
      <footer className="pie">AutoPuja GT · Plataforma de subastas de vehículos en tiempo real</footer>
    </>
  );
}
