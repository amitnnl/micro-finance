import axios from 'axios';

// Detect PHP Backend URL dynamically (XAMPP Apache, Custom Env, or Production Web Host/cPanel)
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Vite dev server local proxy or direct port 5173
  if (window.location.port === '5173') {
    return 'http://localhost/micro-fin/backend/api/index.php';
  }
  // Production Web Server (Apache, cPanel, VPS, Nginx, or subfolder)
  const path = window.location.pathname;
  const dir = path.substring(0, path.lastIndexOf('/') + 1);
  return `${window.location.origin}${dir}backend/api/index.php`;
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request Interceptor: Attach JWT Bearer Token and Route query
api.interceptors.request.use(
  (config) => {
    const urlParts = config.url.split('?');
    const route = urlParts[0];
    
    config.params = config.params || {};
    config.params.route = route;
    
    if (urlParts.length > 1) {
        const queryParams = new URLSearchParams(urlParts[1]);
        for (const [key, value] of queryParams.entries()) {
            config.params[key] = value;
        }
    }
    
    config.url = '';

    const token = localStorage.getItem('microfin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Unauthorized Expiry
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('microfin_token');
      localStorage.removeItem('microfin_user');
      if (!window.location.hash.includes('login') && window.location.pathname !== '/login') {
        if (window.location.hash) {
          window.location.hash = '#/login';
        } else {
          window.location.href = '#/login';
        }
      }
    }
    return Promise.reject(error.response?.data || { message: 'Network or Server Error' });
  }
);

export default api;
