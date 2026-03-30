import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

const adminUser = process.env.TRACCAR_ADMIN_USER || process.env.TRACCAR_USER || process.env.TRACCAR_EMAIL;
const adminPass = process.env.TRACCAR_ADMIN_PASS || process.env.TRACCAR_ADMIN_PASSWORD || process.env.TRACCAR_PASSWORD;

const traccarApi = axios.create({
  baseURL: process.env.TRACCAR_API_URL,
  auth: {
    username: (adminUser || '').trim(),
    password: (adminPass || '').trim(),
  },
});

export const getUsers = async () => {
  try {
    const response = await traccarApi.get('/api/users');
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const fallback = await traccarApi.get('/users');
      return fallback.data;
    }
    throw err;
  }
};

export const createUser = async (userData) => {
  const response = await traccarApi.post('/api/users', userData);
  return response.data;
};

export const getDevices = async () => {
  const response = await traccarApi.get('/api/devices');
  return response.data;
};

export const checkImeiExists = async (uniqueId) => {
  try {
    const response = await traccarApi.get(`/api/devices?uniqueId=${uniqueId}`);
    return response.data.length > 0 ? response.data[0] : null;
  } catch (error) {
    return null;
  }
};

export const createDevice = async (name, uniqueId) => {
  const response = await traccarApi.post('/api/devices', {
    name,
    uniqueId,
  });
  return response.data;
};

export const linkDeviceToUser = async (userId, deviceId) => {
  const response = await traccarApi.post('/api/permissions', {
    userId,
    deviceId,
  });
  return response.data;
};

export const authenticate = async (email, password) => {
  try {
    const params = new URLSearchParams();
    params.append('email', email);
    params.append('password', password);

    const response = await axios.post(`${process.env.TRACCAR_API_URL}/api/session`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  } catch (error) {
    try {
      const response = await axios.post(`${process.env.TRACCAR_API_URL}/api/session`, { email, password });
      return response.data;
    } catch (innerError) {
      throw new Error('Falha na autenticação Traccar (Verifique credenciais)');
    }
  }
};
