import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  MapPin, 
  Clock, 
  Battery, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  X,
  Navigation,
  Gauge
} from 'lucide-react';
import { cn } from '../lib/utils';

const ModernStatusCard = ({ deviceId, position, onClose, desktopPadding = 0 }) => {
  if (!position) return null;

  const formatLastUpdate = (time) => {
    if (!time) return 'Never';
    const now = new Date();
    const updateTime = new Date(time);
    const diffMs = now - updateTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getBatteryIcon = (battery) => {
    if (battery === null || battery === undefined) return <Battery className="w-4 h-4" />;
    if (battery > 75) return <Battery className="w-4 h-4 text-green-500" />;
    if (battery > 25) return <Battery className="w-4 h-4 text-yellow-500" />;
    return <Battery className="w-4 h-4 text-red-500" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-gray-500';
      case 'unknown':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'unknown':
        return 'Unknown';
      default:
        return 'Unknown';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed z-50 max-w-sm w-full",
          desktopPadding > 0 ? `right-4 top-4` : "bottom-4 left-4 right-4"
        )}
        style={desktopPadding > 0 ? { marginRight: `${desktopPadding + 16}px` } : {}}
      >
        <Card className="shadow-xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  getStatusColor(position.status)
                )} />
                <h3 className="font-semibold text-lg">{position.deviceName}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={position.status === 'online' ? 'default' : 'secondary'}>
                  {getStatusText(position.status)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 space-y-4">
            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Location</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {position.address || `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Last Update */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Last Update</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatLastUpdate(position.fixTime)}
                </p>
              </div>

              {/* Speed */}
              {position.speed && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm">
                    <Gauge className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Speed</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {Math.round(position.speed * 3.6)} km/h
                  </p>
                </div>
              )}

              {/* Battery */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sm">
                  {getBatteryIcon(position.batteryLevel)}
                  <span className="font-medium">Battery</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {position.batteryLevel !== null && position.batteryLevel !== undefined 
                    ? `${position.batteryLevel}%` 
                    : 'N/A'
                  }
                </p>
              </div>

              {/* Course */}
              {position.course && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm">
                    <Navigation className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Course</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {Math.round(position.course)}°
                  </p>
                </div>
              )}
            </div>

            {/* Alerts */}
            {position.alarm && (
              <div className="flex items-center space-x-2 text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                <AlertCircle className="w-4 h-4" />
                <span>Alarm active</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModernStatusCard;

