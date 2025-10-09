import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { devicesActions } from '../store';
import ModernDeviceList from './ModernDeviceList';
import DrawerMenu from './DrawerMenu';
import { useAttributePreference } from '../common/util/preferences';
import useFilter from '../main/useFilter';
import usePersistedState from '../common/util/usePersistedState';
import MainMap from '../main/MainMap';
import ModernStatusCard from './ModernStatusCard';
import EventsDrawer from '../main/EventsDrawer';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Menu, Map, List, Settings, Bell } from 'lucide-react';

const ModernMainPage = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const mapOnSelect = useAttributePreference('mapOnSelect', true);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const user = useSelector((state) => state.session.user);
  const { companyName } = useResellerBranding();
  
  // Check if user has mainMenu permission
  const hasMainMenuPermission = useMemo(() => {
    if (!user || !user.attributes || !user.attributes.accessLevel) {
      return false; // No accessLevel means no permission
    }
    try {
      const accessLevel = JSON.parse(user.attributes.accessLevel);
      return accessLevel.mainMenu === true;
    } catch (error) {
      return false; // Parse error means no permission
    }
  }, [user]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const selectedPosition = filteredPositions.find((position) => selectedDeviceId && position.deviceId === selectedDeviceId);

  const [filteredDevices, setFilteredDevices] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = usePersistedState('filter', {
    statuses: [],
    groups: [],
  });
  const [filterSort, setFilterSort] = usePersistedState('filterSort', '');
  const [filterMap, setFilterMap] = usePersistedState('filterMap', false);

  const [devicesOpen, setDevicesOpen] = useState(desktop);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(desktop);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const onEventsClick = useCallback(() => setEventsOpen(true), [setEventsOpen]);
  const onDrawerOpen = useCallback(() => setDrawerOpen(true), []);
  const onDrawerClose = useCallback(() => setDrawerOpen(false), []);
  const onNavigate = useCallback((route) => {
    // Handle navigation to different routes
    // You can implement navigation logic here
  }, []);

  useEffect(() => {
    if (!desktop && mapOnSelect && selectedDeviceId) {
      setDevicesOpen(false);
    }
  }, [desktop, mapOnSelect, selectedDeviceId]);

  useFilter(keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions);

  const sidebarVariants = {
    open: { x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { x: -320, transition: { type: "spring", stiffness: 300, damping: 30 } }
  };

  const overlayVariants = {
    open: { opacity: 1, pointerEvents: "auto" },
    closed: { opacity: 0, pointerEvents: "none" }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {!desktop && sidebarOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-40"
          variants={overlayVariants}
          initial="closed"
          animate="open"
          exit="closed"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        className={`
          ${desktop ? 'relative' : 'fixed'} 
          z-50 w-80 h-full bg-card border-r shadow-lg
        `}
        variants={sidebarVariants}
        initial={desktop ? "open" : "closed"}
        animate={sidebarOpen ? "open" : "closed"}
      >
        <ModernDeviceList 
          devices={filteredDevices} 
          positions={filteredPositions}
        />
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <motion.div 
          className="bg-card border-b px-4 py-3 flex items-center justify-between"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-4">
            {!desktop && hasMainMenuPermission && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <h1 className="text-xl font-semibold">Traccar</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDevicesOpen(!devicesOpen)}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEventsClick}
            >
              <Bell className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Map Area */}
        <div className="flex-1 relative">
          <MainMap
            filteredPositions={filteredPositions}
            selectedPosition={selectedPosition}
            onEventsClick={onEventsClick}
          />
        </div>
      </div>

      {/* Events Drawer */}
      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />

      {/* Status Card */}
      {selectedDeviceId && (
        <ModernStatusCard
          deviceId={selectedDeviceId}
          position={selectedPosition}
          onClose={() => dispatch(devicesActions.selectId(null))}
          desktopPadding={desktop ? 320 : 0}
        />
      )}

      {/* Drawer Menu for Mobile */}
      {!desktop && hasMainMenuPermission && (
        <DrawerMenu
          isOpen={drawerOpen}
          onClose={onDrawerClose}
          onNavigate={onNavigate}
          onEventsClick={onEventsClick}
          onDevicesClick={() => setSidebarOpen(true)}
          onSettingsClick={() => console.log('Settings clicked')}
        />
      )}
    </div>
  );
};

export default ModernMainPage;
