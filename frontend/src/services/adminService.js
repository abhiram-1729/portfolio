import api from './api';

export const adminAPI = {
  // Dashboard
  getDashboardStats: (params) => api.get('/admin/dashboard', { params }),
  getLocationCheckIns: () => api.get('/routes/all-location-check-ins'),

  // Tracking
  getLiveLocations: (params) => api.get('/location/live', { params }),
  getBreadcrumbHistory: (params) => api.get('/location/history', { params }),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deactivateUser: (id) => api.delete(`/admin/users/${id}`),
  uploadUserDocument: (userId, data) => api.post(`/admin/users/${userId}/documents`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateUserDocumentStatus: (documentId, status) => api.put(`/admin/users/documents/${documentId}`, { status }),
  getShifts: () => api.get('/admin/users/shifts'),
  createShift: (data) => api.post('/admin/users/shifts', data),

  // Vehicles
  getVehicles: (params) => api.get('/admin/vehicles', { params }),
  createVehicle: (data) => api.post('/admin/vehicles', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateVehicle: (id, data) => api.put(`/admin/vehicles/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteVehicle: (id) => api.delete(`/admin/vehicles/${id}`),
  assignDriver: (id, userId) => api.put(`/admin/vehicles/${id}/assign`, { userId }),
  executeVehicleHandover: (id, payload) => api.post(`/admin/vehicles/${id}/handover`, payload),
  getVehicleStock: (id) => api.get(`/admin/vehicles/${id}/stock`),
  getVehicleSales: (id) => api.get(`/admin/vehicles/${id}/sales`),
  
  // Vehicle Operations
  getVehicleOpsTrips: (params) => api.get('/admin/vehicles/ops/trips', { params }),
  startVehicleTrip: (data) => api.post('/admin/vehicles/ops/trips/start', data),
  endVehicleTrip: (id, data) => api.put(`/admin/vehicles/ops/trips/${id}/end`, data),
  getFuelLogs: (params) => api.get('/admin/vehicles/ops/fuel', { params }),
  addFuelLog: (data) => api.post('/admin/vehicles/ops/fuel', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMaintenanceLogs: (params) => api.get('/admin/vehicles/ops/maintenance', { params }),
  addMaintenanceLog: (data) => api.post('/admin/vehicles/ops/maintenance', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Inventory
  getInventoryInit: (params) => api.get('/admin/inventory/init', { params }),
  getItems: (params) => api.get('/admin/inventory/items', { params }),
  createItem: (data) => api.post('/admin/inventory/items', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  bulkCreateItems: (data) => api.post('/admin/inventory/items/bulk', data),
  bulkImportItems: (data) => api.post('/admin/inventory/items/bulk-import', data),
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
  getLoadHistory: (params) => api.get('/admin/inventory/load-history', { params }),
  getReturnHistory: (params) => api.get('/admin/inventory/return-history', { params }),
  getRefillHistory: (params) => api.get('/admin/inventory/refill-history', { params }),
  approveRefillRequest: (id, data) => api.put(`/admin/inventory/refills/${id}/approve`, data),
  rejectRefillRequest: (id, data) => api.put(`/admin/inventory/refills/${id}/reject`, data),
  updateProductStock: (data) => api.post('/admin/inventory/stock', data),
  updateInventory: (data) => api.post('/admin/inventory/stock', data),
  importZipInventory: (data) => api.post('/admin/inventory/items/zip-import', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Sales
  getSales: (params) => api.get('/admin/sales', { params }),
  createManualSale: (data) => api.post('/admin/sales', data),
  getSuspendedSales: (params) => api.get('/admin/sales/suspended', { params }),
  suspendSale: (data) => api.post('/admin/sales/suspend', data),
  deleteSuspendedSale: (id) => api.delete(`/admin/sales/suspended/${id}`),

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
  getCategoryReport: (params) => api.get('/admin/reports/category-wise', { params }),
  getReturnReport: (params) => api.get('/admin/reports/returns', { params }),
  getSessionReport: (params) => api.get('/admin/reports/sessions', { params }),
  getVehicleAllPerformance: (params) => api.get('/admin/reports/vehicle-all', { params }),
  getDayDetailedSales: (params) => api.get('/admin/reports/day-detailed', { params }),
  getPaymentReport: (params) => api.get('/admin/reports/daily', { params }),
  getDamageReports: (params) => api.get('/damage/reports', { params }),
  getDamageEntries: (params) => api.get('/damage/entries', { params }),

  // Vehicle Damage CRUD (Separate)
  getVehicleDamages: (params) => api.get('/admin/vehicle-damages', { params }),
  createVehicleDamage: (data) => api.post('/admin/vehicle-damages', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateVehicleDamage: (id, data) => api.put(`/admin/vehicle-damages/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteVehicleDamage: (id) => api.delete(`/admin/vehicle-damages/${id}`),
  getInvoiceReport: (params) => api.get('/admin/sales', { params }),
  getTrackingVillageVisits: (params) => api.get('/reports/tracking/village-visits', { params }),
  getTrackingTimeDeviation: (params) => api.get('/reports/tracking/time-deviation', { params }),

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
  getAssets: (params) => api.get('/admin/assets', { params }),
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
  getAssetTracking: (params) => api.get('/admin/assets/tracking', { params }),
  getAssetIssues: (params) => api.get('/admin/assets/issues', { params }),
  updateAssetIssue: (id, data) => api.put(`/admin/assets/issues/${id}`, data),
  getAssetRequests: (params) => api.get('/admin/assets/requests', { params }),
  updateAssetRequest: (id, data) => api.put(`/admin/assets/requests/${id}`, data),
  getAssetReports: (params) => api.get('/admin/assets/reports', { params }),

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

  // Organization Stores Management (Admin Perspective)
  getStores: () => api.get('/admin/stores'),
  createStore: (data) => api.post('/admin/stores', data),
  updateStore: (id, data) => api.put(`/admin/stores/${id}`, data),
  deleteStore: (id) => api.delete(`/admin/stores/${id}`),

  // Role & Privileges Management
  getRoles: () => api.get('/admin/roles'),
  getRole: (id) => api.get(`/admin/roles/${id}`),
  createRole: (data) => api.post('/admin/roles', data),
  updateRole: (id, data) => api.put(`/admin/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/admin/roles/${id}`),
  assignRole: (data) => api.put('/admin/roles/assign', data),

  // Media / Uploads
  uploadProductImage: (data) => api.post('/admin/upload-image', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Customers Module
  getCustomers: (params) => api.get('/customers', { params }),
  registerCustomer: (data) => api.post('/customers', data),
  loginCustomer: (data) => api.post('/customers/login', data),
  getCustomerHistory: (id) => api.get(`/customers/${id}/history`),
  updateCustomerProfile: (id, data) => api.put(`/customers/${id}`, data),
  adjustCreditBalance: (id, data) => api.post(`/customers/${id}/credit`, data),
  adjustLoyaltyPoints: (id, data) => api.post(`/customers/${id}/points`, data),

  // Module 14 Enterprise Asset Extensions
  updateAssetVehicleMapping: (data) => api.put('/admin/assets/vehicle-mapping', data),
  getDepreciationSchedules: (params) => api.get('/admin/assets/depreciation', { params }),
  saveDepreciationSchedule: (data) => api.post('/admin/assets/depreciation', data),
  getAssetAudits: (params) => api.get('/admin/assets/audits', { params }),
  createAssetAudit: (data) => api.post('/admin/assets/audits', data),

  // POS Terminals
  getTerminals: (params) => api.get('/admin/terminals', { params }),
  createTerminal: (data) => api.post('/admin/terminals', data),
  updateTerminal: (id, data) => api.put(`/admin/terminals/${id}`, data),
  deleteTerminal: (id) => api.delete(`/admin/terminals/${id}`),

  // Asset Transfers
  getAssetTransfers: (params) => api.get('/admin/assets/transfers', { params }),
  createAssetTransfer: (data) => api.post('/admin/assets/transfers', data),
};

export default adminAPI;
