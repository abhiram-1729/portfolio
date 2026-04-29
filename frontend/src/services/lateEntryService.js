import api from './api';

const lateEntryService = {
  // Config
  getConfig: async (storeId) => {
    const response = await api.get(`/late-entry/config${storeId ? `?storeId=${storeId}` : ''}`);
    return response.data;
  },

  updateConfig: async (configData) => {
    const response = await api.post('/late-entry/config', configData);
    return response.data;
  },

  // History & Reports
  getMyHistory: async (month) => {
    const response = await api.get(`/late-entry/my${month ? `?month=${month}` : ''}`);
    return response.data;
  },

  getAdminReport: async (params) => {
    const response = await api.get('/late-entry/admin/report', { params });
    return response.data;
  },

  updateRecord: async (id, updateData) => {
    const response = await api.patch(`/late-entry/${id}`, updateData);
    return response.data;
  },

  // Exceptions
  requestException: async (exceptionData) => {
    const response = await api.post('/late-entry/exception', exceptionData);
    return response.data;
  },

  reviewException: async (id, reviewData) => {
    const response = await api.patch(`/late-entry/exception/${id}`, reviewData);
    return response.data;
  },

  // Leave Balance
  getLeaveBalance: async (userId, month) => {
    const response = await api.get('/late-entry/leave-balance', { params: { userId, month } });
    return response.data;
  },

  // Analytics
  getAnalyticsStats: async (params) => {
    const response = await api.get('/late-entry/analytics/stats', { params });
    return response.data;
  },

  getTopOffenders: async () => {
    const response = await api.get('/late-entry/analytics/top-offenders');
    return response.data;
  }
};

export default lateEntryService;
