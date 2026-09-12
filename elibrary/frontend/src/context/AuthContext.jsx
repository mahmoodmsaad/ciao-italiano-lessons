import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'elibrary_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Page reload par token se user wapas load karte hain.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = useCallback(({ token, user: nextUser }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(nextUser);
    return nextUser;
  }, []);

  const login = useCallback(
    async (email, password) => saveSession((await api.post('/auth/login', { email, password })).data),
    [saveSession]
  );

  const register = useCallback(
    async (payload) => saveSession((await api.post('/auth/register', payload)).data),
    [saveSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      setUser,
      isAdmin: user?.role === 'admin',
      isLoggedIn: Boolean(user),
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth ko AuthProvider ke andar use karein.');
  return ctx;
}
