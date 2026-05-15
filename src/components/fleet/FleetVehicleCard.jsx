import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Menu,
  MenuItem,
  Drawer,
  Badge,
} from '@mui/material';
// Icons
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import ShareIcon from '@mui/icons-material/Share';
import StreetviewIcon from '@mui/icons-material/Streetview';
import AnchorIcon from '@mui/icons-material/Anchor';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import { TbBrandGoogleMaps } from "react-icons/tb";
import { SiWaze } from "react-icons/si";
import { FaApple } from "react-icons/fa6";
import { Gauge, ChevronLeft, Loader2, Settings, X } from 'lucide-react';

// Store & Utils
import { fleetActions, devicesActions, errorsActions } from '../../store';
import { 
  formatSpeed, 
  formatCoordinate, 
  formatTime,
  formatDistance,
  formatBoolean,
  formatNumber,
  formatPercentage,
  reverseGeocode,
  formatNotificationTitle,
} from '../../common/util/formatter';
import { distanceFromMeters, distanceToMeters, distanceUnitString } from '../../common/util/converter';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../../common/components/ThemeProvider';
import { useAttributePreference, usePreference } from '../../common/util/preferences';
import { map } from '../../map/core/MapView';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';
import { vehicleTypeToIcon } from '../../common/util/vehicleTypeIcon';
import usePositionAttributes from '../../common/attributes/usePositionAttributes';
import { useDeviceReadonly } from '../../common/util/permissions';
import localStorageAsync from '../../common/util/localStorageAsync';
import fetchOrThrow from '../../common/util/fetchOrThrow';

// Dialogs
import CommandDialog from '../CommandDialog';
import ShareDialog from '../ShareDialog';
import DeviceStatusIcons from '../../settings/components/DeviceStatusIcons';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMediaQuery } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';

dayjs.extend(relativeTime);

const FleetVehicleCard = ({ onOpenReplay, onOpenDetails }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();
  const colors = useThemeColors();
  const muiTheme = useMuiTheme();
  const desktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  
  // Selectors
  const { items, selectedPlate } = useSelector((state) => state.fleet);
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const user = useSelector((state) => state.session.user);
  const eventsItems = useSelector((state) => state.events.items);

  // Local State
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isAnchorLoading, setIsAnchorLoading] = useState(false);
  const [isAnchored, setIsAnchored] = useState(false);
  const [anchorGeofenceId, setAnchorGeofenceId] = useState(null);
  const [isLockOpenLoading, setIsLockOpenLoading] = useState(false);
  const [isLockClosedLoading, setIsLockClosedLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [vehicleEventsDrawerOpen, setVehicleEventsDrawerOpen] = useState(false);
  const [showLockPasswordDialog, setShowLockPasswordDialog] = useState(false);
  const [lockPasswordAction, setLockPasswordAction] = useState(null);
  const [lockPasswordInput, setLockPasswordInput] = useState('');
  const [lockMenuAnchor, setLockMenuAnchor] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Address Resolution State
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const addressCache = useRef(new Map());
  const resolvingRef = useRef(false);

  // Refs
  const lastMapUpdateRef = useRef({ deviceId: null, position: null });
  const mapUpdateTimeoutRef = useRef(null);
  const prevSelectedPlateRef = useRef(selectedPlate);

  // --- Fleet Group Logic ---
  const selectedGroup = useMemo(() => {
    if (!selectedPlate) return null;
    return items.find((item) => item.plate === selectedPlate);
  }, [items, selectedPlate]);

  // Calculate Device List & Current Device
  const groupDevices = useMemo(() => {
    return selectedGroup?.devices || [];
  }, [selectedGroup]);

  // Reset address only when switching vehicles; device index when plate/group changes
  // Don't clear address when groupDevices ref changes (fleet refresh every 10s) - that caused "address loads then reverts to lat/long"
  useEffect(() => {
    if (prevSelectedPlateRef.current !== selectedPlate) {
      setResolvedAddress(null);
      prevSelectedPlateRef.current = selectedPlate;
    }
    if (!groupDevices || groupDevices.length === 0) {
      setCurrentDeviceIndex(0);
      return;
    }
    let bestIdx = 0;
    let bestTime = 0;
    groupDevices.forEach((entry, idx) => {
      const pos = positions[entry.id];
      const fixTime = pos?.fixTime ? new Date(pos.fixTime).getTime() : 0;
      if (fixTime > bestTime) {
        bestTime = fixTime;
        bestIdx = idx;
      }
    });
    setCurrentDeviceIndex(bestIdx);
  }, [selectedPlate, groupDevices]);

  const currentDeviceEntry = groupDevices[currentDeviceIndex];
  
  const currentDevice = useMemo(() => {
    if (!currentDeviceEntry) return null;
    return devices[currentDeviceEntry.id];
  }, [currentDeviceEntry, devices]);

  const currentPosition = useMemo(() => {
    if (!currentDevice) return null;
    return positions[currentDevice.id];
  }, [currentDevice, positions]);

  const deviceEvents = useMemo(() => {
    if (!currentDevice?.id) return [];
    return eventsItems
      .filter((e) => e.deviceId === currentDevice.id)
      .sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
  }, [eventsItems, currentDevice?.id]);

  const formatVehicleEventType = useCallback((event) => {
    const device = devices[event.deviceId];
    const standardEvent = formatNotificationTitle(t, {
      type: event.type,
      attributes: {
        alarms: event.attributes?.alarm,
      },
    });
    if (device?.attributes?.customSensors) {
      try {
        const customSensors = JSON.parse(device.attributes.customSensors);
        for (const [sensorKey, customName] of Object.entries(customSensors)) {
          if (event.type.includes(sensorKey)) {
            const regex = new RegExp(sensorKey, 'gi');
            let customEvent = standardEvent.replace(regex, customName);
            if (event.type.endsWith('On') || event.type.endsWith('Off')) {
              const isOn = event.type.endsWith('On');
              customEvent = `${customName}: ${isOn ? t('sharedYes') : t('sharedNo')}`;
            }
            return customEvent;
          }
        }
      } catch (e) {
        // ignore invalid customSensors JSON
      }
    }
    return standardEvent;
  }, [devices, t]);

  // Sync internal index with Redux selection
  // This ensures that if the map or another component changes the selectedId, the card updates
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  useEffect(() => {
    if (selectedGroup?.devices && selectedDeviceId) {
      const index = selectedGroup.devices.findIndex(d => d.id === selectedDeviceId);
      if (index >= 0) {
        setCurrentDeviceIndex(index);
      }
    }
  }, [selectedDeviceId, selectedGroup]);

  // Update Map when device changes
  useEffect(() => {
    if (mapUpdateTimeoutRef.current) clearTimeout(mapUpdateTimeoutRef.current);

    if (currentDevice && currentPosition) {
      const positionKey = `${currentPosition.latitude?.toFixed(6)},${currentPosition.longitude?.toFixed(6)}`;
      const hasChanged = lastMapUpdateRef.current.deviceId !== currentDevice.id || lastMapUpdateRef.current.position !== positionKey;

      if (hasChanged) {
        mapUpdateTimeoutRef.current = setTimeout(() => {
          if (currentPosition.latitude && currentPosition.longitude) {
            map.flyTo({
              center: [currentPosition.longitude, currentPosition.latitude],
              zoom: 16,
              duration: 500,
              essential: true,
            });
            lastMapUpdateRef.current = { deviceId: currentDevice.id, position: positionKey };
            // Select the ID in Redux so other components know about it
            dispatch(devicesActions.selectId(currentDevice.id));
          }
        }, 100);
      }
    }
  }, [currentDevice, currentPosition, dispatch]);

  // --- Address Resolution Effect ---
  useEffect(() => {
    if (!currentPosition) {
      setResolvedAddress(null);
      resolvingRef.current = false;
      setIsResolvingAddress(false);
      return;
    }

    const hasCoordinates = currentPosition.latitude && currentPosition.longitude;
    const hasAddress = currentPosition.address && currentPosition.address.trim() !== '';
    const currentKey = `${currentPosition.latitude}_${currentPosition.longitude}`;

    if (hasAddress) {
      setResolvedAddress(null);
      resolvingRef.current = false;
      setIsResolvingAddress(false);
      return;
    }

    if (hasCoordinates && !hasAddress && !resolvingRef.current) {
      if (addressCache.current.has(currentKey)) {
        setResolvedAddress(addressCache.current.get(currentKey));
        return;
      }

      resolvingRef.current = true;
      setIsResolvingAddress(true);
      
      reverseGeocode(currentPosition.latitude, currentPosition.longitude)
        .then((address) => {
          if (address) {
            addressCache.current.set(currentKey, address);
            setResolvedAddress(address);
          } else {
            setResolvedAddress(null);
          }
          setIsResolvingAddress(false);
          resolvingRef.current = false;
        })
        .catch((error) => {
          console.error('Error resolving address:', error);
          setResolvedAddress(null);
          setIsResolvingAddress(false);
          resolvingRef.current = false;
        });
    }
  }, [currentPosition]);

  // --- Permissions ---
  const hasResumeEnginePermission = useMemo(() => {
    if (!user?.attributes?.accessLevel) return false;
    try { return JSON.parse(user.attributes.accessLevel).resumeEngine === true; } catch { return false; }
  }, [user]);

  const hasStopEnginePermission = useMemo(() => {
    if (!user?.attributes?.accessLevel) return false;
    try { return JSON.parse(user.attributes.accessLevel).stopEngine === true; } catch { return false; }
  }, [user]);

  const hasSendCommandPermission = useMemo(() => {
    if (!user?.attributes?.accessLevel) return false;
    try { return JSON.parse(user.attributes.accessLevel).sendCommand === true; } catch { return false; }
  }, [user]);

  const hasShareDevicePermission = useMemo(() => {
    if (!user?.attributes?.accessLevel) return false;
    try { return JSON.parse(user.attributes.accessLevel).shareDevice === true; } catch { return false; }
  }, [user]);

  const hasAnchorPermission = useMemo(() => {
    if (!user?.attributes?.accessLevel) return false;
    try { return JSON.parse(user.attributes.accessLevel).anchor === true; } catch { return false; }
  }, [user]);

  const hasAnyActionButtons = useMemo(() => {
    return hasResumeEnginePermission || hasStopEnginePermission || hasShareDevicePermission || hasAnchorPermission || !!currentPosition;
  }, [hasResumeEnginePermission, hasStopEnginePermission, hasShareDevicePermission, hasAnchorPermission, currentPosition]);

  // --- Formatting & Preferences ---
  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
  const coordinateFormat = usePreference('coordinateFormat');
  const positionItems = useAttributePreference('positionItems', 'serverTime,address,speed,totalDistance');
  const positionAttributes = usePositionAttributes(t);
  const deviceReadonly = useDeviceReadonly();

  const deviceCount = groupDevices.length;
  const hasMultipleDevices = deviceCount > 1;

  /** Custom theme `colors.primary` is white in light mode — carousel used bg+white icon = invisible. MUI palette stays contrast-safe. */
  const carouselNavColors = useMemo(() => {
    if (!hasMultipleDevices) {
      return { bg: '#3f3f46', icon: '#ffffff' };
    }
    if (muiTheme.palette.mode === 'light') {
      return {
        bg: muiTheme.palette.primary.main,
        icon: muiTheme.palette.primary.contrastText,
      };
    }
    return { bg: colors.primary, icon: '#ffffff' };
  }, [
    hasMultipleDevices,
    muiTheme.palette.mode,
    muiTheme.palette.primary.main,
    muiTheme.palette.primary.contrastText,
    colors.primary,
  ]);

  // --- Navigation Handlers ---
  const handlePrevious = useCallback((e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!hasMultipleDevices) return;
    
    // Calculates new index safely based on current state
    const newIndex = currentDeviceIndex === 0 ? deviceCount - 1 : currentDeviceIndex - 1;
    const newDevice = groupDevices[newIndex];

    if (newDevice) {
        setCurrentDeviceIndex(newIndex);
        dispatch(devicesActions.selectId(newDevice.id)); 
    }
  }, [hasMultipleDevices, currentDeviceIndex, deviceCount, groupDevices, dispatch]);

  const handleNext = useCallback((e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!hasMultipleDevices) return;

    // Calculates new index safely based on current state
    const newIndex = currentDeviceIndex === deviceCount - 1 ? 0 : currentDeviceIndex + 1;
    const newDevice = groupDevices[newIndex];

    if (newDevice) {
        setCurrentDeviceIndex(newIndex);
        dispatch(devicesActions.selectId(newDevice.id)); 
    }
  }, [hasMultipleDevices, currentDeviceIndex, deviceCount, groupDevices, dispatch]);

  const handleClose = useCallback((e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    dispatch(fleetActions.setSelectedPlate(null));
    dispatch(devicesActions.selectId(null));
  }, [dispatch]);

  // --- Action Button Handlers ---
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const executeLockOpen = useCallback(async () => {
    if (!currentDevice) return;
    setIsLockOpenLoading(true);
    try {
        const commandPayload = { type: 'engineResume', attributes: {}, deviceId: currentDevice.id };
        const response = await fetchOrThrow('/api/commands/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commandPayload),
        });
        if (response.ok) showSnackbar(t('commandQueued'), 'success');
    } catch (error) {
        dispatch(errorsActions.push(error.message));
    } finally {
        setIsLockOpenLoading(false);
    }
  }, [currentDevice, t, dispatch]);

  const executeLockClosed = useCallback(async () => {
    if (!currentDevice) return;
    setIsLockClosedLoading(true);
    try {
        const commandPayload = { type: 'engineStop', attributes: {}, deviceId: currentDevice.id };
        const response = await fetchOrThrow('/api/commands/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commandPayload),
        });
        if (response.ok) showSnackbar(t('commandQueued'), 'success');
    } catch (error) {
        dispatch(errorsActions.push(error.message));
    } finally {
        setIsLockClosedLoading(false);
    }
  }, [currentDevice, t, dispatch]);

  const handleLockOpen = useCallback(() => {
    if (!currentDevice) return;
    setLockPasswordAction('unlock');
    setLockPasswordInput('');
    setShowLockPasswordDialog(true);
  }, [currentDevice]);

  const handleLockClosed = useCallback(() => {
    if (!currentDevice) return;
    setLockPasswordAction('lock');
    setLockPasswordInput('');
    setShowLockPasswordDialog(true);
  }, [currentDevice]);

  const handleLockPasswordConfirm = useCallback(async () => {
    const entered = String(lockPasswordInput || '').trim();
    if (!entered) {
      showSnackbar('Digite sua senha.', 'warning');
      return;
    }
    const userEmail = user?.email || user?.login || '';
    if (!userEmail) {
      showSnackbar('Usuário não possui email/login configurado.', 'error');
      return;
    }
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email: userEmail, password: entered }),
      });
      if (!response.ok) {
        showSnackbar('Senha incorreta.', 'error');
        return;
      }
      const action = lockPasswordAction;
      setShowLockPasswordDialog(false);
      setLockPasswordAction(null);
      setLockPasswordInput('');
      if (action === 'unlock') {
        executeLockOpen();
      } else if (action === 'lock') {
        executeLockClosed();
      }
    } catch (err) {
      showSnackbar('Erro ao verificar senha.', 'error');
    }
  }, [user, lockPasswordInput, lockPasswordAction, executeLockOpen, executeLockClosed]);

  // Check Anchor
  useEffect(() => {
    const checkAnchor = async () => {
        if (!currentDevice) return;
        const anchorKey = `anchor_${currentDevice.id}`;
        const geofenceId = await localStorageAsync.getItem(anchorKey);
        setIsAnchored(!!geofenceId);
        setAnchorGeofenceId(geofenceId);
    };
    checkAnchor();
  }, [currentDevice]);

  const handleAnchorClick = useCallback(async () => {
    if (!currentDevice || !currentPosition) return;
    setIsAnchorLoading(true);
    try {
        if (isAnchored) {
            if (anchorGeofenceId) {
                await fetchOrThrow(`/api/geofences/${anchorGeofenceId}`, { method: 'DELETE' });
                await localStorageAsync.removeItem(`anchor_${currentDevice.id}`);
                setIsAnchored(false);
                setAnchorGeofenceId(null);
            }
        } else {
            const geofencePayload = {
                name: `Anchor for ${currentDevice.name}`,
                area: `CIRCLE (${currentPosition.latitude} ${currentPosition.longitude}, 50)`
            };
            const res = await fetchOrThrow('/api/geofences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geofencePayload),
            });
            const geofence = await res.json();
            await fetchOrThrow('/api/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: currentDevice.id, geofenceId: geofence.id }),
            });
            await localStorageAsync.setItem(`anchor_${currentDevice.id}`, geofence.id);
            setIsAnchored(true);
            setAnchorGeofenceId(geofence.id);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setIsAnchorLoading(false);
    }
  }, [currentDevice, currentPosition, isAnchored, anchorGeofenceId]);

  // Navigation logic
  const getUserLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
      );
    });
  }, []);

  const handleOpenNavigation = useCallback(async (app) => {
    if (!currentPosition?.latitude || !currentPosition?.longitude) return;
    const { latitude: lat, longitude: lon } = currentPosition;
    
    let currentUserLocation = userLocation;
    if (!currentUserLocation) {
        try {
            currentUserLocation = await getUserLocation();
            setUserLocation(currentUserLocation);
        } catch {
            currentUserLocation = null;
        }
    }

    let url = '';
    if (app === 'waze') {
      url = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
    } else if (app === 'google') {
      url = currentUserLocation
        ? `https://www.google.com/maps/dir/?api=1&origin=${currentUserLocation.lat},${currentUserLocation.lon}&destination=${lat},${lon}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    } else if (app === 'apple') {
      url = currentUserLocation
        ? `https://maps.apple.com/?saddr=${currentUserLocation.lat},${currentUserLocation.lon}&daddr=${lat},${lon}`
        : `https://maps.apple.com/?daddr=${lat},${lon}`;
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [currentPosition, userLocation, getUserLocation]);

  const handleOpenStreetView = useCallback(() => {
    if (!currentPosition?.latitude || !currentPosition?.longitude) return;
    const { latitude, longitude, course = 0 } = currentPosition;
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude}%2C${longitude}&heading=${course}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [currentPosition]);

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
    if (!currentDevice?.id || !editField) return;
    
    setIsSaving(true);
    try {
      const item = {
        deviceId: currentDevice.id,
        hours: currentPosition?.attributes?.hours || 0,
        totalDistance: currentPosition?.attributes?.totalDistance || 0,
      };
      
      if (editField === 'hours') {
        item.hours = Number(editValue) * 3600000;
      } else if (editField === 'totalDistance') {
        item.totalDistance = distanceToMeters(Number(editValue), distanceUnit);
      }
      
      await fetchOrThrow(`/api/devices/${currentDevice.id}/accumulators`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      
      setShowEditModal(false);
      setEditField(null);
      setEditValue('');
      showSnackbar(t('sharedSaved'), 'success');
    } catch (error) {
      showSnackbar(t('errorGeneral'), 'error');
    } finally {
      setIsSaving(false);
    }
  }, [currentDevice?.id, editField, editValue, currentPosition?.attributes, distanceUnit, t]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10B981';
      case 'offline': return '#EF4444';
      case 'unknown': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const isSharedUnknown = (value) => value === 'sharedUnknown' || value === t('sharedUnknown');

  if (!selectedPlate || !selectedGroup) return null;
  if (!currentDevice) {
     return (
        <Card style={{ height: '100%', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <CircularProgress size={24} />
        </Card>
     );
  }

  return (
    <>
    <Card style={{
      height: '100%',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      boxShadow: 'none',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 1000,
    }}>
      {/* Header Buttons */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <ChevronLeft size={24} color={colors.textSecondary} />
      </button>

      {/* Top Right Action Buttons */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 10 }}>
         <button
            type="button"
            onClick={() => setVehicleEventsDrawerOpen(true)}
            style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
            }}
            title={t('reportEvents')}
         >
            <Badge
              color="error"
              badgeContent={deviceEvents.length}
              invisible={deviceEvents.length === 0}
              overlap="circular"
              max={99}
            >
              <NotificationsOutlinedIcon style={{ fontSize: '24px', color: colors.textSecondary }} />
            </Badge>
         </button>

         <button 
            onClick={() => onOpenDetails?.(currentDevice?.id, currentPosition)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            title={t('sharedDetails')}
         >
            <InfoOutlinedIcon style={{ fontSize: '22px', color: colors.textSecondary }} />
         </button>
      </div>

      <div style={{ padding: '24px 20px 8px 20px', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
        
        {/* --- DEVICE NAME (Centered) --- */}
        {/* AJUSTE AQUI: Adicionei margem superior para baixar o nome */}
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: colors.text,
          margin: '12px 0 16px 0', // Adicionei 12px de margem superior
          lineHeight: '1.3',
          textAlign: 'center',
          padding: '0 40px'
        }}>
          {currentDevice[devicePrimary] || currentDevice.name || selectedGroup.plate}
        </h3>

        {/* --- DEVICE IMAGE & NAVIGATION --- */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '12px', position: 'relative' }}>
          <button
            onClick={handlePrevious}
            disabled={!hasMultipleDevices}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: carouselNavColors.bg,
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: hasMultipleDevices ? 'pointer' : 'default',
              boxShadow: hasMultipleDevices ? '0 4px 6px rgba(0,0,0,0.3)' : 'none',
              opacity: hasMultipleDevices ? 1 : 0.4,
              transition: 'all 0.2s'
            }}
          >
            <ChevronLeftIcon style={{ fontSize: '28px', color: carouselNavColors.icon }} />
          </button>

          <div style={{
            width: '130px', height: '130px', borderRadius: '50%',
            backgroundColor: colors.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', border: `4px solid ${getStatusColor(currentDevice?.status || 'unknown')}`,
            position: 'relative',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            {selectedGroup?.foto_veiculo?.trim() ? (
              <img 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                src={`/api/vehicles/image/${selectedGroup.foto_veiculo.replace(/^\/?uploads\//, '')}`}
                alt=""
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : currentDevice?.attributes?.deviceImage ? (
              <img 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                src={`/api/media/${currentDevice.uniqueId}/${currentDevice.attributes.deviceImage}`}
                alt=""
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div style={{
                width: '100%', height: '100%',
                display: (selectedGroup?.foto_veiculo?.trim() || currentDevice?.attributes?.deviceImage) ? 'none' : 'flex',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#E5E7EB'
            }}>
                <img 
                  style={{ width: '56px', height: '56px', objectFit: 'contain' }} 
                  src={mapIcons[mapIconKey(currentDevice?.category || vehicleTypeToIcon(selectedGroup?.vehicle_type) || 'default')]} 
                  alt="" 
                />
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={!hasMultipleDevices}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: carouselNavColors.bg,
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: hasMultipleDevices ? 'pointer' : 'default',
              boxShadow: hasMultipleDevices ? '0 4px 6px rgba(0,0,0,0.3)' : 'none',
              opacity: hasMultipleDevices ? 1 : 0.4,
              transition: 'all 0.2s'
            }}
          >
            <ChevronRightIcon style={{ fontSize: '28px', color: carouselNavColors.icon }} />
          </button>

          {hasMultipleDevices && (
             <div style={{
                position: 'absolute', bottom: '-14px', left: '50%',
                transform: 'translateX(-50%)', backgroundColor: colors.surface,
                padding: '3px 10px', borderRadius: '12px',
                border: `1px solid ${colors.border}`, fontSize: '11px',
                color: colors.textSecondary, fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
             }}>
                {currentDeviceIndex + 1} / {deviceCount}
             </div>
          )}
        </div>

        {/* --- STATUS & ADDRESS --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getStatusColor(currentDevice.status) }} />
                <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: 500 }}>
                  {t(`deviceStatus${currentDevice.status.charAt(0).toUpperCase() + currentDevice.status.slice(1)}`)}
                </span>
              </div>
              
              {currentPosition && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Gauge size={16} color={colors.textSecondary} />
                  <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: 600 }}>
                    {currentPosition.speed ? formatSpeed(currentPosition.speed, speedUnit, t) : formatSpeed(0, speedUnit, t)}
                  </span>
                </div>
              )}
            </div>

            <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0, lineHeight: '1.5', minHeight: '38px' }}>
                {(() => {
                    if (currentPosition?.address && currentPosition.address.trim() !== '') {
                        return currentPosition.address;
                    }
                    if (resolvedAddress) {
                        return resolvedAddress;
                    }
                    if (isResolvingAddress) {
                        return t('sharedLoading');
                    }
                    if (currentPosition?.latitude && currentPosition?.longitude) {
                        return `${formatCoordinate('latitude', currentPosition.latitude, coordinateFormat)}, ${formatCoordinate('longitude', currentPosition.longitude, coordinateFormat)}`;
                    }
                    return t('sharedNoData');
                })()}
            </p>
            {currentPosition && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px', width: '100%' }}>
                <DeviceStatusIcons position={currentPosition} device={currentDevice} />
              </div>
            )}
        </div>
      </div>

      {/* --- ACTION BUTTONS --- */}
      {hasAnyActionButtons && (
        <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            gap: '8px', padding: '16px 20px', 
            borderTop: `1px solid ${colors.border}`,
            marginTop: 'auto',
            flexShrink: 0,
        }}>
            {(hasResumeEnginePermission || hasStopEnginePermission) && (
                <>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLockMenuAnchor(e.currentTarget); }}
                    disabled={isLockOpenLoading || isLockClosedLoading}
                    style={{
                        flex: 1, height: '48px', borderRadius: '10px',
                        border: `1px solid ${colors.textSecondary}`, backgroundColor: 'transparent',
                        cursor: (isLockOpenLoading || isLockClosedLoading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: (isLockOpenLoading || isLockClosedLoading) ? 0.5 : 1
                    }}
                    title="Bloquear / Desbloquear motor"
                >
                    {(isLockOpenLoading || isLockClosedLoading) ? (
                        <Loader2 size={24} className="animate-spin" style={{ color: colors.textSecondary }} />
                    ) : (
                        <LockOutlinedIcon style={{ fontSize: '24px', color: colors.textSecondary }} />
                    )}
                </button>
                <Menu
                    anchorEl={lockMenuAnchor}
                    open={Boolean(lockMenuAnchor)}
                    onClose={() => setLockMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    style={{ zIndex: 10002 }}
                    PaperProps={{ sx: { backgroundColor: colors.surface, border: `1px solid ${colors.border}`, minWidth: 180 } }}
                >
                    {hasResumeEnginePermission && (
                        <MenuItem
                            onClick={() => { setLockMenuAnchor(null); handleLockOpen(); }}
                            sx={{ color: colors.text }}
                        >
                            <LockOpenIcon sx={{ fontSize: 20, mr: 1.5, color: colors.textSecondary }} />
                            Desbloquear motor
                        </MenuItem>
                    )}
                    {hasStopEnginePermission && (
                        <MenuItem
                            onClick={() => { setLockMenuAnchor(null); handleLockClosed(); }}
                            sx={{ color: colors.text }}
                        >
                            <LockOutlinedIcon sx={{ fontSize: 20, mr: 1.5, color: colors.textSecondary }} />
                            Bloquear motor
                        </MenuItem>
                    )}
                </Menu>
                </>
            )}

            <button
                onClick={() => onOpenReplay?.(currentDevice?.id)}
                style={{
                    flex: 1, height: '48px', borderRadius: '10px',
                    border: `1px solid ${colors.textSecondary}`, backgroundColor: 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title={t('reportReplay')}
            >
                <RefreshOutlinedIcon style={{ fontSize: '24px', color: colors.textSecondary }} />
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); handleOpenNavigation('google'); }}
                disabled={!currentPosition?.latitude}
                style={{
                    flex: 1, height: '48px', borderRadius: '10px',
                    border: `1px solid ${colors.textSecondary}`, backgroundColor: 'transparent',
                    cursor: currentPosition?.latitude ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: currentPosition?.latitude ? 1 : 0.5
                }}
                title={t('mapNavigation') || 'Abrir rota no Google Maps'}
            >
                <TbBrandGoogleMaps style={{ fontSize: '24px', color: colors.textSecondary }} />
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); handleOpenStreetView(); }}
                disabled={!currentPosition?.latitude}
                style={{
                    flex: 1, height: '48px', borderRadius: '10px',
                    border: `1px solid ${colors.textSecondary}`, backgroundColor: 'transparent',
                    cursor: currentPosition?.latitude ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: currentPosition?.latitude ? 1 : 0.5
                }}
                title={t('linkStreetView') || 'Abrir Street View'}
            >
                <StreetviewIcon style={{ fontSize: '24px', color: colors.textSecondary }} />
            </button>

            {hasShareDevicePermission && (
                <button
                    onClick={(e) => { e.stopPropagation(); setShowShareDialog(true); }}
                    style={{
                        flex: 1, height: '48px', borderRadius: '10px',
                        border: `1px solid ${colors.textSecondary}`, backgroundColor: 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <ShareIcon style={{ fontSize: '24px', color: colors.textSecondary }} />
                </button>
            )}

            {hasAnchorPermission && (
                <button
                    onClick={handleAnchorClick}
                    disabled={isAnchorLoading}
                    style={{
                        flex: 1, height: '48px', borderRadius: '10px',
                        border: `1px solid ${isAnchored ? '#10B981' : colors.textSecondary}`, 
                        backgroundColor: isAnchored ? '#D1FAE5' : 'transparent',
                        cursor: isAnchorLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    {isAnchorLoading ? <Loader2 size={24} className="animate-spin" /> : <AnchorIcon style={{ fontSize: '24px', color: isAnchored ? '#10B981' : colors.textSecondary }} />}
                </button>
            )}
        </div>
      )}
      
      {/* --- DETAILS LIST --- */}
      <div style={{
        flex: 1,
        minHeight: 0,
        padding: '0 20px 20px 20px',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        borderTop: `1px solid ${colors.border}`,
      }}>
        {currentPosition && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {positionItems.split(',').filter((key) => {
              return key && key !== 'address' && key !== 'fixTime'
                && (currentPosition.hasOwnProperty(key) || currentPosition.attributes?.hasOwnProperty(key));
            }).map((key, index) => {
              const attributeName = positionAttributes[key]?.name || key;
              const value = currentPosition.hasOwnProperty(key) ? currentPosition[key] : currentPosition.attributes?.[key];
              
              return (
                <div key={`position-${key || 'empty'}-${index}`} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: `1px solid ${colors.border}`
                }}>
                  <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '500' }}>
                    {attributeName}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: colors.text, fontWeight: '400' }}>
                      {key === 'fixTime' || key === 'deviceTime' || key === 'serverTime' ? formatTime(value, 'seconds') :
                       key === 'speed' ? formatSpeed(value, speedUnit, t) :
                       key === 'totalDistance' ? formatDistance(value, distanceUnit, t) :
                       key === 'ignition' ? formatBoolean(value, t) :
                       key === 'batteryLevel' ? formatPercentage(value) :
                       isSharedUnknown(value) ? '-' :
                       (typeof value === 'number' ? formatNumber(value, 2) : (value || '-'))}
                    </span>
                    {!deviceReadonly && (key === 'totalDistance' || key === 'hours') && (
                        <button
                          onClick={() => handleEditField(key, value)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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

      {/* Dialogs */}
      <CommandDialog open={showCommandDialog} onClose={() => setShowCommandDialog(false)} deviceId={currentDevice.id} />
      <ShareDialog open={showShareDialog} onClose={() => setShowShareDialog(false)} deviceId={currentDevice.id} />

      {/* Password dialog for lock/unlock */}
      <Dialog
        open={showLockPasswordDialog}
        onClose={() => { setShowLockPasswordDialog(false); setLockPasswordAction(null); setLockPasswordInput(''); }}
        PaperProps={{ sx: { backgroundColor: colors.surface, border: `1px solid ${colors.border}` } }}
      >
        <DialogTitle style={{ color: colors.text }}>
          {lockPasswordAction === 'unlock' ? 'Desbloquear motor' : 'Bloquear motor'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Senha"
            type="password"
            fullWidth
            variant="outlined"
            value={lockPasswordInput}
            onChange={(e) => setLockPasswordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLockPasswordConfirm(); }}
            InputLabelProps={{ style: { color: colors.textSecondary } }}
            InputProps={{ style: { color: colors.text } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowLockPasswordDialog(false); setLockPasswordAction(null); setLockPasswordInput(''); }} style={{ color: colors.textSecondary }}>
            {t('sharedCancel')}
          </Button>
          <Button onClick={handleLockPasswordConfirm} variant="contained" color="primary">
            {t('sharedOk')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({...prev, open: false}))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>

    </Card>

    <Drawer
      anchor="right"
      open={vehicleEventsDrawerOpen}
      onClose={() => setVehicleEventsDrawerOpen(false)}
      PaperProps={{
        sx: {
          width: desktop ? 360 : '100%',
          maxWidth: '100vw',
          backgroundColor: colors.surface,
          borderLeft: `1px solid ${colors.border}`,
        },
      }}
    >
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.text, lineHeight: 1.3 }}>
            {t('reportEvents')}
          </h3>
          <p style={{
            margin: '6px 0 0 0',
            fontSize: '13px',
            color: colors.textSecondary,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          >
            {currentDevice[devicePrimary] || currentDevice.name || selectedGroup?.plate}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVehicleEventsDrawerOpen(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
        >
          <X size={22} color={colors.textSecondary} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 88px)' }}>
        {deviceEvents.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: colors.textSecondary, fontSize: '14px' }}>
            {t('noEventsAvailable')}
          </div>
        ) : (
          deviceEvents.map((event, index) => (
            <div
              key={event.id ?? `ev-${index}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (event.id) {
                  navigate(`/event/${event.id}`);
                }
                setVehicleEventsDrawerOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (event.id) {
                    navigate(`/event/${event.id}`);
                  }
                  setVehicleEventsDrawerOpen(false);
                }
              }}
              style={{
                padding: '12px 16px',
                borderBottom: index < deviceEvents.length - 1 ? `1px solid ${colors.border}` : 'none',
                cursor: event.id ? 'pointer' : 'default',
                opacity: event.id ? 1 : 0.7,
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '4px', lineHeight: 1.35 }}>
                {formatVehicleEventType(event)}
              </div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                {formatTime(event.eventTime, 'seconds')}
              </div>
            </div>
          ))
        )}
      </div>
    </Drawer>

    {/* --- ROUTE MODAL --- */}
    <AnimatePresence>
        {routeModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10004
            }}
            onClick={() => setRouteModalOpen(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '16px',
                width: '400px', maxWidth: '90vw',
                overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>
                    Route
                  </label>
                  <button onClick={() => setRouteModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <X size={24} color={colors.textSecondary} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', gap: '16px' }}>
                  <button
                    onClick={() => handleOpenNavigation('waze')}
                    disabled={!currentPosition?.latitude}
                    style={{
                      width: '100px', height: '100px', padding: '12px',
                      borderRadius: '12px', border: 'none',
                      backgroundColor: '#5bc0de', // Waze Blue ish
                      color: 'white',
                      cursor: currentPosition ? 'pointer' : 'not-allowed',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      opacity: currentPosition ? 1 : 0.6,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    <SiWaze size={42} />
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Waze</span>
                  </button>

                  <button
                    onClick={() => handleOpenNavigation('google')}
                    disabled={!currentPosition?.latitude}
                    style={{
                      width: '100px', height: '100px', padding: '12px',
                      borderRadius: '12px', border: 'none',
                      backgroundColor: '#4285F4', // Google Blue
                      color: 'white',
                      cursor: currentPosition ? 'pointer' : 'not-allowed',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      opacity: currentPosition ? 1 : 0.6,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    <TbBrandGoogleMaps size={42} />
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Google Maps</span>
                  </button>

                  <button
                    onClick={() => handleOpenNavigation('apple')}
                    disabled={!currentPosition?.latitude}
                    style={{
                      width: '100px', height: '100px', padding: '12px',
                      borderRadius: '12px', border: 'none',
                      backgroundColor: '#000000', // Apple Black
                      color: 'white',
                      cursor: currentPosition ? 'pointer' : 'not-allowed',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      opacity: currentPosition ? 1 : 0.6,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    <FaApple size={42} />
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Apple Maps</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
    </AnimatePresence>

    {/* Edit Accumulator Modal */}
    <AnimatePresence>
      {showEditModal && (
        <motion.div
          key="edit-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10005
          }}
          onClick={() => setShowEditModal(false)}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '16px',
              width: '360px', maxWidth: '90vw',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '16px', fontWeight: '700', color: colors.text, margin: 0 }}>
                  {editField === 'hours' ? t('positionHours') : `${t('deviceTotalDistance')} (${distanceUnitString(distanceUnit, t)})`}
                </label>
                <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <X size={20} color={colors.textSecondary} />
                </button>
              </div>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.secondary,
                  color: colors.text,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '20px'
                }}
                onFocus={(e) => { e.target.style.borderColor = colors.primary; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border; }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                step={editField === 'hours' ? '0.1' : '0.01'}
                min="0"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '10px 20px', borderRadius: '8px',
                    border: `1px solid ${colors.border}`, backgroundColor: 'transparent',
                    color: colors.textSecondary, cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                  }}
                >
                  {t('sharedCancel')}
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  style={{
                    padding: '10px 20px', borderRadius: '8px',
                    border: 'none', backgroundColor: colors.primary,
                    color: '#fff', cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '14px', fontWeight: '500', opacity: isSaving ? 0.7 : 1
                  }}
                >
                  {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : t('sharedSave')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default FleetVehicleCard;