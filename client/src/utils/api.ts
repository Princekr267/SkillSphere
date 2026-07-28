import axios from 'axios';

// Dynamically retrieve backend URL, fallback to localhost for local development
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
export const API_BASE_URL = `${BACKEND_URL}/api`;

// Create a pre-configured axios instance
const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to every outgoing request if it exists in local storage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('skillsphere_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
