class ProgressTracker {
  constructor() {
    this.progress = 0;
    this.maxProgress = 100;
    this.progressBar = null;
    this.progressText = null;
    this.loadingSteps = [
      { step: 10, text: 'Initializing...' },
      { step: 25, text: 'Loading modules...' },
      { step: 40, text: 'Connecting to server...' },
      { step: 60, text: 'Loading data...' },
      { step: 80, text: 'Rendering interface...' },
      { step: 95, text: 'Finalizing...' },
      { step: 100, text: 'Complete!' }
    ];
    this.currentStepIndex = 0;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupElements());
    } else {
      this.setupElements();
    }
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
    this.updateProgress(5, 'Starting...');
    
    // Simulate loading steps
    this.simulateLoading();
  }

  simulateLoading() {
    const step = this.loadingSteps[this.currentStepIndex];
    if (step) {
      this.updateProgress(step.step, step.text);
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
    this.updateProgress(100, 'Complete!');
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
