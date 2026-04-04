import api from './api';

export const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/admin/dashboard'),

  // Users
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deactivateUser: (id) => api.delete(`/admin/users/${id}`),

  // Vehicles
  getVehicles: () => api.get('/admin/vehicles'),
  createVehicle: (data) => api.post('/admin/vehicles', data),
  updateVehicle: (id, data) => api.put(`/admin/vehicles/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteVehicle: (id) => api.delete(`/admin/vehicles/${id}`),
  assignDriver: (id, userId) => api.put(`/admin/vehicles/${id}/assign`, { userId }),
  getVehicleSales: (id) => api.get(`/admin/vehicles/${id}/sales`),

  // Inventory
  getItems: () => api.get('/admin/inventory/items'),
  createItem: (data) => api.post('/admin/inventory/items', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  bulkCreateItems: (data) => api.post('/admin/inventory/items/bulk', data),
  bulkDeleteItems: (ids) => api.post('/admin/inventory/items/bulk-delete', { ids }),
  updateItem: (id, data) => api.put(`/admin/inventory/items/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteItem: (id) => api.delete(`/admin/inventory/items/${id}`),
  loadStock: (data) => api.post('/admin/inventory/load', data),
  returnStock: (data) => api.post('/admin/inventory/return', data),
  getVehicleInventory: (id) => api.get(`/admin/inventory/vehicle/${id}`),
  getRefillRequests: () => api.get('/admin/inventory/refills'),
  approveRefillRequest: (id) => api.put(`/admin/inventory/refills/${id}/approve`),
  rejectRefillRequest: (id) => api.put(`/admin/inventory/refills/${id}/reject`),

  // Sales
  getSales: (params) => api.get('/admin/sales', { params }),

  // Reports
  getDailyReport: () => api.get('/admin/reports/daily'),
  getTrendsReport: (params) => api.get('/admin/reports/trends', { params }),
  getTopProducts: () => api.get('/admin/reports/top-products'),
  getVehicleReport: (id) => api.get(`/admin/reports/vehicle/${id}`),
  getItemReport: () => api.get('/admin/reports/item'),
  getDateRangeReport: (params) => api.get('/admin/reports/date-range', { params }),
  getReconciliationReport: (params) => api.get('/admin/reports/reconciliation', { params }),
  getRouteWiseReport: (params) => api.get('/admin/reports/route-wise', { params }),
  getVillageWiseReport: (params) => api.get('/admin/reports/village-wise', { params }),
  
  // Settings
  getSettings: () => api.get('/admin/settings').catch(err => {
    if (err.response?.status === 404) {
      console.warn('[System] Admin settings route not found on server yet. Using defaults.');
      return { data: { success: true, data: { businessName: 'VillagKart', taxRates: '0,5,12,18' } } };
    }
    throw err;
  }),
  updateSettings: (data) => api.put('/admin/settings', data),
};

export default adminAPI;
