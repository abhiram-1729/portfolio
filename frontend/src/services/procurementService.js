import api from './api';

export const procurementAPI = {
  // ─── VENDORS ─────────────────────────────────────
  getVendors: (params) => api.get('/procurement/vendors', { params }),
  createVendor: (data) => api.post('/procurement/vendors', data),
  updateVendor: (id, data) => api.put(`/procurement/vendors/${id}`, data),
  deleteVendor: (id) => api.delete(`/procurement/vendors/${id}`),
  toggleVendorStatus: (id) => api.put(`/procurement/vendors/${id}/toggle-status`),
  updateVendorApproval: (id, data) => api.put(`/procurement/vendors/${id}/approval`, data),
  getVendorLedger: (id) => api.get(`/procurement/vendors/${id}/ledger`),

  // ─── VENDOR ITEM MAPPINGS ─────────────────────────────────────
  getVendorMappings: (vendorId) => api.get(`/procurement/vendors/${vendorId}/mappings`),
  updateVendorMappings: (vendorId, data) => api.put(`/procurement/vendors/${vendorId}/mappings`, data),

  // ─── PURCHASE ORDERS ─────────────────────────────────────
  getPurchaseOrders: (params) => api.get('/procurement/purchase-orders', { params }),
  createPurchaseOrder: (data) => api.post('/procurement/purchase-orders', data),
  getPurchaseOrderById: (id) => api.get(`/procurement/purchase-orders/${id}`),
  updatePurchaseOrder: (id, data) => api.put(`/procurement/purchase-orders/${id}`, data),
  deletePurchaseOrder: (id) => api.delete(`/procurement/purchase-orders/${id}`),
  updatePOStatus: (id, data) => api.put(`/procurement/purchase-orders/${id}/status`, data),

  // ─── GOODS RECEIPT NOTES ─────────────────────────────────────
  getGRNs: (params) => api.get('/procurement/grn', { params }),
  createGRN: (data) => api.post('/procurement/grn', data),
  updateGRN: (id, data) => api.put(`/procurement/grn/${id}`, data),
  deleteGRN: (id) => api.delete(`/procurement/grn/${id}`),

  // ─── PURCHASES (INVOICES) ─────────────────────────────────────
  getPurchases: (params) => api.get('/procurement/purchases', { params }),
  createPurchase: (data) => api.post('/procurement/purchases', data),
  getPurchaseById: (id) => api.get(`/procurement/purchases/${id}`),
  updatePurchase: (id, data) => api.put(`/procurement/purchases/${id}`, data),
  deletePurchase: (id) => api.delete(`/procurement/purchases/${id}`),

  // ─── PAYMENTS ─────────────────────────────────────
  getPayments: (params) => api.get('/procurement/payments', { params }),
  createPayment: (data) => api.post('/procurement/payments', data),
  deletePayment: (id) => api.delete(`/procurement/payments/${id}`),
  getOutstandingInvoices: (vendorId) => api.get(`/procurement/payments/outstanding/${vendorId}`),

  // ─── REPORTS ─────────────────────────────────────
  getStockReport: (params) => api.get('/procurement/reports/stock', { params }),
  getLowStockAlert: (params) => api.get('/procurement/reports/low-stock', { params }),
  getPurchaseReport: (params) => api.get('/procurement/reports/purchases', { params }),
  getVendorReport: (params) => api.get('/procurement/reports/vendors', { params }),
  getOutstandingPayables: (params) => api.get('/procurement/reports/outstanding', { params }),
  getAgingReport: (params) => api.get('/procurement/reports/aging', { params }),
  getProfitabilityReport: (params) => api.get('/procurement/reports/profitability', { params }),
  getStockLedger: (params) => api.get('/procurement/reports/stock-ledger', { params }),

  // ─── REQUISITIONS ─────────────────────────────────────
  getRequisitions: (params) => api.get('/procurement/requisitions', { params }),
  createRequisition: (data) => api.post('/procurement/requisitions', data),
  getRequisitionById: (id) => api.get(`/procurement/requisitions/${id}`),
  updateRequisitionStatus: (id, data) => api.put(`/procurement/requisitions/${id}`, data),
  deleteRequisition: (id) => api.delete(`/procurement/requisitions/${id}`),

  // ─── STOCK TRANSFERS ─────────────────────────────────────
  getTransfers: (params) => api.get('/procurement/transfers', { params }),
  createTransfer: (data) => api.post('/procurement/transfers', data),
  getTransferById: (id) => api.get(`/procurement/transfers/${id}`),
  dispatchTransfer: (id, data) => api.put(`/procurement/transfers/${id}/dispatch`, data),
  receiveTransfer: (id, data) => api.put(`/procurement/transfers/${id}/receive`, data),

  // ─── WORK ORDERS (CONVERSIONS) ─────────────────────────────────────
  getWorkOrders: (params) => api.get('/procurement/work-orders', { params }),
  createWorkOrder: (data) => api.post('/procurement/work-orders', data),
  getWorkOrderById: (id) => api.get(`/procurement/work-orders/${id}`),
  completeWorkOrder: (id, data) => api.put(`/procurement/work-orders/${id}/complete`, data),
};

export default procurementAPI;
