import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Chip,
  Divider
} from '@mui/material';
import { 
  Truck, 
  MapPin, 
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useThemeColors } from '../common/components/ThemeProvider';
import { formatTime, getStatusColor } from '../common/util/formatter';

const ClusterPopup = ({ 
  visible, 
  position, 
  devices, 
  onClose 
}) => {
  const colors = useThemeColors();

  if (!visible || !devices || devices.length === 0) {
    return null;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <Wifi size={16} color={getStatusColor('online')} />;
      case 'offline':
        return <WifiOff size={16} color={getStatusColor('offline')} />;
      default:
        return <WifiOff size={16} color={getStatusColor('unknown')} />;
    }
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
              backgroundColor: 'transparent',
            }}
          />
          
          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              zIndex: 1001,
              pointerEvents: 'auto',
            }}
          >
            <Box
              sx={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                minWidth: '280px',
                maxWidth: '400px',
                maxHeight: '400px',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  padding: '16px 20px',
                  borderBottom: `1px solid ${colors.border}`,
                  background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Truck size={20} color={colors.primary} />
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: colors.text, 
                      fontWeight: '600', 
                      margin: 0,
                      fontSize: '16px'
                    }}
                  >
                    Cluster ({devices.length} devices)
                  </Typography>
                </Box>
              </Box>

              {/* Device List */}
              <Box sx={{ maxHeight: '320px', overflow: 'auto' }}>
                {devices.length === 0 ? (
                  <Box sx={{ padding: '20px', textAlign: 'center' }}>
                    <Typography 
                      variant="body2" 
                      sx={{ color: colors.textSecondary, fontSize: '14px' }}
                    >
                      No devices found in this cluster
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ padding: 0 }}>
                    {devices.map((device, index) => (
                      <React.Fragment key={device.id}>
                        <ListItem
                          sx={{
                            padding: '12px 20px',
                            '&:hover': {
                              backgroundColor: colors.hover,
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: '40px' }}>
                            {getStatusIcon(device.status)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    color: colors.text, 
                                    fontWeight: '500',
                                    fontSize: '14px'
                                  }}
                                >
                                  {device.name}
                                </Typography>
                                <Chip
                                  label={device.status}
                                  size="small"
                                  color={getStatusChipColor(device.status)}
                                  sx={{ 
                                    fontSize: '10px',
                                    height: '20px',
                                    '& .MuiChip-label': {
                                      padding: '0 8px',
                                    }
                                  }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', mt: 1 }}>
                                {device.latitude && device.longitude && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={12} color={colors.textSecondary} />
                                    <Typography 
                                      variant="caption" 
                                      sx={{ color: colors.textSecondary, fontSize: '11px' }}
                                    >
                                      {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
                                    </Typography>
                                  </Box>
                                )}
                                {device.lastUpdate && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={12} color={colors.textSecondary} />
                                    <Typography 
                                      variant="caption" 
                                      sx={{ color: colors.textSecondary, fontSize: '11px' }}
                                    >
                                      {formatTime(device.lastUpdate)}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < devices.length - 1 && (
                          <Divider sx={{ backgroundColor: colors.border, margin: '0 20px' }} />
                        )}
                      </React.Fragment>
                  ))}
                  </List>
                )}
              </Box>
            </Box>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ClusterPopup;
