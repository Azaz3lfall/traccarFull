// Async localStorage utility for better error handling and consistency
export const localStorageAsync = {
  // Get item from localStorage
  getItem: async (key) => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting localStorage item ${key}:`, error);
      return null;
    }
  },

  // Set item in localStorage
  setItem: async (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting localStorage item ${key}:`, error);
      return false;
    }
  },

  // Remove item from localStorage
  removeItem: async (key) => {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage item ${key}:`, error);
      return false;
    }
  },

  // Check if item exists in localStorage
  hasItem: async (key) => {
    try {
      return window.localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(`Error checking localStorage item ${key}:`, error);
      return false;
    }
  }
};

export default localStorageAsync;
