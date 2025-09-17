import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { devicesActions } from '../store';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import { useDeviceReadonly } from '../common/util/permissions';
import { distanceFromMeters, distanceToMeters, distanceUnitString } from '../common/util/converter';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { formatPercentage, formatStatus, formatSpeed, formatDistance, formatCoordinate, formatTime, formatCourse, formatAltitude, formatVoltage, formatVolume, formatBoolean, formatAlarm, formatNumber, formatNumericHours } from '../common/util/formatter';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import PositionValue from '../common/components/PositionValue';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import EngineIcon from '../resources/images/data/engine.svg?react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { 
  MapPin, 
  Battery, 
  AlertTriangle,
  Gauge,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Loader2,
  Settings
} from 'lucide-react';
import { Card } from './ui/card';

dayjs.extend(relativeTime);

const FloatingStatusCard = ({ desktop, isMenuExpanded, isDeviceListVisible }) => {
  const dispatch = useDispatch();
  const t = useTranslation();
  const colors = useThemeColors();
  
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const groups = useSelector((state) => state.groups.items);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailedPosition, setDetailedPosition] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // User preferences
  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const deviceSecondary = useAttributePreference('deviceSecondary', '');
  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
  const altitudeUnit = useAttributePreference('altitudeUnit');
  const volumeUnit = useAttributePreference('volumeUnit');
  const coordinateFormat = usePreference('coordinateFormat');
  const positionItems = useAttributePreference('positionItems', 'fixTime,address,speed,totalDistance');
  const positionAttributes = usePositionAttributes(t);
  const deviceReadonly = useDeviceReadonly();
  
  // Get current device and position
  const device = selectedDeviceId ? devices[selectedDeviceId] : null;
  const position = selectedDeviceId ? positions[selectedDeviceId] : null;
  const group = device?.groupId ? groups[device.groupId] : null;
  
  
  const formatLastUpdate = useCallback((device) => {
    if (device.status === 'online' || !device.lastUpdate) {
      return formatStatus(device.status, t);
    }
    return dayjs(device.lastUpdate).fromNow();
  }, [t]);

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
  
  const handleClose = useCallback(() => {
    dispatch(devicesActions.selectId(null));
  }, [dispatch]);


  const handleEditField = useCallback((field, currentValue) => {
    if (field === 'hours') {
      setEditValue((currentValue / 3600000).toString());
    } else if (field === 'totalDistance') {
      setEditValue(distanceFromMeters(currentValue, distanceUnit).toString());
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
  
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10B981';
      case 'offline': return '#EF4444';
      case 'unknown': return '#6B7280';
      default: return '#6B7280';
    }
  };
  
  const getBatteryIcon = (level) => {
    if (level > 75) return <Battery size={16} color="#10B981" />;
    if (level > 25) return <Battery size={16} color="#F59E0B" />;
    return <Battery size={16} color="#EF4444" />;
  };
  
  return (
    <AnimatePresence mode="wait">
      {selectedDeviceId && device && (
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
          left: !desktop ? '0px' : (isDeviceListVisible ? (isMenuExpanded ? '510px' : '370px') : (isMenuExpanded ? '200px' : '63px')),
          width: !desktop ? '100vw' : '290px',
          height: !desktop ? '50vh' : 'calc(100vh - 16px)',
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
            onClick={() => dispatch(devicesActions.selectId(null))}
            style={{
              position: 'absolute',
              top: !desktop ? '8px' : '12px',
              left: !desktop ? '2px' : '12px',
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
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
            }}
          >
            <ChevronLeft size={20} color={colors.textSecondary} />
          </button>
          
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.surface
          }}>
            {!desktop ? (
              /* Mobile Layout - 2 Columns */
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* Column 1: Picture and Speed */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '80px' }}>
                  {/* Device Image */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: colors.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '1px solid #E5E7EB'
                  }}>
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
                  {/* Chevron and uniqueId on first line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Chevron placeholder for alignment */}
                    <div style={{ width: '20px' }} />
                    
                    {/* uniqueId */}
                    <span style={{ 
                      fontSize: '12px', 
                      color: colors.textSecondary, 
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}>
                      {device.uniqueId}
                    </span>
                  </div>

                  {/* Device Name centered */}
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: colors.text,
                    margin: 0,
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
                  {/* Chevron and uniqueId on first line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    {/* Chevron placeholder for alignment */}
                    <div style={{ width: '20px' }} />
                    
                    {/* uniqueId */}
                    <span style={{ 
                      fontSize: '14px', 
                      color: colors.textSecondary, 
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}>
                      {device.uniqueId}
                    </span>
                  </div>

                  {/* Device Name centered */}
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: colors.text,
                    margin: 0,
                    lineHeight: '1.2',
                    textAlign: 'center'
                  }}>
                    {device[devicePrimary]}
                  </h3>
                </div>

            {/* Device Image */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                        backgroundColor: colors.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '2px solid #E5E7EB'
              }}>
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
              justifyContent: 'space-between',
              gap: '8px',
              width: '100%',
              marginTop: !desktop ? '12px' : '0px'
            }}>
              {/* Button 1 - Lock/Unlock (Green) */}
              <button
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '1px solid #10B981',
                  borderRadius: '4px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#10B981',
                    borderRadius: '50%'
                  }} />
                </div>
              </button>
              
              {/* Button 2 - Lock (Red) */}
              <button
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '1px solid #EF4444',
                  borderRadius: '4px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#EF4444',
                    borderRadius: '50%'
                  }} />
                </div>
              </button>
              
              {/* Button 3 - Upload/Send */}
              <button
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0',
                    height: '0',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: '8px solid #6B7280'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '12px',
                    height: '2px',
                    backgroundColor: '#6B7280'
                  }} />
                </div>
              </button>
              
              {/* Button 4 - Share */}
              <button
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    width: '4px',
                    height: '4px',
                    backgroundColor: '#6B7280',
                    borderRadius: '50%'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '4px',
                    height: '4px',
                    backgroundColor: '#6B7280',
                    borderRadius: '50%'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '4px',
                    height: '4px',
                    backgroundColor: '#6B7280',
                    borderRadius: '50%'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '8px',
                    height: '1px',
                    backgroundColor: '#6B7280'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(90deg)',
                    width: '8px',
                    height: '1px',
                    backgroundColor: '#6B7280'
                  }} />
                </div>
              </button>
              
              {/* Button 5 - Refresh */}
              <button
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '1px solid #6B7280',
                  borderRadius: '50%',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '0',
                    height: '0',
                    borderLeft: '3px solid transparent',
                    borderRight: '3px solid transparent',
                    borderBottom: '4px solid #6B7280',
                    transform: 'rotate(45deg)'
                  }} />
                </div>
              </button>
              
              {/* Button 6 - More Details (Green) */}
              <button
                onClick={handleMoreDetails}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    backgroundColor: '#10B981',
                    borderRadius: '50%'
                  }} />
                  <div style={{
                    width: '4px',
                    height: '4px',
                    backgroundColor: '#10B981',
                    borderRadius: '50%'
                  }} />
                  <div style={{
                    width: '4px',
                    height: '4px',
                    backgroundColor: '#10B981',
                    borderRadius: '50%'
                  }} />
                </div>
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflow: 'auto'
          }}>
            
            {/* Position Attributes */}
            {position && (
              <div style={{ marginBottom: '16px' }}>
                {positionItems.split(',').filter((key) => key && key !== 'address' && (position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key))).map((key, index) => {
                  const attributeName = positionAttributes[key]?.name || key;
                  const value = position.hasOwnProperty(key) ? position[key] : position.attributes[key];
                  
                  return (
                    <div key={`position-${key || 'empty'}-${index}`} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
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
                      key === 'accuracy' || key === 'odometer' || key === 'serviceOdometer' || key === 'tripOdometer' || key === 'obdOdometer' || key === 'distance' || key === 'totalDistance' ? 
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
                              transition: 'all 0.2s',
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
              zIndex: 10000
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
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
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
                          gridTemplateColumns: '20% 20% 60%',
                          gap: '16px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: colors.textSecondary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          <div>{t('stateName')}</div>
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
                              gridTemplateColumns: '20% 20% 60%',
                              gap: '16px',
                              padding: '8px 16px',
                              borderBottom: `1px solid ${colors.border}`,
                              fontSize: '12px',
                              lineHeight: '1.4',
                              minHeight: '32px'
                            }}>
                              <div style={{ color: colors.textSecondary, fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
                                {property}
                              </div>
                              <div style={{ color: colors.text, fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                                {positionAttributes[property]?.name || property}
                              </div>
                              <div style={{ color: colors.text, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap', paddingLeft: '16px', paddingRight: '8px' }}>
                                <div style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4', overflowX: 'hidden', overflowY: 'visible', paddingRight: (property === 'totalDistance' || property === 'hours') ? '4px' : '16px' }}>
                                  {property === 'fixTime' || property === 'deviceTime' || property === 'serverTime' ? 
                                    formatTime(value, 'seconds') :
                                property === 'speed' ? 
                                  formatSpeed(value, speedUnit, t) :
                                property === 'course' ? 
                                  formatCourse(value, t) :
                                property === 'altitude' ? 
                                  formatAltitude(value, altitudeUnit, t) :
                              property === 'accuracy' || property === 'odometer' || property === 'serviceOdometer' || property === 'tripOdometer' || property === 'obdOdometer' || property === 'distance' || property === 'totalDistance' ? 
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
                                    transition: 'all 0.2s',
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
                              gridTemplateColumns: '20% 20% 60%',
                              gap: '16px',
                              padding: '8px 16px',
                              borderBottom: `1px solid ${colors.border}`,
                              fontSize: '12px',
                              lineHeight: '1.4',
                              minHeight: '32px'
                            }}>
                              <div style={{ color: colors.textSecondary, fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
                                {attribute}
                              </div>
                              <div style={{ color: colors.text, fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                                {positionAttributes[attribute]?.name || attribute}
                              </div>
                              <div style={{ color: colors.text, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap', paddingLeft: '16px', paddingRight: '8px' }}>
                                <div style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4', overflowX: 'hidden', overflowY: 'visible', paddingRight: (attribute === 'totalDistance' || attribute === 'hours') ? '4px' : '16px' }}>
                                  {attribute === 'fixTime' || attribute === 'deviceTime' || attribute === 'serverTime' ? 
                                    formatTime(value, 'seconds') :
                                attribute === 'speed' ? 
                                  formatSpeed(value, speedUnit, t) :
                                attribute === 'course' ? 
                                  formatCourse(value, t) :
                                attribute === 'altitude' ? 
                                  formatAltitude(value, altitudeUnit, t) :
                              attribute === 'accuracy' || attribute === 'odometer' || attribute === 'serviceOdometer' || attribute === 'tripOdometer' || attribute === 'obdOdometer' || attribute === 'distance' || attribute === 'totalDistance' ? 
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
                                    transition: 'all 0.2s',
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
              zIndex: 10001
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
                      border: `1px solid ${colors.border}`,
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
                      border: `1px solid ${colors.border}`,
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
                      transition: 'all 0.2s',
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
    </AnimatePresence>
  );
};

export default FloatingStatusCard;
