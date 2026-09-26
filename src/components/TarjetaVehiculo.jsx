import { Link } from 'react-router-dom';
import BadgeDanio from './BadgeDanio.jsx';
import { ETIQUETA_ESTADO, estadoSubasta, fmtQ, fmtRestante } from '../utils.js';

export default function TarjetaVehiculo({ v, puja, now, acciones }) {
  const estado = estadoSubasta(v, puja, now);
  return (
    <article className="tarjeta">
      <Link to={`/vehiculo/${v.id}`} className="tarjeta-img">
        <img src={v.portada} alt={`${v.marca} ${v.modelo}`} loading="lazy" />
        <span className={`estado estado-${estado}`}>{ETIQUETA_ESTADO[estado]}</span>
        <span className="tarjeta-danio"><BadgeDanio danio={v.danio} /></span>
      </Link>
      <div className="tarjeta-cuerpo">
        <Link to={`/vehiculo/${v.id}`} className="tarjeta-titulo">
          {v.anio} {v.marca} {v.modelo}
        </Link>
        <div className="chips">
          <span>{v.tipo}</span>
          <span>{v.motor}</span>
          <span>{v.transmision}</span>
          <span>{v.combustible}</span>
          <span>{v.traccion}</span>
          <span>{v.cilindros} cil.</span>
        </div>
        <div className="tarjeta-precio">
          <div>
            <small>{puja ? 'Oferta actual' : 'Precio base'}</small>
            <strong>{fmtQ(puja ? puja.monto : v.precioBase)}</strong>
          </div>
          <div className="tarjeta-tiempo">
            {estado === 'activa' && <><small>Cierra en</small><strong>{fmtRestante(v.cierre - now)}</strong></>}
            {estado === 'proxima' && <><small>Inicia en</small><strong>{fmtRestante(v.inicio - now)}</strong></>}
            {(estado === 'vendida' || estado === 'desierta') && <><small>Estado</small><strong>Cerrada</strong></>}
          </div>
        </div>
        {acciones ? (
          <div className="tarjeta-acciones">{acciones}</div>
        ) : (
          <Link to={`/vehiculo/${v.id}`} className="btn btn-pri btn-bloque">
            {estado === 'activa' ? 'Ofertar ahora' : 'Ver detalle'}
          </Link>
        )}
      </div>
    </article>
  );
}
