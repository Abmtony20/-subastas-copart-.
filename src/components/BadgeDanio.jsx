import { DANIOS } from '../utils.js';

export default function BadgeDanio({ danio, detallado = false }) {
  const d = DANIOS[danio];
  if (!d) return null;
  return (
    <span className={`badge-danio danio-${danio}`} title={d.desc}>
      <span className="punto" /> {d.nombre}
      {detallado && <small> · {d.desc}</small>}
    </span>
  );
}
