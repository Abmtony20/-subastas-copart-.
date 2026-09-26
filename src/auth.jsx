import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase.js';

const AuthCtx = createContext({ user: undefined, perfil: null });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [perfil, setPerfil] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  useEffect(() => {
    if (!user) {
      setPerfil(null);
      return;
    }
    return onValue(ref(db, `users/${user.uid}/perfil`), (s) => setPerfil(s.val()));
  }, [user]);

  return <AuthCtx.Provider value={{ user, perfil }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export function RequireAuth({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <p className="cargando">Cargando…</p>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}
