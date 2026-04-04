import api from './api';

export const getTodayPlan = async () => {
    const response = await api.get('/routes/today-plan');
    return response.data;
};

export const getTomorrowPlan = async () => {
    const response = await api.get('/routes/tomorrow-plan');
    return response.data;
};

// Admin Routes
export const createRoute = async (data) => {
    const response = await api.post('/admin/routes', data);
    return response.data;
};

export const getAdminRoutes = async () => {
    const response = await api.get('/admin/routes');
    return response.data;
};

export const assignRoute = async (data) => {
    const response = await api.post('/admin/routes/assignments', data);
    return response.data;
};

export const getRouteAssignments = async () => {
    const response = await api.get('/admin/routes/assignments');
    return response.data;
};
