// API Configuration
const API_CONFIG = {
  // Development
  development: {
    baseURL: 'https://rast.rastreadorautoram.com.br:8082',
    wsURL: 'wss://rast.rastreadorautoram.com.br:8082',
  },
  // Production
  production: {
    baseURL: 'https://rast.rastreadorautoram.com.br:8082',
    wsURL: 'wss://rast.rastreadorautoram.com.br:8082',
  }
};

const isDevelopment = import.meta.env.DEV;
const config = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

export const API_BASE_URL = config.baseURL;
export const WS_BASE_URL = config.wsURL;

// Helper function to get full API URL
export const getApiUrl = (path) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

// Helper function to get WebSocket URL
export const getWsUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${WS_BASE_URL}/${cleanPath}`;
};

