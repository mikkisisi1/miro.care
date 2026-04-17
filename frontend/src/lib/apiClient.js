import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TOKEN_KEY = 'access_token';

/** Read current auth token. Single source of truth for token access. */
export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/** Persist auth token. */
export function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Remove auth token. */
export function removeAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
export { API_BASE };
