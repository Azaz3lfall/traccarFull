// Resellers Server Configuration
// This file centralizes the resellersServer URL configuration

const RESELLERS_SERVER_URL = process.env.REACT_APP_RESELLERS_SERVER_URL || 'http://localhost:3333';

export default {
  RESELLERS_SERVER_URL,
  
  // API Endpoints
  ENDPOINTS: {
    LIST: `${RESELLERS_SERVER_URL}/api/resellers/list`,
    CREATE: `${RESELLERS_SERVER_URL}/api/resellers`,
    UPDATE: (id) => `${RESELLERS_SERVER_URL}/api/resellers/${id}`,
    DELETE: `${RESELLERS_SERVER_URL}/api/resellers/delete`,
    UPLOAD: `${RESELLERS_SERVER_URL}/api/upload`,
    USERS: `${RESELLERS_SERVER_URL}/api/users`,
  }
};

// Usage:
// import resellersConfig from '../config/resellersConfig';
// const response = await fetch(resellersConfig.ENDPOINTS.LIST, { ... });
