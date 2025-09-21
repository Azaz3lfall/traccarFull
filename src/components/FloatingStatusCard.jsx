import {
  useState, useEffect, useCallback, useRef, useMemo
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  devicesActions,
  geofencesActions,
  errorsActions,
  sessionActions
} from '../store';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { map } from '../map/core/MapView';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import { useDeviceReadonly } from '../common/util/permissions';
import { distanceFromMeters, distanceToMeters, distanceUnitString } from '../common/util/converter';
import fetchOrThrow from '../common/util/fetchOrThrow';
import {
  formatPercentage,
  formatSpeed,
  formatDistance,
  formatCoordinate,
  formatTime,
  formatCourse,
  formatAltitude,
  formatVoltage,
  formatVolume,
  formatBoolean,
  formatAlarm,
  formatNumber,
  formatNumericHours
} from '../common/util/formatter';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import localStorageAsync from '../common/util/localStorageAsync';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import UploadIcon from '@mui/icons-material/Upload';
import AnchorIcon from '@mui/icons-material/Anchor';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CommandDialog from './CommandDialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { 
  Gauge,
  X,
  ChevronLeft,
  Loader2,
  Settings
} from 'lucide-react';
import { Card } from './ui/card';

dayjs.extend(relativeTime);

const FloatingStatusCard = ({ desktop, isMenuExpanded, isDeviceListVisible, showReplayPopover, setShowReplayPopover, onHideDeviceList }) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const t = useTranslation();
  const colors = useThemeColors();
  
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const replayPositions = useSelector((state) => state.session.replayPositions);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailedPosition, setDetailedPosition] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [isAnchored, setIsAnchored] = useState(false);
  const [anchorGeofenceId, setAnchorGeofenceId] = useState(null);
  const [isAnchorLoading, setIsAnchorLoading] = useState(false);
  const [isLockOpenLoading, setIsLockOpenLoading] = useState(false);
  const [isLockClosedLoading, setIsLockClosedLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showLockOpenConfirmation, setShowLockOpenConfirmation] = useState(false);
  const [showLockClosedConfirmation, setShowLockClosedConfirmation] = useState(false);
  
  // Replay form states
  const [replayDeviceId, setReplayDeviceId] = useState(null);
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [replayLoading, setReplayLoading] = useState(false);
  
  // Enhanced replay states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentReplayIndex, setCurrentReplayIndex] = useState(0);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const intervalRef = useRef(null);
  
  // Get replay state from Redux
  const reduxCurrentReplayIndex = useSelector((state) => state.session.currentReplayIndex);
  
  // User preferences
  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
  const altitudeUnit = useAttributePreference('altitudeUnit');
  const volumeUnit = useAttributePreference('volumeUnit');
  const coordinateFormat = usePreference('coordinateFormat');
  const positionItems = useAttributePreference('positionItems', 'fixTime,address,speed,totalDistance');
  const positionAttributes = usePositionAttributes(t);
  const deviceReadonly = useDeviceReadonly();
  
  // Get current device and position
  // In replay mode, use replay device; otherwise use selected device
  const device = showReplayPopover && replayDeviceId ? devices[replayDeviceId] : (selectedDeviceId ? devices[selectedDeviceId] : null);
  
  // Sync local state with Redux state
  useEffect(() => {
    setCurrentReplayIndex(reduxCurrentReplayIndex);
  }, [reduxCurrentReplayIndex]);

  // Memoize position to ensure it updates when replay position changes
  const position = useMemo(() => {
    if (showReplayPopover && replayPositions[currentReplayIndex]) {
      return replayPositions[currentReplayIndex];
    }
    return selectedDeviceId ? positions[selectedDeviceId] : null;
  }, [showReplayPopover, replayPositions, currentReplayIndex, selectedDeviceId, positions]);


  // Check for existing anchor when device changes
  useEffect(() => {
    const checkAnchorStatus = async () => {
      if (!selectedDeviceId) {
        setIsAnchored(false);
        setAnchorGeofenceId(null);
        return;
      }

      try {
        const anchorKey = `anchor_${selectedDeviceId}`;
        const geofenceId = await localStorageAsync.getItem(anchorKey);
        
        if (geofenceId) {
          setIsAnchored(true);
          setAnchorGeofenceId(geofenceId);
        } else {
          setIsAnchored(false);
          setAnchorGeofenceId(null);
        }
      } catch (error) {
        console.error('Error checking anchor status:', error);
        setIsAnchored(false);
        setAnchorGeofenceId(null);
      }
    };

    checkAnchorStatus();
  }, [selectedDeviceId]);
  
  

  const handleMoreDetails = useCallback(async () => {
    if (!position || !position.id) return;
    
    setShowDetailsModal(true);
    setIsLoadingDetails(true);
    setDetailedPosition(null);
    
    try {
      const response = await fetch(`/api/positions?id=${position.id}`);
      if (response.ok) {
        const positions = await response.json();
        if (positions.length > 0) {
          setDetailedPosition(positions[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching position details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [position]);
  


  const handleEditField = useCallback((field, currentValue) => {
    if (field === 'hours') {
      setEditValue((currentValue / 3600000).toFixed(2));
    } else if (field === 'totalDistance') {
      setEditValue(distanceFromMeters(currentValue, distanceUnit).toFixed(2));
    }
    setEditField(field);
    setShowEditModal(true);
  }, [distanceUnit]);

  const handleSaveEdit = useCallback(async () => {
    if (!device?.id || !editField) return;
    
    setIsSaving(true);
    try {
      const item = {
        deviceId: device.id,
        hours: position?.attributes?.hours || 0,
        totalDistance: position?.attributes?.totalDistance || 0,
      };
      
      if (editField === 'hours') {
        item.hours = Number(editValue) * 3600000;
      } else if (editField === 'totalDistance') {
        item.totalDistance = distanceToMeters(Number(editValue), distanceUnit);
      }
      
      await fetchOrThrow(`/api/devices/${device.id}/accumulators`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      
      setShowEditModal(false);
      setEditField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving accumulator:', error);
    } finally {
      setIsSaving(false);
    }
  }, [device?.id, editField, editValue, position?.attributes, distanceUnit]);
  
  // Refresh geofences list and map
  const refreshGeofences = useCallback(async () => {
    try {
      const response = await fetchOrThrow('/api/geofences');
      const geofences = await response.json();
      dispatch(geofencesActions.refresh(geofences));
      
      // Invalidate TanStack Query to refresh FloatingGeofencesPopover
      queryClient.invalidateQueries(['geofences']);
    } catch (error) {
      console.error('Error refreshing geofences:', error);
    }
  }, [dispatch, queryClient]);

  // Anchor button handlers
  const handleCreateAnchor = useCallback(async () => {
    if (!selectedDeviceId || !position || !device) return;

    setIsAnchorLoading(true);
    try {
      // Get current position
      const lat = position.latitude;
      const lon = position.longitude;

      // Create geofence
      const geofencePayload = {
        name: `Anchor for ${device.name}`,
        area: `CIRCLE (${lat} ${lon}, 50)`
      };

      const geofenceResponse = await fetchOrThrow('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geofencePayload),
      });

      const geofence = await geofenceResponse.json();

      // Create permission
      const permissionPayload = {
        deviceId: selectedDeviceId,
        geofenceId: geofence.id
      };

      try {
        await fetchOrThrow('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(permissionPayload),
        });
      } catch (permissionError) {
        // If permission creation fails, clean up the geofence
        try {
          await fetchOrThrow(`/api/geofences/${geofence.id}`, {
            method: 'DELETE',
          });
        } catch (cleanupError) {
          console.error('Error cleaning up geofence after permission failure:', cleanupError);
        }
        throw permissionError;
      }

      // Save to localStorage
      const anchorKey = `anchor_${selectedDeviceId}`;
      await localStorageAsync.setItem(anchorKey, geofence.id);

      // Update state
      setIsAnchored(true);
      setAnchorGeofenceId(geofence.id);

      // Refresh geofences list and map
      await refreshGeofences();

    } catch (error) {
      console.error('Error creating anchor:', error);
    } finally {
      setIsAnchorLoading(false);
    }
  }, [selectedDeviceId, position, device, refreshGeofences]);

  const handleDeleteAnchor = useCallback(async () => {
    if (!selectedDeviceId || !anchorGeofenceId) return;

    setIsAnchorLoading(true);
    try {
      // Delete geofence
      await fetchOrThrow(`/api/geofences/${anchorGeofenceId}`, {
        method: 'DELETE',
      });

      // Remove from localStorage
      const anchorKey = `anchor_${selectedDeviceId}`;
      await localStorageAsync.removeItem(anchorKey);

      // Update state
      setIsAnchored(false);
      setAnchorGeofenceId(null);

      // Refresh geofences list and map
      await refreshGeofences();

    } catch (error) {
      console.error('Error deleting anchor:', error);
    } finally {
      setIsAnchorLoading(false);
    }
  }, [selectedDeviceId, anchorGeofenceId, refreshGeofences]);

  const handleAnchorClick = useCallback(() => {
    if (isAnchored) {
      handleDeleteAnchor();
    } else {
      handleCreateAnchor();
    }
  }, [isAnchored, handleCreateAnchor, handleDeleteAnchor]);

  // Helper function to get custom commands from device attributes
  const getCustomCommands = useCallback((device) => {
    if (!device?.attributes?.customCommands) return null;
    
    try {
      return JSON.parse(device.attributes.customCommands);
    } catch (error) {
      console.error('Error parsing customCommands:', error);
      return null;
    }
  }, []);

  // Lock open confirmation handlers
  const confirmLockOpen = useCallback(async () => {
    setShowLockOpenConfirmation(false);
    
    if (!selectedDeviceId || !device) return;

    setIsLockOpenLoading(true);
    try {
      const customCommands = getCustomCommands(device);
      let commandType = 'engineResume';
      let successMessage = t('commandQueued');

      // Check if custom command exists
      if (customCommands?.engineResume) {
        commandType = customCommands.engineResume;
        successMessage = `${t('commandQueued')}: ${customCommands.engineResume}`;
      }

      const commandPayload = {
        type: commandType,
        attributes: {},
        deviceId: selectedDeviceId
      };

      const response = await fetchOrThrow('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandPayload),
      });

      if (response.ok) {
        // Show success message with custom command info if applicable
        setSuccessMessage(successMessage);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    } catch (error) {
      console.error('Error sending engineResume command:', error);
      dispatch(errorsActions.push(error.message));
    } finally {
      setIsLockOpenLoading(false);
    }
  }, [selectedDeviceId, device, getCustomCommands, t, dispatch]);

  const cancelLockOpen = useCallback(() => {
    setShowLockOpenConfirmation(false);
  }, []);

  // Lock closed confirmation handlers
  const confirmLockClosed = useCallback(async () => {
    setShowLockClosedConfirmation(false);
    
    if (!selectedDeviceId || !device) return;

    setIsLockClosedLoading(true);
    try {
      const customCommands = getCustomCommands(device);
      let commandType = 'engineStop';
      let successMessage = t('commandQueued');

      // Check if custom command exists
      if (customCommands?.engineStop) {
        commandType = customCommands.engineStop;
        successMessage = `${t('commandQueued')}: ${customCommands.engineStop}`;
      }

      const commandPayload = {
        type: commandType,
        attributes: {},
        deviceId: selectedDeviceId
      };

      const response = await fetchOrThrow('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandPayload),
      });

      if (response.ok) {
        // Show success message with custom command info if applicable
        setSuccessMessage(successMessage);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    } catch (error) {
      console.error('Error sending engineStop command:', error);
      dispatch(errorsActions.push(error.message));
    } finally {
      setIsLockClosedLoading(false);
    }
  }, [selectedDeviceId, device, getCustomCommands, t, dispatch]);

  const cancelLockClosed = useCallback(() => {
    setShowLockClosedConfirmation(false);
  }, []);

  // Lock open button handler - show confirmation dialog
  const handleLockOpen = useCallback(() => {
    if (!selectedDeviceId || !device) return;
    setShowLockOpenConfirmation(true);
  }, [selectedDeviceId, device]);

  // Lock closed button handler - show confirmation dialog
  const handleLockClosed = useCallback(() => {
    if (!selectedDeviceId || !device) return;
    setShowLockClosedConfirmation(true);
  }, [selectedDeviceId, device]);

  // Clear replay positions when device selection changes
  useEffect(() => {
    dispatch(sessionActions.updateReplayPositions([]));
    setCurrentReplayIndex(0);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [selectedDeviceId, dispatch]);

  // Replay form handlers
  const handleReplayShow = useCallback(async () => {
    if (!replayDeviceId) return;

    setReplayLoading(true);
    dispatch(sessionActions.updateReplayPositions([])); // Clear previous positions when starting new search
    setCurrentReplayIndex(0);
    dispatch(sessionActions.updateCurrentReplayIndex(0));
    setIsPlaying(false);
    try {
      let selectedFrom;
      let selectedTo;
      
      switch (period) {
        case 'today':
          selectedFrom = dayjs().startOf('day');
          selectedTo = dayjs().endOf('day');
          break;
        case 'yesterday':
          selectedFrom = dayjs().subtract(1, 'day').startOf('day');
          selectedTo = dayjs().subtract(1, 'day').endOf('day');
          break;
        case 'thisWeek':
          selectedFrom = dayjs().startOf('week');
          selectedTo = dayjs().endOf('week');
          break;
        case 'previousWeek':
          selectedFrom = dayjs().subtract(1, 'week').startOf('week');
          selectedTo = dayjs().subtract(1, 'week').endOf('week');
          break;
        case 'thisMonth':
          selectedFrom = dayjs().startOf('month');
          selectedTo = dayjs().endOf('month');
          break;
        case 'previousMonth':
          selectedFrom = dayjs().subtract(1, 'month').startOf('month');
          selectedTo = dayjs().subtract(1, 'month').endOf('month');
          break;
        default:
          selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
          selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
          break;
      }

      const query = new URLSearchParams({
        deviceId: replayDeviceId,
        from: selectedFrom.toISOString(),
        to: selectedTo.toISOString()
      });

      
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`);
      const positions = await response.json();
      
             
             // Store positions for map plotting
             dispatch(sessionActions.updateReplayPositions(positions));
             
             if (!positions.length) {
             }
      
    } catch (error) {
      console.error('Error fetching replay data:', error);
    } finally {
      setReplayLoading(false);
    }
  }, [replayDeviceId, period, customFrom, customTo, dispatch]);

  // Replay control handlers
  const handlePlay = useCallback(() => {
    if (!replayPositions.length || isPlaying) return;
    
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentReplayIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= replayPositions.length) {
          setIsPlaying(false);
          return prevIndex; // Stay at last position
        }
        // Update Redux state
        dispatch(sessionActions.updateCurrentReplayIndex(nextIndex));
        return nextIndex;
      });
    }, 1000 / playbackSpeed);
  }, [replayPositions, isPlaying, playbackSpeed, dispatch]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);


  // Screenshot handler
  const handleScreenshot = useCallback(async () => {
    if (!replayPositions.length || isScreenshotting) return;
    
    setIsScreenshotting(true);
    
    try {
      // Calculate bounding box from all replay positions
      const lngs = replayPositions.map(p => p.longitude);
      const lats = replayPositions.map(p => p.latitude);
      
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      
      // Add some padding around the route
      const padding = 0.01; // Adjust this value for more/less padding
      const bounds = [
        [minLng - padding, minLat - padding], // Southwest corner
        [maxLng + padding, maxLat + padding]  // Northeast corner
      ];
      
      // Fit map to the route bounds
      map.fitBounds(bounds, {
        padding: 50, // Add padding around the bounds
        duration: 1000 // Animation duration
      });
      
      // Wait for map to finish rendering and fitting
      await new Promise(resolve => {
        map.once('idle', resolve);
        // Also add a timeout as fallback
        setTimeout(resolve, 2000);
      });
      
      // Wait a bit more to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the map canvas
      const canvas = map.getCanvas();
      console.log('Canvas found:', canvas);
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      
      // Check if canvas is ready and has content
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas not ready or has zero dimensions');
      }
      
      // Try to get image data from canvas
      let dataURL;
      try {
        console.log('Attempting map screenshot capture...');
        
        // Method 1: Try using map's built-in export functionality
        console.log('Trying map.getStyle() export...');
        try {
          // Get the current map style as a static image
          const style = map.getStyle();
          console.log('Map style loaded:', !!style);
          
          // Try to export the map as a static image
          const mapCanvas = map.getCanvas();
          console.log('Canvas element:', mapCanvas);
          console.log('Canvas dimensions:', mapCanvas.width, 'x', mapCanvas.height);
          
          // Force a repaint and wait
          map.triggerRepaint();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to get the canvas as a blob first
          const blob = await new Promise((resolve, reject) => {
            mapCanvas.toBlob((blob) => {
              if (blob) {
                console.log('Blob created, size:', blob.size);
                resolve(blob);
              } else {
                reject(new Error('toBlob returned null'));
              }
            }, 'image/png', 1.0);
          });
          
          if (blob && blob.size > 1000) {
            dataURL = URL.createObjectURL(blob);
            console.log('Blob method successful, size:', blob.size);
          } else {
            throw new Error('Blob too small or null');
          }
          
        } catch (blobError) {
          console.log('Blob method failed:', blobError.message);
          
          // Method 2: Try direct toDataURL
          console.log('Trying direct toDataURL...');
          const mapCanvas = map.getCanvas();
          dataURL = mapCanvas.toDataURL('image/png', 1.0);
          console.log('Direct toDataURL length:', dataURL.length);
          
          if (dataURL.length < 1000) {
            throw new Error('Direct toDataURL too short');
          }
        }
        
        // Method 3: If still no success, try a different approach
        if (!dataURL || dataURL.length < 1000) {
          console.log('Trying alternative approach...');
          
          // Create a new map instance temporarily for export
          const mapContainer = map.getContainer();
          const tempDiv = document.createElement('div');
          tempDiv.style.width = mapContainer.offsetWidth + 'px';
          tempDiv.style.height = mapContainer.offsetHeight + 'px';
          tempDiv.style.position = 'absolute';
          tempDiv.style.top = '-9999px';
          tempDiv.style.left = '-9999px';
          document.body.appendChild(tempDiv);
          
          try {
            // Create a temporary map with the same style and data
            const tempMap = new (await import('maplibre-gl')).Map({
              container: tempDiv,
              style: map.getStyle(),
              center: map.getCenter(),
              zoom: map.getZoom(),
              bearing: map.getBearing(),
              pitch: map.getPitch()
            });
            
            // Wait for the temp map to load
            await new Promise(resolve => {
              tempMap.on('idle', resolve);
              setTimeout(resolve, 3000); // Fallback timeout
            });
            
            // Add the same data sources and layers
            // const sources = map.getStyle().sources;
            // const layers = map.getStyle().layers;
            
            // Add replay positions as a source
            tempMap.addSource('replay-positions', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: replayPositions.map(pos => ({
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [pos.longitude, pos.latitude]
                  },
                  properties: {}
                }))
              }
            });
            
            // Add a line layer for the route
            tempMap.addLayer({
              id: 'replay-route',
              type: 'line',
              source: 'replay-positions',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#ff0000',
                'line-width': 3
              }
            });
            
            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Capture the temp map
            const tempCanvas = tempMap.getCanvas();
            dataURL = tempCanvas.toDataURL('image/png', 1.0);
            console.log('Temp map DataURL length:', dataURL.length);
            
            // Clean up
            tempMap.remove();
            document.body.removeChild(tempDiv);
            
          } catch (tempMapError) {
            console.error('Temp map method failed:', tempMapError);
            if (tempDiv.parentNode) {
              document.body.removeChild(tempDiv);
            }
          }
        }
        
        if (!dataURL || dataURL.length < 1000) {
          throw new Error('All capture methods failed to produce valid image data');
        }
        
      } catch (canvasError) {
        console.error('All canvas methods failed:', canvasError);
        throw new Error('Failed to capture map screenshot: ' + canvasError.message);
      }
      
      // Create download link
      const link = document.createElement('a');
      link.download = `route-screenshot-${device?.name || 'device'}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataURL;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL if we used it
      if (dataURL.startsWith('blob:')) {
        URL.revokeObjectURL(dataURL);
      }
      
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      alert(`Failed to capture screenshot: ${error.message}`);
    } finally {
      setIsScreenshotting(false);
    }
  }, [replayPositions, device?.name, isScreenshotting]);

  const handleSliderChange = useCallback((event) => {
    const newIndex = parseInt(event.target.value);
    setCurrentReplayIndex(newIndex);
    dispatch(sessionActions.updateCurrentReplayIndex(newIndex));
  }, [dispatch]);

  const handleCloseReplayPopover = useCallback(() => {
    setShowReplayPopover(false);
    
    // Clear all replay-related state variables
    setReplayDeviceId(null);
    setPeriod('today');
    setCustomFrom('');
    setCustomTo('');
    setReplayLoading(false);
    setIsPlaying(false);
    setPlaybackSpeed(1);
    
    // Clear local and Redux replay state
    setCurrentReplayIndex(0);
    dispatch(sessionActions.updateCurrentReplayIndex(0));
    dispatch(sessionActions.updateReplayPositions([]));
    
    // Clear interval if running
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Hide replay popover when device list is shown
  useEffect(() => {
    if (isDeviceListVisible && showReplayPopover) {
      setShowReplayPopover(false);
    }
  }, [isDeviceListVisible, showReplayPopover, setShowReplayPopover]);

  // Handle replay mode changes - ensure proper data source switching
  useEffect(() => {
    // When exiting replay mode, reset to first position and stop playback
    if (!showReplayPopover && replayPositions.length > 0) {
      setCurrentReplayIndex(0);
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [showReplayPopover, replayPositions.length]);

  // Close replay popover when status card is closed (selectedDeviceId becomes null)
  // But not when we're intentionally entering replay mode (replayDeviceId is set)
  useEffect(() => {
    if (!selectedDeviceId && showReplayPopover && !replayDeviceId) {
      handleCloseReplayPopover();
    }
  }, [selectedDeviceId, showReplayPopover, replayDeviceId, handleCloseReplayPopover]);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10B981';
      case 'offline': return '#EF4444';
      case 'unknown': return '#F59E0B';
      default: return '#6B7280';
    }
  };
  
  
  
  return (
    <>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
    <AnimatePresence mode="wait">
      {((selectedDeviceId && device) || (showReplayPopover && replayDeviceId && devices[replayDeviceId])) && (
        <motion.div
          key={`status-card-${selectedDeviceId}`}
          initial={{ x: !desktop ? 0 : -400, y: !desktop ? 100 : 0, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={{ x: !desktop ? 0 : -400, y: !desktop ? 100 : 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: 'fixed',
          top: !desktop ? 'auto' : '8px',
          bottom: !desktop ? '0px' : 'auto',
          left: !desktop ? '0px' : (isDeviceListVisible || showReplayPopover ? (isMenuExpanded ? '510px' : '370px') : (isMenuExpanded ? '200px' : '63px')),
          width: !desktop ? '100vw' : '310px',
          height: !desktop ? '47vh' : 'calc(100vh - 16px)',
          zIndex: 9998,
          pointerEvents: 'auto',
          transition: 'left 0.3s ease'
        }}
      >
        <Card style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: !desktop ? '16px 16px 0px 0px' : (isDeviceListVisible ? '0px 16px 16px 0px' : '0px 16px 16px 0px'),
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: !desktop ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Back Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch(devicesActions.selectId(null));
            }}
            style={{
              position: !desktop ? 'fixed' : 'absolute',
              top: !desktop ? '10px' : '12px',
              left: !desktop ? '10px' : '12px',
              zIndex: !desktop ? 10000 : 10,
              width: !desktop ? '34px' : '32px',
              height: !desktop ? '34px' : '32px',
              borderRadius: !desktop ? '12px' : '0px',
              backgroundColor: !desktop ? colors.surface : 'transparent',
              border: 'none',
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: !desktop ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'none',
              ...(desktop ? {} : {
                outline: 'none !important',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              })
            }}
          >
            <ChevronLeft size={20} color={colors.textSecondary} />
          </button>

          {/* Details Button - Hidden in replay mode */}
          {!showReplayPopover && (
            <button
              onClick={handleMoreDetails}
              style={{
                position: 'absolute',
                top: !desktop ? '8px' : '12px',
                right: !desktop ? '7px' : '12px',
                zIndex: 10,
                width: '32px',
                height: '32px',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <InfoOutlinedIcon style={{ fontSize: '20px', color: colors.textSecondary }} />
            </button>
          )}
          
          {/* Header */}
          <div style={{
            padding: '20px',
            backgroundColor: colors.surface
          }}>
            {!desktop ? (
              /* Mobile Layout - 2 Columns */
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* Column 1: Picture and Speed */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '80px' }}>
                  {/* Device Image */}
                  <div 
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: colors.secondary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: `3px solid ${getStatusColor(device.status)}`,
                      position: 'relative',
                      cursor: device.attributes?.deviceImage ? 'pointer' : 'default'
                    }}
                    onMouseMove={(e) => {
                      if (device.attributes?.deviceImage) {
                        let tooltip = document.getElementById('device-image-tooltip');
                        if (!tooltip) {
                          tooltip = document.createElement('div');
                          tooltip.id = 'device-image-tooltip';
                          tooltip.style.cssText = `
                            position: fixed;
                            z-index: 10000;
                            pointer-events: none;
                            border-radius: 8px;
                            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                            max-width: 300px;
                            max-height: 300px;
                          `;
                          const img = document.createElement('img');
                          img.src = `/api/media/${device.uniqueId}/${device.attributes.deviceImage}`;
                          img.style.cssText = `
                            width: auto;
                            height: auto;
                            max-width: 100%;
                            max-height: 100%;
                            border-radius: 8px;
                            display: block;
                          `;
                          tooltip.appendChild(img);
                          document.body.appendChild(tooltip);
                        }
                        // Position bottom-left of image at mouse pointer
                        tooltip.style.left = `${e.clientX}px`;
                        tooltip.style.top = `${e.clientY}px`;
                        tooltip.style.transform = 'translateY(-100%)';
                      }
                    }}
                    onMouseLeave={() => {
                      const tooltip = document.getElementById('device-image-tooltip');
                      if (tooltip) {
                        tooltip.remove();
                      }
                    }}
                  >
                    <img 
                      style={{ 
                        width: '60px', 
                        height: '60px', 
                        objectFit: 'cover', 
                        borderRadius: '50%',
                        display: device.attributes?.deviceImage ? 'block' : 'none'
                      }} 
                      src={device.attributes?.deviceImage ? `/api/media/${device.uniqueId}/${device.attributes.deviceImage}` : ''} 
                      alt=""
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div style={{
                      width: '60px',
                      height: '60px',
                      display: device.attributes?.deviceImage ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#E5E7EB',
                      borderRadius: '50%'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Speed */}
                  {position && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Gauge size={12} color={colors.textSecondary} />
                      <span style={{ fontSize: '11px', color: colors.textSecondary, fontWeight: '500' }}>
                        {position.speed ? formatSpeed(position.speed, speedUnit, t) : formatSpeed(0, speedUnit, t)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Column 2: Device Name, Status, Address */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Chevron and space for alignment */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    {/* Chevron placeholder for alignment */}
                    <div style={{ width: '20px' }} />
                    
                    {/* Empty space to preserve layout */}
                    <div style={{ flex: 1 }} />
                  </div>

                  {/* Device Name centered */}
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: colors.text,
                    margin: !desktop ? '-30px 0 0 0' : '0',
                    lineHeight: '1.2',
                    textAlign: 'center'
                  }}>
                    {device[devicePrimary]}
                  </h3>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(device.status)
                    }} />
                    <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: '500' }}>
                      {t(`deviceStatus${device.status.charAt(0).toUpperCase() + device.status.slice(1)}`)}
                    </span>
                  </div>

                  {/* Address */}
                  <p style={{
                    fontSize: '12px',
                    color: colors.textSecondary,
                    margin: 0,
                    lineHeight: '1.4'
                  }}>
                    {position?.address || (position?.latitude && position?.longitude ?
                      `${formatCoordinate('latitude', position.latitude, coordinateFormat)}, ${formatCoordinate('longitude', position.longitude, coordinateFormat)}` :
                      t('sharedNoData'))}
                  </p>
                </div>
              </div>
            ) : (
              /* Desktop Layout - Original */
              <>
                {/* Chevron and uniqueId on first line, Device Name below */}
                <div style={{ marginBottom: '16px' }}>
                  {/* Chevron and space for alignment */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    {/* Chevron placeholder for alignment */}
                    <div style={{ width: '20px' }} />
                    
                    {/* Empty space to preserve layout */}
                    <div style={{ flex: 1 }} />
                  </div>

                  {/* Device Name centered */}
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: colors.text,
                    margin: !desktop ? '-30px 0 0 0' : '0',
                    lineHeight: '1.2',
                    textAlign: 'center'
                  }}>
                    {device[devicePrimary]}
                  </h3>
                </div>

            {/* Device Image */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div 
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: colors.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: `3px solid ${getStatusColor(device.status)}`,
                  position: 'relative',
                  cursor: device.attributes?.deviceImage ? 'pointer' : 'default'
                }}
                onMouseMove={(e) => {
                  if (device.attributes?.deviceImage) {
                    let tooltip = document.getElementById('device-image-tooltip');
                    if (!tooltip) {
                      tooltip = document.createElement('div');
                      tooltip.id = 'device-image-tooltip';
                      tooltip.style.cssText = `
                        position: fixed;
                        z-index: 10000;
                        pointer-events: none;
                        border-radius: 8px;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                        max-width: 300px;
                        max-height: 300px;
                      `;
                      const img = document.createElement('img');
                      img.src = `/api/media/${device.uniqueId}/${device.attributes.deviceImage}`;
                      img.style.cssText = `
                        width: auto;
                        height: auto;
                        max-width: 100%;
                        max-height: 100%;
                        border-radius: 8px;
                        display: block;
                      `;
                      tooltip.appendChild(img);
                      document.body.appendChild(tooltip);
                    }
                    // Position bottom-left of image at mouse pointer
                    tooltip.style.left = `${e.clientX}px`;
                    tooltip.style.top = `${e.clientY}px`;
                    tooltip.style.transform = 'translateY(-100%)';
                  }
                }}
                onMouseLeave={() => {
                  const tooltip = document.getElementById('device-image-tooltip');
                  if (tooltip) {
                    tooltip.remove();
                  }
                }}
              >
                <img 
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    objectFit: 'cover', 
                    borderRadius: '50%',
                    display: device.attributes?.deviceImage ? 'block' : 'none'
                  }} 
                  src={device.attributes?.deviceImage ? `/api/media/${device.uniqueId}/${device.attributes.deviceImage}` : ''} 
                  alt=""
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{
                  width: '120px',
                  height: '120px',
                  display: device.attributes?.deviceImage ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '50%'
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Status and Speed */}
            <div style={{ textAlign: 'left', marginBottom: '8px' }}>
              <div style={{ marginBottom: '0px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(device.status)
                    }} />
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                      {t(`deviceStatus${device.status.charAt(0).toUpperCase() + device.status.slice(1)}`)}
                    </span>
                  </div>
                  
                  {/* Speed */}
                  {position && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Gauge size={14} color={colors.textSecondary} />
                      <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                        {position.speed ? formatSpeed(position.speed, speedUnit, t) : formatSpeed(0, speedUnit, t)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <p style={{
                fontSize: '12px',
                color: colors.textSecondary,
                margin: 0,
                lineHeight: '1.4'
              }}>
                {position?.address || (position?.latitude && position?.longitude ?
                  `${formatCoordinate('latitude', position.latitude, coordinateFormat)}, ${formatCoordinate('longitude', position.longitude, coordinateFormat)}` :
                  t('sharedNoData'))}
              </p>
            </div>
              </>
            )}
            
            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-around',
              gap: '4px',
              width: '100%',
              marginTop: !desktop ? '12px' : '0px',
              minHeight: !desktop ? '58px' : '42px'
            }}>
              {/* Button 1 - Lock Open (Outlined) */}
              <button
                onClick={handleLockOpen}
                disabled={isLockOpenLoading || !selectedDeviceId}
                style={{
                  width: !desktop ? '58px' : '42px',
                  height: !desktop ? '58px' : '42px',
                  minWidth: !desktop ? '58px' : '42px',
                  minHeight: !desktop ? '58px' : '42px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.textSecondary}`,
                  backgroundColor: 'transparent',
                  cursor: (isLockOpenLoading || !selectedDeviceId) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box',
                  opacity: (isLockOpenLoading || !selectedDeviceId) ? 0.5 : 1
                }}
              >
                {isLockOpenLoading ? (
                  <Loader2 size={16} color={colors.textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                <LockOpenIcon style={{ fontSize: '20px', color: colors.textSecondary }} />
                )}
              </button>
              
              {/* Button 2 - Lock Closed (Outlined) */}
              <button
                onClick={handleLockClosed}
                disabled={isLockClosedLoading || !selectedDeviceId}
                style={{
                  width: !desktop ? '58px' : '42px',
                  height: !desktop ? '58px' : '42px',
                  minWidth: !desktop ? '58px' : '42px',
                  minHeight: !desktop ? '58px' : '42px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.textSecondary}`,
                  backgroundColor: 'transparent',
                  cursor: (isLockClosedLoading || !selectedDeviceId) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box',
                  opacity: (isLockClosedLoading || !selectedDeviceId) ? 0.5 : 1
                }}
              >
                {isLockClosedLoading ? (
                  <Loader2 size={16} color={colors.textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                <LockOutlinedIcon style={{ fontSize: '20px', color: colors.textSecondary }} />
                )}
              </button>
              
              {/* Button 3 - Refresh (Outlined) - Hidden on mobile */}
              {desktop && (
                <button
             onClick={(e) => {
               e.stopPropagation(); // Prevent event bubbling to map
               
               // Store the current deviceId for replay
               setReplayDeviceId(selectedDeviceId);
               
               // Hide device list but keep device selection
               onHideDeviceList();
               
               // Initialize form with current time
               const now = dayjs();
               setCustomFrom(now.subtract(1, 'hour').format('YYYY-MM-DDTHH:mm'));
               setCustomTo(now.format('YYYY-MM-DDTHH:mm'));
               
               // Show popover and close device list
               setShowReplayPopover(true);
               onHideDeviceList();
               
             }}
                  style={{
                    width: '42px',
                    height: '42px',
                    minWidth: '42px',
                    minHeight: '42px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.textSecondary}`,
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    boxSizing: 'border-box'
                  }}
                >
                  <RefreshOutlinedIcon style={{ fontSize: '20px', color: colors.textSecondary }} />
                </button>
              )}
              
              {/* Button 4 - Send Commands (Outlined) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCommandDialog(true);
                }}
                style={{
                  width: !desktop ? '58px' : '42px',
                  height: !desktop ? '58px' : '42px',
                  minWidth: !desktop ? '58px' : '42px',
                  minHeight: !desktop ? '58px' : '42px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.textSecondary}`,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box'
                }}
              >
                <UploadIcon style={{ fontSize: '20px', color: colors.textSecondary }} />
              </button>
              
              
              {/* Button 6 - Anchor (Outlined) */}
              <button
                onClick={handleAnchorClick}
                disabled={isAnchorLoading || !position}
                style={{
                  width: !desktop ? '58px' : '42px',
                  height: !desktop ? '58px' : '42px',
                  minWidth: !desktop ? '58px' : '42px',
                  minHeight: !desktop ? '58px' : '42px',
                  borderRadius: '8px',
                  border: `1px solid ${isAnchored ? '#10B981' : colors.textSecondary}`,
                  backgroundColor: isAnchored ? '#D1FAE5' : 'transparent',
                  cursor: (isAnchorLoading || !position) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box',
                  opacity: (isAnchorLoading || !position) ? 0.5 : 1
                }}
              >
                {isAnchorLoading ? (
                  <Loader2 size={16} color={isAnchored ? '#10B981' : colors.textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <AnchorIcon style={{ fontSize: '20px', color: isAnchored ? '#10B981' : colors.textSecondary }} />
                )}
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div style={{
            flex: 1,
            padding: '4px 16px 16px 16px',
            overflow: 'auto'
          }}>
            
            {/* Position Attributes */}
            {position && (
              <div style={{ marginBottom: '8px' }}>
                {positionItems.split(',').filter((key) => key && key !== 'address' && (position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key))).map((key, index) => {
                  const attributeName = positionAttributes[key]?.name || key;
                  const value = position.hasOwnProperty(key) ? position[key] : position.attributes[key];
                  
                  return (
                    <div key={`position-${key || 'empty'}-${index}`} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      borderBottom: `1px solid ${colors.border}`
                    }}>
                      <span style={{
                        fontSize: '12px',
                        color: colors.textSecondary,
                        fontWeight: '500'
                      }}>
                        {attributeName}
                      </span>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: colors.text
                        }}>
                          {key === 'fixTime' || key === 'deviceTime' || key === 'serverTime' ? 
                            formatTime(value, 'seconds') :
                          key === 'speed' ? 
                            formatSpeed(value, speedUnit, t) :
                          key === 'course' ? 
                            formatCourse(value, t) :
                          key === 'altitude' ? 
                            formatAltitude(value, altitudeUnit, t) :
                      key === 'accuracy' || key === 'odometer' || key === 'serviceOdometer' || 
                      key === 'tripOdometer' || key === 'obdOdometer' || key === 'distance' || 
                      key === 'totalDistance' ? 
                        formatDistance(value, distanceUnit, t) :
                          key === 'batteryLevel' ? 
                            formatPercentage(value) :
                          key === 'battery' ? 
                            formatVoltage(value, t) :
                      key === 'fuel' ? 
                        formatVolume(value, volumeUnit, t) :
                      key === 'hours' ? 
                        formatNumericHours(value, t) :
                      key === 'ignition' || key === 'motion' || key === 'armed' ? 
                        formatBoolean(value, t) :
                      key === 'alarm' ? 
                        formatAlarm(value, t) :
                          key === 'latitude' || key === 'longitude' ? 
                            formatCoordinate(key, value, coordinateFormat) :
                          key === 'address' ? 
                            value || t('sharedUnknown') :
                          value !== null && value !== undefined && typeof value === 'number' ? 
                            formatNumber(value, 2) :
                            value || t('sharedUnknown')}
                        </span>
                        {!deviceReadonly && (key === 'totalDistance' || key === 'hours') && (
                          <button
                            onClick={() => handleEditField(key, value)}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '2px'
                            }}
                          >
                            <Settings size={14} color={colors.textSecondary} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
      )}

      {/* More Details Modal */}
      <AnimatePresence>
        {showDetailsModal && (
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
              zIndex: 10002
            }}
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '8px',
                width: '90vw',
                maxWidth: '800px',
                maxHeight: '70vh',
                overflow: 'hidden',
                boxShadow: colors.shadow
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: '20px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '600',
                  color: colors.text
                }}>
                  {device?.name} {t('sharedDetails')}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: colors.secondary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={16} color={colors.textSecondary} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{
                padding: '20px',
                maxHeight: 'calc(80vh - 80px)',
                overflowY: 'auto'
              }}>
                {isLoadingDetails ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px',
                    gap: '16px'
                  }}>
                    <Loader2 size={32} color={colors.textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : detailedPosition ? (
                  <div>
                    
                    {/* Position Properties Table */}
                    <div style={{
                      backgroundColor: colors.surface,
                      overflow: 'hidden',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{
                        backgroundColor: colors.secondary,
                        padding: '12px 16px',
                        borderBottom: `1px solid ${colors.border}`
                      }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: desktop ? '20% 20% 60%' : '30% 70%',
                          gap: '16px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: colors.textSecondary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {desktop && <div>{t('stateName')}</div>}
                          <div>{t('sharedName')}</div>
                          <div>{t('stateValue')}</div>
                        </div>
                      </div>
                      
                      <div style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden' }}>
                        {/* Position Properties */}
                        {Object.getOwnPropertyNames(detailedPosition).filter((it) => it && it !== 'attributes').map((property, propIndex) => {
                          const value = detailedPosition[property];
                          return (
                            <div key={`property-${property || 'empty'}-${propIndex}`} style={{
                              display: 'grid',
                              gridTemplateColumns: desktop ? '20% 20% 60%' : '30% 70%',
                              gap: '16px',
                              padding: '8px 16px',
                              borderBottom: `1px solid ${colors.border}`,
                              fontSize: '12px',
                              lineHeight: '1.4',
                              minHeight: '32px'
                            }}>
                              {desktop && (
                                <div style={{ color: colors.textSecondary, fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
                                  {property}
                                </div>
                              )}
                              <div style={{ color: colors.text, fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                                {positionAttributes[property]?.name || property}
                              </div>
                              <div style={{ 
                                color: colors.text, 
                                textAlign: 'right', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'flex-end', 
                                gap: '8px', 
                                flexWrap: 'wrap', 
                                paddingLeft: '16px', 
                                paddingRight: '8px' 
                              }}>
                                <div style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4', overflowX: 'hidden', overflowY: 'visible', paddingRight: (property === 'totalDistance' || property === 'hours') ? '4px' : '16px' }}>
                                  {property === 'fixTime' || property === 'deviceTime' || property === 'serverTime' ? 
                                    formatTime(value, 'seconds') :
                                property === 'speed' ? 
                                  formatSpeed(value, speedUnit, t) :
                                property === 'course' ? 
                                  formatCourse(value, t) :
                                property === 'altitude' ? 
                                  formatAltitude(value, altitudeUnit, t) :
                              property === 'accuracy' || property === 'odometer' || property === 'serviceOdometer' || 
                              property === 'tripOdometer' || property === 'obdOdometer' || property === 'distance' || 
                              property === 'totalDistance' ? 
                                formatDistance(value, distanceUnit, t) :
                                  property === 'batteryLevel' ? 
                                    formatPercentage(value) :
                                  property === 'battery' ? 
                                    formatVoltage(value, t) :
                                property === 'fuel' ? 
                                  formatVolume(value, volumeUnit, t) :
                                property === 'hours' ? 
                                  formatNumericHours(value, t) :
                                property === 'ignition' || property === 'motion' || property === 'armed' ? 
                                  formatBoolean(value, t) :
                                property === 'alarm' ? 
                                  formatAlarm(value, t) :
                                  property === 'latitude' || property === 'longitude' ? 
                                    formatCoordinate(property, value, coordinateFormat) :
                                  property === 'address' ? 
                                    value || t('sharedUnknown') :
                                  value !== null && value !== undefined && typeof value === 'number' ? 
                                    formatNumber(value, 2) :
                                  value !== null && value !== undefined && typeof value === 'object' ? 
                                    JSON.stringify(value) :
                                    value || t('sharedUnknown')}
                              </div>
                              {!deviceReadonly && (property === 'totalDistance' || property === 'hours') && (
                                <button
                                  onClick={() => handleEditField(property, detailedPosition[property])}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                    marginRight: '16px',
                                    padding: '2px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = colors.secondary;
                                    e.target.style.borderColor = colors.border;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.borderColor = colors.border;
                                  }}
                                  onMouseDown={(e) => {
                                    e.target.style.backgroundColor = colors.hover;
                                  }}
                                  onMouseUp={(e) => {
                                    e.target.style.backgroundColor = colors.secondary;
                                  }}
                                >
                                  <Settings size={14} color={colors.textSecondary} />
                                </button>
                              )}
                            </div>
                          </div>
                          );
                        })}
                        
                        {/* Position Attributes */}
                        {Object.getOwnPropertyNames(detailedPosition.attributes).filter((attr) => attr).map((attribute, attrIndex) => {
                          const value = detailedPosition.attributes[attribute];
                          return (
                            <div key={`attribute-${attribute || 'empty'}-${attrIndex}`} style={{
                              display: 'grid',
                              gridTemplateColumns: desktop ? '20% 20% 60%' : '30% 70%',
                              gap: '16px',
                              padding: '8px 16px',
                              borderBottom: `1px solid ${colors.border}`,
                              fontSize: '12px',
                              lineHeight: '1.4',
                              minHeight: '32px'
                            }}>
                              {desktop && (
                                <div style={{ color: colors.textSecondary, fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
                                  {attribute}
                                </div>
                              )}
                              <div style={{ color: colors.text, fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                                {positionAttributes[attribute]?.name || attribute}
                              </div>
                              <div style={{ 
                                color: colors.text, 
                                textAlign: 'right', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'flex-end', 
                                gap: '8px', 
                                flexWrap: 'wrap', 
                                paddingLeft: '16px', 
                                paddingRight: '8px' 
                              }}>
                                <div style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4', overflowX: 'hidden', overflowY: 'visible', paddingRight: (attribute === 'totalDistance' || attribute === 'hours') ? '4px' : '16px' }}>
                                  {attribute === 'fixTime' || attribute === 'deviceTime' || attribute === 'serverTime' ? 
                                    formatTime(value, 'seconds') :
                                attribute === 'speed' ? 
                                  formatSpeed(value, speedUnit, t) :
                                attribute === 'course' ? 
                                  formatCourse(value, t) :
                                attribute === 'altitude' ? 
                                  formatAltitude(value, altitudeUnit, t) :
                                attribute === 'accuracy' || attribute === 'odometer' || attribute === 'serviceOdometer' || 
                                attribute === 'tripOdometer' || attribute === 'obdOdometer' || attribute === 'distance' || 
                                attribute === 'totalDistance' ? 
                                formatDistance(value, distanceUnit, t) :
                                  attribute === 'batteryLevel' ? 
                                    formatPercentage(value) :
                                  attribute === 'battery' ? 
                                    formatVoltage(value, t) :
                                attribute === 'fuel' ? 
                                  formatVolume(value, volumeUnit, t) :
                                attribute === 'hours' ? 
                                  formatNumericHours(value, t) :
                                attribute === 'ignition' || attribute === 'motion' || attribute === 'armed' ? 
                                  formatBoolean(value, t) :
                                attribute === 'alarm' ? 
                                  formatAlarm(value, t) :
                                  attribute === 'latitude' || attribute === 'longitude' ? 
                                    formatCoordinate(attribute, value, coordinateFormat) :
                                  attribute === 'address' ? 
                                    value || t('sharedUnknown') :
                                  value !== null && value !== undefined && typeof value === 'number' ? 
                                    formatNumber(value, 2) :
                                  value !== null && value !== undefined && typeof value === 'object' ? 
                                    JSON.stringify(value) :
                                    value || t('sharedUnknown')}
                              </div>
                              {!deviceReadonly && (attribute === 'totalDistance' || attribute === 'hours') && (
                                <button
                                  onClick={() => handleEditField(attribute, detailedPosition.attributes[attribute])}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                    marginRight: '16px',
                                    padding: '2px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = colors.secondary;
                                    e.target.style.borderColor = colors.border;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.borderColor = colors.border;
                                  }}
                                  onMouseDown={(e) => {
                                    e.target.style.backgroundColor = colors.hover;
                                  }}
                                  onMouseUp={(e) => {
                                    e.target.style.backgroundColor = colors.secondary;
                                  }}
                                >
                                  <Settings size={14} color={colors.textSecondary} />
                                </button>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px',
                    gap: '16px'
                  }}>
                    <p                     style={{
                      margin: 0,
                      fontSize: '16px',
                      color: colors.textSecondary
                    }}>
                      {t('sharedNoData')}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
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
              zIndex: 10004
            }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '8px',
                width: '400px',
                maxWidth: '90vw',
                overflow: 'hidden',
                boxShadow: colors.shadow
              }}
              onClick={(e) => e.stopPropagation()}
            >

              {/* Modal Content */}
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <label                     style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.text,
                      margin: 0
                    }}>
                      {editField === 'hours' ? t('positionHours') : `${t('deviceTotalDistance')} (${distanceUnitString(distanceUnit, t)})`}
                    </label>
                    <button
                      onClick={() => setShowEditModal(false)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: colors.secondary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = colors.hover;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = colors.secondary;
                      }}
                    >
                      <X size={16} color={colors.textSecondary} />
                    </button>
                  </div>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: colors.secondary,
                      border: `1px solid ${colors.textSecondary}`,
                      borderRadius: '8px',
                      color: colors.text,
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3B82F6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = colors.border;
                    }}
                    step={editField === 'hours' ? '0.1' : '0.01'}
                    min="0"
                  />
                </div>

                {/* Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'space-between'
                }}>
                  <button
                    onClick={() => setShowEditModal(false)}
                    disabled={isSaving}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.textSecondary}`,
                      backgroundColor: colors.secondary,
                      color: colors.text,
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        e.target.style.backgroundColor = colors.hover;
                        e.target.style.color = colors.text;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving) {
                        e.target.style.backgroundColor = colors.secondary;
                        e.target.style.color = colors.text;
                      }
                    }}
                  >
                    {t('sharedCancel')}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: isSaving ? `1px solid ${colors.border}` : '1px solid #065F46',
                      backgroundColor: isSaving ? colors.secondary : '#D1FAE5',
                      color: isSaving ? colors.text : '#065F46',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        e.target.style.backgroundColor = '#A7F3D0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSaving) {
                        e.target.style.backgroundColor = '#D1FAE5';
                      }
                    }}
                  >
                    {isSaving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                    {isSaving ? t('sharedSaving') : t('sharedSave')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Command Dialog */}
      <CommandDialog
        open={showCommandDialog}
        onClose={() => setShowCommandDialog(false)}
        deviceId={device?.id}
      />
      

      {/* Success Message Snackbar */}
      {showSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#10B981',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 10003,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {successMessage || t('commandQueued')}
        </motion.div>
      )}
    </AnimatePresence>

    {/* Replay Popover */}
    <AnimatePresence>
      {showReplayPopover && (
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: !desktop ? '0px' : '8px',
            left: !desktop ? '0px' : (isMenuExpanded ? '200px' : '63px'),
            width: !desktop ? '100vw' : '310px',
            height: !desktop ? '100vh' : 'calc(100vh - 16px)',
            zIndex: 10000,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: !desktop ? '0px' : (selectedDeviceId && device ? '0px 0px 0px 0px' : '0px 16px 16px 0px'),
            boxShadow: !desktop ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'left 0.3s ease'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.surface
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleCloseReplayPopover}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.textSecondary,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.color = colors.text;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = colors.textSecondary;
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: colors.text
              }}>
                {t('reportReplay')}
              </h3>
            </div>
          </div>

          {/* Content - Replay Form */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto'
            }}
          >
            {/* Device Selection - Hidden since device is already selected */}
            {false && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.text
                }}>
                  {t('reportDevice')}
                </label>
                <select
                  value={replayDeviceId || ''}
                  onChange={(e) => setReplayDeviceId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.surface,
                    color: colors.text,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ backgroundColor: colors.surface, color: colors.text }}>
                    Select Device
                  </option>
                  {Object.values(devices).map((device) => (
                    <option 
                      key={device.id} 
                      value={device.id}
                      style={{ backgroundColor: colors.surface, color: colors.text }}
                    >
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Period Selection */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.text
              }}>
                {t('reportPeriod')}
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingRight: '32px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontSize: '14px',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(colors.textSecondary)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  backgroundSize: '16px'
                }}
              >
                <option value="today" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportToday')}
                </option>
                <option value="yesterday" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportYesterday')}
                </option>
                <option value="thisWeek" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportThisWeek')}
                </option>
                <option value="previousWeek" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportPreviousWeek')}
                </option>
                <option value="thisMonth" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportThisMonth')}
                </option>
                <option value="previousMonth" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportPreviousMonth')}
                </option>
                <option value="custom" style={{ backgroundColor: colors.surface, color: colors.text }}>
                  {t('reportCustom')}
                </option>
              </select>
            </div>

            {/* Date/Time Inputs */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.text
              }}>
                {t('reportFrom')}
              </label>
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                disabled={period !== 'custom'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: period === 'custom' ? colors.surface : colors.surface,
                  color: period === 'custom' ? colors.text : colors.textSecondary,
                  fontSize: '14px',
                  cursor: period === 'custom' ? 'text' : 'not-allowed',
                  opacity: period === 'custom' ? 1 : 0.6,
                  colorScheme: colors.surface === '#1F2937' ? 'dark' : 'light'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.text
              }}>
                {t('reportTo')}
              </label>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                disabled={period !== 'custom'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: period === 'custom' ? colors.surface : colors.surface,
                  color: period === 'custom' ? colors.text : colors.textSecondary,
                  fontSize: '14px',
                  cursor: period === 'custom' ? 'text' : 'not-allowed',
                  opacity: period === 'custom' ? 1 : 0.6,
                  colorScheme: colors.surface === '#1F2937' ? 'dark' : 'light'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px'
            }}>
                       <button
                         onClick={handleCloseReplayPopover}
                         style={{
                           flex: 1,
                           padding: '12px 20px',
                           borderRadius: '8px',
                           border: `1px solid ${colors.border}`,
                           backgroundColor: colors.surface,
                           color: colors.text,
                           cursor: 'pointer',
                           fontSize: '14px',
                           fontWeight: '500',
                           transition: 'all 0.2s'
                         }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.borderColor = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.surface;
                  e.target.style.borderColor = colors.border;
                }}
              >
                {t('sharedCancel')}
              </button>
              
              <button
                onClick={handleReplayShow}
                disabled={!replayDeviceId || replayLoading}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.primary,
                  color: colors.text,
                  cursor: replayLoading || !replayDeviceId ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: replayLoading || !replayDeviceId ? 0.6 : 1,
                  boxShadow: 'none',
                  outline: 'none'
                }}
              >
                {replayLoading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    {t('sharedLoading')}
                  </>
                ) : (
                  t('reportShow')
                )}
              </button>
            </div>

            {/* Replay Controls Section - BELOW the Cancel and Show buttons */}
            <>

                {/* Slider */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.text
                  }}>
                    {t('sharedTimeline')}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, replayPositions.length - 1)}
                    value={currentReplayIndex}
                    onChange={handleSliderChange}
                    disabled={replayPositions.length === 0}
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: replayPositions.length === 0 
                        ? colors.border 
                        : `linear-gradient(to right, #18a9fd 0%, #18a9fd ${(currentReplayIndex / Math.max(1, replayPositions.length - 1)) * 100}%, ${colors.border} ${(currentReplayIndex / Math.max(1, replayPositions.length - 1)) * 100}%, ${colors.border} 100%)`,
                      outline: 'none',
                      cursor: replayPositions.length === 0 ? 'not-allowed' : 'pointer',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      opacity: replayPositions.length === 0 ? 0.5 : 1,
                      border: 'none'
                    }}
                  />
                  <style>
                    {`
                      input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: #18a9fd;
                        cursor: pointer;
                        border: 3px solid #ffffff;
                        box-shadow: 0 0 0 1px #18a9fd, 0 2px 6px rgba(0,0,0,0.4);
                      }
                      
                      input[type="range"]::-moz-range-thumb {
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: #18a9fd;
                        cursor: pointer;
                        border: 3px solid #ffffff;
                        box-shadow: 0 0 0 1px #18a9fd, 0 2px 6px rgba(0,0,0,0.4);
                      }
                    `}
                  </style>
                </div>

                {/* Playback Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: colors.surface,
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`
                }}>
                  <button
                    onClick={isPlaying ? handlePause : handlePlay}
                    disabled={replayPositions.length === 0 || (currentReplayIndex >= replayPositions.length - 1 && !isPlaying)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: "#18a9fd",
                      color: colors.surface,
                      cursor: (replayPositions.length === 0 || (currentReplayIndex >= replayPositions.length - 1 && !isPlaying)) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (replayPositions.length === 0 || (currentReplayIndex >= replayPositions.length - 1 && !isPlaying)) ? 0.5 : 1
                    }}
                  >
                    {isPlaying ? (
                      <PauseIcon style={{ fontSize: '28px', width: '28px', height: '28px', color: "#ffffff"}} />
                    ) : (
                      <PlayArrowIcon style={{ fontSize: '28px', width: '28px', height: '28px', color: "#ffffff" }} />
                    )}
                  </button>

                  {/* Screenshot Button */}
                  <button
                    onClick={handleScreenshot}
                    disabled={replayPositions.length === 0 || isScreenshotting}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: isScreenshotting ? colors.textSecondary : colors.primary,
                      color: colors.surface,
                      cursor: (replayPositions.length === 0 || isScreenshotting) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (replayPositions.length === 0 || isScreenshotting) ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (replayPositions.length > 0 && !isScreenshotting) {
                        e.target.style.backgroundColor = colors.primaryHover;
                        e.target.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (replayPositions.length > 0 && !isScreenshotting) {
                        e.target.style.backgroundColor = colors.primary;
                        e.target.style.transform = 'scale(1)';
                      }
                    }}
                    title={isScreenshotting ? t('sharedProcessing') : t('sharedScreenshot')}
                  >
                    {isScreenshotting ? (
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid transparent',
                        borderTop: '2px solid currentColor',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9C3 7.11438 3 6.17157 3.58579 5.58579C4.17157 5 5.11438 5 7 5H17C18.8856 5 19.8284 5 20.4142 5.58579C21 6.17157 21 7.11438 21 9V15C21 16.8856 21 17.8284 20.4142 18.4142C19.8284 19 18.8856 19 17 19H7C5.11438 19 4.17157 19 3.58579 18.4142C3 17.8284 3 16.8856 3 15V9Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M8 13H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Speed Control */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <select
                      value={playbackSpeed}
                      disabled={replayPositions.length === 0}
                      onChange={(e) => {
                        const newSpeed = Number(e.target.value);
                        setPlaybackSpeed(newSpeed);
                        // Stop playback when speed changes
                        setIsPlaying(false);
                        if (intervalRef.current) {
                          clearInterval(intervalRef.current);
                          intervalRef.current = null;
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.surface,
                        color: colors.text,
                        fontSize: '12px',
                        cursor: replayPositions.length === 0 ? 'not-allowed' : 'pointer',
                        outline: 'none',
                        opacity: replayPositions.length === 0 ? 0.5 : 1
                      }}
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={5}>5x</option>
                      <option value={10}>10x</option>
                    </select>
                  </div>
                </div>
            </>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Lock Open Confirmation Modal */}
    <AnimatePresence>
      {showLockOpenConfirmation && (
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
          onClick={cancelLockOpen}
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
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: colors.text,
              lineHeight: '1.5'
            }}>
              {t('commandConfirm')}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={cancelLockOpen}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: colors.secondary,
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.color = colors.text;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.color = colors.text;
                }}
              >
                {t('sharedCancel')}
              </button>
              <button
                onClick={confirmLockOpen}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FEF2F2';
                }}
              >
                {t('commandSend')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Lock Closed Confirmation Modal */}
    <AnimatePresence>
      {showLockClosedConfirmation && (
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
          onClick={cancelLockClosed}
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
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: colors.text,
              lineHeight: '1.5'
            }}>
              {t('commandConfirm')}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={cancelLockClosed}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: colors.secondary,
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.color = colors.text;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.color = colors.text;
                }}
              >
                {t('sharedCancel')}
              </button>
              <button
                onClick={confirmLockClosed}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FEF2F2';
                }}
              >
                {t('commandSend')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default FloatingStatusCard;
