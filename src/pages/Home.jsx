import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useInventario } from '../useInventario.js';
import TarjetaVehiculo from '../components/TarjetaVehiculo.jsx';
import { COMBUSTIBLES, DANIOS, TIPOS, TRACCIONES, TRANSMISIONES, estadoSubasta, useNow } from '../utils.js';

const FILTROS_VACIOS = {
  texto: '', marca: '', modelo: '', tipo: '', combustible: '', transmision: '',
  traccion: '', danio: '', anioMin: '', anioMax: '', cilindros: '', estado: '',
};

export default function Home() {
  const { user } = useAuth();
  const { lista: vehiculos, error } = useInventario();
  const [f, setF] = useState(FILTROS_VACIOS);
  const now = useNow();


  const marcas = useMemo(() => [...new Set((vehiculos || []).map((v) => v.marca))].sort(), [vehiculos]);
  const modelos = useMemo(
    () => [...new Set((vehiculos || []).filter((v) => !f.marca || v.marca === f.marca).map((v) => v.modelo))].sort(),
    [vehiculos, f.marca]
  );

  const cambiar = (campo) => (e) =>
    setF((p) => ({ ...p, [campo]: e.target.value, ...(campo === 'marca' ? { modelo: '' } : {}) }));

  const lista = (vehiculos || []).filter((v) => {
    const t = f.texto.trim().toLowerCase();
    if (t && !`${v.anio} ${v.marca} ${v.modelo} ${v.motor} ${v.tipo}`.toLowerCase().includes(t)) return false;
    if (f.marca && v.marca !== f.marca) return false;
    if (f.modelo && v.modelo !== f.modelo) return false;
    if (f.tipo && v.tipo !== f.tipo) return false;
    if (f.combustible && v.combustible !== f.combustible) return false;
    if (f.transmision && v.transmision !== f.transmision) return false;
    if (f.traccion && v.traccion !== f.traccion) return false;
    if (f.danio && v.danio !== f.danio) return false;
    if (f.cilindros && v.cilindros !== Number(f.cilindros)) return false;
    if (f.anioMin && v.anio < Number(f.anioMin)) return false;
    if (f.anioMax && v.anio > Number(f.anioMax)) return false;
    if (f.estado) {
      const e = estadoSubasta(v, v.puja, now);
      if (f.estado === 'cerrada' ? !(e === 'vendida' || e === 'desierta') : e !== f.estado) return false;
    }
    return true;
  });

  const activos = (vehiculos || []).filter((v) => estadoSubasta(v, v.puja, now) === 'activa').length;
  const hayFiltros = Object.values(f).some(Boolean);

  return (
    <>
      <section className="hero">
        <div>
          <h1>Subastas de vehículos en tiempo real</h1>
          <p>Vehículos importados estilo Copart. Explora el inventario, compara por nivel de daño y oferta en vivo desde cualquier dispositivo.</p>
          {!user && (
            <div className="hero-acciones">
              <Link to="/registro" className="btn btn-acento">Crear cuenta gratis</Link>
              <Link to="/login" className="btn btn-sec">Ya tengo cuenta</Link>
            </div>
          )}
        </div>
        <div className="pilares">
          <div className="pilar"><span>①</span><strong>Regístrese</strong><small>Crea tu cuenta para ofertar y publicar.</small></div>
          <div className="pilar"><span>②</span><strong>Encuentre</strong><small>{vehiculos ? vehiculos.length : '…'} vehículos · {activos} en vivo</small></div>
          <div className="pilar"><span>③</span><strong>Oferte</strong><small>Pujas en vivo con aviso si te superan.</small></div>
        </div>
      </section>

      {!user && (
        <div className="aviso">Estás viendo el inventario en modo lectura. <Link to="/login">Inicia sesión</Link> para ofertar o publicar un vehículo.</div>
      )}

      <div className="inventario">
        <aside className="filtros">
          <div className="filtros-cabecera">
            <h2>Filtros</h2>
            {hayFiltros && <button className="enlace" onClick={() => setF(FILTROS_VACIOS)}>Limpiar</button>}
          </div>
          <label>Buscar
            <input value={f.texto} onChange={cambiar('texto')} placeholder="Ej. Toyota Tacoma 2019" />
          </label>
          <label>Nivel de daño</label>
          <div className="danio-filtro">
            <button className={!f.danio ? 'activo' : ''} onClick={() => setF((p) => ({ ...p, danio: '' }))}>Todos</button>
            {Object.keys(DANIOS).map((d) => (
              <button key={d} className={`danio-${d} ${f.danio === d ? 'activo' : ''}`} onClick={() => setF((p) => ({ ...p, danio: d }))}>
                <span className="punto" /> {DANIOS[d].nombre}
              </button>
            ))}
          </div>
          <label>Marca
            <select value={f.marca} onChange={cambiar('marca')}>
              <option value="">Todas</option>
              {marcas.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label>Modelo
            <select value={f.modelo} onChange={cambiar('modelo')}>
              <option value="">Todos</option>
              {modelos.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <div className="fila2">
            <label>Año desde<input type="number" value={f.anioMin} onChange={cambiar('anioMin')} placeholder="2010" /></label>
            <label>Año hasta<input type="number" value={f.anioMax} onChange={cambiar('anioMax')} placeholder="2026" /></label>
          </div>
          <label>Tipo de artículo
            <select value={f.tipo} onChange={cambiar('tipo')}>
              <option value="">Todos</option>
              {TIPOS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Combustible
            <select value={f.combustible} onChange={cambiar('combustible')}>
              <option value="">Todos</option>
              {COMBUSTIBLES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Transmisión
            <select value={f.transmision} onChange={cambiar('transmision')}>
              <option value="">Todas</option>
              {TRANSMISIONES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <div className="fila2">
            <label>Tracción
              <select value={f.traccion} onChange={cambiar('traccion')}>
                <option value="">Todas</option>
                {TRACCIONES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Cilindros
              <select value={f.cilindros} onChange={cambiar('cilindros')}>
                <option value="">Todos</option>
                {[3, 4, 5, 6, 8, 10, 12].map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>
          <label>Estado de subasta
            <select value={f.estado} onChange={cambiar('estado')}>
              <option value="">Todas</option>
              <option value="activa">En vivo</option>
              <option value="proxima">Próximamente</option>
              <option value="cerrada">Cerradas</option>
            </select>
          </label>
        </aside>

        <section className="resultados">
          {error && <p className="error">{error}</p>}
          <p className="conteo">
            {vehiculos === null ? 'Cargando inventario…' : `${lista.length} vehículo(s) encontrado(s)`}
          </p>
          <div className="grid">
            {lista.map((v) => <TarjetaVehiculo key={v.id} v={v} puja={v.puja} now={now} />)}
          </div>
          {vehiculos && !lista.length && <p className="vacio">No hay vehículos que coincidan con los filtros.</p>}
        </section>
      </div>
    </>
  );
}
