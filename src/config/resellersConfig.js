// Resellers Server Configuration
// This file centralizes the resellersServer URL configuration

// Use environment variable or default to the resellers server domain
// In development, set VITE_RESELLERS_SERVER_URL=http://localhost:3333
// In production, uses the separate resellers domain
// const RESELLERS_SERVER_URL = import.meta.env.VITE_RESELLERS_SERVER_URL || 'https://resellers.codeartisan.cloud';
const RESELLERS_SERVER_URL = import.meta.env.VITE_RESELLERS_SERVER_URL || 'http://localhost:3333';

export default {
  RESELLERS_SERVER_URL,
  
  // API Endpoints (resellers-specific only)
  ENDPOINTS: {
    LIST: `${RESELLERS_SERVER_URL}/api/resellers/list`,
    CREATE: `${RESELLERS_SERVER_URL}/api/resellers`,
    UPDATE: (id) => `${RESELLERS_SERVER_URL}/api/resellers/${id}`,
    DELETE: `${RESELLERS_SERVER_URL}/api/resellers/delete`,
    UPLOAD: `${RESELLERS_SERVER_URL}/api/upload`,
    CHECK: `${RESELLERS_SERVER_URL}/api/reseller-check`,
    CHECK_DOMAIN: `${RESELLERS_SERVER_URL}/api/check-domain`,
    LOGS: `${RESELLERS_SERVER_URL}/api/resellers/logs`,
    LOGS_DELETE: `${RESELLERS_SERVER_URL}/api/resellers/logs/delete`,
    BUILD: `${RESELLERS_SERVER_URL}/api/resellers/build`,
  }
};

// Usage:
// import resellersConfig from '../config/resellersConfig';
// const response = await fetch(resellersConfig.ENDPOINTS.LIST, { ... });
