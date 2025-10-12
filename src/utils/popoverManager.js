/**
 * Simple popover manager using custom events
 * Much more performant than Redux for this use case
 */

class PopoverManager {
  constructor() {
    this.currentPopover = null;
    this.listeners = new Set();
  }

  // Open a popover (closes any existing one)
  openPopover(popoverName) {
    if (this.currentPopover === popoverName) {
      return; // Already open
    }

    // Close current popover if exists
    if (this.currentPopover) {
      this.notifyListeners('close', this.currentPopover);
    }

    // Open new popover
    this.currentPopover = popoverName;
    this.notifyListeners('open', popoverName);
  }

  // Close a specific popover
  closePopover(popoverName) {
    if (this.currentPopover === popoverName) {
      this.currentPopover = null;
      this.notifyListeners('close', popoverName);
    }
  }

  // Close all popovers
  closeAllPopovers() {
    if (this.currentPopover) {
      const popoverToClose = this.currentPopover;
      this.currentPopover = null;
      this.notifyListeners('close', popoverToClose);
    }
  }

  // Toggle a popover
  togglePopover(popoverName) {
    if (this.currentPopover === popoverName) {
      this.closePopover(popoverName);
    } else {
      this.openPopover(popoverName);
    }
  }

  // Get current popover
  getCurrentPopover() {
    return this.currentPopover;
  }

  // Check if a popover is open
  isPopoverOpen(popoverName) {
    return this.currentPopover === popoverName;
  }

  // Subscribe to popover events
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(action, popoverName) {
    this.listeners.forEach(callback => {
      try {
        callback(action, popoverName);
      } catch (error) {
        console.error('Error in popover listener:', error);
      }
    });
  }
}

// Create singleton instance
const popoverManager = new PopoverManager();

export default popoverManager;
