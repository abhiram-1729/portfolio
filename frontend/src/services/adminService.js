import api from './api';

export const adminAPI = {
  // Dashboard
  getDashboardStats: (params) => api.get('/admin/dashboard', { params }),
  getLocationCheckIns: () => api.get('/routes/all-location-check-ins'),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deactivateUser: (id) => api.delete(`/admin/users/${id}`),

  // Vehicles
  getVehicles: (params) => api.get('/admin/vehicles', { params }),
  createVehicle: (data) => api.post('/admin/vehicles', data),
  updateVehicle: (id, data) => api.put(`/admin/vehicles/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteVehicle: (id) => api.delete(`/admin/vehicles/${id}`),
  assignDriver: (id, userId) => api.put(`/admin/vehicles/${id}/assign`, { userId }),
  getVehicleSales: (id) => api.get(`/admin/vehicles/${id}/sales`),

  // Inventory
  getItems: (params) => api.get('/admin/inventory/items', { params }),
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
  auditVehicleStock: (id, data) => api.put(`/admin/inventory/vehicle/${id}/audit`, data),
  getRefillRequests: (params) => api.get('/admin/inventory/refills', { params }),
  getAuditHistory: (params) => api.get('/admin/inventory/audit-history', { params }),
  approveRefillRequest: (id, data) => api.put(`/admin/inventory/refills/${id}/approve`, data),
  rejectRefillRequest: (id, data) => api.put(`/admin/inventory/refills/${id}/reject`, data),
  updateProductStock: (data) => api.post('/admin/inventory/stock', data),
  importZipInventory: (data) => api.post('/admin/inventory/items/zip-import', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Sales
  getSales: (params) => api.get('/admin/sales', { params }),

  // Activity Logs
  getActivityLogs: (params) => api.get('/admin/activities', { params }),

  // Reports
  getDailyReport: (params) => api.get('/admin/reports/daily', { params }),
  getTrendsReport: (params) => api.get('/admin/reports/trends', { params }),
  getTopProducts: (params) => api.get('/admin/reports/top-products', { params }),
  getVehicleReport: (id) => api.get(`/admin/reports/vehicle/${id}`),
  getItemReport: (params) => api.get('/admin/reports/item', { params }),
  getDateRangeReport: (params) => api.get('/admin/reports/date-range', { params }),
  getReconciliationReport: (params) => api.get('/admin/reports/reconciliation', { params }),
  getRouteWiseReport: (params) => api.get('/admin/reports/route-wise', { params }),
  getVillageWiseReport: (params) => api.get('/admin/reports/village-wise', { params }),
  getAgentPerformance: (params) => api.get('/admin/reports/agent-performance', { params }),
  
  // Settings
  getSettings: (params) => api.get('/admin/settings', { params }).catch(err => {
    if (err.response?.status === 404) {
      console.warn('[System] Admin settings route not found on server yet. Using defaults.');
      return { data: { success: true, data: { businessName: 'VillagKart', taxRates: '0,5,12,18' } } };
    }
    throw err;
  }),
  updateSettings: (data) => api.put('/admin/settings', data),

  // Units
  getUnits: (params) => api.get('/admin/units', { params }),
  createUnit: (data) => api.post('/admin/units', data),
  updateUnit: (id, data) => api.put(`/admin/units/${id}`, data),
  deleteUnit: (id) => api.delete(`/admin/units/${id}`),

  // Categories
  getCategories: (params) => api.get('/admin/categories', { params }),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  
  // Sub-Categories
  getSubCategories: (params) => api.get('/admin/sub-categories', { params }),
  createSubCategory: (data) => api.post('/admin/sub-categories', data),
  updateSubCategory: (id, data) => api.put(`/admin/sub-categories/${id}`, data),
  deleteSubCategory: (id) => api.delete(`/admin/sub-categories/${id}`),

  // VGE Targets & Incentives
  vgeAllPerformance: (params) => api.get('/vge/admin/all-performance', { params }),
  vgeAgentPerformance: (userId, params) => api.get(`/vge/admin/agent/${userId}`, { params }),
  vgeMonthlyReport: (params) => api.get('/vge/admin/monthly-report', { params }),
  vgeGetConfig: (params) => api.get('/vge/admin/config', { params }),
  vgeUpdateConfig: (data) => api.put('/vge/admin/config', data),
  vgeRecalculate: (data) => api.post('/vge/admin/recalculate', data),
  vgeEndOfDay: (data) => api.post('/vge/admin/end-of-day', data || {}),
  vgeGenerateMonthly: (data) => api.post('/vge/admin/generate-monthly', data || {}),

  // Asset Management
  getAssets: () => api.get('/admin/assets'),
  createAsset: (data) => api.post('/admin/assets', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateAsset: (id, data) => api.put(`/admin/assets/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAsset: (id) => api.delete(`/admin/assets/${id}`),
  addAssetUnits: (id, data) => api.post(`/admin/assets/${id}/units`, data),
  assignAsset: (data) => api.post('/admin/assets/assign', data),
  returnAsset: (data) => api.post('/admin/assets/return', data),
  getAssetTracking: () => api.get('/admin/assets/tracking'),
  getAssetIssues: () => api.get('/admin/assets/issues'),
  updateAssetIssue: (id, data) => api.put(`/admin/assets/issues/${id}`, data),
  getAssetRequests: () => api.get('/admin/assets/requests'),
  updateAssetRequest: (id, data) => api.put(`/admin/assets/requests/${id}`, data),
  getAssetReports: () => api.get('/admin/assets/reports'),

  // Asset Categories
  getAssetCategories: (params) => api.get('/admin/asset-categories', { params }),
  createAssetCategory: (data) => api.post('/admin/asset-categories', data),
  updateAssetCategory: (id, data) => api.put(`/admin/asset-categories/${id}`, data),
  deleteAssetCategory: (id) => api.delete(`/admin/asset-categories/${id}`),

  // Financial Reports
  getFinancialReport: async (params) => {
    const response = await api.get('/admin/finance/reports', { params });
    return response.data;
  },
  resolveVillageLink: (url) => api.post('/admin/villages/resolve-link', { url }),

  // Tenant Stores Management
  getStores: () => api.get('/tenant/stores'),
  createStore: (data) => api.post('/tenant/stores', data),
  updateStore: (id, data) => api.put(`/tenant/stores/${id}`, data),
  deleteStore: (id) => api.delete(`/tenant/stores/${id}`),

  // Role & Privileges Management
  getRoles: () => api.get('/admin/roles'),
  getRole: (id) => api.get(`/admin/roles/${id}`),
  createRole: (data) => api.post('/admin/roles', data),
  updateRole: (id, data) => api.put(`/admin/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/admin/roles/${id}`),
  assignRole: (data) => api.put('/admin/roles/assign', data),
};


export default adminAPI;
