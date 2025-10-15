// Simple Build Status Manager
// Uses localStorage and a single global timer - no multiple instances!

class SimpleBuildStatusManager {
  constructor() {
    this.pollInterval = 30000; // 30 seconds
    this.maxPolls = 120; // 60 minutes
    this.globalTimer = null;
    this.isRunning = false;
    
    console.log('🏗️ SimpleBuildStatusManager constructor called');
    
    // Only start if not already running
    if (!window.buildStatusManagerRunning) {
      console.log('🚀 Starting build status manager for the first time');
      this.start();
      window.buildStatusManagerRunning = true;
    } else {
      console.log('⚠️ Build status manager already running, skipping initialization');
    }
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Build status polling already running');
      return;
    }
    
    this.isRunning = true;
    console.log('🚀 Starting simple build status polling');
    
    // Poll every 30 seconds
    this.globalTimer = setInterval(() => {
      console.log('⏰ Polling timer triggered');
      this.pollActiveBuilds();
    }, this.pollInterval);
    
    // Do an initial poll
    setTimeout(() => {
      this.pollActiveBuilds();
    }, 1000);
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('🛑 Stopping build status polling');
    
    if (this.globalTimer) {
      clearInterval(this.globalTimer);
      this.globalTimer = null;
    }
    
    window.buildStatusManagerRunning = false;
  }

  async pollActiveBuilds() {
    try {
      const buildStates = this.getBuildStates();
      const activeBuilds = this.getActiveBuilds(buildStates);
      
      if (activeBuilds.length === 0) {
        console.log('📊 No active builds to poll');
        return;
      }
      
      console.log(`🔄 Polling ${activeBuilds.length} active builds:`, activeBuilds.map(b => b.key));
      
      // Poll all active builds in parallel
      const pollPromises = activeBuilds.map(build => this.pollSingleBuild(build));
      await Promise.allSettled(pollPromises);
      
    } catch (error) {
      console.error('❌ Error in polling:', error);
    }
  }

  getActiveBuilds(buildStates) {
    const activeBuilds = [];
    
    for (const [key, buildData] of Object.entries(buildStates)) {
      // Handle both old format (string) and new format (object)
      let status;
      if (typeof buildData === 'string') {
        status = buildData;
      } else if (buildData && typeof buildData === 'object') {
        status = buildData.status;
      } else {
        continue;
      }
      
      if (status === 'BUILDING' || status === 'PARTIAL_BUILDED') {
        const [resellerId, buildType] = key.split('_');
        if (resellerId && buildType) {
          activeBuilds.push({ resellerId, buildType, key });
        }
      }
    }
    
    return activeBuilds;
  }

  async pollSingleBuild(build) {
    try {
      const { resellerId, buildType, key } = build;
      
      // Get reseller data from localStorage
      const resellerData = await this.getResellerData(resellerId, buildType);
      if (!resellerData) {
        console.log(`⚠️ Reseller data not found for ${resellerId}_${buildType}`);
        return;
      }
      
      // Check build status via API
      const status = await this.checkBuildStatus(resellerData, buildType);
      
      if (status.success) {
        const serverStatus = status.data.buildStatus;
        console.log(`📊 Build status for ${key}: ${serverStatus}`);
        
        // Update localStorage with server status
        this.updateBuildState(key, serverStatus);
        
        // Also trigger a React state update if possible
        if (window.updateReactBuildState) {
          window.updateReactBuildState(key, serverStatus);
        }
      } else {
        console.error(`❌ Failed to check status for ${key}:`, status.error);
      }
      
    } catch (error) {
      console.error(`❌ Error polling build ${build.key}:`, error);
    }
  }

  async getResellerData(resellerId, buildType) {
    try {
      // Get from unified build states
      const buildStates = localStorage.getItem('resellerBuildStates');
      if (buildStates) {
        const data = JSON.parse(buildStates);
        const key = `${resellerId}_${buildType}`;
        const buildData = data[key];
        if (buildData && buildData.resellerData) {
          console.log(`✅ Found reseller data for ${key}:`, buildData.resellerData);
          return buildData.resellerData;
        }
      }
      
      console.log(`⚠️ Reseller data not found for ${resellerId}_${buildType}`);
      return null;
    } catch (error) {
      console.error(`❌ Error getting reseller data:`, error);
      return null;
    }
  }

  async checkBuildStatus(reseller, buildType) {
    try {
      const baseUrl = window.location.origin;
      const encodedAppUrl = encodeURIComponent(reseller.appUrl);
      const parentUserId = reseller.parentUserId;
      const currentDomain = reseller.currentDomain || 'gps';
      
      const statusUrl = `${baseUrl}/api/resellers/build/status/${encodedAppUrl}?parentUserId=${parentUserId}&currentDomain=${currentDomain}&buildType=${buildType}`;
      
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

  updateBuildState(key, state) {
    try {
      const buildStates = this.getBuildStates();
      buildStates[key] = state;
      localStorage.setItem('resellerBuildStates', JSON.stringify(buildStates));
      console.log(`💾 Updated build state: ${key} = ${state}`);
    } catch (error) {
      console.error(`❌ Error updating build state:`, error);
    }
  }

  getBuildStates() {
    try {
      const buildStates = localStorage.getItem('resellerBuildStates');
      return buildStates ? JSON.parse(buildStates) : {};
    } catch (error) {
      console.error('❌ Error reading build states:', error);
      return {};
    }
  }

  addBuildToPolling(resellerId, buildType) {
    const key = `${resellerId}_${buildType}`;
    console.log(`➕ Build ${key} will be polled automatically`);
    
    // Force an immediate poll to check this build
    setTimeout(() => {
      console.log(`🔄 Force polling build ${key}`);
      this.pollActiveBuilds();
    }, 2000);
  }

}

// Create singleton instance
let instance = null;

const getInstance = () => {
  if (!instance) {
    instance = new SimpleBuildStatusManager();
  }
  return instance;
};

export default getInstance;
