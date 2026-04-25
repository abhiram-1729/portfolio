import api from './api';

export const startShift = async (data) => {
  return await api.post('/shifts/start', data);
};

export const endShift = async (data) => {
  return await api.post('/shifts/end', data);
};

export const getShiftStatus = async () => {
  return await api.get('/shifts/status');
};
