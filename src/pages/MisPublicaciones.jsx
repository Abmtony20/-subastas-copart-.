import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInventario } from '../useInventario.js';
import TarjetaVehiculo from '../components/TarjetaVehiculo.jsx';
import { useNow } from '../utils.js';

export default function MisPublicaciones() {
  const now = useNow();
  const { lista } = useInventario('/vehiculos/mios');
  const [texto, setTexto] = useState('');


  const t = texto.trim().toLowerCase();
  const filtrados = (lista || []).filter((v) => !t || `${v.anio} ${v.marca} ${v.modelo} ${v.motor}`.toLowerCase().includes(t));

  return (
    <>
      <div className="cabecera-pagina">
        <div>
          <h1>Mis publicaciones</h1>
          <p className="sub">Busca y edita los vehículos que has publicado.</p>
        </div>
        <Link to="/publicar" className="btn btn-pri">＋ Publicar vehículo</Link>
      </div>
      <input className="buscador" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar en mis publicaciones (marca, modelo, año…)" />
      {lista === null && <p className="cargando">Cargando…</p>}
      {lista && !lista.length && <p className="vacio">Aún no has publicado vehículos.</p>}
      <div className="grid">
        {filtrados.map((v) => (
          <TarjetaVehiculo
            key={v.id} v={v} puja={v.puja} now={now}
            acciones={<>
              <Link to={`/vehiculo/${v.id}`} className="btn btn-sec">Ver</Link>
              <Link to={`/editar/${v.id}`} className="btn btn-pri">Editar</Link>
            </>}
          />
        ))}
      </div>
    </>
  );
}
