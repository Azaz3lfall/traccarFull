import {
  useState, useCallback, useEffect,
} from 'react';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import { devicesActions } from '../store';
import usePersistedState from '../common/util/usePersistedState';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import useMapStyles from '../map/core/useMapStyles';
import { map } from '../map/core/MapView';
import EventsDrawer from './EventsDrawer';
import useFilter from './useFilter';
import MainMap from './MainMap';
import FloatingDeviceList from '../components/FloatingDeviceList';
import FloatingStatusCard from '../components/FloatingStatusCard';
import { 
  Truck, 
  PieChart, 
  ChevronRight,
  ChevronLeft,
  Map,
  Check,
  Plus,
  Minus,
  Compass,
  MapPin,
  Search
} from 'lucide-react';
import SettingsIcon from '@mui/icons-material/Settings';
import CreateIcon from '@mui/icons-material/Create';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import StorageIcon from '@mui/icons-material/Storage';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import TodayIcon from '@mui/icons-material/Today';
import PublishIcon from '@mui/icons-material/Publish';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import HelpIcon from '@mui/icons-material/Help';
import PaymentIcon from '@mui/icons-material/Payment';
import CampaignIcon from '@mui/icons-material/Campaign';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useTranslation } from '../common/components/LocalizationProvider';
import { 
  useAdministrator, 
  useManager, 
  useRestriction 
} from '../common/util/permissions';
import useFeatures from '../common/util/useFeatures';
import { formatTime, formatNotificationTitle } from '../common/util/formatter';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { eventsActions } from '../store';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('md')]: {
      position: 'fixed',
      left: 0,
      top: 0,
      height: `calc(100% - ${theme.spacing(3)})`,
      width: theme.dimensions.drawerWidthDesktop,
      margin: theme.spacing(1.5),
      zIndex: 3,
    },
    [theme.breakpoints.down('md')]: {
      height: '100%',
      width: '100%',
    },
  },
  middle: {
    flex: 1,
    display: 'grid',
    minHeight: 0,
  },
  contentMap: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
  },
}));

const MainPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const theme = useTheme();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isDeviceListVisible, setIsDeviceListVisible] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEventsPopover, setShowEventsPopover] = useState(false);
  const [eventsButtonRef, setEventsButtonRef] = useState(null);
  const [showMapSwitcher, setShowMapSwitcher] = useState(false);
  const [mapSwitcherRef, setMapSwitcherRef] = useState(null);
  const [isGeolocationEnabled, setIsGeolocationEnabled] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchRef, setSearchRef] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Logout handlers
  const confirmLogout = () => {
    setShowLogoutModal(false);
    window.location.href = '/login';
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Clear all events handler
  const clearAllEvents = () => {
    dispatch(eventsActions.deleteAll());
    setShowEventsPopover(false);
  };

  // Handle event card click - select device and close popover
  const handleEventClick = (event) => {
    if (event.deviceId) {
      dispatch(devicesActions.selectId(event.deviceId));
      setShowEventsPopover(false);
    }
  };

  // Map switcher handlers
  const mapStyles = useMapStyles();
  const activeMapStyles = useAttributePreference('activeMapStyles', 'locationIqStreets,locationIqDark,openFreeMap');
  const [selectedMapStyle, setSelectedMapStyle] = usePersistedState('selectedMapStyle', usePreference('map', 'locationIqStreets'));
  
  const handleMapStyleChange = (styleId) => {
    setSelectedMapStyle(styleId);
    setShowMapSwitcher(false);
    // The map will automatically update through the MapView component
  };

  // Zoom handlers
  const handleZoomIn = () => {
    if (map) {
      map.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (map) {
      map.zoomOut();
    }
  };

  // Reset bearing handler
  const handleResetBearing = () => {
    if (map) {
      map.setBearing(0);
    }
  };

  // Check geolocation permission on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setIsGeolocationEnabled(true);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setIsGeolocationEnabled(false);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 1000,
          maximumAge: 60000
        }
      );
    } else {
      setIsGeolocationEnabled(false);
    }
  }, []);

  // My Location handler
  const handleMyLocation = () => {
    if (!isGeolocationEnabled) return;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (map) {
            map.easeTo({
              center: [position.coords.longitude, position.coords.latitude],
              zoom: Math.max(map.getZoom(), 15),
              duration: 1000
            });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          if (error.code === error.PERMISSION_DENIED) {
            setIsGeolocationEnabled(false);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 60000
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      setIsGeolocationEnabled(false);
    }
  };

  // Search functionality
  const searchAddresses = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const request = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=geojson&polygon_geojson=1&addressdetails=1&limit=5`;
      const response = await fetch(request);
      const geojson = await response.json();
      
      const results = geojson.features.map((feature) => {
        const center = [
          feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
          feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2,
        ];
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: center,
          },
          place_name: feature.properties.display_name,
          properties: feature.properties,
          text: feature.properties.display_name,
          place_type: ['place'],
          center,
        };
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      searchAddresses(query);
    }, 300);
  };

  // Handle search result selection
  const handleSearchResultClick = (result) => {
    if (map && result.center) {
      map.easeTo({
        center: result.center,
        zoom: Math.max(map.getZoom(), 15),
        duration: 1000
      });
    }
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  
  // Translation and permissions
  const t = useTranslation();
  const readonly = useRestriction('readonly');
  const admin = useAdministrator();
  const manager = useManager();
  const features = useFeatures();
  const disableReports = useRestriction('disableReports');
  
  // User and server data
  const user = useSelector((state) => state.session.user);
  const supportLink = useSelector((state) => state.session.server.attributes.support);
  const billingLink = useSelector((state) => state.session.user.attributes.billingLink);
  
  // Events data for notification badge
  const events = useSelector((state) => state.events.items);
  const eventsCount = events ? events.length : 0;
  
  // Get user initials for avatar
  const getUserInitials = (user) => {
    if (!user || !user.name) return 'U';
    return user.name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2); // Max 2 letters
  };

  // Format event type using Traccar's formatter
  const formatEventType = (event) => {
    return formatNotificationTitle(t, {
      type: event.type,
      attributes: {
        alarms: event.attributes?.alarm,
      },
    });
  };

  // Get device name from deviceId
  const getDeviceName = (deviceId) => {
    if (!deviceId || !devices) return 'Unknown Device';
    const device = devices[deviceId];
    return device?.name || 'Unknown Device';
  };

  // Get address from event's device position (since events don't have direct position data)
  const getAddress = (event) => {
    if (!event?.deviceId || !positions) return null;
    const position = positions[event.deviceId];
    return position?.address || null;
  };

  // Clean up tooltips when menu state changes
  useEffect(() => {
    const tooltipIds = ['menu-tooltip-dashboard', 'menu-tooltip-vehicles', 'menu-tooltip-map', 'menu-tooltip-settings', 'menu-tooltip-reports', 'menu-tooltip-expand'];
    tooltipIds.forEach(id => {
      const tooltip = document.getElementById(id);
      if (tooltip) tooltip.remove();
    });
  }, [isMenuExpanded]);

  // Add CSS animation for loading spinner
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Close events popover and map switcher when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEventsPopover && eventsButtonRef && !eventsButtonRef.contains(event.target)) {
        setShowEventsPopover(false);
      }
      if (showMapSwitcher && mapSwitcherRef && !mapSwitcherRef.contains(event.target)) {
        setShowMapSwitcher(false);
      }
      if (showSearch && searchRef && !searchRef.contains(event.target)) {
        setShowSearch(false);
      }
    };

    if (showEventsPopover || showMapSwitcher || showSearch) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEventsPopover, eventsButtonRef, showMapSwitcher, mapSwitcherRef, showSearch, searchRef]);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const devices = useSelector((state) => state.devices.items);
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

  const [eventsOpen, setEventsOpen] = useState(false);


  const onMapClick = useCallback(() => {
    dispatch(devicesActions.selectId(null));
  }, [dispatch]);


  useFilter(keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions);

  return (
    <div className={classes.root}>
      {desktop && (
        <MainMap
          filteredPositions={filteredPositions}
          selectedPosition={selectedPosition}
          onMapClick={onMapClick}
          selectedMapStyle={selectedMapStyle}
        />
      )}
      <div className={classes.sidebar}>
        <div className={classes.middle}>
          {!desktop && (
            <div className={classes.contentMap}>
              <MainMap
                filteredPositions={filteredPositions}
                selectedPosition={selectedPosition}
                onMapClick={onMapClick}
                selectedMapStyle={selectedMapStyle}
              />
            </div>
          )}
        </div>
      </div>
      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />
      
      {/* Desktop Menu */}
      {desktop && (
        <div style={{
          position: 'fixed',
          top: '8px',
          left: '8px',
          width: isMenuExpanded ? '200px' : '55px',
          height: 'calc(100vh - 16px)',
          backgroundColor: '#1F2937',
          borderRadius: (isDeviceListVisible || selectedDeviceId) ? '16px 0px 0px 16px' : '16px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          gap: '0px',
          transition: 'width 0.3s ease, border-radius 0.3s ease',
          overflow: 'hidden'
        }}>
          {/* Toggle Menu Button - First Option */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            setIsMenuExpanded(!isMenuExpanded);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}>
            {isMenuExpanded ? <ChevronLeft size={18} color="white" /> : <ChevronRight size={18} color="white" />}
          </div>
          
          {/* Device List Toggle Button */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            const tooltip = document.getElementById('menu-tooltip-device-list');
            if (tooltip) tooltip.remove();
            setIsDeviceListVisible(!isDeviceListVisible);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = isDeviceListVisible ? 'Hide Device List' : 'Show Device List';
              tooltip.id = 'menu-tooltip-device-list';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
              const tooltip = document.getElementById('menu-tooltip-device-list');
              if (tooltip) tooltip.remove();
            }
          }}>
            <Truck size={18} color={isDeviceListVisible ? "white" : "#6B7280"} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: isDeviceListVisible ? 'white' : '#6B7280',
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.6'
              }}>
                {isDeviceListVisible ? 'Hide Devices' : 'Show Devices'}
              </span>
            )}
          </div>
          
          {/* Reports Icon */}
          {!disableReports && (
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-reports');
            if (tooltip) tooltip.remove();
              window.location.href = '/reports/combined';
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
                tooltip.textContent = t('reportTitle');
                tooltip.id = 'menu-tooltip-reports';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-reports');
              if (tooltip) tooltip.remove();
            }
          }}>
              <PieChart size={18} color="white" />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.6'
              }}>
                  {t('reportTitle')}
              </span>
            )}
          </div>
          )}
          
          {/* Geofences Icon */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            const tooltip = document.getElementById('menu-tooltip-geofences');
            if (tooltip) tooltip.remove();
            window.location.href = '/geofences';
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = t('sharedGeofences');
              tooltip.id = 'menu-tooltip-geofences';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
              const tooltip = document.getElementById('menu-tooltip-geofences');
              if (tooltip) tooltip.remove();
            }
          }}>
            <CreateIcon style={{ fontSize: 18, color: 'white' }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.6'
              }}>
                {t('sharedGeofences')}
              </span>
            )}
          </div>
          
          {/* Settings Icon */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            const tooltip = document.getElementById('menu-tooltip-settings');
            if (tooltip) tooltip.remove();
            window.location.href = '/settings/preferences';
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = t('settingsTitle');
              tooltip.id = 'menu-tooltip-settings';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
              const tooltip = document.getElementById('menu-tooltip-settings');
              if (tooltip) tooltip.remove();
            }
          }}>
            <SettingsIcon style={{ fontSize: 18, color: 'white' }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.6'
              }}>
                {t('settingsTitle')}
              </span>
            )}
          </div>
          
          {/* Notifications Icon */}
          {!readonly && (
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-notifications');
            if (tooltip) tooltip.remove();
              window.location.href = '/settings/notifications';
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
                tooltip.textContent = t('sharedNotifications');
                tooltip.id = 'menu-tooltip-notifications';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-notifications');
              if (tooltip) tooltip.remove();
            }
          }}>
              <NotificationsOutlinedIcon style={{ fontSize: 18, color: 'white' }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.6'
              }}>
                  {t('sharedNotifications')}
                </span>
              )}
            </div>
          )}
          
          {/* User Profile Icon */}
          {!readonly && (
            <div style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMenuExpanded ? 'flex-start' : 'center',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '0px',
              paddingLeft: isMenuExpanded ? '12px' : '0px',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-user');
              if (tooltip) tooltip.remove();
              window.location.href = `/settings/user/${user.id}`;
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.textContent = t('settingsUser');
                tooltip.id = 'menu-tooltip-user';
                tooltip.style.cssText = `
                  position: fixed;
                  left: ${rect.right + 8}px;
                  top: ${rect.top + rect.height / 2}px;
                  transform: translateY(-50%);
                  background: #1F2937;
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-user');
                if (tooltip) tooltip.remove();
              }
            }}>
              <PersonIcon style={{ fontSize: 18, color: 'white' }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                  {t('settingsUser')}
              </span>
            )}
          </div>
          )}
          
          {/* Devices Icon */}
          {!readonly && (
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-devices');
            if (tooltip) tooltip.remove();
              window.location.href = '/settings/devices';
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
                tooltip.textContent = t('deviceTitle');
                tooltip.id = 'menu-tooltip-devices';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-devices');
              if (tooltip) tooltip.remove();
            }
          }}>
              <SmartphoneIcon style={{ fontSize: 18, color: 'white' }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                  fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                  {t('deviceTitle')}
              </span>
            )}
          </div>
          )}
          
          {/* Groups Icon */}
          {!readonly && !features.disableGroups && (
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-groups');
            if (tooltip) tooltip.remove();
              window.location.href = '/settings/groups';
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
                tooltip.textContent = t('settingsGroups');
                tooltip.id = 'menu-tooltip-groups';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-groups');
              if (tooltip) tooltip.remove();
            }
          }}>
              <FolderIcon style={{ fontSize: 18, color: 'white' }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                  fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                  {t('settingsGroups')}
              </span>
            )}
          </div>
          )}
          
          {/* Drivers Icon */}
          {!readonly && !features.disableDrivers && (
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-drivers');
            if (tooltip) tooltip.remove();
              window.location.href = '/settings/drivers';
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
                tooltip.textContent = t('sharedDrivers');
                tooltip.id = 'menu-tooltip-drivers';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-drivers');
              if (tooltip) tooltip.remove();
            }
          }}>
              <PersonIcon style={{ fontSize: 18, color: 'white' }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                  fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                  {t('sharedDrivers')}
              </span>
            )}
          </div>
          )}
          
          {/* Calendars Icon */}
          {!readonly && !features.disableCalendars && (
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-calendars');
            if (tooltip) tooltip.remove();
              window.location.href = '/settings/calendars';
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
                tooltip.textContent = t('sharedCalendars');
                tooltip.id = 'menu-tooltip-calendars';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-calendars');
              if (tooltip) tooltip.remove();
            }
          }}>
              <TodayIcon style={{ fontSize: 18, color: 'white' }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: 'white',
                fontSize: '14px',
                  fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                  {t('sharedCalendars')}
                </span>
              )}
            </div>
          )}
          
          {/* Computed Attributes Icon */}
          {!readonly && !features.disableComputedAttributes && (
            <div style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMenuExpanded ? 'flex-start' : 'center',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '0px',
              paddingLeft: isMenuExpanded ? '12px' : '0px',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-attributes');
              if (tooltip) tooltip.remove();
              window.location.href = '/settings/attributes';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.textContent = t('sharedComputedAttributes');
                tooltip.id = 'menu-tooltip-attributes';
                tooltip.style.cssText = `
                  position: fixed;
                  left: ${rect.right + 8}px;
                  top: ${rect.top + rect.height / 2}px;
                  transform: translateY(-50%);
                  background: #1F2937;
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-attributes');
                if (tooltip) tooltip.remove();
              }
            }}>
              <StorageIcon style={{ fontSize: 18, color: 'white' }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  {t('sharedComputedAttributes')}
                </span>
              )}
            </div>
          )}
          
          {/* Maintenance Icon */}
          {!readonly && !features.disableMaintenance && (
            <div style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMenuExpanded ? 'flex-start' : 'center',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '0px',
              paddingLeft: isMenuExpanded ? '12px' : '0px',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-maintenance');
              if (tooltip) tooltip.remove();
              window.location.href = '/settings/maintenances';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.textContent = t('sharedMaintenance');
                tooltip.id = 'menu-tooltip-maintenance';
                tooltip.style.cssText = `
                  position: fixed;
                  left: ${rect.right + 8}px;
                  top: ${rect.top + rect.height / 2}px;
                  transform: translateY(-50%);
                  background: #1F2937;
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-maintenance');
                if (tooltip) tooltip.remove();
              }
            }}>
              <BuildIcon style={{ fontSize: 18, color: 'white' }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  {t('sharedMaintenance')}
                </span>
              )}
            </div>
          )}
          
          {/* Saved Commands Icon */}
          {!readonly && !features.disableSavedCommands && (
            <div style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMenuExpanded ? 'flex-start' : 'center',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '0px',
              paddingLeft: isMenuExpanded ? '12px' : '0px',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-commands');
              if (tooltip) tooltip.remove();
              window.location.href = '/settings/commands';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.textContent = t('sharedSavedCommands');
                tooltip.id = 'menu-tooltip-commands';
                tooltip.style.cssText = `
                  position: fixed;
                  left: ${rect.right + 8}px;
                  top: ${rect.top + rect.height / 2}px;
                  transform: translateY(-50%);
                  background: #1F2937;
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-commands');
                if (tooltip) tooltip.remove();
              }
            }}>
              <PublishIcon style={{ fontSize: 18, color: 'white' }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  {t('sharedSavedCommands')}
                </span>
              )}
            </div>
          )}
          
          {/* Billing Link Icon */}
          {billingLink && (
            <div style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMenuExpanded ? 'flex-start' : 'center',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '0px',
              paddingLeft: isMenuExpanded ? '12px' : '0px',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-billing');
              if (tooltip) tooltip.remove();
              window.open(billingLink, '_blank');
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.textContent = t('userBilling');
                tooltip.id = 'menu-tooltip-billing';
                tooltip.style.cssText = `
                  position: fixed;
                  left: ${rect.right + 8}px;
                  top: ${rect.top + rect.height / 2}px;
                  transform: translateY(-50%);
                  background: #1F2937;
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-billing');
                if (tooltip) tooltip.remove();
              }
            }}>
              <PaymentIcon style={{ fontSize: 18, color: 'white' }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  {t('userBilling')}
                </span>
              )}
            </div>
          )}
          
          {/* Support Link Icon */}
          {supportLink && (
            <div style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMenuExpanded ? 'flex-start' : 'center',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '0px',
              paddingLeft: isMenuExpanded ? '12px' : '0px',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-support');
              if (tooltip) tooltip.remove();
              window.open(supportLink, '_blank');
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.textContent = t('settingsSupport');
                tooltip.id = 'menu-tooltip-support';
                tooltip.style.cssText = `
                  position: fixed;
                  left: ${rect.right + 8}px;
                  top: ${rect.top + rect.height / 2}px;
                  transform: translateY(-50%);
                  background: #1F2937;
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-support');
                if (tooltip) tooltip.remove();
              }
            }}>
              <HelpIcon style={{ fontSize: 18, color: 'white' }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  {t('settingsSupport')}
                </span>
              )}
            </div>
          )}
          
          {/* Manager Section - Server Announcement */}
          {manager && (
            <div style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMenuExpanded ? 'flex-start' : 'center',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '0px',
              paddingLeft: isMenuExpanded ? '12px' : '0px',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-announcement');
              if (tooltip) tooltip.remove();
              window.location.href = '/settings/announcement';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.textContent = t('serverAnnouncement');
                tooltip.id = 'menu-tooltip-announcement';
                tooltip.style.cssText = `
                  position: fixed;
                  left: ${rect.right + 8}px;
                  top: ${rect.top + rect.height / 2}px;
                  transform: translateY(-50%);
                  background: #1F2937;
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-announcement');
                if (tooltip) tooltip.remove();
              }
            }}>
              <CampaignIcon style={{ fontSize: 18, color: 'white' }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  {t('serverAnnouncement')}
                </span>
              )}
            </div>
          )}
          
          {/* Manager Section - Server Settings */}
          {manager && admin && (
            <div style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMenuExpanded ? 'flex-start' : 'center',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '0px',
              paddingLeft: isMenuExpanded ? '12px' : '0px',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-server');
              if (tooltip) tooltip.remove();
              window.location.href = '/settings/server';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.textContent = t('settingsServer');
                tooltip.id = 'menu-tooltip-server';
                tooltip.style.cssText = `
                  position: fixed;
                  left: ${rect.right + 8}px;
                  top: ${rect.top + rect.height / 2}px;
                  transform: translateY(-50%);
                  background: #1F2937;
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-server');
                if (tooltip) tooltip.remove();
              }
            }}>
              <StorageIcon style={{ fontSize: 18, color: 'white' }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  {t('settingsServer')}
                </span>
              )}
            </div>
          )}
          
          {/* Manager Section - Users Management */}
          {manager && (
            <div style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMenuExpanded ? 'flex-start' : 'center',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '0px',
              paddingLeft: isMenuExpanded ? '12px' : '0px',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const tooltip = document.getElementById('menu-tooltip-users');
              if (tooltip) tooltip.remove();
              window.location.href = '/settings/users';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.textContent = t('settingsUsers');
                tooltip.id = 'menu-tooltip-users';
                tooltip.style.cssText = `
                  position: fixed;
                  left: ${rect.right + 8}px;
                  top: ${rect.top + rect.height / 2}px;
                  transform: translateY(-50%);
                  background: #1F2937;
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-users');
                if (tooltip) tooltip.remove();
              }
            }}>
              <PeopleIcon style={{ fontSize: 18, color: 'white' }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  {t('settingsUsers')}
                </span>
              )}
            </div>
          )}
          
          {/* Spacer to push logout to bottom */}
          <div style={{ flex: 1 }} />
          
          {/* Logout Icon - Last Option */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'flex-start' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            paddingLeft: isMenuExpanded ? '12px' : '0px',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            const tooltip = document.getElementById('menu-tooltip-logout');
            if (tooltip) tooltip.remove();
            setShowLogoutModal(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#374151';
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = t('loginLogout');
              tooltip.id = 'menu-tooltip-logout';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: #1F2937;
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(tooltip);
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            if (!isMenuExpanded) {
              const tooltip = document.getElementById('menu-tooltip-logout');
              if (tooltip) tooltip.remove();
            }
          }}>
            <ExitToAppIcon style={{ fontSize: 18, color: '#EF4444' }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: '#EF4444',
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.6'
              }}>
                {t('loginLogout')}
              </span>
            )}
          </div>
          
        </div>
      )}
      
      {/* Floating Device List */}
      <FloatingDeviceList
        filteredDevices={filteredDevices}
        positions={filteredPositions}
        keyword={keyword}
        setKeyword={setKeyword}
        filter={filter}
        setFilter={setFilter}
        filterSort={filterSort}
        setFilterSort={setFilterSort}
        filterMap={filterMap}
        setFilterMap={setFilterMap}
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={desktop ? isDeviceListVisible : true} // Desktop: controlled by toggle, Mobile: always visible unless device selected
      />
      
      {/* Floating Status Card */}
      <FloatingStatusCard desktop={desktop} isMenuExpanded={isMenuExpanded} isDeviceListVisible={isDeviceListVisible} />
      
      {/* Vertical Control Bar - Left of Device List */}
      <div style={{
        position: 'fixed',
        top: '8px',
        right: '8px', // 8px from right edge
        width: '50px',
        height: 'auto',
        backgroundColor: '#1F2937',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '8px 0',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        gap: '8px'
      }}>
        <button style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#374151';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
        }}
        onMouseDown={(e) => {
          e.target.style.backgroundColor = '#374151';
        }}
        onMouseUp={(e) => {
          e.target.style.backgroundColor = '#374151';
        }}
        onFocus={(e) => {
          e.target.style.backgroundColor = '#374151';
          e.target.style.outline = 'none';
          e.target.style.boxShadow = 'none';
        }}
        onBlur={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.outline = 'none';
          e.target.style.boxShadow = 'none';
        }}>
          <Avatar style={{ width: '28px', height: '28px', userSelect: 'none', pointerEvents: 'none' }}>
            {user?.attributes?.avatar && (
              <AvatarImage src={user.attributes.avatar} alt="User" />
            )}
            <AvatarFallback style={{ 
              backgroundColor: '#6B7280', 
              color: 'white', 
              fontSize: '13px',
              fontWeight: '500'
            }}>
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
        </button>
        <button 
          ref={setEventsButtonRef}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            outline: 'none !important',
            transition: 'all 0.2s',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            boxShadow: 'none !important'
          }}
          onClick={() => setShowEventsPopover(!showEventsPopover)}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          onMouseDown={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseUp={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}>
          <NotificationsOutlinedIcon style={{ fontSize: 22, userSelect: 'none', pointerEvents: 'none' }} />
          {eventsCount > 0 && (
            <motion.div
              key={eventsCount} // This will trigger re-animation when count changes
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                backgroundColor: eventsCount > 0 ? '#EF4444' : '#6B7280',
                color: 'white',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '600',
                padding: '0 4px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                zIndex: 1
              }}>
              {eventsCount > 99 ? '99+' : eventsCount}
            </motion.div>
          )}
        </button>
        <button 
          ref={setMapSwitcherRef}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
            position: 'relative',
            outline: 'none !important',
            transition: 'all 0.2s',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            boxShadow: 'none !important'
          }}
          onClick={() => setShowMapSwitcher(!showMapSwitcher)}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          onMouseDown={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseUp={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}>
          <Map style={{ fontSize: 18, userSelect: 'none', pointerEvents: 'none' }} />
        </button>
        
        {/* Separator */}
        <div style={{
          width: '24px',
          height: '1px',
          backgroundColor: '#4B5563',
          margin: '4px 0'
        }} />
        
        {/* Zoom In Button */}
        <button 
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
              color: 'white', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            outline: 'none !important',
            transition: 'all 0.2s',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            boxShadow: 'none !important'
          }}
          onClick={handleZoomIn}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          onMouseDown={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseUp={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}>
          <Plus style={{ fontSize: 18, userSelect: 'none', pointerEvents: 'none' }} />
        </button>
        
        {/* Zoom Out Button */}
        <button 
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            outline: 'none !important',
            transition: 'all 0.2s',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            boxShadow: 'none !important'
          }}
          onClick={handleZoomOut}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          onMouseDown={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseUp={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}>
          <Minus style={{ fontSize: 18, userSelect: 'none', pointerEvents: 'none' }} />
        </button>
        
        {/* Reset Bearing Button */}
        <button 
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            outline: 'none !important',
            transition: 'all 0.2s',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            boxShadow: 'none !important'
          }}
          onClick={handleResetBearing}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          onMouseDown={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseUp={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}>
          <Compass style={{ fontSize: 18, userSelect: 'none', pointerEvents: 'none' }} />
        </button>
        
        {/* Another Separator */}
        <div style={{
          width: '24px',
          height: '1px',
          backgroundColor: '#4B5563',
          margin: '4px 0'
        }} />
        
        {/* My Location Button */}
        <button 
          disabled={!isGeolocationEnabled}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: isGeolocationEnabled ? 'white' : '#6B7280',
            cursor: isGeolocationEnabled ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            outline: 'none !important',
            transition: 'all 0.2s',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            boxShadow: 'none !important',
            opacity: isGeolocationEnabled ? 1 : 0.5
          }}
          onClick={isGeolocationEnabled ? handleMyLocation : undefined}
          onMouseEnter={(e) => {
            if (isGeolocationEnabled) {
              e.target.style.backgroundColor = '#374151';
            }
          }}
          onMouseLeave={(e) => {
            if (isGeolocationEnabled) {
              e.target.style.backgroundColor = 'transparent';
            }
          }}
          onMouseDown={(e) => {
            if (isGeolocationEnabled) {
              e.target.style.backgroundColor = '#374151';
            }
          }}
          onMouseUp={(e) => {
            if (isGeolocationEnabled) {
              e.target.style.backgroundColor = '#374151';
            }
          }}
          onFocus={(e) => {
            if (isGeolocationEnabled) {
              e.target.style.backgroundColor = '#374151';
            }
          }}
          onBlur={(e) => {
            if (isGeolocationEnabled) {
              e.target.style.backgroundColor = 'transparent';
            }
          }}>
          <MapPin style={{ 
            fontSize: 18, 
            userSelect: 'none', 
            pointerEvents: 'none',
            color: isGeolocationEnabled ? 'white' : '#6B7280'
          }} />
        </button>
        
        {/* Search Button */}
        <button 
          ref={setSearchRef}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            outline: 'none !important',
            transition: 'all 0.2s',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            boxShadow: 'none !important'
          }}
          onClick={() => setShowSearch(!showSearch)}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          onMouseDown={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onMouseUp={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = '#374151';
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}>
          <Search style={{ fontSize: 18, userSelect: 'none', pointerEvents: 'none' }} />
        </button>
      </div>
      
      {/* Events Popover */}
      <AnimatePresence>
        {showEventsPopover && eventsButtonRef && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: 'fixed',
              top: eventsButtonRef ? eventsButtonRef.getBoundingClientRect().top + 'px' : '60px', // Align with events button top
              right: '65px', // 8px control bar + 30px offset + 15px additional + 12px popover margin
              width: '300px',
              maxHeight: '400px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              border: '1px solid #E5E7EB',
              zIndex: 10001,
              overflow: 'hidden'
            }}>
          {/* Popover Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #F3F4F6',
            backgroundColor: 'white'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: '#1F2937',
                lineHeight: '1.3'
              }}>
{t('reportEvents')} ({eventsCount})
              </h3>
              <button
                onClick={clearAllEvents}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#EF4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
                title="Clear all events"
              >
                <DeleteOutlineIcon style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
          
          {/* Events List */}
          <div style={{
            maxHeight: '320px',
            overflowY: 'auto'
          }}>
            {eventsCount === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6B7280'
              }}>
                No events available
              </div>
            ) : (
              events.map((event, index) => (
                <div
                  key={event.id || index}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < events.length - 1 ? '1px solid #F3F4F6' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleEventClick(event)}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Device Name - Header */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6B7280',
                    marginBottom: '4px'
                  }}>
                    {getDeviceName(event.deviceId)}
                  </div>
                  
                  {/* Address - Second Line */}
                  {getAddress(event) && (
                    <div style={{
                      fontSize: '11px',
                      color: '#9CA3AF',
                      marginBottom: '4px',
                      fontStyle: 'italic',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {getAddress(event)}
                    </div>
                  )}
                  
                  {/* Event Type and Time - Third Line */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#9CA3AF'
                  }}>
                    <span style={{ fontWeight: '500' }}>
                      {formatEventType(event)}
                    </span>
                    <span>
                      {formatTime(event.eventTime, 'seconds')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Map Switcher Dropdown */}
      <AnimatePresence>
        {showMapSwitcher && mapSwitcherRef && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: 'fixed',
              top: mapSwitcherRef ? mapSwitcherRef.getBoundingClientRect().top + 'px' : '60px', // Align with map switcher button top
              right: '65px', // 8px control bar + 30px offset + 15px additional + 12px popover margin
              width: '280px',
              maxHeight: '300px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              border: '1px solid #E5E7EB',
              zIndex: 10001,
              overflow: 'hidden'
            }}>
            {/* Map Switcher Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #F3F4F6',
              backgroundColor: 'white'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: '#1F2937',
                lineHeight: '1.3'
              }}>
                {t('mapTitle')}
              </h3>
            </div>
            
            {/* Map Styles List */}
            <div style={{
              maxHeight: '240px',
              overflowY: 'auto'
            }}>
              {mapStyles
                .filter((style) => style.available && activeMapStyles.includes(style.id))
                .map((style, index) => (
                  <button
                    key={style.id}
                    onClick={() => handleMapStyleChange(style.id)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      color: selectedMapStyle === style.id ? '#1F2937' : '#374151',
                      backgroundColor: selectedMapStyle === style.id ? '#F3F4F6' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      borderBottom: index < mapStyles.filter(s => s.available && activeMapStyles.includes(s.id)).length - 1 ? '1px solid #F3F4F6' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedMapStyle !== style.id) {
                        e.target.style.backgroundColor = '#F9FAFB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedMapStyle !== style.id) {
                        e.target.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontWeight: selectedMapStyle === style.id ? '600' : '400' }}>
                      {style.title}
                    </span>
                    {selectedMapStyle === style.id && (
                      <Check size={16} color="#10B981" />
                    )}
                  </button>
                ))}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
      
      {/* Search Popover */}
      <AnimatePresence>
        {showSearch && searchRef && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              right: '65px',
              top: searchRef.getBoundingClientRect().top,
              width: '320px',
              backgroundColor: '#1F2937',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              zIndex: 10000,
              padding: '16px',
              border: '1px solid #374151'
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search for places..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#374151',
                  border: '1px solid #4B5563',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  paddingRight: isSearching ? '40px' : '16px'
                }}
                autoFocus
              />
              {isSearching && (
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #6B7280',
                  borderTop: '2px solid #3B82F6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div style={{
                marginTop: '12px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleSearchResultClick(result)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.2s',
                      border: '1px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#374151';
                      e.target.style.borderColor = '#4B5563';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.borderColor = 'transparent';
                    }}
                  >
                    <div style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {result.properties?.name || result.properties?.display_name?.split(',')[0]}
                    </div>
                    <div style={{
                      color: '#9CA3AF',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {result.properties?.display_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* No Results */}
            {searchQuery && searchResults.length === 0 && !isSearching && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                color: '#9CA3AF',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                No results found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
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
            onClick={cancelLogout}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '20px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{
                margin: '0 0 20px 0',
                fontSize: '16px',
                color: '#374151',
                lineHeight: '1.5'
              }}>
                {t('sharedConfirmLogout')}
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={cancelLogout}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'white';
                  }}
                >
                  {t('sharedCancel')}
                </button>
                <button
                  onClick={confirmLogout}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#DC2626';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#EF4444';
                  }}
                >
                  {t('loginLogout')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

export default MainPage;
