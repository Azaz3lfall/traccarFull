// Initialize the global build status manager
// This should be imported early in your app to start the polling system

import getBuildStatusManager from './buildStatusManager';

// Initialize the singleton instance
const buildStatusManager = getBuildStatusManager();

console.log('🚀 Build Status Manager initialized');

export default buildStatusManager;
