import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api' || 'https://foodgh-backend.onrender.com/api';

const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const menuAPI = {
  getCategories: () => api.get('/menu/categories'),
  getItems: (params) => api.get('/menu/items', { params }),
  getItem: (id) => api.get(`/menu/items/${id}`),
  createItem: (data, config) => api.post('/menu/items', data, config),
  updateItem: (id, data, config) => api.put(`/menu/items/${id}`, data, config),
  deleteItem: (id) => api.delete(`/menu/items/${id}`),
  createCategory: (data) => api.post('/menu/categories', data),
  updateCategory: (id, data) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/menu/categories/${id}`),
};

export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.post(`/orders/${id}/cancel`),
  validatePromo: (data) => api.post('/orders/validate-promo', data),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),
  getSalesData: (params) => api.get('/admin/sales', { params }),
  exportSalesCSV: (params) => api.get('/admin/sales/export', { params, responseType: 'blob' }),
  getUsers: () => api.get('/admin/users'),
};

export const promoAPI = {
  getAll: () => api.get('/promos'),
  create: (data) => api.post('/promos', data),
  update: (id, data) => api.put(`/promos/${id}`, data),
  delete: (id) => api.delete(`/promos/${id}`),
};

export default api;
