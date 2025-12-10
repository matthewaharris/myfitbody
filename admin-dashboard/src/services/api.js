import axios from 'axios';

// Use environment variable for API URL, fallback to relative path for same-origin
const API_BASE = import.meta.env.VITE_API_URL || '';
const API_URL = `${API_BASE}/api/admin`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
export const setAdminToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('adminToken', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('adminToken');
  }
};

// Initialize token from localStorage
const savedToken = localStorage.getItem('adminToken');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

// Auth
export const adminLogin = async (email, password) => {
  const response = await api.post('/login', { email, password });
  return response.data;
};

export const verifyAdminToken = async () => {
  const response = await api.get('/verify');
  return response.data;
};

// Dashboard Stats
export const getDashboardStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

// Users
export const getUsers = async (params = {}) => {
  const response = await api.get('/users', { params });
  return response.data;
};

export const getUserById = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const getUserActivity = async (userId) => {
  const response = await api.get(`/users/${userId}/activity`);
  return response.data;
};

export const suspendUser = async (userId, reason) => {
  const response = await api.post(`/users/${userId}/suspend`, { reason });
  return response.data;
};

export const unsuspendUser = async (userId) => {
  const response = await api.post(`/users/${userId}/unsuspend`);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

export const resetUserPassword = async (userId) => {
  const response = await api.post(`/users/${userId}/reset-password`);
  return response.data;
};

// Activity Logs
export const getActivityLogs = async (params = {}) => {
  const response = await api.get('/activity-logs', { params });
  return response.data;
};

export default api;
