import { useEffect, useState } from 'react';
import popoverManager from '../utils/popoverManager';

/**
 * Custom hook for managing popover state with centralized control
 * Ensures only one popover is open at a time
 * Much more performant than Redux approach
 * 
 * @param {string} popoverName - Unique name for this popover
 * @param {boolean} isVisible - Whether this popover should be visible
 * @param {function} onClose - Callback to close this popover
 * @returns {object} - Popover state and utilities
 */
export const usePopoverState = (popoverName, isVisible, onClose) => {
  const [currentPopover, setCurrentPopover] = useState(popoverManager.getCurrentPopover());
  
  // Handle popover state changes
  useEffect(() => {
    if (isVisible) {
      // Open this popover (will automatically close others)
      popoverManager.openPopover(popoverName);
    } else if (popoverManager.isPopoverOpen(popoverName)) {
      // Close this popover if it's currently open
      popoverManager.closePopover(popoverName);
    }
  }, [isVisible, popoverName]);
  
  // Listen for popover changes
  useEffect(() => {
    const unsubscribe = popoverManager.subscribe((action, changedPopoverName) => {
      const newCurrentPopover = popoverManager.getCurrentPopover();
      setCurrentPopover(newCurrentPopover);
      
      // If another popover opened, close this one
      if (action === 'open' && changedPopoverName !== popoverName && isVisible) {
        onClose();
      }
    });
    
    return unsubscribe;
  }, [popoverName, isVisible, onClose]);
  
  // Utility functions
  const openPopover = () => {
    popoverManager.openPopover(popoverName);
  };
  
  const closePopover = () => {
    popoverManager.closePopover(popoverName);
  };
  
  const togglePopover = () => {
    popoverManager.togglePopover(popoverName);
  };
  
  const closeAllPopovers = () => {
    popoverManager.closeAllPopovers();
  };
  
  return {
    isOpen: currentPopover === popoverName,
    currentOpenPopover: currentPopover,
    openPopover,
    closePopover,
    togglePopover,
    closeAllPopovers,
  };
};

export default usePopoverState;
