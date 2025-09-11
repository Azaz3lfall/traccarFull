import React, {
  useState,
  useRef,
  useMemo,
  useCallback
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
// import { FixedSizeList } from 'react-window';
import { devicesActions } from '../store';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import { formatPercentage, formatStatus } from '../common/util/formatter';
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
  setFilterMap 
}) => {
  console.log('FloatingDeviceList rendering', { filteredDevices: filteredDevices?.length });
  
  const dispatch = useDispatch();
  const t = useTranslation();
  
  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showOnMobile, setShowOnMobile] = useState(true);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);
  const filterButtonRef = useRef(null);
  const filterPopupRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const groupsDropdownRef = useRef(null);
  
  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  
  const deviceStatusCount = useCallback((status) => Object.values(devices).filter((d) => d.status === status).length, [devices]);

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

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [showFilters]);

  // Hide device list on mobile when device is selected
  React.useEffect(() => {
    if (isMobile && selectedDeviceId) {
      setShowOnMobile(false);
    } else if (isMobile && !selectedDeviceId) {
      setShowOnMobile(true);
    }
  }, [isMobile, selectedDeviceId]);
  

  // Memoized device row component for virtualized rendering
  const DeviceRow = useCallback(({ index, style, data }) => {
    const device = data.devices[index];
    const position = data.positions.find(p => p.deviceId === device.id);
    const isSelected = data.selectedDeviceId === device.id;
    
    return (
      <div style={style}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card 
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: isSelected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
              boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              margin: '4px 0 8px 0',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
            onClick={(e) => handleDeviceClick(device.id, e)}
          >
            <div style={{ padding: '12px 0px 12px 0px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                {/* Device Icon with Speed */}
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
                    backgroundColor: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img 
                      style={{ width: '24px', height: '24px' }} 
                      src={mapIcons[mapIconKey(device.category)]} 
                      alt="" 
                    />
                  </div>
                  
                  {/* Speed below icon */}
                  {position && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '10px',
                      color: '#6B7280',
                      marginTop: '8px'
                    }}>
                      <Gauge style={{ width: '10px', height: '10px' }} />
                      <span>{position.speed ? Math.round(position.speed * 3.6) : 0} km/h</span>
                    </div>
                  )}
                </div>
                
                {/* Device Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                  }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#6B7280',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {device[devicePrimary]}
                    </h3>
                    
                    {/* Sensor Icons - Always visible */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: isMobile ? '6px' : '4px',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                      minWidth: isMobile ? '80px' : '60px',
                      paddingRight: '8px'
                    }}>
                      {/* Alarm */}
                      <div style={{
                        width: isMobile ? '20px' : '16px',
                        height: isMobile ? '20px' : '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <AlertTriangle style={{ 
                          width: isMobile ? '18px' : '16px', 
                          height: isMobile ? '18px' : '16px', 
                          color: position?.attributes?.alarm ? '#EF4444' : '#D1D5DB' 
                        }} />
                      </div>
                      
                      {/* Ignition */}
                      <div style={{
                        width: isMobile ? '20px' : '16px',
                        height: isMobile ? '20px' : '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <EngineIcon style={{ 
                          width: isMobile ? '18px' : '16px', 
                          height: isMobile ? '18px' : '16px', 
                          color: position?.attributes?.ignition ? '#10B981' : '#D1D5DB' 
                        }} />
                      </div>
                      
                      {/* Motion */}
                      <div style={{
                        width: isMobile ? '20px' : '16px',
                        height: isMobile ? '20px' : '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: isMobile ? '10px' : '8px',
                          height: isMobile ? '10px' : '8px',
                          borderRadius: '50%',
                          backgroundColor: position?.attributes?.motion ? '#3B82F6' : '#D1D5DB'
                        }} />
                      </div>
                      
                      {/* Door */}
                      <div style={{
                        width: isMobile ? '20px' : '16px',
                        height: isMobile ? '20px' : '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: isMobile ? '14px' : '12px',
                          height: isMobile ? '10px' : '8px',
                          border: `2px solid ${position?.attributes?.door ? '#10B981' : '#D1D5DB'}`,
                          borderRadius: '2px',
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: isMobile ? '5px' : '4px',
                            height: isMobile ? '5px' : '4px',
                            backgroundColor: position?.attributes?.door ? '#10B981' : '#D1D5DB',
                            borderRadius: '50%'
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Dot and Text - Below device name */}
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
                      backgroundColor: getStatusColor(device.status)
                    }} />
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      textTransform: 'capitalize'
                    }}>
                      {t(`deviceStatus${device.status.charAt(0).toUpperCase() + device.status.slice(1)}`)}
                    </span>
                  </div>
                  
                  <p style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {position?.address || formatLastUpdate(device)}
                  </p>
                </div>
              </div>
              
              {/* Additional Info */}
              {position && position.attributes?.batteryLevel && (
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#6B7280'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Battery */}
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
  }, [devicePrimary, getStatusColor, formatLastUpdate, getBatteryIcon, handleDeviceClick, mapIcons, mapIconKey]);

  // Memoized data for virtualized list
  const listData = useMemo(() => ({
    devices: filteredDevices,
    positions: positions,
    selectedDeviceId: selectedDeviceId
  }), [filteredDevices, positions, selectedDeviceId]);
  
  // Don't render on mobile if device is selected
  if (isMobile && !showOnMobile) {
    return null;
  }

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        position: 'fixed',
        top: isMobile ? '0px' : '16px',
        left: isMobile ? '0px' : '16px',
        width: isMobile ? '100vw' : '360px',
        height: isMobile ? '100vh' : 'calc(100vh - 32px)',
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
    >
      <Card style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        borderRadius: isMobile ? '0px' : '16px',
        boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
              color: '#9CA3AF'
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
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                outline: 'none',
                boxShadow: 'none'
              }}
              onFocus={(e) => {
                e.target.style.outline = 'none';
                e.target.style.boxShadow = 'none';
                e.target.style.borderColor = '#D1D5DB';
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
              <Filter style={{ width: '16px', height: '16px', color: '#D1D5DB' }} />
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
                right: isMobile ? '16px' : (filterButtonRef.current ? window.innerWidth - filterButtonRef.current.getBoundingClientRect().right : 0),
                left: isMobile ? '16px' : 'auto',
                width: isMobile ? 'calc(100vw - 32px)' : '300px',
                maxWidth: isMobile ? '400px' : '300px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid #E5E7EB',
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
                      color: '#374151'
                    }}>{t('deviceStatus')}</label>
                    {filter.statuses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilter({ ...filter, statuses: [] })}
                        style={{
                          fontSize: '12px',
                          color: '#6B7280',
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
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      fontSize: '14px',
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none'
                    }}
                  >
                    <span>
                      {filter.statuses.length === 0 
                        ? 'All' 
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
                        color: '#6B7280'
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
                          backgroundColor: 'white',
                          border: '1px solid #D1D5DB',
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
                              color: '#374151',
                              backgroundColor: filter.statuses.includes(status) ? '#F3F4F6' : 'transparent',
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
                      color: '#374151'
                    }}>{t('settingsGroups')}</label>
                    {filter.groups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilter({ ...filter, groups: [] })}
                        style={{
                          fontSize: '12px',
                          color: '#6B7280',
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
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      fontSize: '14px',
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none'
                    }}
                  >
                    <span>
                      {filter.groups.length === 0 
                        ? 'All' 
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
                        color: '#6B7280'
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
                          backgroundColor: 'white',
                          border: '1px solid #D1D5DB',
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
                              color: '#374151',
                              backgroundColor: filter.groups.includes(group.id) ? '#F3F4F6' : 'transparent',
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
                      color: '#374151',
                      marginBottom: '8px',
                      display: 'block'
                    }}>{t('sharedSortBy')}</label>
                  
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      fontSize: '14px',
                      color: '#374151',
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
                        color: '#6B7280'
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
                          backgroundColor: 'white',
                          border: '1px solid #D1D5DB',
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
                            color: '#374151',
                            backgroundColor: filterSort === 'name' ? '#F3F4F6' : 'transparent',
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
                            color: '#374151',
                            backgroundColor: filterSort === 'lastUpdate' ? '#F3F4F6' : 'transparent',
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
                  borderTop: '1px solid #E5E7EB',
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
          {filteredDevices.length > 0 ? (
            <div style={{ 
              height: isMobile ? 'calc(100vh - 80px)' : '400px', 
              overflowY: 'auto',
              width: '100%',
              padding: '0px 16px 0px 16px'
            }}>
              {filteredDevices.map((device, index) => (
                <DeviceRow 
                  key={device.id} 
                  index={index} 
                  style={{}} 
                  data={listData} 
                />
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '128px',
              color: '#6B7280'
            }}>
              <Search style={{ width: '32px', height: '32px', marginBottom: '8px' }} />
              <p style={{ fontSize: '14px', margin: 0 }}>{t('sharedNoDevicesFound')}</p>
            </div>
          )}
        </div>
        
        {/* Removed Footer with Add Device Button */}
      </Card>
    </motion.div>
  );
};

export default FloatingDeviceList;