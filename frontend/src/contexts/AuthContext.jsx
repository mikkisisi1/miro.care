import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.get(`${API}/auth/me`, { withCredentials: true, headers });
      setUser(data.user);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Auth check failed:', err.message);
      }
      setUser(false);
      localStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    if (data.access_token) localStorage.setItem('access_token', data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await axios.post(`${API}/auth/register`, { email, password, name }, { withCredentials: true });
    if (data.access_token) localStorage.setItem('access_token', data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout request failed:', err.message);
    }
    localStorage.removeItem('access_token');
    setUser(false);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.get(`${API}/auth/me`, { withCredentials: true, headers });
      setUser(data.user);
    } catch (err) {
      console.error('User refresh failed:', err.message);
    }
  }, []);

  const value = useMemo(() => ({
    user, loading, login, register, logout, refreshUser
  }), [user, loading, login, register, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
