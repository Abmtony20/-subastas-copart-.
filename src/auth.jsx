import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';

const AuthCtx = createContext({ user: undefined });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    if (!getToken()) return setUser(null);
    api('/auth/yo')
      .then(setUser)
      .catch(() => { setToken(null); setUser(null); });
  }, []);

  async function entrar(ruta, datos) {
    const { token, usuario } = await api(ruta, { method: 'POST', body: datos });
    setToken(token);
    setUser(usuario);
  }

  const valor = {
    user,
    login: (correo, clave) => entrar('/auth/login', { correo, clave }),
    registro: (datos) => entrar('/auth/registro', datos),
    logout: () => { setToken(null); setUser(null); },
  };
  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export function RequireAuth({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <p className="cargando">Cargando…</p>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}
