import axios from 'axios';
import { useUserStore } from '../store/userStore';

const envURL = import.meta.env.VITE_API_URL;
const isProd = import.meta.env.PROD || (typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname !== 'localhost'));

let API_URL = envURL || '';

// Case 1: Production logic
if (isProd) {
    // ALWAYS use/assume a relative /api rewrite on Vercel to avoid Mixed Content errors.
    API_URL = '/api';
} else {
    // Case 2: Development Localhost / Environment fallback
    API_URL = envURL || API_URL || 'http://localhost:5001/api';
}

// Case 3: Ensure /api suffix
if (API_URL !== '/api' && API_URL && !API_URL.endsWith('/api') && !API_URL.endsWith('/api/')) {
    API_URL = API_URL.replace(/\/$/, '') + '/api';
}

console.log(`[API Config] Mode: ${isProd ? 'Production' : 'Development'}, Target: ${API_URL}`);

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
    // 503 Service Unavailable or 500 Internal Server Error (usually DB connection issues)
    // DO NOT LOGOUT the user for these. Just let the component handle the error toast.
    if (error.response?.status === 503 || (error.response?.status === 500 && error.response?.data?.message?.includes('connection'))) {
      console.warn('[API Interceptor] Server/DB busy. Skipping automatic logout.', error.response?.status);
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      if (window.location.pathname.includes('/success')) {
        console.warn('[API Interceptor] 401 Error on Success page. Skipping logout to preserve order view.');
        return Promise.reject(error);
      }
      
      if (window.location.pathname.includes('/login')) {
        console.warn('[API Interceptor] 401 Error during login attempt. Relaying error to component.');
        return Promise.reject(error);
      }

      useUserStore.getState().clearUser();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (formData) => api.put('/auth/me', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateBusinessProfile: (formData) => api.put('/auth/business', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updatePassword: (data) => api.put('/auth/password', data),
  uploadMyDocument: (formData) => api.post('/auth/me/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getVehicleInventory: (id) => api.get(`/products/vehicle-inventory/${id}`),
  getAuditHistory: (vehicleId) => api.get(`/products/audit-history/${vehicleId}`),
  requestRefill: (data) => api.post('/products/refill', data),
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
  getMyHistory: (params) => api.get('/orders/my-history', { params }),
  editItem: (orderId, itemId, data) => api.put(`/orders/${orderId}/items/${itemId}`, data),
  removeItem: (orderId, itemId) => api.delete(`/orders/${orderId}/items/${itemId}`),
  returnItems: (orderId, data) => api.post(`/orders/${orderId}/return`, data),
  cancelOrder: (orderId, data) => api.post(`/orders/${orderId}/cancel`, data),
  getSessionSales: (params) => api.get('/orders/session-sales', { params }),
  getReturnReport: (params) => api.get('/orders/return-report', { params }),
  getItemWiseReport: (params) => api.get('/orders/item-wise-report', { params }),
  freezeSession: (data) => api.post('/orders/freeze-session', data),
};

export const reportsAPI = {
  today: (params) => api.get('/reports/today', { params }),
  byDate: (params) => api.get('/reports/date', { params }),
};

export const vgeAPI = {
  getMyPerformance: (params) => api.get('/vge/my-performance', { params }),
  getMyHistory: (params) => api.get('/vge/my-history', { params }),
  getMyMonthlySummary: (params) => api.get('/vge/my-monthly', { params }),
  getLeaderboard: (params) => api.get('/vge/leaderboard', { params }),
};

export const assetAPI = {
  getMyAssets: () => api.get('/assets/my-assets'),
  reportIssue: (data) => api.post('/assets/report-issue', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  createRequest: (data) => api.post('/assets/requests', data),
  getMyRequests: () => api.get('/assets/requests'),
  getCatalog: () => api.get('/assets/catalog'),
};

export const attendanceAPI = {
  punchIn: (data) => api.post('/attendance/punch-in', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  punchOut: (data) => api.post('/attendance/punch-out', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getToday: () => api.get('/attendance/today'),
  getMyHistory: (params) => api.get('/attendance/my-history', { params }),
  getAll: (params) => api.get('/attendance/all', { params }),
};

export const storeAPI = {
  create: (data) => api.post('/tenant/stores', data),
  getMyStores: () => api.get('/tenant/stores'),
};

export default api;
