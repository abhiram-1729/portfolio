import api from './api';

export const addExpense = async (data) => {
    // Check if it's FormData (for image upload)
    const response = await api.post('/expenses', data);
    return response.data;
};

export const getMyExpenses = async (params) => {
    const response = await api.get('/expenses/my', { params });
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

export const updateExpenseStatus = async (id, status) => {
    const response = await api.put(`/expenses/admin/${id}/status`, { status });
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
