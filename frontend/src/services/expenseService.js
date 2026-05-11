import api from './api';

export const addExpense = async (data) => {
    const response = await api.post('/expenses', data);
    return response.data;
};

export const getMyExpenses = async (params) => {
    const response = await api.get('/expenses/my', { params });
    return response.data;
};

export const claimExpense = async (id) => {
    const response = await api.put(`/expenses/${id}/claim`);
    return response.data;
};

export const submitToChest = async (data) => {
    const response = await api.post('/expenses/chest-transfer', data);
    return response.data;
};

// Admin
export const getAllExpenses = async (params) => {
    const response = await api.get('/expenses/admin/all', { params });
    return response.data;
};

export const updateExpenseStatus = async (id, status, extras = {}) => {
    const response = await api.put(`/expenses/admin/${id}/status`, { status, ...extras });
    return response.data;
};

export const bulkUpdateExpenseStatus = async (ids, status) => {
    const response = await api.put('/expenses/admin/bulk-status', { ids, status });
    return response.data;
};

export const getExpenseAnalytics = async (params) => {
    const response = await api.get('/expenses/admin/analytics', { params });
    return response.data;
};

export const getExpenseCategories = async () => {
    const response = await api.get('/expenses/admin/categories');
    return response.data;
};

export const createExpenseCategory = async (data) => {
    const response = await api.post('/expenses/admin/categories', data);
    return response.data;
};

export const updateExpenseCategory = async (id, data) => {
    const response = await api.put(`/expenses/admin/categories/${id}`, data);
    return response.data;
};

export const deleteExpenseCategory = async (id) => {
    const response = await api.delete(`/expenses/admin/categories/${id}`);
    return response.data;
};
