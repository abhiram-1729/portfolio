import api from './api';

// ─── Agent-facing APIs ─────────────────────────────
export const getTodayPlan = async () => {
    const response = await api.get('/routes/today-plan');
    return response.data;
};

export const getTomorrowPlan = async () => {
    const response = await api.get('/routes/tomorrow-plan');
    return response.data;
};

export const getCoverageStatus = async () => {
    const response = await api.get('/routes/coverage-status');
    return response.data;
};

export const markCoverage = async (slot) => {
    const response = await api.post('/routes/mark-coverage', { slot });
    return response.data;
};

export const getNotifications = async (page = 1, limit = 20) => {
    const response = await api.get('/routes/notifications', { params: { page, limit } });
    return response.data;
};

export const markNotificationRead = async (id) => {
    const response = await api.post(`/routes/notifications/${id}/read`);
    return response.data;
};

export const markAllNotificationsRead = async () => {
    const response = await api.post('/routes/notifications/read-all');
    return response.data;
};

export const locationCheckIn = async (data) => {
    const response = await api.post('/routes/location-check-in', data);
    return response.data;
};


// ─── Admin-facing APIs ─────────────────────────────
export const createRoute = async (data) => {
    const response = await api.post('/admin/routes', data);
    return response.data;
};

export const getAdminRoutes = async (params) => {
    const response = await api.get('/admin/routes', { params });
    return response.data;
};

export const updateRoute = async (id, data) => {
    const response = await api.put(`/admin/routes/${id}`, data);
    return response.data;
};

export const deleteRoute = async (id) => {
    const response = await api.delete(`/admin/routes/${id}`);
    return response.data;
};

export const assignRoute = async (data) => {
    const response = await api.post('/admin/routes/assignments', data);
    return response.data;
};

export const getRouteAssignments = async (params) => {
    const response = await api.get('/admin/routes/assignments', { params });
    return response.data;
};

export const updateRouteAssignment = async (id, data) => {
    const response = await api.put(`/admin/routes/assignments/${id}`, data);
    return response.data;
};

export const deleteRouteAssignment = async (id) => {
    const response = await api.delete(`/admin/routes/assignments/${id}`);
    return response.data;
};

// --- Village APIs ---
export const getVillages = async (params) => {
    const response = await api.get('/admin/villages', { params });
    return response.data;
};

export const createVillage = async (data) => {
    const response = await api.post('/admin/villages', data);
    return response.data;
};

export const updateVillage = async (id, data) => {
    const response = await api.put(`/admin/villages/${id}`, data);
    return response.data;
};

export const deleteVillage = async (id) => {
    const response = await api.delete(`/admin/villages/${id}`);
    return response.data;
};

export const getAllLocationCheckIns = async () => {
    const response = await api.get('/routes/all-location-check-ins');
    return response.data;
};

