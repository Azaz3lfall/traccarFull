import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { formatTime, formatNotificationTitle } from '../common/util/formatter';

const CustomNotificationStack = ({ notifications, onRemove }) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const devices = useSelector((state) => state.devices.items);
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  const timeoutRefs = useRef({});

  // Auto-remove notifications after 15 seconds
  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.show && !timeoutRefs.current[notification.id]) {
        timeoutRefs.current[notification.id] = setTimeout(() => {
          onRemove(notification.id);
        }, 15000); // 15 seconds
      }
    });
  }, [notifications, onRemove]);

  // Update visible notifications when notifications change
  useEffect(() => {
    setVisibleNotifications(notifications.filter(n => n.show));
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
    // Extract address from event if available
    return event.attributes?.address || null;
  };

  const formatEventType = (event) => {
    return formatNotificationTitle(t, {
      type: event.type,
      attributes: {
        alarms: event.attributes?.alarm,
      },
    });
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '400px',
      pointerEvents: 'none'
    }}>
      <AnimatePresence>
        {visibleNotifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              x: 0, 
              scale: 1,
              y: index * (120 + 8) // Stack with margin
            }}
            exit={{ 
              opacity: 0, 
              x: 300, 
              scale: 0.8,
              transition: { duration: 0.2 }
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3
            }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '12px',
              boxShadow: colors.shadow,
              border: `1px solid ${colors.border}`,
              padding: '16px',
              minWidth: '350px',
              maxWidth: '400px',
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
              fontSize: '16px',
              fontWeight: '600',
              color: colors.text,
              marginBottom: '6px',
              paddingRight: '24px' // Space for close button
            }}>
              {getDeviceName(notification.deviceId)}
            </div>
            
            {/* Device ID - Second Line */}
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: colors.textSecondary,
              marginBottom: '6px'
            }}>
              {notification.deviceId}
            </div>
            
            {/* Address - Third Line (if available) */}
            {getAddress(notification) && (
              <div style={{
                fontSize: '12px',
                color: colors.textSecondary,
                marginBottom: '6px',
                fontStyle: 'italic',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {getAddress(notification)}
              </div>
            )}
            
            {/* Event Type and Time - Fourth Line */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: colors.textSecondary
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
