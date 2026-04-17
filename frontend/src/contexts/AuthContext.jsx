import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '@/lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      setUser(data.user);
    } catch {
      try {
        const { data } = await apiClient.post('/auth/guest', {});
        if (data.access_token) localStorage.setItem('access_token', data.access_token);
        setUser(data.user);
      } catch {
        setUser(false);
        localStorage.removeItem('access_token');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    if (data.access_token) localStorage.setItem('access_token', data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await apiClient.post('/auth/register', { email, password, name });
    if (data.access_token) localStorage.setItem('access_token', data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Logout request failed:', err.message);
    }
    localStorage.removeItem('access_token');
    try {
      const { data } = await apiClient.post('/auth/guest', {});
      if (data.access_token) localStorage.setItem('access_token', data.access_token);
      setUser(data.user);
    } catch {
      setUser(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('User refresh failed:', err.message);
    }
  }, []);

  const isGuest = user?.is_guest === true || user?.role === 'guest';

  const value = useMemo(() => ({
    user, loading, login, register, logout, refreshUser, isGuest
  }), [user, loading, login, register, logout, refreshUser, isGuest]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
