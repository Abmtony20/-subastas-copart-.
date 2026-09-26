import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, serverNow } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  COMBUSTIBLES, DANIOS, TIPOS, TRACCIONES, TRANSMISIONES,
  aInputFecha, comprimirImagen, miniatura,
} from '../utils.js';

const VACIO = {
  anio: '', tipo: 'Automóvil', marca: '', modelo: '', motor: '', transmision: 'Automática',
  combustible: 'Gasolina', traccion: 'FWD', cilindros: '4', danio: 'verde', precioBase: '',
  inicio: '', cierre: '',
};

export default function Publicar() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState(() => {
    const ahora = serverNow();
    return { ...VACIO, inicio: aInputFecha(ahora), cierre: aInputFecha(ahora + 3 * 86400000) };
  });
  const [fotos, setFotos] = useState([]);
  const [conPujas, setConPujas] = useState(false);
  const [original, setOriginal] = useState(null);
  const [cargando, setCargando] = useState(!!id);
  const [guardando, setGuardando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const v = await api(`/vehiculos/${id}`).catch(() => null);
      if (!v || v.ownerId !== user.id) {
        navigate('/mis-publicaciones');
        return;
      }
      setD({
        ...v, anio: String(v.anio), cilindros: String(v.cilindros), precioBase: String(v.precioBase),
        inicio: aInputFecha(v.inicio), cierre: aInputFecha(v.cierre),
      });
      setOriginal(v);
      setFotos(v.fotos);
      setConPujas(!!v.puja);
      setCargando(false);
    })();
  }, [id, user, navigate]);

  const cambiar = (c) => (e) => setD({ ...d, [c]: e.target.value });

  async function agregarFotos(e) {
    const archivos = [...e.target.files].filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    setProcesando(true);
    const nuevas = await Promise.all(archivos.map((f) => comprimirImagen(f)));
    setFotos((p) => [...p, ...nuevas].slice(0, 12));
    setProcesando(false);
  }

  const quitarFoto = (i) => setFotos((p) => p.filter((_, k) => k !== i));
  const moverPortada = (i) => setFotos((p) => [p[i], ...p.filter((_, k) => k !== i)]);

  async function guardar(e) {
    e.preventDefault();
    setError('');
    const anio = Number(d.anio);
    // Si ya hay ofertas se conservan los valores exactos guardados (el servidor no permite cambiarlos).
    const precioBase = conPujas ? original.precioBase : Number(d.precioBase);
    const inicio = conPujas ? original.inicio : new Date(d.inicio).getTime();
    const cierre = conPujas ? original.cierre : new Date(d.cierre).getTime();
    if (anio < 1950 || anio > 2030) return setError('Ingresa un año entre 1950 y 2030.');
    if (!Number.isInteger(precioBase) || precioBase <= 0) return setError('El precio base debe ser un monto entero mayor a 0.');
    if (!(cierre > inicio)) return setError('La fecha de cierre debe ser posterior a la de inicio.');
    if (fotos.length < 5) return setError(`Debes subir mínimo 5 fotografías (llevas ${fotos.length}).`);

    setGuardando(true);
    try {
      const datos = {
        anio, tipo: d.tipo, marca: d.marca.trim(), modelo: d.modelo.trim(), motor: d.motor.trim(),
        transmision: d.transmision, combustible: d.combustible, traccion: d.traccion,
        cilindros: Number(d.cilindros), danio: d.danio,
        precioBase, inicio, cierre,
        portada: await miniatura(fotos[0]),
        fotos,
      };
      const r = id
        ? await api(`/vehiculos/${id}`, { method: 'PUT', body: datos })
        : await api('/vehiculos', { method: 'POST', body: datos });
      navigate(`/vehiculo/${r.id}`);
    } catch (ex) {
      setError(ex.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="cargando">Cargando publicación…</p>;

  return (
    <form className="panel formulario" onSubmit={guardar}>
      <h1>{id ? 'Editar publicación' : 'Publicar vehículo para subasta'}</h1>
      <p className="sub">Todos los campos son obligatorios.</p>

      <fieldset>
        <legend>Ficha técnica</legend>
        <div className="fila3">
          <label>Año<input type="number" required min="1950" max="2030" value={d.anio} onChange={cambiar('anio')} placeholder="2019" /></label>
          <label>Tipo de artículo
            <select value={d.tipo} onChange={cambiar('tipo')}>{TIPOS.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <label>Marca<input required value={d.marca} onChange={cambiar('marca')} placeholder="Toyota" /></label>
          <label>Modelo<input required value={d.modelo} onChange={cambiar('modelo')} placeholder="Corolla" /></label>
          <label>Motor<input required value={d.motor} onChange={cambiar('motor')} placeholder="1.8L I4" /></label>
          <label>Transmisión
            <select value={d.transmision} onChange={cambiar('transmision')}>{TRANSMISIONES.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <label>Tipo de combustible
            <select value={d.combustible} onChange={cambiar('combustible')}>{COMBUSTIBLES.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <label>Tren de manejo
            <select value={d.traccion} onChange={cambiar('traccion')}>{TRACCIONES.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <label>Número de cilindros
            <select value={d.cilindros} onChange={cambiar('cilindros')}>{[3, 4, 5, 6, 8, 10, 12].map((x) => <option key={x}>{x}</option>)}</select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Clasificación por estado de daño</legend>
        <div className="opciones-danio">
          {Object.entries(DANIOS).map(([k, x]) => (
            <label key={k} className={`opcion-danio danio-${k} ${d.danio === k ? 'activo' : ''}`}>
              <input type="radio" name="danio" value={k} checked={d.danio === k} onChange={cambiar('danio')} />
              <span className="punto" />
              <span><b>{x.nombre}</b><small>{x.desc}</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Galería fotográfica (mínimo 5)</legend>
        <label className="subir">
          <input type="file" accept="image/*" multiple onChange={agregarFotos} />
          {procesando ? 'Procesando imágenes…' : '＋ Seleccionar fotografías'}
        </label>
        <p className={`sub ${fotos.length < 5 ? 'error-suave' : ''}`}>{fotos.length} / 5 fotografías mínimas · la primera es la portada</p>
        <div className="galeria-previa">
          {fotos.map((f, i) => (
            <div key={i} className={i === 0 ? 'portada' : ''}>
              <img src={f} alt={`Foto ${i + 1}`} />
              {i === 0 ? <span className="etiqueta">Portada</span> : <button type="button" onClick={() => moverPortada(i)}>Portada</button>}
              <button type="button" className="quitar" onClick={() => quitarFoto(i)} aria-label="Quitar">✕</button>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Parámetros de la subasta</legend>
        {conPujas && <p className="aviso">Este vehículo ya tiene ofertas: el precio base y las fechas no se pueden modificar.</p>}
        <div className="fila3">
          <label>Precio / monto base (Q)<input type="number" required min="1" step="1" value={d.precioBase} onChange={cambiar('precioBase')} placeholder="20000" disabled={conPujas} /></label>
          <label>Fecha y hora de inicio<input type="datetime-local" required value={d.inicio} onChange={cambiar('inicio')} disabled={conPujas} /></label>
          <label>Fecha y hora de cierre<input type="datetime-local" required value={d.cierre} onChange={cambiar('cierre')} disabled={conPujas} /></label>
        </div>
      </fieldset>

      {error && <p className="error">{error}</p>}
      <div className="acciones-form">
        <button type="button" className="btn btn-sec" onClick={() => navigate(-1)}>Cancelar</button>
        <button className="btn btn-pri" disabled={guardando || procesando}>{guardando ? 'Guardando…' : id ? 'Guardar cambios' : 'Publicar vehículo'}</button>
      </div>
    </form>
  );
}
