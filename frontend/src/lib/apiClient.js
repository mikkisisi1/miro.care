import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Centralized axios instance with auth interceptor.
 * Replaces scattered localStorage.getItem('access_token') calls.
 * Token is read from httpOnly cookies (withCredentials) + Bearer fallback.
 */
const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Centralized token getter — use this instead of direct localStorage access.
 */
export const getToken = () => localStorage.getItem('access_token');

export default apiClient;
export { API_BASE };
