# Popover State Management

This directory contains custom hooks for managing application state, including centralized popover management.

## usePopoverState Hook

The `usePopoverState` hook provides centralized management for popover states, ensuring only one popover is open at a time across the entire application.

### Features

- **Single Popover Rule**: Only one popover can be open at a time
- **Automatic Closing**: Opening a new popover automatically closes any currently open popover
- **Redux Integration**: Uses Redux for state management and persistence
- **Easy Integration**: Simple hook interface for any popover component

### Usage

```javascript
import usePopoverState from '../hooks/usePopoverState';

const MyPopover = ({ isVisible, onClose }) => {
  // Use the hook with a unique popover name
  const { isOpen, currentOpenPopover, openPopover, closePopover, togglePopover } = usePopoverState(
    'my-popover-name', // Unique identifier
    isVisible,         // Whether this popover should be visible
    onClose           // Callback to close this popover
  );

  // The hook automatically handles:
  // - Closing other popovers when this one opens
  // - Closing this popover when another opens
  // - Syncing with Redux state

  return (
    <div>
      {/* Your popover content */}
    </div>
  );
};
```

### Available Popover Names

Use these consistent names for different popovers:

- `'devices'` - Device list popover
- `'users'` - Users management popover
- `'groups'` - Groups management popover
- `'calendars'` - Calendars management popover
- `'drivers'` - Drivers management popover
- `'maintenance'` - Maintenance popover
- `'geofences'` - Geofences popover
- `'reports'` - Reports popover
- `'settings'` - Settings popover
- `'account'` - Account settings popover
- `'notifications'` - Notifications popover
- `'resellers'` - Resellers panel popover
- `'announcements'` - Announcements popover
- `'saved-commands'` - Saved commands popover
- `'calculated-attributes'` - Calculated attributes popover

### Hook API

```javascript
const {
  isOpen,              // boolean - whether this popover is currently open
  currentOpenPopover,  // string|null - name of currently open popover
  openPopover,         // function - manually open this popover
  closePopover,        // function - manually close this popover
  togglePopover,       // function - toggle this popover open/closed
  closeAllPopovers,    // function - close all popovers
} = usePopoverState(popoverName, isVisible, onClose);
```

### Redux Actions

You can also use Redux actions directly if needed:

```javascript
import { useDispatch } from 'react-redux';
import { popoverActions } from '../store';

const dispatch = useDispatch();

// Open a specific popover
dispatch(popoverActions.openPopover('devices'));

// Close a specific popover
dispatch(popoverActions.closePopover('devices'));

// Toggle a popover
dispatch(popoverActions.togglePopover('devices'));

// Close all popovers
dispatch(popoverActions.closeAllPopovers());
```

### Implementation Example

Here's how to implement this pattern in a new popover component:

```javascript
import React from 'react';
import usePopoverState from '../hooks/usePopoverState';

const FloatingUsersPopover = ({ isVisible, onClose }) => {
  const { isOpen } = usePopoverState('users', isVisible, onClose);

  if (!isVisible) return null;

  return (
    <div className="popover-container">
      {/* Your popover content */}
    </div>
  );
};

export default FloatingUsersPopover;
```

This pattern ensures a consistent user experience where only one popover is open at a time, preventing UI conflicts and improving usability.
