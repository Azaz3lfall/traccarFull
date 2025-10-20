import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { devicesActions } from '../store';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import { formatStatus, formatSpeed, formatCoordinate } from '../common/util/formatter';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { prefixString } from '../common/util/stringUtils';
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
import { Input } from './ui/input';
import { Card } from './ui/card';
import { TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

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
  const t = useTranslation();
  const colors = useThemeColors();
  
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
  const [smartLinkRecurrence, setSmartLinkRecurrence] = useState('');
  const [smartLinkRecurrenceDropdownOpen, setSmartLinkRecurrenceDropdownOpen] = useState(false);
  const [smartLinkNotifications, setSmartLinkNotifications] = useState([]);
  const [smartLinkNotificationsLoading, setSmartLinkNotificationsLoading] = useState(false);
  const [smartLinkCalendars, setSmartLinkCalendars] = useState([]);
  const [smartLinkCalendarsLoading, setSmartLinkCalendarsLoading] = useState(false);
  const [smartLinkActiveTab, setSmartLinkActiveTab] = useState('groups');
  const [showOnMobile, setShowOnMobile] = useState(true);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);
  
  // Simplified key management - only change when showOnMobile changes
  const virtualizerContainerKey = useMemo(() => {
    return `virtualizer-${showOnMobile}`;
  }, [showOnMobile]);
  const filterButtonRef = useRef(null);
  const filterPopupRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const groupsDropdownRef = useRef(null);
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
        
        if (showStatusDropdown && 
            statusDropdownRef.current &&
            !statusDropdownRef.current.contains(event.target)) {
          setShowStatusDropdown(false);
        }
        
        if (showGroupsDropdown && 
            groupsDropdownRef.current &&
            !groupsDropdownRef.current.contains(event.target)) {
          setShowGroupsDropdown(false);
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
  }, [showFilters, showSortDropdown, showStatusDropdown, showGroupsDropdown]);

  // Close all dropdowns when filter popup is closed
  React.useEffect(() => {
    if (!showFilters) {
      setShowSortDropdown(false);
      setShowStatusDropdown(false);
      setShowGroupsDropdown(false);
    }
  }, [showFilters]);

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
  
  // Close recurrence dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (smartLinkRecurrenceDropdownOpen) {
        setSmartLinkRecurrenceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [smartLinkRecurrenceDropdownOpen]);

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
    if (showWandModal) {
      loadNotifications();
      loadCalendars();
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
                {/* Status Filter - Custom dropdown */}
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
          onClick={() => setShowWandModal(false)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <button
                onClick={() => setShowWandModal(false)}
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
                <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                  {(filteredDevices && Array.isArray(filteredDevices) ? filteredDevices : Object.values(devices))
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map((device) => {
                      const isSelected = smartLinkSelectedDeviceIds.includes(device.id);
                      return (
                          <label
                          key={device.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
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
                              setSmartLinkSelectedDeviceIds((prev) => {
                                if (e.target.checked) {
                                  return prev.includes(device.id) ? prev : [...prev, device.id];
                                }
                                return prev.filter((id) => id !== device.id);
                              });
                            }}
                            style={{ width: '14px', height: '14px', margin: 0 }}
                          />
                          <span style={{ color: colors.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                            {device[devicePrimary] || device.name || 'Unnamed'}
                          </span>
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
                            return (
                              <label key={group.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', width: '100%', minWidth: 0 }}>
                                <input type="checkbox" checked={isSelected} onChange={(e) => { setSmartLinkSelectedGroupIds((prev) => e.target.checked ? (prev.includes(group.id) ? prev : [...prev, group.id]) : prev.filter((id) => id !== group.id)); }} style={{ width: '14px', height: '14px', margin: 0 }} />
                                <span style={{ color: colors.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{group.name || 'Unnamed'}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textSecondary }}>Selected: {smartLinkSelectedGroupIds.length}</div>
                      </>
                    )}
                    {smartLinkActiveTab === 'geofences' && (
                      <>
                        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                          {Object.values(geofences).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((geofence) => {
                            const isSelected = smartLinkSelectedGeofenceIds.includes(geofence.id);
                            return (
                              <label key={geofence.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', width: '100%', minWidth: 0 }}>
                                <input type="checkbox" checked={isSelected} onChange={(e) => { setSmartLinkSelectedGeofenceIds((prev) => e.target.checked ? (prev.includes(geofence.id) ? prev : [...prev, geofence.id]) : prev.filter((id) => id !== geofence.id)); }} style={{ width: '14px', height: '14px', margin: 0 }} />
                                <span style={{ color: colors.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{geofence.name || 'Unnamed'}</span>
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
                              return (
                                <label key={notification.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', width: '100%', minWidth: 0 }}>
                                  <input type="checkbox" checked={isSelected} onChange={(e) => { setSmartLinkSelectedNotificationIds((prev) => e.target.checked ? (prev.includes(notification.id) ? prev : [...prev, notification.id]) : prev.filter((id) => id !== notification.id)); }} style={{ width: '14px', height: '14px', margin: 0 }} />
                                  <span style={{ color: colors.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{notification.type ? t(prefixString('event', notification.type)) : t('sharedNotifications')}</span>
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
                                  return (
                                    <label key={calendar.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', width: '100%', minWidth: 0 }}>
                                      <input type="checkbox" checked={isSelected} onChange={(e) => { setSmartLinkSelectedCalendarIds((prev) => e.target.checked ? (prev.includes(calendar.id) ? prev : [...prev, calendar.id]) : prev.filter((id) => id !== calendar.id)); }} style={{ width: '14px', height: '14px', margin: 0 }} />
                                      <span style={{ color: colors.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{calendar.name || 'Unnamed'}</span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textSecondary }}>Selected: {smartLinkSelectedCalendarIds.length}</div>
                          </div>
                          
                          {/* Right Column - Add Calendar Form */}
                          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>{t('sharedAdd')} {t('sharedCalendar')}</div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', border: `1px solid ${colors.border}`, borderRadius: '6px', backgroundColor: colors.surface }}>
                              {/* Name Field */}
                              <TextField
                                label={t('sharedName')}
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
                              
                              {/* From Field */}
                              <TextField
                                label={t('reportFrom')}
                                type="datetime-local"
                                fullWidth
                                variant="outlined"
                                size="small"
                                InputLabelProps={{ shrink: true }}
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
                              
                              {/* To Field */}
                              <TextField
                                label={t('reportTo')}
                                type="datetime-local"
                                fullWidth
                                variant="outlined"
                                size="small"
                                InputLabelProps={{ shrink: true }}
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
                              
                              {/* Recurrency Field */}
                              <div style={{ position: 'relative' }}>
                                <TextField
                                  label={t('calendarRecurrence')}
                                  value={smartLinkRecurrence || ''}
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
                                    style={{
                                      position: 'fixed',
                                      zIndex: 999999,
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      backgroundColor: colors.surface,
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: '6px',
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                      minWidth: '200px',
                                      maxHeight: '200px',
                                      overflow: 'auto'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'].map((frequency) => (
                                      <div
                                        key={frequency}
                                        onClick={() => {
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
    </>
  );
};

export default FloatingDeviceList;