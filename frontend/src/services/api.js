import axios from 'axios';

/**
 * The Afia Food Hub API client.
 *
 * The session lives in an httpOnly cookie set by the API, so the browser
 * never holds a readable token (the original implementation kept the JWT in
 * localStorage, where any injected script could read it).
 *
 * `withCredentials` is required for the cookie to be sent.
 */

const RAW_BASE = process.env.REACT_APP_API_URL;

/**
 * The base URL is resolved once, from a single variable. The original code
 * had `process.env.REACT_APP_API_URL || 'http://localhost:5000/api' ||
 * 'https://…'` - the third operand was unreachable, and a production build
 * with no variable set silently pointed every request at the visitor's own
 * machine (audit finding P1-15).
 */
export function resolveApiBase() {
  const base = (RAW_BASE || '').trim().replace(/\/+$/, '');
  if (!base) {
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line no-console
      console.error(
        '[Afia Food Hub] REACT_APP_API_URL is not set. Every API request will fail. ' +
          'Set it in the deployment environment (see DEPLOYMENT.md).'
      );
    }
    return '/api';
  }
  return base;
}

export const API_BASE = resolveApiBase();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

/** Pull a human-readable message out of an API error. */
export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    (error?.code === 'ERR_NETWORK'
      ? 'We could not reach Afia Food Hub. Check your connection and try again.'
      : fallback)
  );
}

/** The field-level validation details, when the API returned any. */
export function apiErrorDetails(error) {
  return error?.response?.data?.error?.details || null;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 means the session has expired. The API clears the cookie, so the
    // client simply re-reads the profile. The original implementation wiped
    // the session and hard-navigated to /login on ANY 401 - including a
    // failed sign-in attempt - which destroyed the form the customer was
    // filling in (audit finding P2-11).
    if (error?.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      window.dispatchEvent(new CustomEvent('afia:session-expired'));
    }
    return Promise.reject(error);
  }
);

/* ------------------------------------------------------------------ auth -- */

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  requestPasswordReset: (email) => api.post('/auth/password/forgot', { email }),
  resetPassword: (token, newPassword) =>
    api.post('/auth/password/reset', { token, newPassword }),
};

/* ------------------------------------------------------------------ menu -- */

export const menuAPI = {
  getCategories: () => api.get('/menu/categories'),
  getItems: (params) => api.get('/menu/items', { params }),
  getItem: (id) => api.get(`/menu/items/${id}`),
  getPaymentMethods: () => api.get('/menu/payment-methods'),
  createItem: (data, config) => api.post('/menu/items', data, config),
  updateItem: (id, data, config) => api.put(`/menu/items/${id}`, data, config),
  deleteItem: (id) => api.delete(`/menu/items/${id}`),
  createCategory: (data) => api.post('/menu/categories', data),
  updateCategory: (id, data) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/menu/categories/${id}`),
};

/* ----------------------------------------------------------------- cart -- */

export const cartAPI = {
  get: () => api.get('/orders/cart'),
  addItem: (data) => api.post('/orders/cart/items', data),
  updateItem: (id, quantity) => api.put(`/orders/cart/items/${id}`, { quantity }),
  removeItem: (id) => api.delete(`/orders/cart/items/${id}`),
  clear: () => api.delete('/orders/cart'),
  quote: (items, promoCode) => api.post('/orders/quote', { items, promoCode }),
};

/* --------------------------------------------------------------- orders -- */

export const orderAPI = {
  create: (data, idempotencyKey) =>
    api.post('/orders', data, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }),
  validatePromo: (code, subtotal) => api.post('/orders/validate-promo', { code, subtotal }),
  startPayment: (id) => api.post(`/orders/${id}/payment`),
  refreshPayment: (id) => api.post(`/orders/${id}/payment/refresh`),
};

/* ---------------------------------------------------------------- admin -- */

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),
  refundOrder: (id, reason) => api.post(`/admin/orders/${id}/refund`, { reason }),
  getSalesData: (params) => api.get('/admin/sales', { params }),
  exportSalesCSV: (params) => api.get('/admin/sales/export', { params, responseType: 'blob' }),
  getUsers: (params) => api.get('/admin/users', { params }),
  setUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  setUserActive: (id, isActive) => api.put(`/admin/users/${id}/status`, { is_active: isActive }),
};

/* --------------------------------------------------------------- promos -- */

export const promoAPI = {
  getAll: () => api.get('/promos'),
  create: (data) => api.post('/promos', data),
  update: (id, data) => api.put(`/promos/${id}`, data),
  delete: (id) => api.delete(`/promos/${id}`),
};

/* ------------------------------------------------------------ assistant -- */

export const assistantAPI = {
  send: (message, sessionId) => api.post('/assistant/message', { message, sessionId }),
};

export default api;
