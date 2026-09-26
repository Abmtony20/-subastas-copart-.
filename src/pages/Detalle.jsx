import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { onValue, ref, serverTimestamp, set } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../auth.jsx';
import Carrusel from '../components/Carrusel.jsx';
import BadgeDanio from '../components/BadgeDanio.jsx';
import { ETIQUETA_ESTADO, estadoSubasta, fmtFecha, fmtQ, fmtRestante, ofertaMinima, useNow } from '../utils.js';

export default function Detalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const now = useNow();
  const [v, setV] = useState(undefined);
  const [puja, setPuja] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [participe, setParticipe] = useState(false);
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [destello, setDestello] = useState(false);

  useEffect(() => onValue(ref(db, `vehiculos/${id}`), (s) => setV(s.val())), [id]);
  useEffect(() => onValue(ref(db, `fotos/${id}`), (s) => setFotos(Object.values(s.val() || {}))), [id]);
  useEffect(() => onValue(ref(db, `pujas/${id}`), (s) => {
    setPuja(s.val());
    setDestello(true);
    setTimeout(() => setDestello(false), 900);
  }), [id]);
  useEffect(() => {
    if (!user) return setParticipe(false);
    return onValue(ref(db, `users/${user.uid}/pujas/${id}`), (s) => setParticipe(s.exists()));
  }, [user, id]);

  if (v === undefined) return <p className="cargando">Cargando vehículo…</p>;
  if (v === null) return <p className="vacio">Este vehículo no existe. <Link to="/">Volver al inventario</Link></p>;

  const estado = estadoSubasta(v, puja, now);
  const minimo = ofertaMinima(v, puja);
  const esDuenio = user && user.uid === v.ownerUid;
  const voyGanando = user && puja && puja.lider === user.uid;
  const meSuperaron = user && participe && puja && puja.lider !== user.uid;

  async function ofertar(e) {
    e.preventDefault();
    setError('');
    const m = Number(monto);
    if (!Number.isInteger(m)) return setError('Ingresa un monto entero en quetzales.');
    if (m < minimo) return setError(`La oferta mínima en este momento es ${fmtQ(minimo)}.`);
    setEnviando(true);
    try {
      await set(ref(db, `pujas/${id}`), {
        monto: m,
        lider: user.uid,
        ts: serverTimestamp(),
        total: (puja?.total || 0) + 1,
      });
      await set(ref(db, `users/${user.uid}/pujas/${id}`), true);
      setMonto('');
    } catch {
      setError('El servidor rechazó la oferta: otro usuario ofertó antes o la subasta ya no está activa. Revisa el nuevo mínimo e inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  const ficha = [
    ['Año', v.anio], ['Tipo de artículo', v.tipo], ['Marca', v.marca], ['Modelo', v.modelo],
    ['Motor', v.motor], ['Transmisión', v.transmision], ['Combustible', v.combustible],
    ['Tren de manejo', v.traccion], ['Cilindros', v.cilindros],
  ];

  return (
    <div className="detalle">
      <Link to="/" className="volver">← Volver al inventario</Link>
      <div className="detalle-grid">
        <div>
          <Carrusel fotos={fotos} />
          <section className="panel">
            <h2>Ficha técnica</h2>
            <dl className="ficha">
              {ficha.map(([k, val]) => (
                <div key={k}><dt>{k}</dt><dd>{val}</dd></div>
              ))}
              <div><dt>Estado de daño</dt><dd><BadgeDanio danio={v.danio} detallado /></dd></div>
            </dl>
          </section>
        </div>

        <aside className="panel subasta">
          <span className={`estado estado-${estado}`}>{ETIQUETA_ESTADO[estado]}</span>
          <h1>{v.anio} {v.marca} {v.modelo}</h1>

          <div className="reloj">
            {estado === 'activa' && <><small>La subasta cierra en</small><strong>{fmtRestante(v.cierre - now)}</strong></>}
            {estado === 'proxima' && <><small>La subasta inicia en</small><strong>{fmtRestante(v.inicio - now)}</strong></>}
            {(estado === 'vendida' || estado === 'desierta') && <><small>Subasta finalizada</small><strong>Oferta cerrada</strong></>}
          </div>

          <div className={`oferta-actual ${destello ? 'destello' : ''}`}>
            <small>{puja ? 'Oferta actual más alta' : 'Precio base'}</small>
            <strong>{fmtQ(puja ? puja.monto : v.precioBase)}</strong>
            <span>{puja ? `${puja.total} oferta(s) · postor anónimo` : 'Aún no hay ofertas'}</span>
          </div>

          {estado === 'activa' && voyGanando && <div className="indicador ganando">¡Vas ganando esta subasta!</div>}
          {estado === 'activa' && meSuperaron && (
            <div className="indicador superado">Tu oferta ha sido superada. ¡Haz tu oferta ahora antes de que termine el tiempo!</div>
          )}
          {estado === 'vendida' && (
            <div className={`indicador ${puja.lider === user?.uid ? 'ganando' : 'neutral'}`}>
              {puja.lider === user?.uid ? `¡Ganaste esta subasta por ${fmtQ(puja.monto)}!` : `Vendido por ${fmtQ(puja.monto)}`}
            </div>
          )}
          {estado === 'desierta' && (
            <div className="indicador neutral">Subasta no vendida / desierta: no se alcanzó el precio base.</div>
          )}

          {estado === 'activa' && !user && (
            <Link to="/login" state={{ from: `/vehiculo/${id}` }} className="btn btn-pri btn-bloque">Inicia sesión para ofertar</Link>
          )}
          {estado === 'activa' && esDuenio && <p className="sub">Eres el publicador de este vehículo; no puedes ofertar en él.</p>}
          {estado === 'activa' && user && !esDuenio && (
            <form className="form-puja" onSubmit={ofertar}>
              <label>Tu oferta (mínimo {fmtQ(minimo)})
                <div className="input-q">
                  <span>Q</span>
                  <input type="number" min={minimo} step="1" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder={String(minimo)} required />
                </div>
              </label>
              <button type="button" className="btn btn-sec btn-bloque" onClick={() => setMonto(String(minimo))}>Usar mínimo ({fmtQ(minimo)})</button>
              <button className="btn btn-acento btn-bloque" disabled={enviando}>{enviando ? 'Enviando…' : 'Ofertar'}</button>
              {error && <p className="error">{error}</p>}
            </form>
          )}
          {estado === 'proxima' && <p className="sub">Podrás ofertar cuando inicie la subasta.</p>}

          <ul className="reglas">
            <li>Precio base: <b>{fmtQ(v.precioBase)}</b></li>
            <li>Incremento mínimo: <b>10%</b> sobre la oferta actual</li>
            <li>Inicio: {fmtFecha(v.inicio)}</li>
            <li>Cierre: {fmtFecha(v.cierre)}</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
