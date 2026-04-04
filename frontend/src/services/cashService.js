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

export const adminSubmitOpeningCash = async (data) => {
  const response = await api.post('/cash/admin/opening', data);
  return response.data;
};

export const adminUpdateReconciliation = async (data) => {
  const response = await api.put('/cash/admin/reconciliation', data);
  return response.data;
};

export const adminDeleteReconciliation = async (vehicleId, date) => {
  const response = await api.delete(`/cash/admin/reconciliation/${vehicleId}/${date}`);
  return response.data;
};
