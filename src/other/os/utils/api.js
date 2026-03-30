import axios from 'axios';
import { OS_API_URL, TRACCAR_API_URL } from '../constants';

const osApi = axios.create({
  baseURL: OS_API_URL,
});

const traccarApi = axios.create({
  baseURL: TRACCAR_API_URL,
});

export const getWorkOrders = () => osApi.get('/work-orders');
export const getWorkOrderDetails = (id) => osApi.get(`/work-orders/${id}`);
export const createWorkOrder = (data) => osApi.post('/work-orders', data);
export const updateWorkOrder = (id, data) => osApi.patch(`/work-orders/${id}`, data);
export const updateWorkOrderStatus = (id, status) => osApi.patch(`/work-orders/${id}/status`, { status });
export const saveWorkOrderChecklist = (data) => osApi.post('/checklist', data);
export const deleteWorkOrder = (id) => osApi.delete(`/work-orders/${id}`);
export const uploadWorkOrderPhotos = (id, formData) =>
  osApi.post(`/work-orders/${id}/photos`, formData, {
    // Não definir Content-Type - o axios define automaticamente com boundary correto para FormData
  });

export const getUsers = () => traccarApi.get('/users');
export const getClients = () => osApi.get('/clients');
export const getVehicles = () =>
  axios.get('/api/vehicles').then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || []));
export const getAvailableDevices = () =>
  axios.get('/api/vehicles/available-devices', { withCredentials: true }).then((r) => (Array.isArray(r.data) ? r.data : []));
export const getLinkedDevices = (plate, clientId) =>
  axios.get('/api/vehicles/linked-devices', { params: { plate, client_id: clientId }, withCredentials: true })
    .then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || []));
export const toggleTechnician = (traccarUserId, status) =>
  traccarApi.post('/toggle-technician', { traccar_user_id: traccarUserId, status });

export default {
  os: osApi,
  traccar: traccarApi,
};

