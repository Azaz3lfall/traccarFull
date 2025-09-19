import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { devicesActions } from '../store';
import DeviceCard from './DeviceCard';
import { Input } from './ui/input';
import { Search, Filter, Grid, List, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { useMediaQuery } from '../common/util/hooks';

const ModernDeviceList = ({ devices, positions }) => {
  const dispatch = useDispatch();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewMode, setViewMode] = React.useState('grid'); // 'grid' or 'list'
  const desktop = useMediaQuery('(min-width: 1024px)');

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeviceClick = (deviceId) => {
    dispatch(devicesActions.selectId(deviceId));
  };

  const getPositionForDevice = (deviceId) => {
    return positions.find(position => position.deviceId === deviceId);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Devices</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Device List */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="popLayout">
          <motion.div
            className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "space-y-3"
            }
            layout
          >
            {filteredDevices.map((device) => {
              const position = getPositionForDevice(device.id);
              return (
                <DeviceCard
                  key={device.id}
                  device={device}
                  position={position}
                  isSelected={selectedDeviceId === device.id}
                  onClick={() => handleDeviceClick(device.id)}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>

        {filteredDevices.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-64 text-muted-foreground"
          >
            <Search className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No devices found</p>
            <p className="text-sm">Try adjusting your search terms</p>
          </motion.div>
        )}
      </div>

      {/* Floating Action Button for Mobile Drawer */}
      {true && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          onClick={() => console.log('Drawer opened')}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
        >
          <Menu 
            style={{ 
              width: '24px', 
              height: '24px', 
              color: 'white' 
            }} 
          />
        </motion.button>
      )}

    </div>
  );
};

export default ModernDeviceList;

