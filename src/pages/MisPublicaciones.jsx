import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { equalTo, onValue, orderByChild, query, ref } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../auth.jsx';
import TarjetaVehiculo from '../components/TarjetaVehiculo.jsx';
import { useNow } from '../utils.js';

export default function MisPublicaciones() {
  const { user } = useAuth();
  const now = useNow();
  const [lista, setLista] = useState(null);
  const [pujas, setPujas] = useState({});
  const [texto, setTexto] = useState('');

  useEffect(() => onValue(query(ref(db, 'vehiculos'), orderByChild('ownerUid'), equalTo(user.uid)), (s) => {
    const data = s.val() || {};
    setLista(Object.entries(data).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.createdAt - a.createdAt));
  }), [user.uid]);
  useEffect(() => onValue(ref(db, 'pujas'), (s) => setPujas(s.val() || {})), []);

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
            key={v.id} v={v} puja={pujas[v.id]} now={now}
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
