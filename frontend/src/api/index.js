// frontend/src/api/index.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
});

export const registerUser = (name) => api.post('/api/users/register', { name });
export const getUser = (userId) => api.get(`/api/users/${userId}`);
export const getLeaderboard = () => api.get('/api/users');
export const getNextTask = (userId) => api.get(`/api/tasks/next?userId=${userId}`);
export const submitResponse = (taskId, userId, answer) =>
  api.post(`/api/tasks/${taskId}/respond`, { userId, answer });
export const uploadDataset = (name, items) => api.post('/api/datasets', { name, items });
export const getDatasets = () => api.get('/api/datasets');
export const getStats = () => api.get('/api/stats');

export default api;

