import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MapPin, Clock, Battery, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { reverseGeocode } from '../common/util/formatter';

const DeviceCard = ({ device, position, onClick, isSelected = false }) => {
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const addressCacheKey = useRef(null);

  // Effect to resolve address when position changes
  useEffect(() => {
    if (!position) {
      setResolvedAddress(null);
      addressCacheKey.current = null;
      return;
    }

    const hasCoordinates = position.latitude && position.longitude;
    const hasAddress = position.address;
    const currentKey = `${position.latitude}_${position.longitude}`;

    // If we already have an address, clear resolved address
    if (hasAddress) {
      setResolvedAddress(null);
      addressCacheKey.current = null;
      return;
    }

    // If we have coordinates but no address, and we haven't resolved this location yet
    if (hasCoordinates && !hasAddress && addressCacheKey.current !== currentKey && !isResolvingAddress) {
      setIsResolvingAddress(true);
      addressCacheKey.current = currentKey;
      
      reverseGeocode(position.latitude, position.longitude)
        .then((address) => {
          if (address) {
            setResolvedAddress(address);
          } else {
            setResolvedAddress(null);
          }
          setIsResolvingAddress(false);
        })
        .catch((error) => {
          console.warn('Failed to resolve address:', error);
          setResolvedAddress(null);
          setIsResolvingAddress(false);
        });
    }
  }, [position, isResolvingAddress]);
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

  const getSignalIcon = (status) => {
    return status === 'online' ? 
      <Wifi className="w-4 h-4 text-green-500" /> : 
      <WifiOff className="w-4 h-4 text-gray-500" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-lg",
          isSelected && "ring-2 ring-primary shadow-lg"
        )}
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-3 h-3 rounded-full",
                getStatusColor(device.status)
              )} />
              <h3 className="font-semibold text-lg">{device.name}</h3>
            </div>
            <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
              {getStatusText(device.status)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Location */}
            {position && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>
                  {position.address || resolvedAddress || (isResolvingAddress ? 'Carregando...' : (position.latitude && position.longitude ? 
                    `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}` : 
                    'Sem dados'))}
                </span>
              </div>
            )}

            {/* Last Update */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Last seen: {formatLastUpdate(position?.fixTime)}</span>
            </div>

            {/* Device Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Battery */}
                <div className="flex items-center space-x-1">
                  {getBatteryIcon(position?.batteryLevel)}
                  <span className="text-sm">
                    {position?.batteryLevel !== null && position?.batteryLevel !== undefined 
                      ? `${position.batteryLevel}%` 
                      : 'N/A'
                    }
                  </span>
                </div>

                {/* Signal */}
                <div className="flex items-center space-x-1">
                  {getSignalIcon(device.status)}
                </div>
              </div>

              {/* Speed */}
              {position?.speed && (
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {Math.round(position.speed * 3.6)} km/h
                  </div>
                  <div className="text-xs text-muted-foreground">Speed</div>
                </div>
              )}
            </div>

            {/* Alerts */}
            {device.alarm && (
              <div className="flex items-center space-x-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>Alarm active</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DeviceCard;

