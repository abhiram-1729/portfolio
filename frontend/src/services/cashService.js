import api from './api';

export const submitOpeningCash = async (data) => {
  const response = await api.post('/cash/opening', data);
  return response.data;
};

export const submitClosingCash = async (data) => {
  const response = await api.post('/cash/closing', data);
  return response.data;
};

export const getCashStatus = async () => {
  const response = await api.get('/cash/status');
  return response.data;
};

export const getAdminReconciliation = async (date) => {
  const response = await api.get(`/cash/admin/reconciliation${date ? `?date=${date}` : ''}`);
  return response.data;
};
