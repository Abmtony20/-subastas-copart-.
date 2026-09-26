import { useCallback, useEffect, useState } from 'react';
import { api, socket } from './api.js';

// Carga un listado de vehículos y lo mantiene al día con los eventos de Socket.IO.
export function useInventario(ruta = '/vehiculos') {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    api(ruta).then((x) => { setLista(x); setError(''); }).catch((e) => setError(e.message));
  }, [ruta]);

  useEffect(() => {
    cargar();
    const onPuja = ({ vehiculoId, puja }) =>
      setLista((l) => l && l.map((v) => (v.id === vehiculoId ? { ...v, puja } : v)));
    socket.on('inventario:puja', onPuja);
    socket.on('inventario:cambio', cargar);
    socket.on('connect', cargar); // al reconectar, por si se perdió algún evento
    return () => {
      socket.off('inventario:puja', onPuja);
      socket.off('inventario:cambio', cargar);
      socket.off('connect', cargar);
    };
  }, [cargar]);

  return { lista, error };
}
