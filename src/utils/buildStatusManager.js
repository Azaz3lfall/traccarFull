// Global Build Status Manager
// Handles polling for all reseller builds independently of UI components

class BuildStatusManager {
  constructor() {
    this.activePolls = new Map(); // Map of pollId -> { intervalId, resellerId, buildType }
    this.pollInterval = 30000; // 30 seconds
    this.maxPolls = 120; // 60 minutes
    this.isRunning = false;
    
    // Start the global polling system
    this.startGlobalPolling();
    
    // Listen for localStorage changes to clean up completed builds
    this.setupLocalStorageListener();
  }

  // Start global polling system
  startGlobalPolling() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Poll every 30 seconds
    this.globalInterval = setInterval(() => {
      this.pollAllActiveBuilds();
    }, this.pollInterval);
  }

  // Stop global polling system
  stopGlobalPolling() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.globalInterval) {
      clearInterval(this.globalInterval);
      this.globalInterval = null;
    }
    
    // Clear all active polls
    this.activePolls.forEach((poll, pollId) => {
      clearTimeout(poll.intervalId);
    });
    this.activePolls.clear();
  }

  // Poll all active builds
  async pollAllActiveBuilds() {
    try {
      const buildStates = this.getBuildStatesFromStorage();
      const activeBuilds = this.getActiveBuilds(buildStates);
      
      if (activeBuilds.length === 0) {
        return;
      }
      
      
      // Poll all active builds in parallel
      const pollPromises = activeBuilds.map(build => this.pollSingleBuild(build));
      await Promise.allSettled(pollPromises);
      
    } catch (error) {
      console.error('❌ Error in global polling:', error);
    }
  }

  // Get active builds from localStorage
  getActiveBuilds(buildStates) {
    const activeBuilds = [];
    
    for (const [key, status] of Object.entries(buildStates)) {
      if (status === 'BUILDING' || status === 'PARTIAL_BUILDED') {
        const [resellerId, buildType] = key.split('_');
        if (resellerId && buildType) {
          activeBuilds.push({ resellerId, buildType, key });
        }
      }
    }
    
    return activeBuilds;
  }

  // Poll a single build
  async pollSingleBuild(build) {
    try {
      const { resellerId, buildType, key } = build;
      
      // Get reseller data from localStorage or make API call
      const resellerData = await this.getResellerData(resellerId);
      if (!resellerData) {
        return;
      }
      
      // Check build status via API
      const status = await this.checkBuildStatus(resellerData, buildType);
      
      if (status.success) {
        const serverStatus = status.data.buildStatus;
        
        // Update localStorage with server status
        this.updateBuildStateInStorage(key, serverStatus);
        
        // If build is complete, we don't need to poll this one anymore
        if (serverStatus === 'BUILDED' || serverStatus === 'BUILD_ERROR') {
        }
      } else {
        console.error(`❌ Failed to check status for ${key}:`, status.error);
      }
      
    } catch (error) {
      console.error(`❌ Error polling build ${build.key}:`, error);
    }
  }

  // Get reseller data (you'll need to implement this based on your data structure)
  async getResellerData(resellerId) {
    try {
      // Try to get from localStorage first
      const resellersData = localStorage.getItem('resellersData');
      if (resellersData) {
        const resellers = JSON.parse(resellersData);
        const reseller = resellers.find(r => r.appUrl === resellerId);
        if (reseller) return reseller;
      }
      
      // If not found in localStorage, you might need to fetch from API
      // This depends on your data structure
      return null;
      
    } catch (error) {
      console.error(`❌ Error getting reseller data for ${resellerId}:`, error);
      return null;
    }
  }

  // Check build status via API
  async checkBuildStatus(reseller, buildType) {
    try {
      const statusUrl = this.buildStatusUrl(reseller, buildType);
      
      const response = await fetch(statusUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const status = await response.json();
      return status;
      
    } catch (error) {
      console.error(`❌ Error checking build status:`, error);
      return { success: false, error: error.message };
    }
  }

  // Build status URL
  buildStatusUrl(reseller, buildType) {
    // You'll need to import your config or define the base URL
    const baseUrl = window.location.origin; // or your API base URL
    const encodedAppUrl = encodeURIComponent(reseller.appUrl);
    const parentUserId = reseller.parentUserId;
    const currentDomain = reseller.currentDomain || 'gps';
    
    return `${baseUrl}/api/resellers/build/status/${encodedAppUrl}?parentUserId=${parentUserId}&currentDomain=${currentDomain}&buildType=${buildType}`;
  }

  // Update build state in localStorage
  updateBuildStateInStorage(key, state) {
    try {
      const buildStates = this.getBuildStatesFromStorage();
      buildStates[key] = state;
      localStorage.setItem('resellerBuildStates', JSON.stringify(buildStates));
    } catch (error) {
      console.error(`❌ Error updating build state in storage:`, error);
    }
  }

  // Get build states from localStorage
  getBuildStatesFromStorage() {
    try {
      const buildStates = localStorage.getItem('resellerBuildStates');
      return buildStates ? JSON.parse(buildStates) : {};
    } catch (error) {
      console.error('❌ Error reading build states from storage:', error);
      return {};
    }
  }

  // Setup localStorage listener to clean up completed builds
  setupLocalStorageListener() {
    // Listen for changes to resellerBuildStates
    const originalSetItem = localStorage.setItem;
    const self = this;
    
    localStorage.setItem = function(key, value) {
      originalSetItem.apply(this, arguments);
      
      if (key === 'resellerBuildStates') {
        try {
          const buildStates = JSON.parse(value);
          self.cleanupCompletedBuilds(buildStates);
        } catch (error) {
          console.error('❌ Error parsing build states in listener:', error);
        }
      }
    };
  }

  // Clean up completed builds from active polls
  cleanupCompletedBuilds(buildStates) {
    const completedBuilds = [];
    
    for (const [key, status] of Object.entries(buildStates)) {
      if (status === 'BUILDED' || status === 'BUILD_ERROR') {
        completedBuilds.push(key);
      }
    }
    
    if (completedBuilds.length > 0) {
    }
  }

  // Add a build to polling (called when starting a new build)
  addBuildToPolling(resellerId, buildType) {
    const key = `${resellerId}_${buildType}`;
    
    // The build will be picked up by the next global poll cycle
    // No need to start individual polling
  }

  // Remove a build from polling (called when build completes)
  removeBuildFromPolling(resellerId, buildType) {
    const key = `${resellerId}_${buildType}`;
    
    // The build will be automatically excluded from future polls
    // when its status is not BUILDING or PARTIAL_BUILDED
  }
}

// Create global instance only once
let buildStatusManager = null;

// Get or create the singleton instance
const getBuildStatusManager = () => {
  if (!buildStatusManager) {
    buildStatusManager = new BuildStatusManager();
  }
  return buildStatusManager;
};

// Export the getter function
export default getBuildStatusManager;
