import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Auto-correct missing /api suffix from Vercel/Render env variables
if (API_URL && !API_URL.endsWith('/api')) {
  API_URL = API_URL.replace(/\/$/, '') + '/api';
}

const api = axios.create({
  baseURL: API_URL,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (token expired/invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Logic: If we are on the Success page, DON'T redirect immediately.
      // This prevents the 'Redirect to Login' issue where a background fetch fails.
      if (window.location.pathname.includes('/success')) {
        console.warn('[API Interceptor] 401 Error on Success page. Skipping logout to preserve order view.');
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getVehicleInventory: (id) => api.get(`/products/vehicle-inventory/${id}`),
};

export const cartAPI = {
  get: () => api.get('/cart'),
  add: (data) => api.post('/cart/add', data),
  update: (data) => api.post('/cart/update', data),
  remove: (data) => api.post('/cart/remove', data),
  clear: () => api.post('/cart/clear'),
};

export const ordersAPI = {
  createFromCart: (data) => api.post('/orders/create-from-cart', data),
  completePayment: (data) => api.post('/orders/complete-payment', data),
  getById: (id) => api.get(`/orders/${id}`),
};

export const reportsAPI = {
  today: (params) => api.get('/reports/today', { params }),
  byDate: (params) => api.get('/reports/date', { params }),
};

export default api;
