
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { api, getToken } from './api.js';

const Ctx = createContext(null);

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;

    api
      .get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('sm_token'))
      .finally(() => setLoading(false));
  }, []);

  const finish = (d) => {
    localStorage.setItem('sm_token', d.token);
    setUser(d.user);
  };

  const login = async (email, password) =>
    finish(
      await api.post('/auth/login', {
        email,
        password,
      })
    );

  const register = async (name, email, password) =>
    finish(
      await api.post('/auth/register', {
        name,
        email,
        password,
      })
    );

  const logout = () => {
    localStorage.removeItem('sm_token');
    setUser(null);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser: setUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
