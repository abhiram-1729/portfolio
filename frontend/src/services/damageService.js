import api from './api';

export const damageAPI = {
  // Agent endpoints
  reportDamage: (data) => api.post('/damage/report', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyDamageReports: () => api.get('/damage/my-reports'),

  // Admin endpoints
  getDamageEntries: (params) => api.get('/damage/entries', { params }),
  getDamageEntryById: (id) => api.get(`/damage/entries/${id}`),
  reviewDamage: (id, data) => api.put(`/damage/entries/${id}/review`, data),
  applyDeduction: (data) => api.post('/damage/deductions', data),
  getDeductions: (params) => api.get('/damage/deductions', { params }),
  updateDeductionStatus: (id, data) => api.put(`/damage/deductions/${id}`, data),
  getDamageReports: (params) => api.get('/damage/reports', { params }),
};

export default damageAPI;
