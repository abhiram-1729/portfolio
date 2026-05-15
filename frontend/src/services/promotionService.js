import API from './api';

const promotionService = {
    validate: (data) => API.post('/promotions/validate', data),
    getAll: (params) => API.get('/promotions', { params }),
    create: (data) => API.post('/promotions', data),
    update: (id, data) => API.put(`/promotions/${id}`, data),
    delete: (id) => API.delete(`/promotions/${id}`),
};

export default promotionService;
