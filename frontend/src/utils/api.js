import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, err => Promise.reject(err));

// Handle auth errors gracefully — don't redirect on every 401
api.interceptors.response.use(
  res => res,
  err => {
    // Only redirect on 401 for protected page requests, not background polls
    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      // Don't auto-logout on public/status endpoints
      const isPublic = url.includes('/elections/active') || 
                       url.includes('/vote/results') ||
                       url.includes('/candidates/public');
      if (!isPublic) {
        const isAdmin = !!localStorage.getItem('adminToken');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userInfo');
        window.location.href = isAdmin ? '/admin/login' : '/user/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;