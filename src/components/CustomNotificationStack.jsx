import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { formatTime, formatNotificationTitle } from '../common/util/formatter';

const CustomNotificationStack = ({ notifications, onRemove }) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  const timeoutRefs = useRef({});

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.show && !timeoutRefs.current[notification.id]) {
        timeoutRefs.current[notification.id] = setTimeout(() => {
          onRemove(notification.id);
        }, 5000); // 5 seconds
      }
    });
    
    // Clean up timeouts for removed notifications
    const currentIds = new Set(notifications.map(n => n.id));
    Object.keys(timeoutRefs.current).forEach(id => {
      if (!currentIds.has(parseInt(id))) {
        clearTimeout(timeoutRefs.current[id]);
        delete timeoutRefs.current[id];
      }
    });
  }, [notifications, onRemove]);

  // Update visible notifications when notifications change
  useEffect(() => {
    const visible = notifications.filter(n => n.show);
    // Remove duplicates by ID and keep only the 5 most recent notifications
    const unique = visible.reduce((acc, current) => {
      const existing = acc.find(item => item.id === current.id);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, []);
    const limited = unique.slice(-5);
    setVisibleNotifications(limited);
  }, [notifications]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  const handleRemove = (id) => {
    if (timeoutRefs.current[id]) {
      clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }
    onRemove(id);
  };

  const getDeviceName = (deviceId) => {
    return devices[deviceId]?.name || `Device ${deviceId}`;
  };

  const getAddress = (event) => {
    // Get address from device's current position
    if (!event?.deviceId || !positions) return null;
    const position = positions[event.deviceId];
    const address = position?.address || null;
    
    // Debug logging

    
    return address;
  };

  const formatEventType = (event) => {
    const device = devices[event.deviceId];
    
    // Get standard event formatting first
    const standardEvent = formatNotificationTitle(t, {
      type: event.type,
      attributes: {
        alarms: event.attributes?.alarm,
      },
    });
    
    // Check if we can replace any sensor key in the event type with custom name
    if (device?.attributes?.customSensors) {
      try {
        const customSensors = JSON.parse(device.attributes.customSensors);
        
        // Check each custom sensor key to see if it appears in the event type
        for (const [sensorKey, customName] of Object.entries(customSensors)) {
          if (event.type.includes(sensorKey)) {
            // Replace the sensor key with custom name in the standard event
            const regex = new RegExp(sensorKey, 'gi');
            let customEvent = standardEvent.replace(regex, customName);
            
            // Handle on/off status for boolean events
            if (event.type.endsWith('On') || event.type.endsWith('Off')) {
              const isOn = event.type.endsWith('On');
              const status = isOn ? t('sharedYes') : t('sharedNo');
              customEvent = `${customName}: ${status}`;
            }
            
            return customEvent;
          }
        }
      } catch (error) {
        console.error('Error parsing customSensors:', error);
      }
    }
    
    return standardEvent;
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: isMobile ? '20px' : '20px',
      left: isMobile ? '20px' : 'auto', // Only add left margin on mobile
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column-reverse', // Reverse so newest appear at bottom
      gap: '8px',
      maxWidth: isMobile ? 'calc(100vw - 40px)' : '400px', // Responsive max width
      width: isMobile ? '100%' : 'auto', // Full width on mobile, auto on desktop
      pointerEvents: 'none'
    }}>
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1
            }}
            exit={{ 
              opacity: 0, 
              y: 100, 
              scale: 0.8,
              transition: { 
                duration: 0.3,
                ease: "easeInOut"
              }
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3,
              layout: {
                type: "spring",
                stiffness: 300,
                damping: 30
              }
            }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '12px',
              boxShadow: colors.shadow,
              border: `1px solid ${colors.border}`,
              padding: isMobile ? '12px' : '16px', // Smaller padding on mobile
              minWidth: isMobile ? '280px' : '350px', // Responsive min width
              maxWidth: '100%', // Take full width of container
              width: '100%', // Full width on mobile
              pointerEvents: 'auto',
              position: 'relative'
            }}
          >
            {/* Close Button */}
            <IconButton
              size="small"
              onClick={() => handleRemove(notification.id)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                color: colors.textSecondary,
                padding: '4px'
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            {/* Device Name - Header */}
            <div style={{
              fontSize: isMobile ? '13px' : '14px', // Smaller font on mobile
              fontWeight: '500',
              color: colors.textSecondary,
              marginBottom: '4px',
              paddingRight: '24px' // Space for close button
            }}>
              {getDeviceName(notification.deviceId)}
            </div>
            
            {/* Address - Second Line (if available) */}
            {getAddress(notification) && (
              <div style={{
                fontSize: isMobile ? '10px' : '11px', // Smaller font on mobile
                color: '#9CA3AF',
                marginBottom: '4px',
                fontStyle: 'italic',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {getAddress(notification)}
              </div>
            )}
            
            {/* Event Type and Time - Third Line */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: isMobile ? '11px' : '12px', // Smaller font on mobile
              color: '#9CA3AF'
            }}>
              <span style={{ fontWeight: '500' }}>
                {formatEventType(notification)}
              </span>
              <span>
                {formatTime(notification.eventTime, 'seconds')}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CustomNotificationStack;
