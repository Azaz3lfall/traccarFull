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
import { formatPercentage, formatStatus, formatSpeed, formatDistance, formatCoordinate } from '../common/util/formatter';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import EngineIcon from '../resources/images/data/engine.svg?react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { 
  Search, 
  Filter, 
  MapPin, 
  Battery, 
  AlertTriangle,
  Gauge,
  Check,
  ChevronDown
} from 'lucide-react';
import { Input } from './ui/input';
import { Card } from './ui/card';

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
  isVisible
}) => {
  console.log('FloatingDeviceList rendering', { filteredDevices: filteredDevices?.length });
  
  const dispatch = useDispatch();
  const t = useTranslation();
  const colors = useThemeColors();
  
  const groups = useSelector((state) => state.groups.items || {});
  const devices = useSelector((state) => state.devices.items || {});
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  
  const [showFilters, setShowFilters] = useState(false);
  const [showOnMobile, setShowOnMobile] = useState(true);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Force re-render when colors change
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [colors.background, colors.surface, colors.text, colors.border]);

  // Create a key that changes when theme changes to force virtualizer re-mount
  const virtualizerContainerKey = useMemo(() => {
    return `virtualizer-${forceUpdate}-${colors.background}-${colors.surface}-${colors.text}`;
  }, [forceUpdate, colors.background, colors.surface, colors.text]);
  const filterButtonRef = useRef(null);
  const filterPopupRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const groupsDropdownRef = useRef(null);
  const parentRef = useRef(null);
  
  // Handle window resize for proper virtualization height
  React.useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  
  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const deviceSecondary = useAttributePreference('deviceSecondary', '');
  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
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
    if (device.status === 'online' || !device.lastUpdate) {
      return formatStatus(device.status, t);
    }
    return dayjs(device.lastUpdate).fromNow();
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
      if (showFilters && 
          filterButtonRef.current && 
          filterPopupRef.current &&
          !filterButtonRef.current.contains(event.target) &&
          !filterPopupRef.current.contains(event.target)) {
        setShowFilters(false);
      }
      
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  // Hide device list on mobile when device is selected
  React.useEffect(() => {
    if (!desktop && selectedDeviceId) {
      setShowOnMobile(false);
    } else if (!desktop && !selectedDeviceId) {
      setShowOnMobile(true);
    }
  }, [!desktop, selectedDeviceId]);
  

  // Memoized device row component for virtualized rendering
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s',
            backgroundColor: colors.surface,
            borderRadius: '12px',
            border: isSelected ? '2px solid #3B82F6' : `1px solid ${colors.border}`,
            boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            margin: '0',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
          onClick={(e) => handleDeviceClick(device.id, e)}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.target.style.backgroundColor = colors.hover;
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.target.style.backgroundColor = colors.surface;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
            }
          }}
        >
          <Card 
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              boxShadow: 'none',
              margin: '0',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ padding: '8px 0px 4px 0px', pointerEvents: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '4px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  paddingLeft: '8px'
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
                      style={{ width: '24px', height: '24px' }} 
                      src={mapIcons[mapIconKey(device.category)] || ''} 
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
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {device[devicePrimary] || 'Unknown'}
                    </h3>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: !desktop ? '6px' : '4px',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                      minWidth: !desktop ? '80px' : '60px',
                      paddingRight: '8px'
                    }}>
                      <div style={{
                        width: !desktop ? '20px' : '16px',
                        height: !desktop ? '20px' : '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <AlertTriangle style={{ 
                          width: !desktop ? '18px' : '16px', 
                          height: !desktop ? '18px' : '16px', 
                          color: position?.attributes?.alarm ? '#EF4444' : '#D1D5DB' 
                        }} />
                      </div>
                      <div style={{
                        width: !desktop ? '20px' : '16px',
                        height: !desktop ? '20px' : '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <EngineIcon style={{ 
                          width: !desktop ? '18px' : '16px', 
                          height: !desktop ? '18px' : '16px', 
                          color: position?.attributes?.ignition ? '#10B981' : '#D1D5DB' 
                        }} />
                      </div>
                      <div style={{
                        width: !desktop ? '20px' : '16px',
                        height: !desktop ? '20px' : '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: !desktop ? '10px' : '8px',
                          height: !desktop ? '10px' : '8px',
                          borderRadius: '50%',
                          backgroundColor: position?.attributes?.motion ? '#3B82F6' : '#D1D5DB'
                        }} />
                      </div>
                      <div style={{
                        width: !desktop ? '20px' : '16px',
                        height: !desktop ? '20px' : '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: !desktop ? '14px' : '12px',
                          height: !desktop ? '10px' : '8px',
                          border: `2px solid ${position?.attributes?.door ? '#10B981' : '#D1D5DB'}`,
                          borderRadius: '2px',
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: !desktop ? '5px' : '4px',
                            height: !desktop ? '5px' : '4px',
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
                    marginBottom: '4px'
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
                      color: colors.text,
                      textTransform: 'capitalize'
                    }}>
                      {t(`deviceStatus${(device.status || 'unknown').charAt(0).toUpperCase() + (device.status || 'unknown').slice(1)}`)}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{
                paddingLeft: '8px',
                paddingRight: '8px'
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
              {position && position.attributes?.batteryLevel && (
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: colors.textSecondary
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {getBatteryIcon(position.attributes.batteryLevel)}
                      <span>{formatPercentage(position.attributes.batteryLevel)}</span>
                    </div>
                  </div>
                </div>
              )}
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

  // TanStack Virtual setup
  const virtualizer = useVirtualizer({
    count: filteredDevices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 105, // Estimated height of each device row (no overlapping)
    overscan: 5,
  });

  // Force re-render when colors change by using colors in the virtualizer items
  const virtualizerItems = useMemo(() => {
    return virtualizer.getVirtualItems().map((virtualItem) => {
      const device = filteredDevices[virtualItem.index];
      return {
        ...virtualItem,
        device,
        colors, // Include colors in each item to force re-render
        forceUpdate // Include forceUpdate to trigger re-render
      };
    });
  }, [virtualizer, filteredDevices, colors, forceUpdate]);

  // Debug logging
  console.log('Virtualizer debug:', {
    totalSize: virtualizer.getTotalSize(),
    virtualItems: virtualizer.getVirtualItems().map(item => ({
      index: item.index,
      start: item.start,
      size: item.size,
      end: item.end
    }))
  });
  
  return (
    <AnimatePresence mode="wait">
      {!(!desktop && !showOnMobile) && isVisible && (
        <motion.div
          key="floating-device-list"
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
        zIndex: 9999,
        pointerEvents: 'auto',
        transition: 'left 0.3s ease'
      }}
    >
      <Card style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.surface,
        borderRadius: !desktop ? '0px' : (selectedDeviceId ? '0px 0px 0px 0px' : '0px 16px 16px 0px'),
        boxShadow: !desktop ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: 'none'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 16px 8px 16px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
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
              placeholder={t('sharedEnterValue')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{
                paddingLeft: '40px',
                paddingRight: '40px',
                height: '40px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
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
            <button
              ref={filterButtonRef}
              type="button"
              style={{
                position: 'absolute',
                right: '4px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '32px',
                height: '32px',
                padding: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter style={{ width: '16px', height: '16px', color: colors.textSecondary }} />
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
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: filterButtonRef.current ? filterButtonRef.current.getBoundingClientRect().bottom + 8 : 0,
                right: !desktop ? '16px' : (filterButtonRef.current ? window.innerWidth - filterButtonRef.current.getBoundingClientRect().right : 0),
                left: !desktop ? '16px' : 'auto',
                width: !desktop ? 'calc(100vw - 32px)' : '300px',
                maxWidth: !desktop ? '400px' : '300px',
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
                        transition={{ duration: 0.2 }}
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
                        transition={{ duration: 0.2 }}
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
                        transition={{ duration: 0.2 }}
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
                    color: '#374151',
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
                  const device = virtualItem.device;
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
  );
};

export default FloatingDeviceList;