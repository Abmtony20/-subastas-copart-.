import { useEffect, useState } from 'react';

export default function Carrusel({ fotos }) {
  const [i, setI] = useState(0);
  const n = fotos.length;

  useEffect(() => {
    if (i >= n) setI(0);
  }, [n, i]);

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + n) % n);
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % n);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [n]);

  if (!n) return <div className="carrusel carrusel-vacio">Cargando fotografías…</div>;

  return (
    <div className="carrusel">
      <div className="carrusel-principal">
        <img src={fotos[i]} alt={`Fotografía ${i + 1} de ${n}`} />
        <button className="carrusel-flecha izq" onClick={() => setI((i - 1 + n) % n)} aria-label="Anterior">‹</button>
        <button className="carrusel-flecha der" onClick={() => setI((i + 1) % n)} aria-label="Siguiente">›</button>
        <span className="carrusel-contador">{i + 1} / {n}</span>
      </div>
      <div className="carrusel-miniaturas">
        {fotos.map((f, k) => (
          <button key={k} className={k === i ? 'activa' : ''} onClick={() => setI(k)} aria-label={`Ver foto ${k + 1}`}>
            <img src={f} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}
