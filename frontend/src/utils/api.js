/**
 * api.js — Axios configuration for BlockVote
 *
 * Direct URL to backend (most reliable fix for 404 errors)
 * Frontend: http://localhost:3000
 * Backend:  http://localhost:5000
 */
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token automatically to every request
api.interceptors.request.use(config => {
  const adminToken = localStorage.getItem('adminToken');
  const userToken  = localStorage.getItem('userToken');
  const token = adminToken || userToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — token expired
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Clear tokens and redirect to login
      const isAdmin = !!localStorage.getItem('adminToken');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userInfo');
      window.location.href = isAdmin ? '/admin/login' : '/user/login';
    }
    return Promise.reject(err);
  }
);

export default api;