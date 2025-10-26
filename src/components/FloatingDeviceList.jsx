import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { devicesActions } from '../store';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import { useManager } from '../common/util/permissions';
import { formatStatus, formatSpeed, formatCoordinate } from '../common/util/formatter';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { prefixString } from '../common/util/stringUtils';
import { defaultTimeFilterOptions, getTimeFilterCounts } from '../common/util/timeFilter';
import EngineIcon from '../resources/images/data/engine.svg?react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { 
  Search, 
  Filter, 
  Battery, 
  AlertTriangle,
  Gauge,
  Check,
  ChevronDown,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { PiMagicWand } from 'react-icons/pi';
import { BsCloudArrowUp } from 'react-icons/bs';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { TextField, FormControl, InputLabel, Select, MenuItem, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';

dayjs.extend(relativeTime);


const FloatingDeviceList = ({ 
  filteredDevices, 
  positions, 
  keyword, 
  setKeyword, 
  filter, 
  setFilter, 
  filterSort, 
  setFilterSort, 
  filterMap, 
  setFilterMap,
  desktop,
  isMenuExpanded,
  isVisible,
  geofencesPopoverVisible,
  onDrawerOpen
}) => {
  
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const t = useTranslation();
  const colors = useThemeColors();
  const manager = useManager();
  
  const groups = useSelector((state) => state.groups.items || {});
  const devices = useSelector((state) => state.devices.items || {});
  const geofences = useSelector((state) => state.geofences?.items || {});
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  
  const [showFilters, setShowFilters] = useState(false);
  const [showWandModal, setShowWandModal] = useState(false);
  const [smartLinkSelectedDeviceIds, setSmartLinkSelectedDeviceIds] = useState([]);
  const [smartLinkSelectedGeofenceIds, setSmartLinkSelectedGeofenceIds] = useState([]);
  const [smartLinkSelectedGroupIds, setSmartLinkSelectedGroupIds] = useState([]);
  const [smartLinkSelectedNotificationIds, setSmartLinkSelectedNotificationIds] = useState([]);
  const [smartLinkSelectedCalendarIds, setSmartLinkSelectedCalendarIds] = useState([]);
  const [smartLinkUserSelectedCalendarIds, setSmartLinkUserSelectedCalendarIds] = useState([]);
  const [smartLinkRecurrence, setSmartLinkRecurrence] = useState('WEEKLY');
  const [smartLinkRecurrenceDropdownOpen, setSmartLinkRecurrenceDropdownOpen] = useState(false);

  const [smartLinkDays, setSmartLinkDays] = useState([]);
  const [smartLinkDaysDropdownOpen, setSmartLinkDaysDropdownOpen] = useState(false);
  const [smartLinkTimeRanges, setSmartLinkTimeRanges] = useState({
    enabled: false,
    periods: [
      { enabled: false, name: 'Period 1', startTime: '08:00', endTime: '12:00' },
      { enabled: false, name: 'Period 2', startTime: '14:00', endTime: '18:00' }
    ]
  });
  
  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  
  const showSnackbar = (message, severity = 'error') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const hideSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Reset SmartLink selections
  const resetSmartLinkSelections = () => {
    setSmartLinkSelectedDeviceIds([]);
    setSmartLinkSelectedGeofenceIds([]);
    setSmartLinkSelectedGroupIds([]);
    setSmartLinkSelectedNotificationIds([]);
    setSmartLinkSelectedCalendarIds([]);
    setSmartLinkUserSelectedCalendarIds([]);
  };

  // SmartLink save validation
  const validateSmartLinkSave = () => {
    // Check if at least one device is selected
    if (smartLinkSelectedDeviceIds.length === 0) {
      showSnackbar('Please select at least one ' + t('sharedDevice').toLowerCase(), 'error');
      return false;
    }

    // Check for conflicting groups (more than one group selected)
    if (smartLinkSelectedGroupIds.length > 1) {
      showSnackbar('Please select only one ' + t('settingsGroups').toLowerCase(), 'error');
      return false;
    }

    // Check for conflicting calendars (more than one calendar selected)
    if (smartLinkSelectedCalendarIds.length > 1) {
      showSnackbar('Please select only one ' + t('sharedCalendars').toLowerCase(), 'error');
      return false;
    }

    // All validations passed
    return true;
  };

  // Save SmartLink geofences
  const saveSmartLinkGeofences = async () => {
    try {
      const selectedGeofenceIds = smartLinkSelectedGeofenceIds;
      
      // Process each selected device
      for (let i = 0; i < smartLinkSelectedDeviceIds.length; i++) {
        const deviceId = smartLinkSelectedDeviceIds[i];
        const device = devices[deviceId];
        
        if (!device) {
          console.error('Device not found:', deviceId);
          continue;
        }

        // Update progress modal
        const deviceName = device.name ? (device.name.length > 25 ? device.name.substring(0, 25) + '...' : device.name) : `Device ${deviceId}`;
        setSmartLinkProgressModal(prev => ({
          ...prev,
          currentDevice: deviceName,
          currentOperation: `Processing geofence permissions...`,
          completedDevices: i
        }));

        // Get all geofences (both selected and unselected)
        const allGeofences = Object.values(geofences);
        
        // Process each geofence for this device
        for (const geofence of allGeofences) {
          const isGeofenceSelected = selectedGeofenceIds.includes(geofence.id);
          
          // Update progress modal for geofence operation
          const geofenceName = geofence.name ? (geofence.name.length > 20 ? geofence.name.substring(0, 20) + '...' : geofence.name) : 'Unnamed';
          setSmartLinkProgressModal(prev => ({
            ...prev,
            currentOperation: isGeofenceSelected 
              ? `Assigning geofence: ${geofenceName}` 
              : `Removing geofence: ${geofenceName}`
          }));

          const payload = {
            deviceId: deviceId,
            geofenceId: geofence.id
          };

          try {
            if (isGeofenceSelected) {
              // POST to assign geofence permission
              const response = await fetchOrThrow('/api/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              
              if (response.status !== 204) {
                throw new Error(`Failed to assign geofence ${geofence.id} to device ${deviceId}`);
              }
            } else {
              // DELETE to remove geofence permission
              const response = await fetchOrThrow('/api/permissions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              
              if (response.status !== 204) {
                throw new Error(`Failed to remove geofence ${geofence.id} from device ${deviceId}`);
              }
            }
          } catch (error) {
            console.error(`Error processing geofence ${geofence.id} for device ${deviceId}:`, error);
            // Continue with other geofences even if one fails
          }
        }
      }
      
    } catch (error) {
      console.error('Error saving geofences:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  };

  // Save SmartLink notifications
  const saveSmartLinkNotifications = async () => {
    try {
      const selectedNotificationIds = smartLinkSelectedNotificationIds;
      
      // Process each selected device
      for (let i = 0; i < smartLinkSelectedDeviceIds.length; i++) {
        const deviceId = smartLinkSelectedDeviceIds[i];
        const device = devices[deviceId];
        
        if (!device) {
          console.error('Device not found:', deviceId);
          continue;
        }

        // Update progress modal
        const deviceName = device.name ? (device.name.length > 25 ? device.name.substring(0, 25) + '...' : device.name) : `Device ${deviceId}`;
        setSmartLinkProgressModal(prev => ({
          ...prev,
          currentDevice: deviceName,
          currentOperation: `Processing notification permissions...`,
          completedDevices: i
        }));

        // Get all notifications (both selected and unselected)
        const allNotifications = Object.values(smartLinkNotifications);
        
        // Process each notification for this device
        for (const notification of allNotifications) {
          const isNotificationSelected = selectedNotificationIds.includes(notification.id);
          
          // Build notification display text (same as UI does)
          const formatList = (prefix, value) => {
            if (value) {
              return value
                .split(/[, ]+/)
                .filter(Boolean)
                .map((it) => t(prefixString(prefix, it)))
                .join(', ');
            }
            return '';
          };
          
          const notificatorsText = formatList('notificator', notification.notificators);
          const hasCommand = notification.notificators?.includes('command');
          
          // Build single line display
          const displayParts = [];
          
          // Notification type
          if (notification.type) {
            displayParts.push(t(prefixString('event', notification.type)));
          }
          
          // Channels/Notificators
          if (notificatorsText) {
            displayParts.push(notificatorsText);
          }
          
          // Command description (if it's a command notification)
          if (hasCommand && notification.commandId) {
            // Find command description from commands list
            const command = smartLinkCommands?.find(cmd => cmd.id === notification.commandId);
            if (command?.description) {
              displayParts.push(command.description);
            } else {
              displayParts.push(`Command ${notification.commandId}`);
            }
          }
          
          // Always flag
          if (notification.always) {
            displayParts.push('Always active');
          }
          
          const displayText = displayParts.join(' / ') || 'Unnamed';
          const notificationName = displayText.length > 20 ? displayText.substring(0, 20) + '...' : displayText;
          
          setSmartLinkProgressModal(prev => ({
            ...prev,
            currentOperation: isNotificationSelected 
              ? `Assigning notification: ${notificationName}` 
              : `Removing notification: ${notificationName}`
          }));

          const payload = {
            deviceId: deviceId,
            notificationId: notification.id
          };

          try {
            if (isNotificationSelected) {
              // POST to assign notification permission
              const response = await fetchOrThrow('/api/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              
              if (response.status !== 204) {
                throw new Error(`Failed to assign notification ${notification.id} to device ${deviceId}`);
              }
            } else {
              // DELETE to remove notification permission
              const response = await fetchOrThrow('/api/permissions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              
              if (response.status !== 204) {
                throw new Error(`Failed to remove notification ${notification.id} from device ${deviceId}`);
              }
            }
          } catch (error) {
            console.error(`Error processing notification ${notification.id} for device ${deviceId}:`, error);
            // Continue with other notifications even if one fails
          }
        }
      }
      
    } catch (error) {
      console.error('Error saving notifications:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  };

  // Combined save function for groups and geofences
  const saveSmartLinkData = async () => {
    try {
      const totalDevices = smartLinkSelectedDeviceIds.length;
      
      // Open progress modal
      setSmartLinkProgressModal({
        open: true,
        currentDevice: null,
        currentOperation: 'Starting SmartLink configuration...',
        totalDevices: totalDevices,
        completedDevices: 0
      });

      // Step 1: Save groups
      await saveSmartLinkGroups();
      
      // Step 2: Save geofences
      await saveSmartLinkGeofences();

      // Step 3: Save notifications
      await saveSmartLinkNotifications();

      // Final progress update
      setSmartLinkProgressModal(prev => ({
        ...prev,
        currentOperation: 'SmartLink configuration completed!',
        completedDevices: totalDevices
      }));

      // Refresh devices and geofences data immediately after save
      try {
        const devicesResponse = await fetchOrThrow('/api/devices');
        const updatedDevices = await devicesResponse.json();
        
        // Convert devices object to array for Redux action
        const devicesArray = Array.isArray(updatedDevices) ? updatedDevices : Object.values(updatedDevices);
        
        // Update Redux store with fresh device data
        dispatch(devicesActions.update(devicesArray));
        
        // Update deviceGroups state with fresh group assignments
        const newDeviceGroups = {};
        devicesArray.forEach(device => {
          if (device.groupId) {
            newDeviceGroups[device.id] = device.groupId;
          }
        });
        setDeviceGroups(newDeviceGroups);
        
        // Refresh geofences data for selected devices to update green/red indicators
        if (smartLinkSelectedDeviceIds.length > 0) {
          try {
            const geofencesPromises = smartLinkSelectedDeviceIds.map(async (deviceId) => {
              const geofencesResponse = await fetchOrThrow(`/api/geofences?deviceId=${deviceId}`);
              const geofences = await geofencesResponse.json();
              const geofenceIds = Array.isArray(geofences) ? geofences.map(g => g.id) : [];
              return { deviceId, geofenceIds };
            });
            
            const geofencesResults = await Promise.all(geofencesPromises);
            const newDeviceGeofences = {};
            geofencesResults.forEach(({ deviceId, geofenceIds }) => {
              newDeviceGeofences[deviceId] = geofenceIds;
            });
            
            setDeviceGeofences(prev => ({
              ...prev,
              ...newDeviceGeofences
            }));
          } catch (error) {
            console.error('Error refreshing geofences:', error);
          }

          // Refresh notifications data for selected devices to update green/red indicators
          try {
            const notificationsPromises = smartLinkSelectedDeviceIds.map(async (deviceId) => {
              const notificationsResponse = await fetchOrThrow(`/api/notifications?deviceId=${deviceId}`);
              const notifications = await notificationsResponse.json();
              const notificationIds = Array.isArray(notifications) ? notifications.map(n => n.id) : [];
              return { deviceId, notificationIds };
            });
            
            const notificationsResults = await Promise.all(notificationsPromises);
            const newDeviceNotifications = {};
            notificationsResults.forEach(({ deviceId, notificationIds }) => {
              newDeviceNotifications[deviceId] = notificationIds;
            });
            
            setDeviceNotifications(prev => ({
              ...prev,
              ...newDeviceNotifications
            }));
          } catch (error) {
            console.error('Error refreshing notifications:', error);
          }
        }
        
        
        // Also invalidate React Query cache for other components
        queryClient.invalidateQueries(['devices']);
        
        // Force re-render of SmartLink modal to update device indicators
        setSmartLinkRefreshTrigger(prev => prev + 1);
        
      } catch (error) {
        console.error('Error refreshing devices:', error);
      }

      // Close progress modal after a short delay
      setTimeout(() => {
        setSmartLinkProgressModal(prev => ({ ...prev, open: false }));
        showSnackbar(t('sharedSaved') + '!', 'success');
      }, 1000);
      
    } catch (error) {
      console.error('Error saving SmartLink data:', error);
      setSmartLinkProgressModal(prev => ({ ...prev, open: false }));
      showSnackbar('Error saving SmartLink configuration: ' + error.message, 'error');
    }
  };

  // Save SmartLink groups
  const saveSmartLinkGroups = async () => {
    try {
      const groupId = smartLinkSelectedGroupIds.length > 0 ? smartLinkSelectedGroupIds[0] : 0;
      const totalDevices = smartLinkSelectedDeviceIds.length;
      
      // Process each selected device sequentially to show progress
      for (let i = 0; i < smartLinkSelectedDeviceIds.length; i++) {
        const deviceId = smartLinkSelectedDeviceIds[i];
        const device = devices[deviceId];
        
        if (!device) {
          console.error('Device not found:', deviceId);
          continue;
        }

        // Update progress modal
        const deviceName = device.name ? (device.name.length > 25 ? device.name.substring(0, 25) + '...' : device.name) : `Device ${deviceId}`;
        setSmartLinkProgressModal(prev => ({
          ...prev,
          currentDevice: deviceName,
          currentOperation: `Updating group assignment...`,
          completedDevices: i
        }));

        // Create updated device payload with new groupId
        const updatedDevice = {
          ...device,
          groupId: groupId
        };

        // PUT the updated device
        const response = await fetchOrThrow(`/api/devices/${deviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedDevice)
        });

        if (!response.ok) {
          throw new Error(`Failed to update device ${deviceId}`);
        }
      }
      
    } catch (error) {
      console.error('Error saving groups:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  };
  const [smartLinkNotifications, setSmartLinkNotifications] = useState([]);
  const [smartLinkNotificationsLoading, setSmartLinkNotificationsLoading] = useState(false);
  const [smartLinkCalendars, setSmartLinkCalendars] = useState([]);
  const [smartLinkCalendarsLoading, setSmartLinkCalendarsLoading] = useState(false);
  const [smartLinkCommands, setSmartLinkCommands] = useState([]);
  const [smartLinkCommandsLoading, setSmartLinkCommandsLoading] = useState(false);
  const [smartLinkSaveLoading, setSmartLinkSaveLoading] = useState(false);
  const [smartLinkProgressModal, setSmartLinkProgressModal] = useState({
    open: false,
    currentDevice: null,
    currentOperation: '',
    totalDevices: 0,
    completedDevices: 0
  });
  const [smartLinkRefreshTrigger, setSmartLinkRefreshTrigger] = useState(0);

  // Auto-select calendars based on selected notifications
  useEffect(() => {
    if (smartLinkSelectedNotificationIds.length > 0 && smartLinkNotifications.length > 0) {
      const calendarIds = smartLinkSelectedNotificationIds
        .map(notificationId => {
          const notification = smartLinkNotifications.find(n => n.id === notificationId);
          return notification?.calendarId;
        })
        .filter(Boolean);
      
      // Only update if there are calendar IDs and they're different from current selection
      if (calendarIds.length > 0) {
        const uniqueCalendarIds = [...new Set(calendarIds)];
        setSmartLinkSelectedCalendarIds(uniqueCalendarIds);
        // Clear user selection when notifications change to reset conflict state
        setSmartLinkUserSelectedCalendarIds([]);
      }
    } else {
      // Clear calendar selection when no notifications are selected
      setSmartLinkSelectedCalendarIds([]);
      setSmartLinkUserSelectedCalendarIds([]);
    }
  }, [smartLinkSelectedNotificationIds, smartLinkNotifications]);
  
  // Business rules state
  const [deviceGeofences, setDeviceGeofences] = useState({}); // deviceId -> geofenceIds
  const [deviceNotifications, setDeviceNotifications] = useState({}); // deviceId -> notificationIds
  const [deviceGroups, setDeviceGroups] = useState({}); // deviceId -> groupId
  const [debounceTimeout, setDebounceTimeout] = useState(null);
  const [loadingDevices, setLoadingDevices] = useState(new Set()); // Track devices currently loading data
  const [smartLinkCalendarForm, setSmartLinkCalendarForm] = useState({
    name: '',
    from: dayjs().format('YYYY-MM-DDTHH:mm'),
    to: dayjs().add(30, 'years').format('YYYY-MM-DDTHH:mm')
  });
  const [smartLinkActiveTab, setSmartLinkActiveTab] = useState('groups');
  const [showOnMobile, setShowOnMobile] = useState(true);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);
  const [showTimeWindowDropdown, setShowTimeWindowDropdown] = useState(false);
  
  // Simplified key management - only change when showOnMobile changes
  const virtualizerContainerKey = useMemo(() => {
    return `virtualizer-${showOnMobile}`;
  }, [showOnMobile]);
  const filterButtonRef = useRef(null);
  const filterPopupRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const groupsDropdownRef = useRef(null);
  const timeWindowDropdownRef = useRef(null);
  const parentRef = useRef(null);
  

  
  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const speedUnit = useAttributePreference('speedUnit');
  const coordinateFormat = usePreference('coordinateFormat');
  
  const deviceStatusCount = useCallback((status) => {
    if (!devices || typeof devices !== 'object' || devices === null) {
      return 0;
    }
    return Object.values(devices).filter((d) => d.status === status).length;
  }, [devices]);

  // Multi-select helpers
  const toggleStatus = useCallback((status) => {
    setFilter(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status) 
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  }, [setFilter]);

  const toggleGroup = useCallback((groupId) => {
    setFilter(prev => ({
      ...prev,
      groups: prev.groups.includes(groupId) 
        ? prev.groups.filter(g => g !== groupId)
        : [...prev.groups, groupId]
    }));
  }, [setFilter]);
  
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'online': return '#10B981';
      case 'offline': return '#EF4444';
      case 'unknown': return '#F59E0B';
      default: return '#6B7280';
    }
  }, []);
  
  
  const formatLastUpdate = useCallback((device) => {
    if (!device.lastUpdate) {
      return formatStatus(device.status, t);
    }
    
    const now = dayjs();
    const lastUpdate = dayjs(device.lastUpdate);
    const diffMinutes = now.diff(lastUpdate, 'minute');
    
    // For online devices, show time if < 5 minutes, otherwise show status
    if (device.status === 'online') {
      if (diffMinutes < 5) {
        return lastUpdate.fromNow();
      } else {
        return formatStatus(device.status, t);
      }
    }
    
    // For offline/unknown devices, always show time
    return lastUpdate.fromNow();
  }, [t]);
  
  const getBatteryIcon = useCallback((battery) => {
    if (battery === null || battery === undefined) return <Battery className="w-4 h-4" />;
    if (battery > 70) return <Battery className="w-4 h-4 text-green-500" />;
    if (battery > 30) return <Battery className="w-4 h-4 text-yellow-500" />;
    return <Battery className="w-4 h-4 text-red-500" />;
  }, []);
  
  const handleDeviceClick = useCallback((deviceId, event) => {
    event.stopPropagation(); // Prevent event bubbling
    dispatch(devicesActions.selectId(deviceId));
  }, [dispatch]);

  const handleContainerClick = useCallback(() => {
    // Deselect device when clicking on empty areas
    if (selectedDeviceId) {
      dispatch(devicesActions.selectId(null));
    }
  }, [dispatch, selectedDeviceId]);

  // Close filter popup when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      // First check if we're clicking outside the entire filter popup
      if (showFilters && 
          filterButtonRef.current && 
          filterPopupRef.current &&
          !filterButtonRef.current.contains(event.target) &&
          !filterPopupRef.current.contains(event.target)) {
        // Close everything at once
        setShowFilters(false);
        setShowSortDropdown(false);
        setShowStatusDropdown(false);
        setShowGroupsDropdown(false);
        return;
      }
      
      // Only check individual dropdowns if filter popup is still open
      if (showFilters) {
        if (showSortDropdown && 
            sortDropdownRef.current &&
            !sortDropdownRef.current.contains(event.target)) {
          setShowSortDropdown(false);
        }
        
        if (manager && showStatusDropdown && 
            statusDropdownRef.current &&
            !statusDropdownRef.current.contains(event.target)) {
          setShowStatusDropdown(false);
        }
        
        if (showGroupsDropdown && 
            groupsDropdownRef.current &&
            !groupsDropdownRef.current.contains(event.target)) {
          setShowGroupsDropdown(false);
        }
        
        if (showTimeWindowDropdown && 
            timeWindowDropdownRef.current &&
            !timeWindowDropdownRef.current.contains(event.target)) {
          setShowTimeWindowDropdown(false);
        }
      }
    };

    // Use mousedown with a small delay to ensure proper event handling
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters, showSortDropdown, showStatusDropdown, showGroupsDropdown, showTimeWindowDropdown, manager]);

  // Close all dropdowns when filter popup is closed
  React.useEffect(() => {
    if (!showFilters) {
      setShowSortDropdown(false);
      setShowStatusDropdown(false);
      setShowGroupsDropdown(false);
      setShowTimeWindowDropdown(false);
    }
  }, [showFilters]);

  // Cleanup debounce timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  // Hide device list on mobile when device is selected
  React.useEffect(() => {
    if (!desktop && selectedDeviceId) {
      setShowOnMobile(false);
      // Inject dummy text to trigger search and reload
      setKeyword(' ');
    } else if (!desktop && !selectedDeviceId) {
      setShowOnMobile(true);
      // Clear dummy text to trigger reload
      setKeyword('');
    }
  }, [desktop, selectedDeviceId]);
  
  // Helper function to get period name
  const getPeriodName = (index) => {
    const periodName = t('calendarPeriod');
    return periodName && periodName !== 'calendarPeriod' ? `${periodName} ${index}` : `Period ${index}`;
  };

  // Business rules functions
  const fetchDeviceGeofences = async (deviceId) => {
    try {
      const response = await fetchOrThrow(`/api/geofences?deviceId=${deviceId}`);
      const data = await response.json();
      return Array.isArray(data) ? data.map(g => g.id) : [];
    } catch (error) {
      console.error(`Error fetching geofences for device ${deviceId}:`, error);
      return [];
    }
  };

  const fetchDeviceNotifications = async (deviceId) => {
    try {
      const response = await fetchOrThrow(`/api/notifications?deviceId=${deviceId}`);
      const data = await response.json();
      return Array.isArray(data) ? data.map(n => n.id) : [];
    } catch (error) {
      console.error(`Error fetching notifications for device ${deviceId}:`, error);
      return [];
    }
  };

  const updateDeviceBusinessRules = async (selectedDeviceIds) => {
    if (selectedDeviceIds.length === 0) {
      setDeviceGeofences({});
      setDeviceNotifications({});
      setDeviceGroups({});
      // Clear all selections when no devices are selected
      setSmartLinkSelectedGroupIds([]);
      setSmartLinkSelectedGeofenceIds([]);
      setSmartLinkSelectedNotificationIds([]);
      return;
    }

    // Fetch geofences and notifications for all selected devices
    const promises = selectedDeviceIds.map(async (deviceId) => {
      const [geofenceIds, notificationIds] = await Promise.all([
        fetchDeviceGeofences(deviceId),
        fetchDeviceNotifications(deviceId)
      ]);
      
      // Get groupId from device object
      const device = devices[deviceId];
      const groupId = device?.groupId || null;
      
      return {
        deviceId,
        geofenceIds,
        notificationIds,
        groupId
      };
    });

    try {
      const results = await Promise.all(promises);
      
      // Update state
      const newDeviceGeofences = {};
      const newDeviceNotifications = {};
      const newDeviceGroups = {};
      
      results.forEach(({ deviceId, geofenceIds, notificationIds, groupId }) => {
        newDeviceGeofences[deviceId] = geofenceIds;
        newDeviceNotifications[deviceId] = notificationIds;
        newDeviceGroups[deviceId] = groupId;
      });
      
      setDeviceGeofences(newDeviceGeofences);
      setDeviceNotifications(newDeviceNotifications);
      setDeviceGroups(newDeviceGroups);

      // Auto-select groups, geofences, and notifications based on device selection
      updateRelatedSelections(results);
    } catch (error) {
      console.error('Error updating device business rules:', error);
    }
  };

  const updateRelatedSelections = (deviceResults) => {
    // Collect all unique groups, geofences, and notifications from selected devices
    const allGroupIds = new Set();
    const allGeofenceIds = new Set();
    const allNotificationIds = new Set();

    deviceResults.forEach(({ groupId, geofenceIds, notificationIds }) => {
      if (groupId) {
        allGroupIds.add(groupId);
      }
      geofenceIds.forEach(id => allGeofenceIds.add(id));
      notificationIds.forEach(id => allNotificationIds.add(id));
    });

    // Update selections
    setSmartLinkSelectedGroupIds(Array.from(allGroupIds));
    setSmartLinkSelectedGeofenceIds(Array.from(allGeofenceIds));
    setSmartLinkSelectedNotificationIds(Array.from(allNotificationIds));
  };

  // Helper functions to check for partial selections
  const hasPartialGroupSelection = (groupId) => {
    const selectedDeviceIds = smartLinkSelectedDeviceIds;
    if (selectedDeviceIds.length === 0) return false;
    
    const devicesInGroup = selectedDeviceIds.filter(deviceId => deviceGroups[deviceId] === groupId);
    return devicesInGroup.length > 0 && devicesInGroup.length < selectedDeviceIds.length;
  };

  const hasPartialGeofenceSelection = (geofenceId) => {
    const selectedDeviceIds = smartLinkSelectedDeviceIds;
    if (selectedDeviceIds.length === 0) return false;
    
    const devicesInGeofence = selectedDeviceIds.filter(deviceId => 
      deviceGeofences[deviceId]?.includes(geofenceId)
    );
    return devicesInGeofence.length > 0 && devicesInGeofence.length < selectedDeviceIds.length;
  };

  const hasPartialNotificationSelection = (notificationId) => {
    const selectedDeviceIds = smartLinkSelectedDeviceIds;
    if (selectedDeviceIds.length === 0) return false;
    
    const devicesInNotification = selectedDeviceIds.filter(deviceId => 
      deviceNotifications[deviceId]?.includes(notificationId)
    );
    return devicesInNotification.length > 0 && devicesInNotification.length < selectedDeviceIds.length;
  };

  // Debounced device selection handler
  const handleDeviceSelectionChange = (deviceId, isChecked) => {
    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Show loading state immediately for both select and deselect
    setLoadingDevices(prev => new Set([...prev, deviceId]));

    // Update selected devices immediately
    setSmartLinkSelectedDeviceIds((prev) => {
      const newSelection = isChecked 
        ? (prev.includes(deviceId) ? prev : [...prev, deviceId])
        : prev.filter((id) => id !== deviceId);
      
      // Set debounced timeout to update business rules for both select and deselect
      const timeout = setTimeout(async () => {
        await updateDeviceBusinessRules(newSelection);
        // Remove device from loading state after ALL business rules are checked
        setLoadingDevices(prev => {
          const newSet = new Set(prev);
          newSet.delete(deviceId);
          return newSet;
        });
      }, 500);
      
      setDebounceTimeout(timeout);
      
      return newSelection;
    });
  };

  // Functions to manage time range periods
  const addPeriod = () => {
    const newPeriodIndex = smartLinkTimeRanges.periods.length + 1;
    const newPeriod = {
      enabled: true,
      name: getPeriodName(newPeriodIndex),
      startTime: '08:00',
      endTime: '12:00'
    };
    
    setSmartLinkTimeRanges({
      enabled: smartLinkTimeRanges.enabled,
      periods: [...smartLinkTimeRanges.periods.map(p => ({ ...p })), newPeriod]
    });
  };

  const removePeriod = (index) => {
    if (smartLinkTimeRanges.periods.length > 1) {
      const newPeriods = smartLinkTimeRanges.periods.filter((_, i) => i !== index).map(p => ({ ...p }));
      setSmartLinkTimeRanges({
        enabled: smartLinkTimeRanges.enabled,
        periods: newPeriods
      });
    }
  };

  // Calendar helper functions
  const formatCalendarTime = (time) => {
    const tzid = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `TZID=${tzid}:${time.locale('en').format('YYYYMMDDTHHmmss')}`;
  };

  const formatRule = (rule, endTime) => {
    const by = rule.by && rule.by.join(',');
    const untilDate = endTime ? endTime.format('YYYYMMDDTHHmmss') + 'Z' : dayjs().add(10, 'years').format('YYYYMMDDTHHmmss') + 'Z';
    
    switch (rule.frequency) {
      case 'DAILY':
        return `RRULE:FREQ=${rule.frequency};UNTIL=${untilDate}`;
      case 'WEEKLY':
        return `RRULE:FREQ=${rule.frequency};BYDAY=${by || 'SU'};UNTIL=${untilDate}`;
      case 'MONTHLY':
        return `RRULE:FREQ=${rule.frequency};BYMONTHDAY=${by || 1};UNTIL=${untilDate}`;
      default:
        return 'RRULE:FREQ=DAILY;COUNT=1';
    }
  };

  const generateSimpleCalendar = (startTime, endTime, rule) => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Traccar//NONSGML Traccar//EN',
    ];

    // Simple weekly calendar - NO VEVENT blocks, just RRULE
    // This creates a weekly recurrence rule without specific events
    lines.push(formatRule(rule, endTime));

    lines.push('END:VCALENDAR');
    const result = window.btoa(lines.join('\n'));
    return result;
  };

  const generateCalendarWithTimeRanges = (startTime, endTime, rule, timeRanges) => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Traccar//NONSGML Traccar//EN',
    ];


    if (timeRanges && timeRanges.enabled && timeRanges.periods && timeRanges.periods.length > 0) {
      // Generate VEVENT blocks for each enabled time range
      const enabledPeriods = timeRanges.periods.filter(period => period.enabled);
      
      if (enabledPeriods.length > 0) {
        enabledPeriods.forEach((period, index) => {
          if (period.startTime && period.endTime) {
            // Use the base date from startTime and apply the period times
            const baseDate = dayjs(startTime);
            
            // Parse time strings properly
            const [startHour, startMinute] = period.startTime.split(':').map(Number);
            const [endHour, endMinute] = period.endTime.split(':').map(Number);
            
            const periodStart = baseDate.clone().hour(startHour).minute(startMinute).second(0);
            const periodEnd = baseDate.clone().hour(endHour).minute(endMinute).second(0);
            
            if (periodStart.isValid() && periodEnd.isValid()) {
              lines.push(
                'BEGIN:VEVENT',
                `UID:00000000-0000-0000-0000-000000000${100 + index}`,
                `DTSTART;${formatCalendarTime(periodStart)}`,
                `DTEND;${formatCalendarTime(periodEnd)}`,
                formatRule(rule, endTime),
                `SUMMARY:${period.name || getPeriodName(index + 1)}`,
                'END:VEVENT'
              );
            }
          }
        });
      }
    } else {
      // Single VEVENT block for regular calendar
      if (startTime.isValid() && endTime.isValid()) {
        lines.push(
          'BEGIN:VEVENT',
          'UID:00000000-0000-0000-0000-000000000000',
          `DTSTART;${formatCalendarTime(startTime)}`,
          `DTEND;${formatCalendarTime(endTime)}`,
          formatRule(rule, endTime),
          'SUMMARY:Event',
          'END:VEVENT'
        );
      }
    }

    lines.push('END:VCALENDAR');
    const result = window.btoa(lines.join('\n'));
    return result;
  };

  const createCalendar = async () => {
    if (!smartLinkCalendarForm.name.trim()) {
      showSnackbar(t('sharedName') + ' ' + t('sharedRequired'), 'error');
      return;
    }

    if (smartLinkDays.length === 0) {
      showSnackbar(t('calendarDays') + ' ' + t('sharedRequired'), 'error');
      return;
    }

    try {
      const startTime = dayjs(smartLinkCalendarForm.from);
      const endTime = dayjs(smartLinkCalendarForm.to);
      const rule = { frequency: smartLinkRecurrence || 'ONCE', by: smartLinkDays };
      
      
      let calendarData;
      if (smartLinkTimeRanges.enabled === true) {
        calendarData = {
          name: smartLinkCalendarForm.name,
          data: generateCalendarWithTimeRanges(startTime, endTime, rule, smartLinkTimeRanges),
          attributes: {}
        };
      } else {
        calendarData = {
          name: smartLinkCalendarForm.name,
          data: generateSimpleCalendar(startTime, endTime, rule),
          attributes: {}
        };
      }

      const response = await fetchOrThrow('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendarData),
      });

      if (response.ok) {
        // Reset form
        setSmartLinkCalendarForm({
          name: '',
          from: dayjs().format('YYYY-MM-DDTHH:mm'),
          to: dayjs().add(30, 'years').format('YYYY-MM-DDTHH:mm')
        });
        
        // Reset timeranges to default state
        setSmartLinkTimeRanges({
          enabled: false,
          periods: [
            { enabled: false, name: 'Period 1', startTime: '08:00', endTime: '12:00' },
            { enabled: false, name: 'Period 2', startTime: '14:00', endTime: '18:00' }
          ]
        });
        
        // Reset weekdays selection
        setSmartLinkDays([]);
        
        // Reload calendars
        const res = await fetchOrThrow('/api/calendars');
        const data = await res.json();
        setSmartLinkCalendars(Array.isArray(data) ? data : []);
        
        // Invalidate React Query cache for calendars to refresh main calendars popover
        queryClient.invalidateQueries(['calendars']);
        
        showSnackbar(t('sharedCalendar') + ' ' + t('sharedSaved'), 'success');
      } else {
        throw new Error('Failed to create calendar');
      }
    } catch (error) {
      console.error('Error creating calendar:', error);
      showSnackbar(t('sharedError') + ': ' + error.message, 'error');
    }
  };

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (smartLinkRecurrenceDropdownOpen) {
        setSmartLinkRecurrenceDropdownOpen(false);
      }
      if (smartLinkDaysDropdownOpen) {
        setSmartLinkDaysDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [smartLinkRecurrenceDropdownOpen, smartLinkDaysDropdownOpen]);

  // Load notifications and calendars when SmartLink modal opens
  React.useEffect(() => {
    const loadNotifications = async () => {
      try {
        setSmartLinkNotificationsLoading(true);
        const res = await fetchOrThrow('/api/notifications');
        const data = await res.json();
        setSmartLinkNotifications(Array.isArray(data) ? data : []);
      } catch (e) {
        setSmartLinkNotifications([]);
      } finally {
        setSmartLinkNotificationsLoading(false);
      }
    };
    const loadCalendars = async () => {
      try {
        setSmartLinkCalendarsLoading(true);
        const res = await fetchOrThrow('/api/calendars');
        const data = await res.json();
        setSmartLinkCalendars(Array.isArray(data) ? data : []);
      } catch (e) {
        setSmartLinkCalendars([]);
      } finally {
        setSmartLinkCalendarsLoading(false);
      }
    };
    const loadCommands = async () => {
      try {
        setSmartLinkCommandsLoading(true);
        const res = await fetchOrThrow('/api/commands');
        const data = await res.json();
        setSmartLinkCommands(Array.isArray(data) ? data : []);
      } catch (e) {
        setSmartLinkCommands([]);
      } finally {
        setSmartLinkCommandsLoading(false);
      }
    };
    if (showWandModal) {
      loadNotifications();
      loadCalendars();
      loadCommands();
      
      // Reset all selections to clean state
      setSmartLinkSelectedDeviceIds([]);
      setSmartLinkSelectedGeofenceIds([]);
      setSmartLinkSelectedGroupIds([]);
      setSmartLinkSelectedNotificationIds([]);
      setSmartLinkSelectedCalendarIds([]);
      setSmartLinkUserSelectedCalendarIds([]);
      
      // Reset calendar form to default values
      setSmartLinkCalendarForm({
        name: '',
        from: dayjs().format('YYYY-MM-DDTHH:mm'),
        to: dayjs().add(30, 'years').format('YYYY-MM-DDTHH:mm')
      });
      
      // Reset weekdays and timeranges
      setSmartLinkDays([]);
      setSmartLinkTimeRanges({
        enabled: false,
        periods: [
          { enabled: false, name: 'Period 1', startTime: '08:00', endTime: '12:00' },
          { enabled: false, name: 'Period 2', startTime: '14:00', endTime: '18:00' }
        ]
      });
      
      // Reset to first tab (groups)
      setSmartLinkActiveTab('groups');
    }
  }, [showWandModal]);
  

  // Optimized device row component for virtualized rendering
  const DeviceRow = useCallback(({ index, style, data }) => {
    if (!data || !data.devices || !Array.isArray(data.devices) || index >= data.devices.length || !data.devices[index]) {
      return <div style={style} />;
    }
  
    const device = data.devices[index];
    const position = data.positions?.find(p => p.deviceId === device.id) || null;
    const isSelected = data.selectedDeviceId === device.id;
  
    return (
      <div style={style}>
        <motion.div
          style={{
            cursor: 'pointer',
            backgroundColor: colors.surface,
            borderRadius: '12px',
            border: isSelected ? '2px solid #3B82F6' : `1px solid ${colors.border}`,
            boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            margin: '0',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
          onClick={(e) => handleDeviceClick(device.id, e)}
        >
          <Card 
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              boxShadow: 'none',
              margin: '0',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '8px 0px 4px 0px', pointerEvents: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '2px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  paddingLeft: '4px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: colors.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img 
                      style={{ 
                        width: '27px', 
                        height: '27px',
                        objectFit: 'contain'
                      }} 
                      src={mapIcons[mapIconKey(device.category)] || undefined} 
                      alt="" 
                    />
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '10px',
                    color: colors.textSecondary,
                    marginTop: '8px'
                  }}>
                    <Gauge style={{ width: '10px', height: '10px' }} />
                    <span>{position?.speed ? formatSpeed(position.speed, speedUnit, t) : formatSpeed(0, speedUnit, t)}</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                  }}>
                    <h3 style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: colors.textSecondary,
                      margin: 0,
                      lineHeight: '1.2',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: !desktop ? '160px' : '140px',
                      flex: '1'
                    }}>
                      {device[devicePrimary] || 'Unknown'}
                    </h3>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: !desktop ? '3px' : '2px',
                      flexWrap: 'nowrap',
                      justifyContent: 'flex-end',
                      minWidth: !desktop ? '80px' : '60px',
                      paddingRight: '4px'
                    }}>
                      <div style={{
                        width: !desktop ? '19px' : '15px',
                        height: !desktop ? '19px' : '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <AlertTriangle style={{ 
                          width: !desktop ? '17px' : '15px', 
                          height: !desktop ? '17px' : '15px', 
                          color: position?.attributes?.alarm ? '#EF4444' : '#D1D5DB' 
                        }} />
                      </div>
                      <div style={{
                        width: !desktop ? '19px' : '15px',
                        height: !desktop ? '19px' : '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <EngineIcon style={{ 
                          width: !desktop ? '17px' : '15px', 
                          height: !desktop ? '17px' : '15px', 
                          color: position?.attributes?.ignition ? '#10B981' : '#D1D5DB' 
                        }} />
                      </div>
                      <div style={{
                        width: !desktop ? '19px' : '15px',
                        height: !desktop ? '19px' : '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: !desktop ? '9px' : '7px',
                          height: !desktop ? '9px' : '7px',
                          borderRadius: '50%',
                          backgroundColor: position?.attributes?.motion ? '#3B82F6' : '#D1D5DB'
                        }} />
                      </div>
                      <div style={{
                        width: !desktop ? '19px' : '15px',
                        height: !desktop ? '19px' : '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: !desktop ? '13px' : '11px',
                          height: !desktop ? '9px' : '7px',
                          border: `2px solid ${position?.attributes?.door ? '#10B981' : '#D1D5DB'}`,
                          borderRadius: '2px',
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: !desktop ? '4px' : '3px',
                            height: !desktop ? '4px' : '3px',
                            backgroundColor: position?.attributes?.door ? '#10B981' : '#D1D5DB',
                            borderRadius: '50%'
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Status - Only visible to administrators and managers */}
                  {manager && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '2px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(device.status || 'unknown')
                      }} />
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: colors.textSecondary,
                        lineHeight: '1.2',
                        textTransform: 'capitalize'
                      }}>
                        {t(`deviceStatus${(device.status || 'unknown').charAt(0).toUpperCase() + (device.status || 'unknown').slice(1)}`)}
                      </span>
                    </div>
                  )}
                  
                  {/* Last Update */}
                  <div style={{
                    fontSize: '11px',
                    color: colors.textSecondary,
                    lineHeight: '1.2',
                    marginBottom: '2px'
                  }}>
                    {formatLastUpdate(device)}
                  </div>
                </div>
              </div>
              <div style={{
                paddingLeft: '4px',
                paddingRight: '4px'
              }}>
                <p style={{
                  fontSize: '12px',
                  color: colors.textSecondary,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {position?.address || (position?.latitude && position?.longitude ? 
                    `${formatCoordinate('latitude', position.latitude, coordinateFormat)}, ${formatCoordinate('longitude', position.longitude, coordinateFormat)}` : 
                    t('sharedNoData'))}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }, [colors, devicePrimary, getStatusColor, formatLastUpdate, getBatteryIcon, handleDeviceClick, mapIcons, mapIconKey, speedUnit, t, coordinateFormat]);
  // Note: Data is now passed directly to List component for better performance
  
  // Don't render anything if we don't have proper data
  if (!filteredDevices || !Array.isArray(filteredDevices)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        color: colors.textSecondary
      }}>
        <Search style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
        <p style={{ fontSize: '14px', margin: 0 }}>Loading devices...</p>
      </div>
    );
  }

  // TanStack Virtual setup - simplified for better performance
  const virtualizer = useVirtualizer({
    count: filteredDevices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 105, // Estimated height of each device row
    overscan: 6, // Fixed overscan for consistent performance
  });

  // Simplified virtualizer items - no complex memoization
  const virtualizerItems = virtualizer.getVirtualItems();

  // Debug logging removed for performance
  
  return (
    <>
    <AnimatePresence mode="wait">
      {!(!desktop && !showOnMobile) && isVisible && (
        <motion.div
          key="floating-device-list"
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: !desktop ? '0px' : '8px',
            left: !desktop ? '0px' : (isMenuExpanded ? '200px' : '63px'),
            width: !desktop ? '100vw' : '310px',
            height: !desktop ? '100vh' : 'calc(100vh - 16px)',
            zIndex: 9999,
            pointerEvents: 'auto',
            transition: 'left 0.15s ease'
          }}
        >
      <Card style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.surface,
        borderRadius: !desktop ? '0px' : (selectedDeviceId || geofencesPopoverVisible ? '0px 0px 0px 0px' : '0px 16px 16px 0px'),
        boxShadow: !desktop ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${colors.border}`
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 16px 8px 16px',
          display: 'flex',
          gap: '6px',
          alignItems: 'center'
        }}>
          {/* Mobile Menu Button */}
          {!desktop && onDrawerOpen && (
            <button
              onClick={onDrawerOpen}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: colors.primary,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = colors.hover;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = colors.primary;
              }}
            >
              <Menu 
                size={20} 
                color={colors.text}
              />
            </button>
          )}
          
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              color: colors.textSecondary
            }} />
            <Input
              id="floating-device-search"
              placeholder={t('sharedSearchDevices')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{
                paddingLeft: '40px',
                paddingRight: '92px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: colors.secondary,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontSize: '14px',
                outline: 'none',
                boxShadow: 'none'
              }}
              onFocus={(e) => {
                e.target.style.outline = 'none';
                e.target.style.boxShadow = 'none';
                e.target.style.borderColor = colors.border;
              }}
            />
            {/* Device count */}
            <div style={{
              position: 'absolute',
              right: '64px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              color: colors.textSecondary,
              backgroundColor: colors.surface,
              padding: '3px 5px',
              borderRadius: '6px',
              border: `1px solid ${colors.border}`,
              zIndex: 1
            }}>
              {filteredDevices.length}
            </div>
            <button
              ref={filterButtonRef}
              type="button"
              style={{
                position: 'absolute',
                right: '32px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '28px',
                height: '28px',
                padding: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2
              }}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter style={{ width: '14px', height: '14px', color: colors.textSecondary }} />
            </button>
            <button
              type="button"
              aria-label="Open filters"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '28px',
                height: '28px',
                padding: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2
              }}
              onClick={() => setShowWandModal(true)}
            >
              <PiMagicWand style={{ width: '16px', height: '16px', color: colors.textSecondary }} />
            </button>
          </div>
        </div>
        
        {/* Filter Popup - Anchored to Button */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              ref={filterPopupRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'fixed',
                top: filterButtonRef.current ? filterButtonRef.current.getBoundingClientRect().bottom + 8 : 0,
                right: !desktop ? '16px' : (filterButtonRef.current ? window.innerWidth - filterButtonRef.current.getBoundingClientRect().right - 10 : 0),
                left: !desktop ? '24px' : (filterButtonRef.current ? filterButtonRef.current.getBoundingClientRect().left + 10 : 10),
                width: !desktop ? 'calc(100vw - 32px)' : '292px',
                maxWidth: !desktop ? '400px' : '292px',
                backgroundColor: colors.surface,
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: `1px solid ${colors.border}`,
                padding: '16px',
                zIndex: 10000,
                pointerEvents: 'auto'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Time Window Filter - Custom dropdown */}
                <div ref={timeWindowDropdownRef} style={{ position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <label style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.text
                    }}>{t('deviceLastUpdate')}</label>
                    {filter.timeWindow && filter.timeWindow !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setFilter({ ...filter, timeWindow: 'all' })}
                        style={{
                          fontSize: '12px',
                          color: colors.textSecondary,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {t('sharedClearAll')}
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowTimeWindowDropdown(!showTimeWindowDropdown)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      backgroundColor: colors.surface,
                      fontSize: '14px',
                      color: colors.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none'
                    }}
                  >
                    <span>
                      {filter.timeWindow === 'all' || !filter.timeWindow
                        ? t('allItems')
                        : defaultTimeFilterOptions.find(opt => opt.key === filter.timeWindow)?.label || t('allItems')
                      }
                    </span>
                    <ChevronDown 
                      size={16} 
                      style={{ 
                        transform: showTimeWindowDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        color: colors.textSecondary
                      }} 
                    />
                  </button>

                  <AnimatePresence>
                    {showTimeWindowDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.1 }}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '6px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          zIndex: 10001,
                          marginTop: '4px'
                        }}
                      >
                        {defaultTimeFilterOptions.map((option) => {
                          const count = getTimeFilterCounts(Object.values(devices), defaultTimeFilterOptions, 'lastUpdate')[option.key];
                          return (
                            <button
                              key={option.key}
                              onClick={() => {
                                setFilter({ ...filter, timeWindow: option.key });
                                setShowTimeWindowDropdown(false);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                textAlign: 'left',
                                fontSize: '14px',
                                color: colors.text,
                                backgroundColor: filter.timeWindow === option.key ? colors.hover : 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span>
                                {option.key === 'all' ? t('allItems') : option.label}: {count}
                              </span>
                              {filter.timeWindow === option.key && <Check size={16} color="#10B981" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Status Filter - Custom dropdown - Only visible to administrators and managers */}
                {manager && (
                  <div ref={statusDropdownRef} style={{ position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <label style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.text
                    }}>{t('deviceStatus')}</label>
                    {filter.statuses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilter({ ...filter, statuses: [] })}
                        style={{
                          fontSize: '12px',
                          color: colors.textSecondary,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {t('sharedClearAll')}
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '8px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      backgroundColor: colors.surface,
                      fontSize: '14px',
                      color: colors.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none'
                    }}
                  >
                    <span>
                      {filter.statuses.length === 0 
                        ? t('allItems') 
                        : filter.statuses.length === 1 
                          ? t(`deviceStatus${filter.statuses[0].charAt(0).toUpperCase() + filter.statuses[0].slice(1)}`)
                          : filter.statuses.map(status => t(`deviceStatus${status.charAt(0).toUpperCase() + status.slice(1)}`)).join(', ')
                      }
                    </span>
                    <ChevronDown 
                      size={16} 
                      style={{ 
                        transform: showStatusDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        color: colors.textSecondary
                      }} 
                    />
                  </button>

                  <AnimatePresence>
                    {showStatusDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.1 }}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '6px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          zIndex: 10001,
                          marginTop: '4px'
                        }}
                      >
                        {['online', 'offline', 'unknown'].map((status) => (
                          <button
                            key={status}
                            onClick={() => toggleStatus(status)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontSize: '14px',
                              color: colors.text,
                              backgroundColor: filter.statuses.includes(status) ? colors.hover : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span style={{ textTransform: 'capitalize' }}>
                              {t(`deviceStatus${status.charAt(0).toUpperCase() + status.slice(1)}`)} ({deviceStatusCount(status)})
                            </span>
                            {filter.statuses.includes(status) && <Check size={16} color="#10B981" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </div>
                )}
                
                {/* Groups Filter - Custom dropdown */}
                <div ref={groupsDropdownRef} style={{ position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <label style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.text
                    }}>{t('settingsGroups')}</label>
                    {filter.groups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilter({ ...filter, groups: [] })}
                        style={{
                          fontSize: '12px',
                          color: colors.textSecondary,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {t('sharedClearAll')}
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowGroupsDropdown(!showGroupsDropdown)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '8px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      backgroundColor: colors.surface,
                      fontSize: '14px',
                      color: colors.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none'
                    }}
                  >
                    <span>
                      {filter.groups.length === 0 
                        ? t('allItems') 
                        : filter.groups.length === 1 
                          ? groups[filter.groups[0]]?.name || 'Selected'
                          : filter.groups.map(id => groups[id]?.name).filter(Boolean).join(', ')
                      }
                    </span>
                    <ChevronDown 
                      size={16} 
                      style={{ 
                        transform: showGroupsDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        color: colors.textSecondary
                      }} 
                    />
                  </button>

                  <AnimatePresence>
                    {showGroupsDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.1 }}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '6px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          zIndex: 10001,
                          marginTop: '4px',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}
                      >
                        {Object.values(groups).sort((a, b) => a.name.localeCompare(b.name)).map((group) => (
                          <button
                            key={group.id}
                            onClick={() => toggleGroup(group.id)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontSize: '14px',
                              color: colors.text,
                              backgroundColor: filter.groups.includes(group.id) ? colors.hover : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{group.name}</span>
                            {filter.groups.includes(group.id) && <Check size={16} color="#10B981" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Sort Options - Custom dropdown */}
                <div ref={sortDropdownRef} style={{ position: 'relative' }}>
                    <label style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.text,
                      marginBottom: '8px',
                      display: 'block'
                    }}>{t('sharedSortBy')}</label>
                  
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '8px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      backgroundColor: colors.surface,
                      fontSize: '14px',
                      color: colors.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none'
                    }}
                  >
                    <span>{filterSort === 'name' ? t('sharedName') : t('deviceLastUpdate')}</span>
                    <ChevronDown 
                      size={16} 
                      style={{ 
                        transform: showSortDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        color: colors.textSecondary
                      }} 
                    />
                  </button>

                  <AnimatePresence>
                    {showSortDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.1 }}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '6px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          zIndex: 10001,
                          marginTop: '4px'
                        }}
                      >
                        <button
                          onClick={() => {
                            setFilterSort('name');
                            setShowSortDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            fontSize: '14px',
                            color: colors.text,
                            backgroundColor: filterSort === 'name' ? colors.hover : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span>{t('sharedName')}</span>
                          {filterSort === 'name' && <Check size={16} color="#10B981" />}
                        </button>
                        <button
                          onClick={() => {
                            setFilterSort('lastUpdate');
                            setShowSortDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            fontSize: '14px',
                            color: colors.text,
                            backgroundColor: filterSort === 'lastUpdate' ? colors.hover : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span>{t('deviceLastUpdate')}</span>
                          {filterSort === 'lastUpdate' && <Check size={16} color="#10B981" />}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Filter on Map Checkbox */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '16px 0 8px 0',
                  borderTop: `1px solid ${colors.border}`,
                  marginTop: '8px'
                }}>
                  <input
                    type="checkbox"
                    id="filterMap"
                    checked={filterMap}
                    onChange={(e) => setFilterMap(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      margin: 0,
                      accentColor: '#3B82F6'
                    }}
                  />
                  <label htmlFor="filterMap" style={{
                    fontSize: '14px',
                    color: colors.text,
                    cursor: 'pointer',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    {t('sharedFilterMap')}
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Device List - Virtualized */}
        <div 
          style={{
            flex: 1,
            overflow: 'hidden',
            padding: '0px 0px 16px 0px',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={handleContainerClick}
        >
          {filteredDevices && Array.isArray(filteredDevices) && filteredDevices.length > 0 ? (
            <div 
              key={virtualizerContainerKey}
              ref={parentRef}
              style={{ 
                height: !desktop ? 'calc(100vh - 80px)' : '100%', 
                overflowY: 'auto',
                width: '100%',
                flex: 1,
                padding: '0px 16px 0px 16px'
              }}
            >
              <div
                key={virtualizerContainerKey}
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizerItems.map((virtualItem) => {
                  const device = filteredDevices[virtualItem.index];
                  return (
                    <div
                      key={`device-${device.id || 'unknown'}-${virtualItem.index}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                        padding: '0',
                        boxSizing: 'border-box'
                      }}
                    >
                      <DeviceRow 
                        index={virtualItem.index} 
                        style={{}} 
                        data={{
                          devices: filteredDevices,
                          positions: positions || [],
                          selectedDeviceId: selectedDeviceId
                        }} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '128px',
              color: colors.textSecondary
            }}>
              <Search style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
              <p style={{ fontSize: '14px', margin: 0 }}>{t('sharedNoDevicesFound')}</p>
            </div>
          )}
        </div>
        
        
        {/* Removed Footer with Add Device Button */}
      </Card>
    </motion.div>
      )}
    </AnimatePresence>
    
    {/* Wand Modal - same style and animation as logout confirmation */}
    <AnimatePresence>
      {showWandModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => {
            resetSmartLinkSelections();
            setShowWandModal(false);
          }}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '8px',
              padding: '20px',
              width: desktop ? '70vw' : '98vw',
              height: '70vh',
              maxWidth: '98%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflowX: desktop ? 'hidden' : 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => {
                    resetSmartLinkSelections();
                    setShowWandModal(false);
                  }}
                  aria-label="Close"
                  style={{
                    width: '34px',
                    height: '34px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <ChevronLeft size={18} color={colors.text} />
                </button>
                <div style={{ color: colors.text }}>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>SmartLink</span>
                  <sup style={{ marginLeft: '6px', fontStyle: 'italic', color: colors.textSecondary, fontSize: '12px' }}>beta</sup>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (smartLinkSaveLoading) return; // Prevent multiple clicks
                  
                  if (validateSmartLinkSave()) {
                    // Validation passed - save groups and geofences
                    setSmartLinkSaveLoading(true);
                    await saveSmartLinkData();
                    setSmartLinkSaveLoading(false);
                  }
                }}
                disabled={smartLinkSaveLoading}
                aria-label="Save"
                style={{
                  width: '34px',
                  height: '34px',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: smartLinkSaveLoading ? 'not-allowed' : 'pointer',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s',
                  opacity: smartLinkSaveLoading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!smartLinkSaveLoading) {
                    e.currentTarget.style.backgroundColor = colors.primary + '20';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {smartLinkSaveLoading ? (
                  <CircularProgress size={18} thickness={4} style={{ color: colors.text }} />
                ) : (
                  <BsCloudArrowUp size={18} color={colors.text} />
                )}
              </button>
            </div>

            {/* Intro text removed per request */}

            {/* Sections grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '230px 1fr',
                gap: '12px',
                marginBottom: '0px',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                width: '100%',
                minWidth: desktop ? 'auto' : '900px'
              }}
            >
              {/* Devices */}
              <div
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: colors.surface,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  minWidth: 0,
                  width: '100%',
                  height: '100%'
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  {t('deviceTitle')}
                </div>
                <div key={`devices-${smartLinkRefreshTrigger}`} style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                  {(filteredDevices && Array.isArray(filteredDevices) ? filteredDevices : Object.values(devices))
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map((device) => {
                      const isSelected = smartLinkSelectedDeviceIds.includes(device.id);
                      return (
                          <label
                          key={device.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                              backgroundColor: 'transparent',
                            width: '100%',
                            minWidth: 0
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              handleDeviceSelectionChange(device.id, e.target.checked);
                            }}
                            style={{ width: '14px', height: '14px', margin: 0, marginTop: '2px' }}
                          />
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flex: 1,
                            minWidth: 0
                          }}>
                          <span style={{ color: colors.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                            {device[devicePrimary] || device.name || 'Unnamed'}
                          </span>
                            {loadingDevices.has(device.id) && (
                              <CircularProgress 
                                size={12} 
                                thickness={4}
                                style={{ 
                                  color: colors.text,
                                  flexShrink: 0
                                }} 
                              />
                            )}
                          </div>
                        </label>
                      );
                    })}
                </div>
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: colors.textSecondary
                }}>
                  Selected: {smartLinkSelectedDeviceIds.length}
                </div>
              </div>

              {/* Right pane tabs header */}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', minHeight: 0 }}>
                <div style={{ display: 'flex', gap: 0, padding: '0 8px', border: `1px solid ${colors.border}`, borderRadius: '8px 8px 0 0', borderBottom: 'none', backgroundColor: colors.surface, alignItems: 'flex-end', height: '48px' }}>
                  {[
                    { key: 'groups', label: t('settingsGroups') },
                    { key: 'geofences', label: t('sharedGeofences') },
                    { key: 'notifications', label: t('sharedNotifications') },
                    { key: 'calendars', label: t('sharedCalendars') },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setSmartLinkActiveTab(tab.key)}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: smartLinkActiveTab === tab.key ? '#1976d2' : '#666666',
                        cursor: 'pointer',
                        borderBottom: smartLinkActiveTab === tab.key ? '2px solid #1976d2' : '2px solid transparent',
                        marginRight: '8px',
                        fontSize: '12px',
                        fontWeight: '500',
                        textTransform: 'none',
                        minHeight: '40px'
                      }}
                      onMouseEnter={(e) => {
                        if (smartLinkActiveTab === tab.key) {
                          e.currentTarget.style.color = '#1976d2';
                          e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.15)';
                        } else {
                          e.currentTarget.style.color = '#1976d2';
                          e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = smartLinkActiveTab === tab.key ? '#1976d2' : '#666666';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div style={{ border: `1px solid ${colors.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px', backgroundColor: colors.surface, minHeight: 0, flex: 1, overflow: 'hidden' }}>
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, padding: '12px' }}>
                    {smartLinkActiveTab === 'groups' && (
                      <>
                        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                          {Object.values(groups).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((group) => {
                            const isSelected = smartLinkSelectedGroupIds.includes(group.id);
                            const hasPartial = hasPartialGroupSelection(group.id);
                            
                            // Check for conflicts - only show conflict if multiple groups are selected
                            const hasConflict = isSelected && smartLinkSelectedGroupIds.length > 1;
                            
                            return (
                              <label key={group.id} style={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: '8px', 
                                padding: '8px', 
                                borderRadius: '6px', 
                                cursor: 'pointer', 
                                backgroundColor: 'transparent', 
                                width: '100%', 
                                minWidth: 0 
                              }}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected} 
                                  onChange={(e) => { setSmartLinkSelectedGroupIds(e.target.checked ? [group.id] : []); }} 
                                  style={{ 
                                    width: '14px', 
                                    height: '14px', 
                                    margin: 0,
                                    marginTop: '2px',
                                    backgroundColor: hasConflict ? '#E0E0E0' : 'transparent',
                                    accentColor: hasConflict ? '#E0E0E0' : '#1976d2'
                                  }} 
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: colors.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {group.name || 'Unnamed'}
                                  </div>
                                  {isSelected && smartLinkSelectedDeviceIds.length > 0 && (
                                    <div style={{ 
                                      fontSize: '11px', 
                                      marginTop: '2px',
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                      maxWidth: '100%'
                                    }}>
                                      {smartLinkSelectedDeviceIds.map(deviceId => {
                                        const deviceGroup = deviceGroups[deviceId];
                                        const isPartnered = deviceGroup === group.id;
                                        const deviceName = devices[deviceId]?.name || 'Unknown';
                                        return (
                                          <span
                                            key={deviceId}
                                            style={{
                                              color: isPartnered ? '#10B981' : '#EF4444' // Green for partnered, red for not partnered
                                            }}
                                          >
                                            {deviceName}
                                </span>
                                        );
                                      }).reduce((acc, curr, index) => {
                                        return acc === null ? [curr] : [...acc, <span key={`comma-${index}`} style={{ color: colors.textSecondary }}>, </span>, curr];
                                      }, null)}
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textSecondary }}>Selected: {smartLinkSelectedGroupIds.length}</div>
                      </>
                    )}
                    {smartLinkActiveTab === 'geofences' && (
                      <>
                        <div key={`geofences-${smartLinkRefreshTrigger}`} style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                          {Object.values(geofences).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((geofence) => {
                            const isSelected = smartLinkSelectedGeofenceIds.includes(geofence.id);
                            const hasPartial = hasPartialGeofenceSelection(geofence.id);
                            return (
                              <label key={geofence.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', width: '100%', minWidth: 0 }}>
                                <input type="checkbox" checked={isSelected} onChange={(e) => { setSmartLinkSelectedGeofenceIds((prev) => e.target.checked ? (prev.includes(geofence.id) ? prev : [...prev, geofence.id]) : prev.filter((id) => id !== geofence.id)); }} style={{ width: '14px', height: '14px', margin: 0, marginTop: '2px' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: colors.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {geofence.name || 'Unnamed'}
                                  </div>
                                  {isSelected && smartLinkSelectedDeviceIds.length > 0 && (
                                    <div style={{ 
                                      fontSize: '11px', 
                                      marginTop: '2px',
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                      maxWidth: '100%'
                                    }}>
                                      {smartLinkSelectedDeviceIds.map(deviceId => {
                                        const deviceGeofenceList = deviceGeofences[deviceId] || [];
                                        const isPartnered = deviceGeofenceList.includes(geofence.id);
                                        const deviceName = devices[deviceId]?.name || 'Unknown';
                                        return (
                                          <span
                                            key={deviceId}
                                            style={{
                                              color: isPartnered ? '#10B981' : '#EF4444' // Green for partnered, red for not partnered
                                            }}
                                          >
                                            {deviceName}
                                </span>
                                        );
                                      }).reduce((acc, curr, index) => {
                                        return acc === null ? [curr] : [...acc, <span key={`comma-${index}`} style={{ color: colors.textSecondary }}>, </span>, curr];
                                      }, null)}
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textSecondary }}>Selected: {smartLinkSelectedGeofenceIds.length}</div>
                      </>
                    )}
                    {smartLinkActiveTab === 'notifications' && (
                      <>
                        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                          {smartLinkNotificationsLoading ? (<div style={{ color: colors.textSecondary, fontSize: '12px' }}>Loading...</div>) : (
                            smartLinkNotifications.sort((a, b) => (a.type || '').localeCompare(b.type || '')).map((notification) => {
                              const isSelected = smartLinkSelectedNotificationIds.includes(notification.id);
                              const hasPartial = hasPartialNotificationSelection(notification.id);
                              
                              // Format notificators (channels)
                              const formatList = (prefix, value) => {
                                if (value) {
                                  return value
                                    .split(/[, ]+/)
                                    .filter(Boolean)
                                    .map((it) => t(prefixString(prefix, it)))
                                    .join(', ');
                                }
                                return '';
                              };
                              
                              const notificatorsText = formatList('notificator', notification.notificators);
                              const hasCommand = notification.notificators?.includes('command');
                              
                              // Build single line display
                              const displayParts = [];
                              
                              // Notification type
                              if (notification.type) {
                                displayParts.push(t(prefixString('event', notification.type)));
                              }
                              
                              // Channels/Notificators
                              if (notificatorsText) {
                                displayParts.push(notificatorsText);
                              }
                              
                              // Command description (if it's a command notification)
                              if (hasCommand && notification.commandId) {
                                // Find command description from commands list
                                const command = smartLinkCommands?.find(cmd => cmd.id === notification.commandId);
                                if (command?.description) {
                                  displayParts.push(command.description);
                                } else {
                                  displayParts.push(`Command ${notification.commandId}`);
                                }
                              }
                              
                              // Always flag
                              if (notification.always) {
                                displayParts.push('Always active');
                              }
                              
                              const displayText = displayParts.join(' / ');
                              
                              return (
                                <label key={notification.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: isSelected ? colors.primary + '10' : 'transparent', width: '100%', minWidth: 0, marginBottom: '4px' }}>
                                  <input type="checkbox" checked={isSelected} onChange={(e) => { setSmartLinkSelectedNotificationIds((prev) => e.target.checked ? (prev.includes(notification.id) ? prev : [...prev, notification.id]) : prev.filter((id) => id !== notification.id)); }} style={{ width: '14px', height: '14px', margin: 0, marginTop: '2px' }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: colors.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {displayText}
                                    </div>
                                    {isSelected && smartLinkSelectedDeviceIds.length > 0 && (
                                      <div style={{ 
                                        fontSize: '11px', 
                                        marginTop: '2px',
                                        wordWrap: 'break-word',
                                        overflowWrap: 'break-word',
                                        maxWidth: '100%'
                                      }}>
                                        {smartLinkSelectedDeviceIds.map(deviceId => {
                                          const deviceNotificationList = deviceNotifications[deviceId] || [];
                                          const isPartnered = deviceNotificationList.includes(notification.id);
                                          const deviceName = devices[deviceId]?.name || 'Unknown';
                                          return (
                                            <span
                                              key={deviceId}
                                              style={{
                                                color: isPartnered ? '#10B981' : '#EF4444' // Green for partnered, red for not partnered
                                              }}
                                            >
                                              {deviceName}
                                  </span>
                                          );
                                        }).reduce((acc, curr, index) => {
                                          return acc === null ? [curr] : [...acc, <span key={`comma-${index}`} style={{ color: colors.textSecondary }}>, </span>, curr];
                                        }, null)}
                                      </div>
                                    )}
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textSecondary }}>Selected: {smartLinkSelectedNotificationIds.length}</div>
                      </>
                    )}
                    {smartLinkActiveTab === 'calendars' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
                          {/* Left Column - Calendar List */}
                          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>{t('sharedCalendars')}</div>
                            <div style={{ flex: 1, overflow: 'auto', minWidth: 0, border: `1px solid ${colors.border}`, borderRadius: '6px', backgroundColor: colors.surface }}>
                              {smartLinkCalendarsLoading ? (
                                <div style={{ color: colors.textSecondary, fontSize: '12px', padding: '12px' }}>Loading...</div>
                              ) : (
                                smartLinkCalendars.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((calendar) => {
                                  const isSelected = smartLinkSelectedCalendarIds.includes(calendar.id);
                                  
                                  // Check if this calendar should be selected based on notifications
                                  // (This logic is now handled in the useEffect above)
                                  
                                  // Check for conflicts - there's a conflict if:
                                  // 1. User has manually selected more than one calendar, OR
                                  // 2. There are notifications assigned to different calendars (only if user hasn't made a selection yet)
                                  const hasConflict = smartLinkUserSelectedCalendarIds.length > 1 || 
                                    (smartLinkUserSelectedCalendarIds.length === 0 && 
                                     smartLinkSelectedNotificationIds.length > 0 && 
                                     smartLinkSelectedNotificationIds.some(notificationId => {
                                       const notification = smartLinkNotifications.find(n => n.id === notificationId);
                                       return notification && notification.calendarId && notification.calendarId !== 0 && 
                                              notification.calendarId !== calendar.id;
                                     }));
                                  
                                  // Determine if this specific calendar has a conflict
                                  // A calendar has conflict if it's selected AND there's a conflict
                                  const calendarHasConflict = hasConflict && isSelected;
                                  
                                  return (
                                    <label key={calendar.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', width: '100%', minWidth: 0 }}>
                                      <input 
                                        type="checkbox" 
                                        checked={isSelected} 
                                        onChange={(e) => { 
                                          if (e.target.checked) {
                                            // When selecting a calendar, clear all others and set this as the only selected
                                            setSmartLinkSelectedCalendarIds([calendar.id]); 
                                            setSmartLinkUserSelectedCalendarIds([calendar.id]);
                                          } else {
                                            // When deselecting, clear all selections
                                            setSmartLinkSelectedCalendarIds([]); 
                                            setSmartLinkUserSelectedCalendarIds([]);
                                          }
                                        }} 
                                        style={{ 
                                          width: '14px', 
                                          height: '14px', 
                                          margin: 0,
                                          marginTop: '2px',
                                          backgroundColor: calendarHasConflict ? '#E0E0E0' : (isSelected ? '#1976d2' : 'transparent'),
                                          accentColor: calendarHasConflict ? '#E0E0E0' : '#1976d2'
                                        }} 
                                      />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ color: colors.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {calendar.name || 'Unnamed'}
                                        </div>
                                        {isSelected && smartLinkSelectedNotificationIds.length > 0 && (
                                          <div style={{ 
                                            fontSize: '11px', 
                                            marginTop: '2px',
                                            wordWrap: 'break-word',
                                            overflowWrap: 'break-word',
                                            maxWidth: '100%'
                                          }}>
                                            {smartLinkSelectedNotificationIds.map(notificationId => {
                                                const notification = smartLinkNotifications.find(n => n.id === notificationId);
                                                if (!notification) return null;
                                                
                                                // Check if this notification is partnered with this calendar
                                                const isPartnered = notification.calendarId === calendar.id;
                                                
                                                // Format notificators (channels)
                                                const formatList = (prefix, value) => {
                                                  if (value) {
                                                    return value
                                                      .split(/[, ]+/)
                                                      .filter(Boolean)
                                                      .map((it) => t(prefixString(prefix, it)))
                                                      .join(', ');
                                                  }
                                                  return '';
                                                };
                                                
                                                const notificatorsText = formatList('notificator', notification.notificators);
                                                const hasCommand = notification.notificators?.includes('command');
                                                
                                                // Build single line display
                                                const displayParts = [];
                                                
                                                // Notification type
                                                if (notification.type) {
                                                  displayParts.push(t(prefixString('event', notification.type)));
                                                }
                                                
                                                // Channels/Notificators
                                                if (notificatorsText) {
                                                  displayParts.push(notificatorsText);
                                                }
                                                
                                                // Command description (if it's a command notification)
                                                if (hasCommand && notification.commandId) {
                                                  const command = smartLinkCommands?.find(cmd => cmd.id === notification.commandId);
                                                  if (command?.description) {
                                                    displayParts.push(command.description);
                                                  } else {
                                                    displayParts.push(`Command ${notification.commandId}`);
                                                  }
                                                }
                                                
                                                
                                                const displayText = displayParts.join(' / ');
                                                
                                                return (
                                                  <span
                                                    key={notificationId}
                                                    style={{
                                                      color: isPartnered ? '#10B981' : '#EF4444', // Green for partnered, red for not partnered
                                                      marginRight: '8px',
                                                      fontSize: '10px'
                                                    }}
                                                  >
                                                    {displayText}
                                                  </span>
                                                );
                                              })
                                              .filter(Boolean)
                                            }
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>
                          
                          {/* Right Column - Add Calendar Form */}
                          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>{t('sharedAdd')} {t('sharedCalendar')}</div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', border: `1px solid ${colors.border}`, borderRadius: '6px', backgroundColor: colors.surface, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                              {/* Name Field */}
                              <TextField
                                label={t('sharedName')}
                                value={smartLinkCalendarForm.name}
                                onChange={(e) => setSmartLinkCalendarForm({ ...smartLinkCalendarForm, name: e.target.value })}
                                fullWidth
                                variant="outlined"
                                size="small"
                                sx={{
                                  '& .MuiOutlinedInputRoot': {
                                    backgroundColor: colors.secondary,
                                    '& fieldset': { borderColor: colors.border },
                                    '&:hover fieldset': { borderColor: colors.primary },
                                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                                  },
                                  '& .MuiInputLabel-root': { 
                                    color: colors.text,
                                    '&.Mui-focused': { color: colors.primary }
                                  },
                                }}
                              />
                              
                              {/* From Field - Hidden but keep state */}
                              <TextField
                                label={t('reportFrom')}
                                type="datetime-local"
                                value={smartLinkCalendarForm.from}
                                onChange={(e) => setSmartLinkCalendarForm({ ...smartLinkCalendarForm, from: e.target.value })}
                                fullWidth
                                variant="outlined"
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                  display: 'none' // Hidden but keep state
                                }}
                              />
                              
                              {/* To Field - Hidden but keep state */}
                              <TextField
                                label={t('reportTo')}
                                type="datetime-local"
                                value={smartLinkCalendarForm.to}
                                onChange={(e) => setSmartLinkCalendarForm({ ...smartLinkCalendarForm, to: e.target.value })}
                                fullWidth
                                variant="outlined"
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                  display: 'none' // Hidden but keep state
                                }}
                              />
                              
                              {/* Recurrency Field - Hidden, fixed to WEEKLY */}
                              <div style={{ position: 'relative', display: 'none' }}>
                                <TextField
                                  label={t('calendarRecurrence')}
                                  value={smartLinkRecurrence ? t(prefixString('calendar', smartLinkRecurrence.toLowerCase())) : ''}
                                  onClick={() => setSmartLinkRecurrenceDropdownOpen(!smartLinkRecurrenceDropdownOpen)}
                                  InputProps={{
                                    readOnly: true,
                                    endAdornment: <ChevronDown style={{ color: colors.textSecondary, width: '16px', height: '16px' }} />
                                  }}
                                  fullWidth
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    backgroundColor: colors.secondary,
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary },
                                    '& .MuiInputLabel-root': { 
                                      color: colors.text,
                                      '&.Mui-focused': { color: colors.primary }
                                    }
                                  }}
                                />
                                {smartLinkRecurrenceDropdownOpen && (
                                  <div 
                                    ref={(el) => {
                                      if (el) {
                                        const rect = el.previousElementSibling?.getBoundingClientRect();
                                        if (rect) {
                                          el.style.top = `${rect.bottom + 4}px`;
                                          el.style.left = `${rect.left}px`;
                                          el.style.width = `${rect.width}px`;
                                        }
                                      }
                                    }}
                                    style={{
                                      position: 'fixed',
                                      zIndex: 999999,
                                      backgroundColor: colors.surface,
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: '6px',
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                      maxHeight: '200px',
                                      overflow: 'auto'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'].map((frequency) => (
                                      <div
                                        key={frequency}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('Setting recurrence to:', frequency);
                                          setSmartLinkRecurrence(frequency);
                                          setSmartLinkRecurrenceDropdownOpen(false);
                                        }}
                                        style={{
                                          padding: '12px 16px',
                                          color: colors.text,
                                          cursor: 'pointer',
                                          borderBottom: `1px solid ${colors.border}`,
                                          '&:hover': {
                                            backgroundColor: colors.primary + '15'
                                          }
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = colors.primary + '15';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                      >
                                        {t(prefixString('calendar', frequency.toLowerCase()))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Days Selection - Always visible since recurrence is fixed to WEEKLY */}
                                <div style={{ position: 'relative' }}>
                                  <TextField
                                    label={t('calendarDays')}
                                    value={smartLinkDays.length > 0 ? 
                                      smartLinkDays.map(day => t(prefixString('calendar', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(day)]))).join(', ') : ''
                                    }
                                    onClick={() => setSmartLinkDaysDropdownOpen(!smartLinkDaysDropdownOpen)}
                                    InputProps={{
                                      readOnly: true,
                                      endAdornment: <ChevronDown style={{ color: colors.textSecondary, width: '16px', height: '16px' }} />
                                    }}
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                      backgroundColor: colors.secondary,
                                      '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border },
                                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary },
                                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary },
                                      '& .MuiInputLabel-root': { 
                                        color: colors.text,
                                        '&.Mui-focused': { color: colors.primary }
                                      }
                                    }}
                                  />
                                  {smartLinkDaysDropdownOpen && (
                                    <div 
                                      ref={(el) => {
                                        if (el) {
                                          const rect = el.previousElementSibling?.getBoundingClientRect();
                                          if (rect) {
                                            el.style.top = `${rect.bottom + 4}px`;
                                            el.style.left = `${rect.left}px`;
                                            el.style.width = `${rect.width}px`;
                                          }
                                        }
                                      }}
                                      style={{
                                        position: 'fixed',
                                        zIndex: 999999,
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '4px',
                                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                        backgroundColor: colors.surface
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {/* Always show week days since recurrence is fixed to WEEKLY */}
                                      {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day, index) => {
                                          const dayCode = day.substring(0, 2).toUpperCase();
                                          const isSelected = smartLinkDays.includes(dayCode);
                                          return (
                                            <div
                                              key={day}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const newDays = isSelected 
                                                  ? smartLinkDays.filter(d => d !== dayCode)
                                                  : [...smartLinkDays, dayCode];
                                                setSmartLinkDays(newDays);
                                              }}
                                              style={{
                                                padding: '12px 16px',
                                                cursor: 'pointer',
                                                color: colors.text,
                                                backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
                                                borderBottom: index < 6 ? `1px solid ${colors.border}` : 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                              }}
                                              onMouseEnter={(e) => {
                                                e.stopPropagation();
                                                e.target.style.backgroundColor = colors.primary + '10';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.stopPropagation();
                                                e.target.style.backgroundColor = isSelected ? colors.primary + '20' : colors.surface;
                                              }}
                                            >
                                              <span>{t(prefixString('calendar', day))}</span>
                                              {isSelected && <CheckIcon style={{ color: '#10B981', fontSize: '18px' }} />}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                              
                              {/* Time Ranges - Always visible since recurrence is fixed to WEEKLY */}
                                <div style={{ marginTop: '16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                      type="checkbox"
                                      checked={smartLinkTimeRanges.enabled}
                                      style={{ marginTop: '2px', width: '16px', height: '16px' }}
                                      onChange={(e) => {
                                        // Create a deep copy of periods to avoid mutation
                                        const newPeriods = smartLinkTimeRanges.periods.map(period => ({ ...period }));
                                        
                                        const newTimeRanges = { 
                                          enabled: e.target.checked,
                                          periods: newPeriods
                                        };
                                        
                                        if (e.target.checked) {
                                          // Enable first period when time ranges are enabled
                                          if (newPeriods.length > 0) {
                                            newTimeRanges.periods[0].enabled = true;
                                          }
                                        } else {
                                          // Disable all periods when time ranges are disabled
                                          newTimeRanges.periods = newPeriods.map(period => ({ ...period, enabled: false }));
                                        }
                                        
                                        setSmartLinkTimeRanges(newTimeRanges);
                                      }}
                                    />
                                    <span style={{ color: colors.text, fontSize: '14px', fontWeight: '500' }}>
                                      {t('calendarByTimeRange')}
                                    </span>
                                  </div>
                                  
                                  {smartLinkTimeRanges.enabled && (
                                    <div>
                                      {smartLinkTimeRanges.periods.map((period, index) => (
                                        <div key={`period-${index}-${period.name || 'unnamed'}`} style={{ 
                                          marginBottom: '16px', 
                                          padding: '16px', 
                                          border: `1px solid ${colors.border}`, 
                                          borderRadius: '8px',
                                          backgroundColor: colors.surface
                                        }}>
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                              <input
                                                type="checkbox"
                                                checked={period.enabled}
                                                disabled={index === 0 && smartLinkTimeRanges.enabled}
                                                style={{ marginTop: '2px', width: '16px', height: '16px' }}
                                                onChange={(e) => {
                                                  const newPeriods = smartLinkTimeRanges.periods.map((p, i) => 
                                                    i === index ? { ...p, enabled: e.target.checked } : { ...p }
                                                  );
                                                  setSmartLinkTimeRanges({ ...smartLinkTimeRanges, periods: newPeriods });
                                                }}
                                              />
                                              <span style={{ color: colors.text, fontSize: '14px', fontWeight: '500' }}>
                                                {period.name}
                                              </span>
                                              {index === 0 && smartLinkTimeRanges.enabled && (
                                                <span style={{
                                                  padding: '2px 6px',
                                                  fontSize: '10px',
                                                  backgroundColor: colors.primary + '20',
                                                  color: colors.primary,
                                                  border: `1px solid ${colors.primary}`,
                                                  borderRadius: '4px'
                                                }}>
                                                  {t('sharedRequired')}
                                                </span>
                                              )}
                                            </div>
                                            {smartLinkTimeRanges.periods.length > 1 && index > 0 && (
                                              <button
                                                onClick={() => removePeriod(index)}
                                                style={{
                                                  padding: '6px',
                                                  border: 'none',
                                                  backgroundColor: colors.surface,
                                                  color: colors.textSecondary,
                                                  cursor: 'pointer',
                                                  borderRadius: '4px',
                                                  width: '24px',
                                                  height: '24px',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontSize: '14px',
                                                  fontWeight: 'bold'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.backgroundColor = colors.error + '20';
                                                  e.currentTarget.style.color = colors.error;
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.backgroundColor = colors.surface;
                                                  e.currentTarget.style.color = colors.textSecondary;
                                                }}
                                              >
                                                ×
                                              </button>
                                            )}
                                          </div>
                                          
                                          {period.enabled && (
                                            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                              <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', color: colors.text, fontSize: '12px', marginBottom: '4px' }}>
                                                  {t('calendarStartTime')}
                                                </label>
                                                <input
                                                  type="time"
                                                  value={period.startTime}
                                                  onChange={(e) => {
                                                    const newPeriods = smartLinkTimeRanges.periods.map((p, i) => 
                                                      i === index ? { ...p, startTime: e.target.value } : { ...p }
                                                    );
                                                    setSmartLinkTimeRanges({ ...smartLinkTimeRanges, periods: newPeriods });
                                                  }}
                                                  style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    border: `1px solid ${colors.border}`,
                                                    borderRadius: '4px',
                                                    backgroundColor: colors.secondary,
                                                    color: colors.text,
                                                    fontSize: '12px'
                                                  }}
                                                />
                                              </div>
                                              <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', color: colors.text, fontSize: '12px', marginBottom: '4px' }}>
                                                  {t('calendarEndTime')}
                                                </label>
                                                <input
                                                  type="time"
                                                  value={period.endTime}
                                                  onChange={(e) => {
                                                    const newPeriods = smartLinkTimeRanges.periods.map((p, i) => 
                                                      i === index ? { ...p, endTime: e.target.value } : { ...p }
                                                    );
                                                    setSmartLinkTimeRanges({ ...smartLinkTimeRanges, periods: newPeriods });
                                                  }}
                                                  style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    border: `1px solid ${colors.border}`,
                                                    borderRadius: '4px',
                                                    backgroundColor: colors.secondary,
                                                    color: colors.text,
                                                    fontSize: '12px'
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      
                                      {/* Add Period Button */}
                                      <button
                                        onClick={addPeriod}
                                        style={{
                                          width: '100%',
                                          padding: '12px',
                                          border: `1px solid ${colors.border}`,
                                          borderRadius: '4px',
                                          backgroundColor: 'transparent',
                                          color: colors.text,
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                          fontWeight: '500'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.borderColor = colors.primary;
                                          e.currentTarget.style.backgroundColor = colors.primary + '10';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.borderColor = colors.border;
                                          e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                      >
                                        + {t('calendarAddPeriod')}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              
                              {/* Create Calendar Button */}
                              <button
                                onClick={createCalendar}
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  border: `1px solid ${colors.primary}`,
                                  borderRadius: '6px',
                                  backgroundColor: colors.primary,
                                  color: colors.text,
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  marginTop: '16px',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = colors.primary + 'CC';
                                  e.currentTarget.style.borderColor = colors.primary;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = colors.primary;
                                  e.currentTarget.style.borderColor = colors.primary;
                                }}
                              >
                                {t('sharedSave')} {t('sharedCalendar')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    
    {/* Snackbar for notifications */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={6000}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={snackbar.severity}
        sx={{ width: '100%' }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>

    {/* SmartLink Progress Modal */}
    {smartLinkProgressModal.open && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: '12px',
            padding: '24px',
            width: '450px',
            maxWidth: '450px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CircularProgress size={24} thickness={4} style={{ color: colors.primary }} />
            <span style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>
              Saving SmartLink Configuration
            </span>
          </div>
          
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ fontSize: '14px', color: colors.text, marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {smartLinkProgressModal.currentOperation}
            </div>
            {smartLinkProgressModal.currentDevice && (
              <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Device: {smartLinkProgressModal.currentDevice}
              </div>
            )}
            <div style={{ fontSize: '12px', color: colors.textSecondary }}>
              Progress: {smartLinkProgressModal.completedDevices} / {smartLinkProgressModal.totalDevices} devices
            </div>
          </div>
          
          <div style={{ width: '100%', backgroundColor: colors.border, borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(smartLinkProgressModal.completedDevices / smartLinkProgressModal.totalDevices) * 100}%`,
                height: '100%',
                backgroundColor: colors.primary,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default FloatingDeviceList;