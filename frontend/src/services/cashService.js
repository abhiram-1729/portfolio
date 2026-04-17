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

export const getAdminReconciliation = async (date, storeId) => {
  const params = {};
  if (date) params.date = date;
  if (storeId) params.storeId = storeId;
  const response = await api.get('/cash/admin/reconciliation', { params });
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

export const adminReviewClosing = async (data) => {
  const response = await api.put('/cash/admin/closing/review', data);
  return response.data;
};

// Store Cash Safe Endpoints
export const getStoreCashRegister = async (date) => {
  const response = await api.get(`/cash/store-register/${date}`);
  return response.data;
};

export const openStoreCashRegister = async (data) => {
  const response = await api.post('/cash/store-register/open', data);
  return response.data;
};

export const closeStoreCashRegister = async (data) => {
  const response = await api.post('/cash/store-register/close', data);
  return response.data;
};

export const createStoreDeposit = async (data) => {
  const response = await api.post('/cash/store-register/deposit', data);
  return response.data;
};

export const updateStoreCashRegister = async (data) => {
  const response = await api.patch('/cash/store-register/update', data);
  return response.data;
};

export const updateStoreDeposit = async (id, data) => {
  const response = await api.patch(`/cash/store-register/deposit/${id}`, data);
  return response.data;
};

export const deleteStoreDeposit = async (id) => {
  const response = await api.delete(`/cash/store-register/deposit/${id}`);
  return response.data;
};

export const addBankDeposit = async (data) => {
  const response = await api.post('/cash/store-register/bank-deposit', data);
  return response.data;
};

export const deleteBankDeposit = async (id) => {
  const response = await api.delete(`/cash/store-register/bank-deposit/${id}`);
  return response.data;
};
