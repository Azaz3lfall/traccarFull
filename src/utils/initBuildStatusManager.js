// Initialize the global build status manager
// This should be imported early in your app to start the polling system

import getBuildStatusManager from './buildStatusManager';

// Initialize the singleton instance
const buildStatusManager = getBuildStatusManager();


export default buildStatusManager;
