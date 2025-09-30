class ProgressTracker {
  constructor() {
    this.progress = 0;
    this.maxProgress = 100;
    this.progressBar = null;
    this.progressText = null;
    this.loadingSteps = [
      { step: 10, textKey: 'loadingInitializing' },
      { step: 25, textKey: 'loadingModules' },
      { step: 40, textKey: 'loadingConnecting' },
      { step: 60, textKey: 'loadingData' },
      { step: 80, textKey: 'loadingRendering' },
      { step: 95, textKey: 'loadingFinalizing' },
      { step: 100, textKey: 'loadingComplete' }
    ];
    this.currentStepIndex = 0;
    this.translations = null;
    this.init();
  }

  init() {
    // Load translations first
    this.loadTranslations();
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupElements());
    } else {
      this.setupElements();
    }
  }

  loadTranslations() {
    // Use hardcoded English strings for loading process
    this.translations = {
      loadingInitializing: 'Initializing...',
      loadingModules: 'Loading modules...',
      loadingConnecting: 'Connecting to server...',
      loadingData: 'Loading data...',
      loadingRendering: 'Rendering interface...',
      loadingFinalizing: 'Finalizing...',
      loadingComplete: 'Complete!',
      loadingStarting: 'Starting...'
    };
  }

  getTranslation(key) {
    return this.translations?.[key] || key;
  }

  setupElements() {
    this.progressBar = document.getElementById('progressBar');
    this.progressText = document.getElementById('progressText');
    
    if (this.progressBar && this.progressText) {
      this.startProgress();
    }
  }

  startProgress() {
    // Start with initial progress
    this.updateProgress(5, this.getTranslation('loadingStarting'));
    
    // Simulate loading steps
    this.simulateLoading();
  }

  simulateLoading() {
    const step = this.loadingSteps[this.currentStepIndex];
    if (step) {
      this.updateProgress(step.step, this.getTranslation(step.textKey));
      this.currentStepIndex++;
      
      // Random delay between steps (100-500ms)
      const delay = Math.random() * 400 + 100;
      setTimeout(() => this.simulateLoading(), delay);
    }
  }

  updateProgress(progress, text) {
    this.progress = Math.min(progress, this.maxProgress);
    
    if (this.progressBar) {
      this.progressBar.style.width = `${this.progress}%`;
    }
    
    if (this.progressText) {
      this.progressText.textContent = text;
    }
  }

  setProgress(progress, text) {
    this.updateProgress(progress, text);
  }

  complete() {
    this.updateProgress(100, this.getTranslation('loadingComplete'));
    // Hide loader after a short delay
    setTimeout(() => {
      const loader = document.querySelector('.loader');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
          loader.style.display = 'none';
        }, 500);
      }
    }, 300);
  }
}

// Create global instance
window.progressTracker = new ProgressTracker();

export default ProgressTracker;
