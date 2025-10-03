import {
  useState, useCallback, useEffect, useRef, useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import { devicesActions } from '../store';
import usePersistedState from '../common/util/usePersistedState';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import useMapStyles from '../map/core/useMapStyles';
import useMapOverlays from '../map/overlay/useMapOverlays';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import { useTranslationKeys } from '../common/components/LocalizationProvider';
import { prefixString, unprefixString } from '../common/util/stringUtils';
import { sessionActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';
import resellersConfig from '../config/resellersConfig';
import { resellersActions } from '../store';
import { useCatch } from '../reactHelper';
import { nativePostMessage } from '../common/components/NativeInterface';
import fallbackLogo from '../resources/images/image170.png?inline';
import dayjs from 'dayjs';
import { map } from '../map/core/MapView';
import EventsDrawer from './EventsDrawer';
import FloatingGeofencesPopover from '../components/FloatingGeofencesPopover';
import FloatingReportsPopover from '../components/FloatingReportsPopover';
import useFilter from './useFilter';
import MainMap from './MainMap';
import FloatingDeviceList from '../components/FloatingDeviceList';
import FloatingStatusCard from '../components/FloatingStatusCard';
import FloatingUsersPopover from '../components/FloatingUsersPopover';
import FloatingCommandsPopover from '../components/FloatingCommandsPopover';
import FloatingMaintenancePopover from '../components/FloatingMaintenancePopover';
import FloatingComputedAttributesPopover from '../components/FloatingComputedAttributesPopover';
import FloatingCalendarsPopover from '../components/FloatingCalendarsPopover';
import FloatingResellersPopover from '../components/FloatingResellersPopover';
import FloatingDriversPopover from '../components/FloatingDriversPopover';
import FloatingGroupsPopover from '../components/FloatingGroupsPopover';
import FloatingDevicesPopover from '../components/FloatingDevicesPopover';
import FloatingNotificationsPopover from '../components/FloatingNotificationsPopover';
import UsersModal from './UsersModal';
import { 
  Truck, 
  PieChart, 
  ChevronLeft,
  Map,
  Check,
  Plus,
  Minus,
  Search,
  Sun,
  Moon
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
import CachedIcon from '@mui/icons-material/Cached';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation, useLocalization } from '../common/components/LocalizationProvider';
import { useTheme as useCustomTheme, useThemeColors } from '../common/components/ThemeProvider';
import ReactCountryFlag from 'react-country-flag';
import { useResellerBranding } from '../common/hooks/useResellerBranding';
import { 
  Box, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Checkbox, 
  FormControlLabel, 
  FormGroup, 
  InputAdornment, 
  IconButton, 
  OutlinedInput, 
  Autocomplete, 
  createFilterOptions,
  Button,
  Typography, 
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation } from '@tanstack/react-query';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import useCommonUserAttributes from '../common/attributes/useCommonUserAttributes';
import useServerAttributes from '../common/attributes/useServerAttributes';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';
import { MuiFileInput } from 'mui-file-input';
import { useEffectAsync } from '../reactHelper';

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
  const navigate = useNavigate();
  const muiTheme = useTheme();

  const desktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isDeviceListVisible, setIsDeviceListVisible] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEventsPopover, setShowEventsPopover] = useState(false);
  const [eventsButtonRef, setEventsButtonRef] = useState(null);
  const [showMapSwitcher, setShowMapSwitcher] = useState(false);
  const [mapSwitcherRef, setMapSwitcherRef] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchRef, setSearchRef] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [userRef, setUserRef] = useState(null);
  const [showLanguagePopover, setShowLanguagePopover] = useState(false);
  const [languageRef, setLanguageRef] = useState(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showUsersPopover, setShowUsersPopover] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [showCommandsPopover, setShowCommandsPopover] = useState(false);
  const [showMaintenancePopover, setShowMaintenancePopover] = useState(false);
  const [showComputedAttributesPopover, setShowComputedAttributesPopover] = useState(false);
  const [showCalendarsPopover, setShowCalendarsPopover] = useState(false);
  const [showDriversPopover, setShowDriversPopover] = useState(false);
  const [showGroupsPopover, setShowGroupsPopover] = useState(false);
  const [showDevicesPopover, setShowDevicesPopover] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [showReplayPopover, setShowReplayPopover] = useState(false);
  const [showServerDrawer, setShowServerDrawer] = useState(false);
  const [showPreferencesDrawer, setShowPreferencesDrawer] = useState(false);
  const [preferencesAttributes, setPreferencesAttributes] = useState({});
  const [token, setToken] = useState(null);
  const [tokenExpiration, setTokenExpiration] = useState(dayjs().add(1, 'week').locale('en').format('YYYY-MM-DD'));
  const [activeServerTab, setActiveServerTab] = useState(0);
  const [activePreferencesTab, setActivePreferencesTab] = useState(0);
  const [activeResellerTab, setActiveResellerTab] = useState(0);
  const [popupInfoOpen, setPopupInfoOpen] = useState(false);
  const [serverData, setServerData] = useState(null);
  const [showAnnouncementDrawer, setShowAnnouncementDrawer] = useState(false);
  const [showResellerDrawer, setShowResellerDrawer] = useState(false);
  const [showResellersPopover, setShowResellersPopover] = useState(false);
  const [resellerData, setResellerData] = useState({
    currentDomain: window.location.hostname,
    parentUserId: '',
    parentUser: '',
    parentEmail: '',
    resellerId: '',
    resellerUser: '',
    resellerEmail: '',
    companyName: '',
    logo: '',
    url: '',
    whatsapp: '',
    billingEmail: '',
    supportEmail: '',
    resellerLimit: '',
    deviceLimit: '',
    userLimit: ''
  });
  const [resellerErrors, setResellerErrors] = useState([]);
  const [announcementData, setAnnouncementData] = useState({
    users: [],
    notificator: '',
    message: { subject: '', body: '' }
  });
  const [resellerUsers, setResellerUsers] = useState([]);
  const [resellerUsersLoading, setResellerUsersLoading] = useState(false);
  const [resellerUsersError, setResellerUsersError] = useState(null);
  const [resellerUsersFetched, setResellerUsersFetched] = useState(false);
  const [resellerAutocompleteOpen, setResellerAutocompleteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  
  // Custom autocomplete states
  const [usersItems, setUsersItems] = useState([]);
  const [notificatorsItems, setNotificatorsItems] = useState([]);
  const [usersAutocompleteOpen, setUsersAutocompleteOpen] = useState(false);
  const [notificatorsAutocompleteOpen, setNotificatorsAutocompleteOpen] = useState(false);
  const [usersInputValue, setUsersInputValue] = useState('');
  const [notificatorsInputValue, setNotificatorsInputValue] = useState('');
  const [usersHighlightedIndex, setUsersHighlightedIndex] = useState(-1);
  const [notificatorsHighlightedIndex, setNotificatorsHighlightedIndex] = useState(-1);
  const usersInputRef = useRef(null);
  const notificatorsInputRef = useRef(null);
  
  // Logout handlers
  const confirmLogout = async () => {
    setShowLogoutModal(false);
    
    try {
      // Delete session
      const sessionResponse = await fetch('/api/session', { 
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!sessionResponse.ok) {
        console.warn('Session deletion failed:', sessionResponse.status);
      }

      // Clear user data
      dispatch(sessionActions.updateUser(null));
      
      // Send native message
      nativePostMessage('logout');
      
      // Navigate to login using React Router
      navigate('/login');
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, still clear the user and navigate to login
      dispatch(sessionActions.updateUser(null));
      nativePostMessage('logout');
      navigate('/login');
    }
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
  
  // Preferences hooks
  // Translation and permissions - moved early to avoid hoisting issues
  const t = useTranslation();
  const admin = useAdministrator();
  const readonly = useRestriction('readonly');
  
  const mapOverlays = useMapOverlays();
  const positionAttributes = usePositionAttributes(t);
  const user = useSelector((state) => state.session.user);
  const versionApp = import.meta.env.VITE_APP_VERSION;
  const versionServer = useSelector((state) => state.session.server.version);
  const isReseller = useSelector((state) => state.resellers.isReseller);
  const socket = useSelector((state) => state.session.socket);
  const logo = useSelector((state) => state.session.server?.attributes?.logo);
  const logoInverted = useSelector((state) => state.session.server?.attributes?.logoInverted);
  
  // Device fields for preferences
  const deviceFields = [
    { id: 'name', name: 'sharedName' },
    { id: 'uniqueId', name: 'deviceIdentifier' },
    { id: 'phone', name: 'sharedPhone' },
    { id: 'model', name: 'deviceModel' },
    { id: 'contact', name: 'deviceContact' },
  ];
  
  // Alarms for sound settings
  const alarms = useTranslationKeys((it) => it.startsWith('alarm')).map((it) => ({
    key: unprefixString('alarm', it),
    name: t(it),
  }));
  
  const createFilter = createFilterOptions();
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

  // Search functionality
  const searchAddresses = async (query) => {
    if (!query.trim() || query.trim().length < 5) {
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
    
    // Clear previous timeout
    clearTimeout(window.searchTimeout);
    
    // Only search if query has at least 5 characters
    if (query.trim().length >= 5) {
      // Debounce search with 500ms delay
      window.searchTimeout = setTimeout(() => {
        searchAddresses(query);
      }, 500);
    } else {
      // Clear results if less than 5 characters
      setSearchResults([]);
      setIsSearching(false);
    }
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

  
  // Server attributes hooks
  const commonUserAttributes = useCommonUserAttributes(t);
  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const serverAttributes = useServerAttributes(t);
  
  // Server query and mutation
  const { data: serverQueryData } = useQuery({
    queryKey: ['server'],
    queryFn: async () => {
      const response = await fetch('/api/server');
      return response.json();
    },
    enabled: showServerDrawer,
  });

  // Timezones query
  const { data: timezones = [] } = useQuery({
    queryKey: ['timezones'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/server/timezones');
      return response.json();
    },
    enabled: showServerDrawer,
  });

  // Update local server data when query data changes
  useEffect(() => {
    if (serverQueryData) {
      setServerData(serverQueryData);
    }
  }, [serverQueryData]);

  // Reset announcement data when drawer opens
  useEffect(() => {
    if (showAnnouncementDrawer) {
      setAnnouncementData({
        users: [],
        notificator: '',
        message: { subject: '', body: '' }
      });
    }
  }, [showAnnouncementDrawer]);

  // Update reseller data when drawer opens
  useEffect(() => {
    if (showResellerDrawer && user) {
      setResellerData(prev => ({
        ...prev,
        currentDomain: window.location.hostname,
        parentUserId: user.id || '',
        parentUser: user.name || '',
        parentEmail: user.email || ''
      }));
      setResellerErrors([]); // Clear errors when drawer opens
    }
  }, [showResellerDrawer, user]);

  // Clear errors when user starts typing
  const handleResellerFieldChange = (field, value) => {
    setResellerData(prev => ({ ...prev, [field]: value }));
    if (resellerErrors.length > 0) {
      setResellerErrors([]);
    }
  };

  // Debounced fetch users function for reseller form
  const debouncedFetchResellerUsers = useCallback(() => {
    const timeoutId = setTimeout(async () => {
      if (resellerUsersFetched) return; // Only fetch once
      
      setResellerUsersLoading(true);
      setResellerUsersError(null);
      
      try {
        const response = await fetch('/api/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        // Store all users for filtering, but show only first 10 initially
        setResellerUsers(data || []);
        setResellerUsersFetched(true);
        
        // Open autocomplete and focus after data loads
        setTimeout(() => {
          setResellerAutocompleteOpen(true);
          setTimeout(() => {
            const input = document.querySelector('input[aria-autocomplete="list"]');
            if (input) {
              input.focus();
            }
          }, 100);
        }, 0);
      } catch (error) {
        console.error('Error fetching users for reseller:', error);
        setResellerUsersError(error.message);
      } finally {
        setResellerUsersLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [resellerUsersFetched]);

  // Function to trigger debounced fetch
  const fetchResellerUsers = () => {
    if (!resellerUsersFetched) {
      debouncedFetchResellerUsers();
    }
  };

  // Fetch users data
  useEffectAsync(async () => {
    if (showAnnouncementDrawer) {
      const response = await fetchOrThrow('/api/users');
      setUsersItems(await response.json());
    }
  }, [showAnnouncementDrawer]);

  // Fetch notificators data
  useEffectAsync(async () => {
    if (showAnnouncementDrawer) {
      const response = await fetchOrThrow('/api/notifications/notificators?announcement=true');
      setNotificatorsItems(await response.json());
    }
  }, [showAnnouncementDrawer]);

  // Filtered options for custom autocomplete
  const filteredUsersOptions = useMemo(() => {
    if (!usersItems) return [];
    if (!usersInputValue) return usersItems;
    return usersItems.filter(item => 
      item.name.toLowerCase().includes(usersInputValue.toLowerCase())
    );
  }, [usersItems, usersInputValue]);

  const filteredNotificatorsOptions = useMemo(() => {
    if (!notificatorsItems) return [];
    if (!notificatorsInputValue) return notificatorsItems;
    return notificatorsItems.filter(item => 
      t(prefixString('notificator', item.type)).toLowerCase().includes(notificatorsInputValue.toLowerCase())
    );
  }, [notificatorsItems, notificatorsInputValue, t]);

  // Users autocomplete handlers
  const handleUsersInputChange = (event) => {
    const value = event.target.value;
    setUsersInputValue(value);
    setUsersAutocompleteOpen(true);
    setUsersHighlightedIndex(-1);
  };

  const handleUsersOptionSelect = (option) => {
    const currentUsers = announcementData.users || [];
    const isAlreadySelected = currentUsers.some(user => user.id === option.id);
    
    if (!isAlreadySelected) {
      setAnnouncementData({
        ...announcementData,
        users: [...currentUsers, option]
      });
    }
    
    setUsersInputValue('');
    setUsersAutocompleteOpen(false);
    setUsersHighlightedIndex(-1);
  };

  const handleUsersRemove = (userToRemove) => {
    const currentUsers = announcementData.users || [];
    setAnnouncementData({
      ...announcementData,
      users: currentUsers.filter(user => user.id !== userToRemove.id)
    });
  };

  const handleUsersFocus = () => {
    setUsersInputValue('');
    setUsersAutocompleteOpen(true);
  };

  const handleUsersBlur = () => {
    setTimeout(() => {
      setUsersAutocompleteOpen(false);
      setUsersHighlightedIndex(-1);
    }, 150);
  };

  // Notificators autocomplete handlers
  const handleNotificatorsInputChange = (event) => {
    const value = event.target.value;
    setNotificatorsInputValue(value);
    setNotificatorsAutocompleteOpen(true);
    setNotificatorsHighlightedIndex(-1);
  };

  const handleNotificatorsOptionSelect = (option) => {
    setAnnouncementData({
      ...announcementData,
      notificator: option.type
    });
    setNotificatorsInputValue(t(prefixString('notificator', option.type)));
    setNotificatorsAutocompleteOpen(false);
    setNotificatorsHighlightedIndex(-1);
  };

  const handleNotificatorsFocus = () => {
    // Show current selection or clear for new search
    if (announcementData.notificator) {
      const selectedNotificator = notificatorsItems.find(item => item.type === announcementData.notificator);
      if (selectedNotificator) {
        setNotificatorsInputValue(t(prefixString('notificator', selectedNotificator.type)));
      } else {
        setNotificatorsInputValue('');
      }
    } else {
      setNotificatorsInputValue('');
    }
    setNotificatorsAutocompleteOpen(true);
  };

  const handleNotificatorsBlur = () => {
    setTimeout(() => {
      setNotificatorsAutocompleteOpen(false);
      setNotificatorsHighlightedIndex(-1);
    }, 150);
  };
  
  const updateServerMutation = useMutation({
    mutationFn: async (data) => {
      await fetchOrThrow('/api/server', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setShowServerDrawer(false);
    },
  });

  const sendAnnouncementMutation = useMutation({
    mutationFn: async (data) => {
      const query = new URLSearchParams();
      data.users.forEach((user) => query.append('userId', user.id));
      await fetchOrThrow(`/api/notifications/send/${data.notificator}?${query.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.message),
      });
    },
    onSuccess: () => {
      setShowAnnouncementDrawer(false);
    },
  });

  // Preferences functions
  const generateToken = useCatch(async () => {
    const expiration = dayjs(tokenExpiration, 'YYYY-MM-DD').toISOString();
    const response = await fetchOrThrow('/api/session/token', {
      method: 'POST',
      body: new URLSearchParams(`expiration=${expiration}`),
    });
    setToken(await response.text());
  });

  const handlePreferencesSave = useCatch(async () => {
    const response = await fetchOrThrow(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, attributes: preferencesAttributes }),
    });
    dispatch(sessionActions.updateUser(await response.json()));
    setShowPreferencesDrawer(false);
  });

  const handleReboot = useCatch(async () => {
    const response = await fetch('/api/server/reboot', { method: 'POST' });
    throw Error(response.statusText);
  });

  // Initialize preferences attributes when drawer opens
  useEffect(() => {
    if (showPreferencesDrawer && user) {
      setPreferencesAttributes(user.attributes || {});
    }
  }, [showPreferencesDrawer, user]);

  // File upload handler
  const handleFileChange = useCallback(async (newFile) => {
    if (newFile) {
      try {
        await fetchOrThrow(`/api/server/file/${newFile.name}`, {
          method: 'POST',
          body: newFile,
        });
        // Optionally show success message or refresh data
      } catch (error) {
        console.error('File upload failed:', error);
      }
    }
  }, []);

  // Reseller file upload handler
  const handleResellerFileUpload = useCallback(async (resellerData) => {
    try {
      // Create JSON string
      const jsonString = JSON.stringify(resellerData, null, 2);
      
      // Create Blob with the JSON data
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create filename with appUrl_resellerId_parentUserId format
      // Extract only domain from appUrl (remove http/https and slashes)
      let appUrl = resellerData.appUrl || 'unknown';
      if (appUrl !== 'unknown') {
        appUrl = appUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      }
      const resellerId = resellerData.resellerId || 'unknown';
      const parentUserId = resellerData.parentUserId || 'unknown';
      const filename = `${appUrl}_${resellerId}_${parentUserId}.json`;
      
      // Create File object
      const file = new File([blob], filename, { type: 'application/json' });
      
    
      
      // Upload to server
      await fetchOrThrow(`/api/server/file/${filename}`, {
        method: 'POST',
        body: file,
      });
      
      
    } catch (error) {
      console.error('Reseller file upload failed:', error);
    }
  }, []);
  const manager = useManager();
  const features = useFeatures();
  const disableReports = useRestriction('disableReports');
  
  // Language functionality
  const { languages, language, setLocalLanguage } = useLocalization();
  const languageList = Object.entries(languages).map((values) => ({ 
    code: values[0], 
    country: values[1].country, 
    name: values[1].name 
  }));
  
  // Theme functionality
  const { theme: currentTheme, setLocalTheme } = useCustomTheme();
  const colors = useThemeColors();

  // Reset button hover states when theme changes
  useEffect(() => {
    // Reset all control bar buttons to transparent background
    const buttons = document.querySelectorAll('[data-control-button]');
    buttons.forEach(button => {
      if (button) {
        button.style.backgroundColor = 'transparent';
      }
    });
  }, [currentTheme]);
  
  // User and server data
  const server = useSelector((state) => state.session.server);
  const supportLink = useSelector((state) => state.session.server.attributes.support);
  const billingLink = useSelector((state) => state.session.user.attributes.billingLink);
  
  // Reseller branding
  const { getLogoUrl, getCompanyName } = useResellerBranding();

  // Check if current user is a reseller
  useEffect(() => {
    const checkResellerStatus = async () => {
      if (!user?.id) {
        dispatch(resellersActions.clearCurrentReseller());
        return;
      }

      try {
        const response = await fetch(resellersConfig.ENDPOINTS.CHECK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.isReseller) {
            dispatch(resellersActions.setCurrentReseller(data.resellerData));
          } else {
            dispatch(resellersActions.clearCurrentReseller());
          }
        } else {
          // User is not a reseller (404 or other error)
          dispatch(resellersActions.clearCurrentReseller());
        }
      } catch (error) {
        console.error('Error checking reseller status:', error);
        dispatch(resellersActions.clearCurrentReseller());
      }
    };

    checkResellerStatus();
  }, [user?.id, dispatch]);
  
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
      if (showLanguagePopover && languageRef && !languageRef.contains(event.target)) {
        setShowLanguagePopover(false);
      }
      if (showUserPopover && userRef && !userRef.contains(event.target)) {
        setShowUserPopover(false);
      }
    };

    if (showEventsPopover || showMapSwitcher || showSearch || showLanguagePopover || showUserPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEventsPopover, eventsButtonRef, showMapSwitcher, mapSwitcherRef, showSearch, searchRef, showLanguagePopover, languageRef, showUserPopover, userRef]);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const devices = useSelector((state) => state.devices.items);
  const currentReplayIndex = useSelector((state) => state.session.currentReplayIndex);
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
  const [geofencesPopoverVisible, setGeofencesPopoverVisible] = useState(false);
  const [reportsPopoverVisible, setReportsPopoverVisible] = useState(false);


  const onMapClick = useCallback(() => {
    dispatch(devicesActions.selectId(null));
  }, [dispatch]);

  // Refresh devices when device list becomes visible
  const refreshDevices = useCallback(async () => {
    try {
      const response = await fetchOrThrow('/api/devices?all=true');
      const devicesData = await response.json();
      dispatch(devicesActions.refresh(devicesData));
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    }
  }, [dispatch]);


  // Always call useFilter (required by Rules of Hooks)
  useFilter(keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions, desktop);


  // Old desktop-only refresh - now handled by universal refresh below

  // Force refresh devices when device list becomes visible (desktop only)
  useEffect(() => {
    if (desktop && isDeviceListVisible) {
      refreshDevices();
    }
  }, [desktop, isDeviceListVisible, refreshDevices]);

  return (
    <div className={classes.root}>
      {desktop && (
        <MainMap
          filteredPositions={filteredPositions}
          selectedPosition={selectedPosition}
          onMapClick={onMapClick}
          selectedMapStyle={selectedMapStyle}
          currentReplayIndex={currentReplayIndex}
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
                currentReplayIndex={currentReplayIndex}
              />
            </div>
          )}
        </div>
      </div>
      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />
      <FloatingGeofencesPopover 
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isDeviceListVisible={isDeviceListVisible}
        isVisible={geofencesPopoverVisible}
        onClose={() => setGeofencesPopoverVisible(false)}
      />
      
      <FloatingReportsPopover 
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isDeviceListVisible={isDeviceListVisible}
        isVisible={reportsPopoverVisible}
        onClose={() => setReportsPopoverVisible(false)}
      />
      
      {/* Desktop Menu */}
      {desktop && (
        <div style={{
          position: 'fixed',
          top: '8px',
          left: '8px',
          width: isMenuExpanded ? '200px' : '55px',
          height: 'calc(100vh - 16px)',
          backgroundColor: colors.menuSurface,
          borderRadius: (isDeviceListVisible || selectedDeviceId || showUsersPopover || showCommandsPopover || showMaintenancePopover || showComputedAttributesPopover || showCalendarsPopover || showDriversPopover || showGroupsPopover || showDevicesPopover || showNotificationsPopover || geofencesPopoverVisible || reportsPopoverVisible || showReplayPopover || showResellersPopover) ? '16px 0px 0px 16px' : '16px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          gap: '0px',
          transition: 'width 0.3s ease, border-radius 0.3s ease',
          overflow: 'hidden',
          border: `1px solid ${colors.menuBorder}`,
          boxShadow: `0 4px 12px ${colors.menuShadow}`
        }}>
          {/* Toggle Menu Button - First Option */}
          <div style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMenuExpanded ? 'space-between' : 'center',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: '0px',
            transition: 'all 0.2s',
            padding: isMenuExpanded ? '0 12px' : '0'
          }}
          onClick={() => {
            setIsMenuExpanded(!isMenuExpanded);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.menuHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}>
            {!isMenuExpanded ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '40px',
                maxWidth: '130px',
                overflow: 'hidden',
                padding: '0 10px',
                marginBottom: '6px'
              }}>
                {(() => {
                  // Priority: Reseller logo > Server logo > Server inverted logo > Fallback
                  const logoUrl = getLogoUrl() || logo || logoInverted;
                  
                  return (
                    <img 
                      src={logoUrl || fallbackLogo} 
                      alt="Server Logo" 
                      style={{ 
                        maxWidth: '100%',
                        maxHeight: '36px',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        // Fallback to server logo or default
                        const fallbackUrl = logo || logoInverted || fallbackLogo;
                        e.target.src = fallbackUrl;
                      }}
                    />
                  );
                })()}
              </div>
            ) : (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '40px',
                  maxWidth: '130px',
                  overflow: 'hidden',
                  padding: '0 10px',
                  marginBottom: '6px'
                }}>
                  {(() => {
                    // Priority: Reseller logo > Server logo > Server inverted logo > Fallback
                    const logoUrl = getLogoUrl() || logo || logoInverted;
                    
                    return (
                      <img 
                        src={logoUrl || fallbackLogo} 
                        alt="Server Logo" 
                        style={{ 
                          maxWidth: '100%',
                          maxHeight: '36px',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          // Fallback to server logo or default
                          const fallbackUrl = logo || logoInverted || fallbackLogo;
                          e.target.src = fallbackUrl;
                        }}
                      />
                    );
                  })()}
                </div>
                <ChevronLeft size={18} color={colors.textSecondary} />
              </>
            )}
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
            e.currentTarget.style.backgroundColor = colors.menuHover;
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = t('showHideDevices');
              tooltip.id = 'menu-tooltip-device-list';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: 0 4px 12px ${colors.menuShadow};
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
            <Truck size={18} color={colors.textSecondary} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.6'
              }}>
                {t('showHideDevices')}
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
              setReportsPopoverVisible(true);
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: ${colors.menuShadow};
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
              <PieChart size={18} color={colors.textSecondary} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
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
            setGeofencesPopoverVisible(true);
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: ${colors.menuShadow};
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
            <CreateIcon style={{ fontSize: 18, color: colors.textSecondary }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
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
            setShowPreferencesDrawer(true);
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: ${colors.menuShadow};
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
            <SettingsIcon style={{ fontSize: 18, color: colors.textSecondary }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
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
              setShowNotificationsPopover(true);
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: ${colors.menuShadow};
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
              <NotificationsOutlinedIcon style={{ fontSize: 18, color: colors.textSecondary }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
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
              setShowUserPopover(false);
              setEditingUserId(user.id);
              setShowUsersPopover(true);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                  background: ${colors.menuText};
                  color: ${colors.menuSurface};
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: ${colors.menuShadow};
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
              <PersonIcon style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
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
              setShowDevicesPopover(true);
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: ${colors.menuShadow};
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
              <SmartphoneIcon style={{ fontSize: 18, color: colors.textSecondary }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
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
              setShowGroupsPopover(true);
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: ${colors.menuShadow};
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
              <FolderIcon style={{ fontSize: 18, color: colors.textSecondary }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
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
              setShowDriversPopover(true);
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: ${colors.menuShadow};
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
              <PersonIcon style={{ fontSize: 18, color: colors.textSecondary }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
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
              setShowCalendarsPopover(true);
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: ${colors.menuShadow};
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
              <TodayIcon style={{ fontSize: 18, color: colors.textSecondary }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
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
              setShowComputedAttributesPopover(true);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                  background: ${colors.menuText};
                  color: ${colors.menuSurface};
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: ${colors.menuShadow};
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
              <StorageIcon style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
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
              setShowMaintenancePopover(true);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                  background: ${colors.menuText};
                  color: ${colors.menuSurface};
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: ${colors.menuShadow};
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
              <BuildIcon style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
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
              setShowCommandsPopover(true);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                  background: ${colors.menuText};
                  color: ${colors.menuSurface};
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: ${colors.menuShadow};
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
              <PublishIcon style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
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
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                  background: ${colors.menuText};
                  color: ${colors.menuSurface};
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: ${colors.menuShadow};
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
              <PaymentIcon style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
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
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                  background: ${colors.menuText};
                  color: ${colors.menuSurface};
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: ${colors.menuShadow};
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
              <HelpIcon style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
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
              setShowAnnouncementDrawer(true);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                  background: ${colors.menuText};
                  color: ${colors.menuSurface};
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: ${colors.menuShadow};
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
              <CampaignIcon style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
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
          {admin && (
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
              setShowServerDrawer(true);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                  background: ${colors.menuText};
                  color: ${colors.menuSurface};
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: ${colors.menuShadow};
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
              <StorageIcon style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
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
              setShowUsersPopover(true);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                  background: ${colors.menuText};
                  color: ${colors.menuSurface};
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: ${colors.menuShadow};
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
              <PeopleIcon style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
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
          
          {/* Manager Section - Reseller Management */}
          {(admin || isReseller) && (
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
              const tooltip = document.getElementById('menu-tooltip-reseller');
              if (tooltip) tooltip.remove();
              setShowResellersPopover(true);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.menuHover;
              if (!isMenuExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.textContent = t('resellerPanel');
                tooltip.id = 'menu-tooltip-reseller';
                tooltip.style.cssText = `
                  position: fixed;
                  left: ${rect.right + 8}px;
                  top: ${rect.top + rect.height / 2}px;
                  transform: translateY(-50%);
                  background: ${colors.menuText};
                  color: ${colors.menuSurface};
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  white-space: nowrap;
                  z-index: 10001;
                  pointer-events: none;
                  box-shadow: ${colors.menuShadow};
                `;
                document.body.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (!isMenuExpanded) {
                const tooltip = document.getElementById('menu-tooltip-reseller');
                if (tooltip) tooltip.remove();
              }
            }}>
              <FolderIcon style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  {t('resellerPanel')}
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
              e.currentTarget.style.backgroundColor = colors.menuHover;
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
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10001;
                pointer-events: none;
                box-shadow: ${colors.menuShadow};
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
        geofencesPopoverVisible={geofencesPopoverVisible}
        onDrawerOpen={() => setDrawerOpen(true)}
      />
      
      {/* Floating Status Card */}
      <FloatingStatusCard 
        desktop={desktop} 
        isMenuExpanded={isMenuExpanded} 
        isDeviceListVisible={isDeviceListVisible}
        geofencesPopoverVisible={geofencesPopoverVisible}
        showReplayPopover={showReplayPopover}
        setShowReplayPopover={setShowReplayPopover}
        onHideDeviceList={() => setIsDeviceListVisible(false)}
      />
      
      {/* Vertical Control Bar - Left of Device List */}
      <AnimatePresence>
        {(desktop || selectedDeviceId) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
        position: 'fixed',
              top: '8px',
              right: '8px', // 8px from right edge
              width: '50px',
              height: 'auto',
              backgroundColor: colors.menuSurface,
        borderRadius: '16px',
        display: 'flex',
              flexDirection: 'column',
        alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '8px 0',
        zIndex: 9999,
              boxShadow: `0 4px 12px ${colors.menuShadow}`,
              border: `1px solid ${colors.menuBorder}`,
              gap: '8px'
            }}
          >
        <button 
          ref={setUserRef}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'transparent',
            color: colors.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none',
            transition: 'all 0.2s'
          }}
          onClick={() => setShowUserPopover(!showUserPopover)}
>
          <Avatar style={{ width: '28px', height: '28px', userSelect: 'none', pointerEvents: 'none' }}>
            {user?.attributes?.avatar && (
              <AvatarImage src={user.attributes.avatar} alt="User" />
            )}
            <AvatarFallback style={{ 
              backgroundColor: colors.avatarBackground, 
              color: colors.avatarText, 
              fontSize: '13px',
              fontWeight: '500'
            }}>
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
        </button>
        <button 
          data-control-button
          ref={setEventsButtonRef}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: colors.textSecondary,
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
          onClick={() => setShowEventsPopover(!showEventsPopover)}>
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
                color: colors.badgeText,
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
          data-control-button
          ref={setMapSwitcherRef}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          color: colors.textSecondary,
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
          onClick={() => setShowMapSwitcher(!showMapSwitcher)}>
          <Map style={{ fontSize: 18, userSelect: 'none', pointerEvents: 'none' }} />
        </button>
        
        {/* Zoom In Button */}
        <button 
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: colors.textSecondary, 
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
          onClick={handleZoomIn}>
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
            color: colors.textSecondary,
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
          onClick={handleZoomOut}>
          <Minus style={{ fontSize: 18, userSelect: 'none', pointerEvents: 'none' }} />
        </button>
        
        {/* Search Button */}
        <button 
          data-control-button
          ref={setSearchRef}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: colors.textSecondary,
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
          onClick={() => setShowSearch(!showSearch)}>
          <Search style={{ fontSize: 18, userSelect: 'none', pointerEvents: 'none' }} />
        </button>
        
        {/* Language Button */}
        <button 
          data-control-button
          ref={setLanguageRef}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: colors.textSecondary,
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
          onClick={() => setShowLanguagePopover(!showLanguagePopover)}>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
            <ReactCountryFlag 
              countryCode={languageList.find(lang => lang.code === language)?.country || 'US'} 
              svg 
              style={{ width: '18px', height: '14px' }} 
            />
          </Box>
        </button>
        
        {/* Theme Switcher Button */}
        <button
          data-control-button
          onClick={() => setLocalTheme(currentTheme === 'light' ? 'dark' : 'light')}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: colors.textSecondary,
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
          }}>
          {currentTheme === 'light' ? (
            <Moon size={18} color={colors.textSecondary} />
          ) : (
            <Sun size={18} color={colors.textSecondary} />
          )}
        </button>
          </motion.div>
        )}
      </AnimatePresence>
      
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
              width: desktop ? '300px' : '75vw',
              maxWidth: '75vw',
              maxHeight: '400px',
              backgroundColor: colors.surface,
              borderRadius: '12px',
              boxShadow: colors.shadow,
              border: `1px solid ${colors.border}`,
              zIndex: 10001,
              overflow: 'hidden'
            }}>
          {/* Popover Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.surface
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
                color: colors.text,
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
                color: colors.textSecondary
              }}>
                No events available
              </div>
            ) : (
              events.map((event, index) => (
                <div
                  key={event.id || index}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < events.length - 1 ? `1px solid ${colors.border}` : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleEventClick(event)}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = colors.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ pointerEvents: 'none' }}>
                  {/* Device Name - Header */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                      color: colors.textSecondary,
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
              backgroundColor: colors.surface,
              borderRadius: '12px',
              boxShadow: colors.shadow,
              border: `1px solid ${colors.border}`,
              zIndex: 10001,
              overflow: 'hidden'
            }}>
            {/* Map Switcher Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${colors.border}`,
              backgroundColor: colors.surface
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: colors.text,
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
                      color: selectedMapStyle === style.id ? colors.text : colors.textSecondary,
                      backgroundColor: selectedMapStyle === style.id ? colors.hover : 'transparent',
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      borderBottom: index < mapStyles.filter(s => s.available && activeMapStyles.includes(s.id)).length - 1 ? `1px solid ${colors.border}` : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedMapStyle !== style.id) {
                        e.target.style.backgroundColor = colors.hover;
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
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: 'fixed',
              right: '65px',
              top: searchRef.getBoundingClientRect().top,
              width: desktop ? '320px' : '75vw',
              maxWidth: '75vw',
              backgroundColor: colors.surface,
              borderRadius: '12px',
              boxShadow: colors.shadow,
              zIndex: 10000,
              padding: '16px',
              border: `1px solid ${colors.border}`
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder={t('sharedSearchPlaces')}
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: colors.secondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.text,
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
                  top: 'calc(50% - 8px)',
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid #18a9fd',
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
                    key={`search-${result.id || result.name || index}`}
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
                      e.target.style.backgroundColor = colors.hover;
                      e.target.style.borderColor = colors.border;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.borderColor = 'transparent';
                    }}
                  >
                    <div style={{ pointerEvents: 'none' }}>
                      <div style={{
                        color: colors.text,
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
                      color: colors.textSecondary,
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {result.properties?.display_name}
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Character Count Message */}
            {searchQuery && searchQuery.trim().length > 0 && searchQuery.trim().length < 5 && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                color: colors.textSecondary,
                fontSize: '14px',
                textAlign: 'center'
              }}>
                Type at least 5 characters to search
              </div>
            )}
            
            {/* No Results */}
            {searchQuery && searchQuery.trim().length >= 5 && searchResults.length === 0 && !isSearching && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                color: colors.textSecondary,
                fontSize: '14px',
                textAlign: 'center'
              }}>
                No results found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Language Popover */}
      <AnimatePresence>
        {showLanguagePopover && languageRef && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              right: '65px',
              top: languageRef.getBoundingClientRect().top,
              width: '200px',
              backgroundColor: colors.surface,
              borderRadius: '12px',
              boxShadow: colors.shadow,
              zIndex: 10000,
              padding: '12px',
              border: `1px solid ${colors.border}`,
              maxHeight: '300px',
              overflowY: 'auto'
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {languageList.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    // Add smooth transition to prevent screen blink
                    document.documentElement.style.transition = 'opacity 0.1s ease-in-out';
                    document.documentElement.style.opacity = '0.8';
                    
                    setTimeout(() => {
                      setLocalLanguage(lang.code);
                      setShowLanguagePopover(false);
                      
                      // Restore opacity after language change
                      setTimeout(() => {
                        document.documentElement.style.opacity = '1';
                        document.documentElement.style.transition = '';
                      }, 150);
                    }, 50);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: language === lang.code ? colors.hover : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    textAlign: 'left',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    if (language !== lang.code) {
                      e.target.style.backgroundColor = colors.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (language !== lang.code) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Box component="span" sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                    <ReactCountryFlag 
                      countryCode={lang.country} 
                      svg 
                      style={{ width: '16px', height: '12px' }} 
                    />
                  </Box>
                  <span style={{
                    fontSize: '13px',
                    color: colors.text,
                    fontWeight: language === lang.code ? '500' : '400'
                  }}>
                    {lang.name}
                  </span>
                  {language === lang.code && (
                    <Box component="span" sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                      <Check style={{ width: '14px', height: '14px', color: '#10B981' }} />
                    </Box>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Popover */}
      <AnimatePresence>
        {showUserPopover && userRef && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: 'fixed',
              right: '65px',
              top: userRef.getBoundingClientRect().top,
              width: desktop ? '320px' : '75vw',
              maxWidth: '75vw',
              backgroundColor: colors.surface,
              borderRadius: '12px',
              boxShadow: `0 8px 32px ${colors.shadow}`,
              zIndex: 10000,
              padding: '20px',
              border: `1px solid ${colors.border}`
            }}
          >
            {/* User Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              paddingBottom: '16px',
              borderBottom: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar style={{ 
                  width: '48px', 
                  height: '48px', 
                  marginRight: '12px',
                  backgroundColor: colors.avatarBackground
                }}>
                  {user?.attributes?.avatar && (
                    <AvatarImage src={user.attributes.avatar} alt="User" />
                  )}
                  <AvatarFallback style={{ 
                    backgroundColor: colors.avatarBackground, 
                    color: colors.avatarText, 
                    fontSize: '18px',
                    fontWeight: '500'
                  }}>
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 style={{
                    color: colors.text,
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: '0 0 4px 0'
                  }}>
                    {user?.name || t('sharedName')}
                  </h3>
                  <p style={{
                    color: colors.textSecondary,
                    fontSize: '14px',
                    margin: '0'
                  }}>
                    {user?.email || t('userEmail')}
                  </p>
                </div>
              </div>
              
            </div>
            
            {/* User Details */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                color: colors.text,
                fontSize: '14px',
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                {t('settingsUser')}
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>ID:</span>
                  <span style={{ color: colors.text, fontSize: '12px' }}>{user?.id || t('sharedN/A')}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>{t('userAdmin')}:</span>
                  <span style={{ color: user?.administrator ? '#10B981' : '#EF4444', fontSize: '12px' }}>
                    {user?.administrator ? t('sharedYes') : t('sharedNo')}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Manager:</span>
                  <span style={{ color: user?.manager ? '#10B981' : '#EF4444', fontSize: '12px' }}>
                    {user?.manager ? t('sharedYes') : t('sharedNo')}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Server Information */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                color: colors.text,
                fontSize: '14px',
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                {t('settingsServer')}
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>{t('settingsServerVersion')}:</span>
                  <span style={{ color: colors.text, fontSize: '12px' }}>{server?.version || t('sharedN/A')}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>{t('deviceTitle')}:</span>
                  <span style={{ color: colors.text, fontSize: '12px' }}>{devices ? Object.keys(devices).length : 0}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>{t('reportPositions')}:</span>
                  <span style={{ color: colors.text, fontSize: '12px' }}>{positions ? Object.keys(positions).length : 0}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '16px'
            }}>
              {/* Billing full width at top */}
              <button
                onClick={() => {
                  setShowUserPopover(false);
                  if (billingLink) {
                    window.open(billingLink, '_blank');
                  }
                }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    opacity: billingLink ? 1 : 0.5
                  }}
                disabled={!billingLink}
                onMouseEnter={(e) => {
                  if (billingLink) {
                    e.target.style.backgroundColor = '#1D4ED8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (billingLink) {
                    e.target.style.backgroundColor = '#1E40AF';
                  }
                }}
              >
                {t('userBilling')}
              </button>
              
              {/* Account and Logout on same line below */}
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={() => {
                    setShowUserPopover(false);
                    setEditingUserId(user.id);
                    setShowUsersPopover(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: colors.secondary,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = colors.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = colors.secondary;
                  }}
                >
                  {t('settingsUser')}
                </button>
                <button
                  onClick={() => {
                    setShowUserPopover(false);
                    setShowLogoutModal(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#FEE2E2';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#FEF2F2';
                  }}
                >
                  {t('loginLogout')}
                </button>
              </div>
          </div>
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
                backgroundColor: colors.surface,
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
                color: colors.text,
                lineHeight: '1.5'
              }}>
                {t('confirmQuit')}
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={cancelLogout}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    backgroundColor: colors.secondary,
                    color: colors.text,
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = colors.hover;
                    e.target.style.color = colors.text;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = colors.secondary;
                    e.target.style.color = colors.text;
                  }}
                >
                  {t('sharedCancel')}
                </button>
                <button
                  onClick={confirmLogout}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#FEE2E2';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#FEF2F2';
                  }}
                >
                  {t('loginLogout')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Users Management Modal */}
      <UsersModal 
        open={showUsersModal} 
        onClose={() => setShowUsersModal(false)} 
      />
      
      {/* Users Management Popover */}
      <FloatingUsersPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showUsersPopover}
        onClose={() => {
          setShowUsersPopover(false);
          setEditingUserId(null);
        }}
        userId={editingUserId}
      />
      
      {/* Commands Management Popover */}
      <FloatingCommandsPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showCommandsPopover}
        onClose={() => setShowCommandsPopover(false)}
      />
      
      {/* Maintenance Management Popover */}
      <FloatingMaintenancePopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showMaintenancePopover}
        onClose={() => setShowMaintenancePopover(false)}
      />

      <FloatingComputedAttributesPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showComputedAttributesPopover}
        onClose={() => setShowComputedAttributesPopover(false)}
      />

      {/* Calendars Management Popover */}
      <FloatingCalendarsPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showCalendarsPopover}
        onClose={() => setShowCalendarsPopover(false)}
      />

      {/* Drivers Management Popover */}
      <FloatingDriversPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showDriversPopover}
        onClose={() => setShowDriversPopover(false)}
      />

      {/* Groups Management Popover */}
      <FloatingGroupsPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showGroupsPopover}
        onClose={() => setShowGroupsPopover(false)}
      />

      {/* Devices Management Popover */}
      <FloatingDevicesPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showDevicesPopover}
        onClose={() => {
          setShowDevicesPopover(false);
          // Refresh devices when popover closes to ensure device list is updated
          refreshDevices();
        }}
      />

      {/* Resellers Management Popover */}
      <FloatingResellersPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showResellersPopover}
        onClose={() => setShowResellersPopover(false)}
      />

      {/* Notifications Management Popover */}
      <FloatingNotificationsPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showNotificationsPopover}
        onClose={() => setShowNotificationsPopover(false)}
      />
      
      {/* Server Settings Drawer */}
      <AnimatePresence>
        {showServerDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowServerDrawer(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
              }}
            />
            
            {/* Server Drawer */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: desktop ? '400px' : '100vw',
                height: '100vh',
                backgroundColor: colors.surface,
                borderLeft: desktop ? `1px solid ${colors.border}` : 'none',
                zIndex: 10000,
                boxShadow: desktop ? '-4px 0 20px rgba(0, 0, 0, 0.15)' : 'none',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Drawer Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconButton
                    onClick={() => setShowServerDrawer(false)}
                    size="small"
                    style={{ color: colors.textSecondary }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                    {t('settingsServer')}
                  </Typography>
                </div>
              </div>

              {/* Drawer Content */}
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                paddingBottom: '200px'
              }}>
                {serverData && (
                  <>
                    {/* Server Tabs */}
                    <Tabs
                      value={activeServerTab}
                      onChange={(e, newValue) => setActiveServerTab(newValue)}
                      variant="scrollable"
                      scrollButtons="auto"
                      style={{
                        marginBottom: '16px',
                      }}
                      sx={{
                        '& .MuiTab-root': {
                          color: '#666666',
                          fontSize: '12px',
                          fontWeight: '500',
                          textTransform: 'none',
                          minHeight: '40px',
                          padding: '8px 16px',
                          '&.Mui-selected': {
                            color: '#1976d2',
                            fontWeight: '600',
                            backgroundColor: 'transparent',
                          },
                          '&:hover': {
                            color: '#1976d2',
                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                          },
                          '&.Mui-selected:hover': {
                            color: '#1976d2',
                            backgroundColor: 'rgba(25, 118, 210, 0.15)',
                          },
                        },
                        '& .MuiTabs-indicator': {
                          backgroundColor: '#1976d2',
                          height: '2px',
                        },
                      }}
                    >
                      <Tab label={t('sharedPreferences')} />
                      <Tab label={t('sharedLocation')} />
                      <Tab label={t('sharedPermissions')} />
                      <Tab label={t('sharedFile')} />
                      <Tab label={t('sharedAttributes')} />
                    </Tabs>

                    {/* Preferences Tab */}
                    {activeServerTab === 0 && (
                      <Box sx={{ paddingTop: '16px' }}>
                        <TextField
                          fullWidth
                          value={serverData.mapUrl || ''}
                          onChange={(event) => setServerData({ ...serverData, mapUrl: event.target.value })}
                          label={t('mapCustomLabel')}
                          margin="normal"
                        />
                        <TextField
                          fullWidth
                          value={serverData.overlayUrl || ''}
                          onChange={(event) => setServerData({ ...serverData, overlayUrl: event.target.value })}
                          label={t('mapOverlayCustom')}
                          margin="normal"
                        />
                        <FormControl fullWidth margin="normal">
                          <InputLabel>{t('mapDefault')}</InputLabel>
                          <Select
                            label={t('mapDefault')}
                            value={serverData.map || 'locationIqStreets'}
                            onChange={(e) => setServerData({ ...serverData, map: e.target.value })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 },
                              PaperProps: {
                                style: {
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${colors.border}`,
                                  zIndex: 10002,
                                }
                              }
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              },
                              '& .MuiInputLabel-root': {
                                color: colors.textSecondary,
                                '&.Mui-focused': { color: colors.primary }
                              },
                            }}
                          >
                            {mapStyles.filter((style) => style.available).map((style) => (
                              <MenuItem key={style.id} value={style.id}>
                                <Typography component="span">{style.title}</Typography>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>{t('settingsCoordinateFormat')}</InputLabel>
                          <Select
                            label={t('settingsCoordinateFormat')}
                            value={serverData.coordinateFormat || 'dd'}
                            onChange={(event) => setServerData({ ...serverData, coordinateFormat: event.target.value })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 },
                              PaperProps: {
                                style: {
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${colors.border}`,
                                  zIndex: 10002,
                                }
                              }
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              },
                              '& .MuiInputLabel-root': {
                                color: colors.textSecondary,
                                '&.Mui-focused': { color: colors.primary }
                              },
                            }}
                          >
                            <MenuItem value="dd">{t('sharedDecimalDegrees')}</MenuItem>
                            <MenuItem value="ddm">{t('sharedDegreesDecimalMinutes')}</MenuItem>
                            <MenuItem value="dms">{t('sharedDegreesMinutesSeconds')}</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>{t('settingsSpeedUnit')}</InputLabel>
                          <Select
                            label={t('settingsSpeedUnit')}
                            value={serverData.attributes?.speedUnit || 'kn'}
                            onChange={(e) => setServerData({ 
                              ...serverData, 
                              attributes: { ...serverData.attributes, speedUnit: e.target.value } 
                            })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 },
                              PaperProps: {
                                style: {
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${colors.border}`,
                                  zIndex: 10002,
                                }
                              }
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              },
                              '& .MuiInputLabel-root': {
                                color: colors.textSecondary,
                                '&.Mui-focused': { color: colors.primary }
                              },
                            }}
                          >
                            <MenuItem value="kn">{t('sharedKn')}</MenuItem>
                            <MenuItem value="kmh">{t('sharedKmh')}</MenuItem>
                            <MenuItem value="mph">{t('sharedMph')}</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>{t('settingsDistanceUnit')}</InputLabel>
                          <Select
                            label={t('settingsDistanceUnit')}
                            value={serverData.attributes?.distanceUnit || 'km'}
                            onChange={(e) => setServerData({ 
                              ...serverData, 
                              attributes: { ...serverData.attributes, distanceUnit: e.target.value } 
                            })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 },
                              PaperProps: {
                                style: {
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${colors.border}`,
                                  zIndex: 10002,
                                }
                              }
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              },
                              '& .MuiInputLabel-root': {
                                color: colors.textSecondary,
                                '&.Mui-focused': { color: colors.primary }
                              },
                            }}
                          >
                            <MenuItem value="km">{t('sharedKm')}</MenuItem>
                            <MenuItem value="mi">{t('sharedMi')}</MenuItem>
                            <MenuItem value="nmi">{t('sharedNmi')}</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>{t('settingsAltitudeUnit')}</InputLabel>
                          <Select
                            label={t('settingsAltitudeUnit')}
                            value={serverData.attributes?.altitudeUnit || 'm'}
                            onChange={(e) => setServerData({ 
                              ...serverData, 
                              attributes: { ...serverData.attributes, altitudeUnit: e.target.value } 
                            })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 }
                            }}
                          >
                            <MenuItem value="m">{t('sharedMeters')}</MenuItem>
                            <MenuItem value="ft">{t('sharedFeet')}</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>{t('settingsVolumeUnit')}</InputLabel>
                          <Select
                            label={t('settingsVolumeUnit')}
                            value={serverData.attributes?.volumeUnit || 'ltr'}
                            onChange={(e) => setServerData({ 
                              ...serverData, 
                              attributes: { ...serverData.attributes, volumeUnit: e.target.value } 
                            })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 }
                            }}
                          >
                            <MenuItem value="ltr">{t('sharedLiter')}</MenuItem>
                            <MenuItem value="usGal">{t('sharedUsGallon')}</MenuItem>
                            <MenuItem value="impGal">{t('sharedImpGallon')}</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>{t('sharedTimezone')}</InputLabel>
                          <Select
                            label={t('sharedTimezone')}
                            value={serverData.attributes?.timezone || ''}
                            onChange={(e) => setServerData({ 
                              ...serverData, 
                              attributes: { ...serverData.attributes, timezone: e.target.value } 
                            })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10005 }
                            }}
                            style={{ width: '100%', minWidth: '100%' }}
                            sx={{ width: '100% !important', minWidth: '100% !important' }}
                          >
                            {timezones.map((timezone) => (
                              <MenuItem key={timezone} value={timezone}>
                                {timezone}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          fullWidth
                          value={serverData.poiLayer || ''}
                          onChange={(event) => setServerData({ ...serverData, poiLayer: event.target.value })}
                          label={t('mapPoiLayer')}
                          margin="normal"
                        />
                        <TextField
                          fullWidth
                          value={serverData.announcement || ''}
                          onChange={(event) => setServerData({ ...serverData, announcement: event.target.value })}
                          label={t('serverAnnouncement')}
                          margin="normal"
                        />
                        <FormGroup>
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={serverData.forceSettings} 
                                onChange={(event) => setServerData({ ...serverData, forceSettings: event.target.checked })}
                                sx={{
                                  color: colors.textSecondary,
                                  '&:hover': {
                                    backgroundColor: `${colors.primary}20`,
                                  },
                                  '&.Mui-checked': {
                                    color: colors.primary,
                                    '&:hover': {
                                      backgroundColor: `${colors.primary}30`,
                                    },
                                  },
                                  '&.MuiCheckbox-root': {
                                    color: colors.textSecondary,
                                  },
                                }}
                              />
                            }
                            label={t('serverForceSettings')}
                          />
                        </FormGroup>
                      </Box>
                    )}

                    {/* Location Tab */}
                    {activeServerTab === 1 && (
                      <Box sx={{ paddingTop: '16px' }}>
                        <TextField
                          fullWidth
                          type="number"
                          value={serverData.latitude || 0}
                          onChange={(event) => setServerData({ ...serverData, latitude: Number(event.target.value) })}
                          label={t('positionLatitude')}
                          margin="normal"
                        />
                        <TextField
                          fullWidth
                          type="number"
                          value={serverData.longitude || 0}
                          onChange={(event) => setServerData({ ...serverData, longitude: Number(event.target.value) })}
                          label={t('positionLongitude')}
                          margin="normal"
                        />
                        <TextField
                          fullWidth
                          type="number"
                          value={serverData.zoom || 0}
                          onChange={(event) => setServerData({ ...serverData, zoom: Number(event.target.value) })}
                          label={t('serverZoom')}
                          margin="normal"
                        />
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={() => {
                            const { lng, lat } = map.getCenter();
                            setServerData({
                              ...serverData,
                              latitude: Number(lat.toFixed(6)),
                              longitude: Number(lng.toFixed(6)),
                              zoom: Number(map.getZoom().toFixed(1)),
                            });
                          }}
                          style={{ marginTop: '16px' }}
                        >
                          {t('mapCurrentLocation')}
                        </Button>
                      </Box>
                    )}

                    {/* Permissions Tab */}
                    {activeServerTab === 2 && (
                      <Box sx={{ paddingTop: '16px' }}>
                        <FormGroup>
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={serverData.registration} 
                                onChange={(event) => setServerData({ ...serverData, registration: event.target.checked })}
                                sx={{
                                  color: colors.textSecondary,
                                  '&:hover': {
                                    backgroundColor: `${colors.primary}20`,
                                  },
                                  '&.Mui-checked': {
                                    color: colors.primary,
                                    '&:hover': {
                                      backgroundColor: `${colors.primary}30`,
                                    },
                                  },
                                  '&.MuiCheckbox-root': {
                                    color: colors.textSecondary,
                                  },
                                }}
                              />
                            }
                            label={t('serverRegistration')}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={serverData.readonly} 
                                onChange={(event) => setServerData({ ...serverData, readonly: event.target.checked })}
                                sx={{
                                  color: colors.textSecondary,
                                  '&:hover': {
                                    backgroundColor: `${colors.primary}20`,
                                  },
                                  '&.Mui-checked': {
                                    color: colors.primary,
                                    '&:hover': {
                                      backgroundColor: `${colors.primary}30`,
                                    },
                                  },
                                  '&.MuiCheckbox-root': {
                                    color: colors.textSecondary,
                                  },
                                }}
                              />
                            }
                            label={t('serverReadonly')}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={serverData.deviceReadonly} 
                                onChange={(event) => setServerData({ ...serverData, deviceReadonly: event.target.checked })}
                                sx={{
                                  color: colors.textSecondary,
                                  '&:hover': {
                                    backgroundColor: `${colors.primary}20`,
                                  },
                                  '&.Mui-checked': {
                                    color: colors.primary,
                                    '&:hover': {
                                      backgroundColor: `${colors.primary}30`,
                                    },
                                  },
                                  '&.MuiCheckbox-root': {
                                    color: colors.textSecondary,
                                  },
                                }}
                              />
                            }
                            label={t('userDeviceReadonly')}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={serverData.limitCommands} 
                                onChange={(event) => setServerData({ ...serverData, limitCommands: event.target.checked })}
                                sx={{
                                  color: colors.textSecondary,
                                  '&:hover': {
                                    backgroundColor: `${colors.primary}20`,
                                  },
                                  '&.Mui-checked': {
                                    color: colors.primary,
                                    '&:hover': {
                                      backgroundColor: `${colors.primary}30`,
                                    },
                                  },
                                  '&.MuiCheckbox-root': {
                                    color: colors.textSecondary,
                                  },
                                }}
                              />
                            }
                            label={t('userLimitCommands')}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={serverData.disableReports} 
                                onChange={(event) => setServerData({ ...serverData, disableReports: event.target.checked })}
                                sx={{
                                  color: colors.textSecondary,
                                  '&:hover': {
                                    backgroundColor: `${colors.primary}20`,
                                  },
                                  '&.Mui-checked': {
                                    color: colors.primary,
                                    '&:hover': {
                                      backgroundColor: `${colors.primary}30`,
                                    },
                                  },
                                  '&.MuiCheckbox-root': {
                                    color: colors.textSecondary,
                                  },
                                }}
                              />
                            }
                            label={t('userDisableReports')}
                          />
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={serverData.fixedEmail} 
                                onChange={(e) => setServerData({ ...serverData, fixedEmail: e.target.checked })}
                                sx={{
                                  color: colors.textSecondary,
                                  '&:hover': {
                                    backgroundColor: `${colors.primary}20`,
                                  },
                                  '&.Mui-checked': {
                                    color: colors.primary,
                                    '&:hover': {
                                      backgroundColor: `${colors.primary}30`,
                                    },
                                  },
                                  '&.MuiCheckbox-root': {
                                    color: colors.textSecondary,
                                  },
                                }}
                              />
                            }
                            label={t('userFixedEmail')}
                          />
                        </FormGroup>
                      </Box>
                    )}

                    {/* File Tab */}
                    {activeServerTab === 3 && (
                      <Box sx={{ paddingTop: '16px' }}>
                        <MuiFileInput
                          placeholder={t('sharedSelectFile')}
                          value={null}
                          onChange={handleFileChange}
                          fullWidth
                          margin="normal"
                        />
                        <Typography variant="body2" color="textSecondary" style={{ marginTop: '8px', fontSize: '12px' }}>
                          {t('serverFileDescription')}
                        </Typography>
                      </Box>
                    )}

                    {/* Attributes Tab */}
                    {activeServerTab === 4 && (
                      <Box sx={{ paddingTop: '16px' }}>
                        <EditAttributesAccordion
                          attributes={serverData.attributes}
                          setAttributes={(attributes) => setServerData({ ...serverData, attributes })}
                          definitions={{ ...commonUserAttributes, ...commonDeviceAttributes, ...serverAttributes }}
                        />
                      </Box>
                    )}
                  </>
                )}
              </div>

              {/* Drawer Footer */}
              <div style={{
                padding: '16px 20px',
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                backgroundColor: colors.surface,
              }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowServerDrawer(false)}
                  style={{
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  {t('sharedCancel')}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => updateServerMutation.mutate(serverData)}
                  disabled={updateServerMutation.isPending}
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.text,
                  }}
                >
                  {updateServerMutation.isPending ? t('sharedSaving') : t('sharedSave')}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reseller Drawer */}
      <AnimatePresence>
        {showResellerDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResellerDrawer(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
              }}
            />
            
            {/* Reseller Drawer */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: desktop ? '400px' : '100vw',
                height: '100vh',
                backgroundColor: colors.surface,
                borderLeft: desktop ? `1px solid ${colors.border}` : 'none',
                zIndex: 10000,
                boxShadow: desktop ? '-4px 0 20px rgba(0, 0, 0, 0.15)' : 'none',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Drawer Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconButton
                    onClick={() => setShowResellerDrawer(false)}
                    size="small"
                    style={{ color: colors.textSecondary }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                    {t('resellerPanel')}
                  </Typography>
                </div>
              </div>

              {/* Drawer Content */}
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                {/* Hidden fields */}
                <input type="hidden" value={resellerData.currentDomain} name="currentDomain" />
                <input type="hidden" value={resellerData.parentUserId} name="parentUserId" />
                <input type="hidden" value={resellerData.parentUser} name="parentUser" />
                <input type="hidden" value={resellerData.parentEmail} name="parentEmail" />
                
                {/* Reseller Tabs */}
                <Tabs
                  value={activeResellerTab}
                  onChange={(e, newValue) => setActiveResellerTab(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  style={{
                    marginBottom: '16px',
                  }}
                  sx={{
                    '& .MuiTab-root': {
                      color: '#666666',
                      fontSize: '12px',
                      fontWeight: '500',
                      textTransform: 'none',
                      minHeight: '40px',
                      padding: '8px 16px',
                      '&.Mui-selected': {
                        color: '#1976d2',
                        fontWeight: '600',
                        backgroundColor: 'transparent',
                      },
                      '&:hover': {
                        color: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      },
                      '&.Mui-selected:hover': {
                        color: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.15)',
                      },
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#1976d2',
                      height: '2px',
                    },
                  }}
                >
                  <Tab label={t('resellerBranding')} />
                  <Tab label={t('resellerContact')} />
                  <Tab label={t('resellerPermissions')} />
                </Tabs>

                {/* Tab Content */}
                <Box style={{ flex: 1, overflow: 'auto', paddingTop: '16px' }}>
                  {/* Branding Tab */}
                  {activeResellerTab === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                <Autocomplete
                  fullWidth
                  options={resellerUsers}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    const name = option.name || option.email || `User ${option.id}`;
                    return `${option.id} - ${name}`;
                  }}
                  value={resellerUsers.find(user => user.id === resellerData.resellerId) || null}
                  onChange={(event, newValue) => {
                    if (typeof newValue === 'string') {
                      // User typed something, find matching user
                      const matchingUser = resellerUsers.find(user => {
                        const name = user.name || user.email || `User ${user.id}`;
                        const displayName = `${user.id} - ${name}`;
                        return displayName.toLowerCase() === newValue.toLowerCase();
                      });
                      if (matchingUser) {
                        setResellerData(prev => ({
                          ...prev,
                          resellerId: matchingUser.id,
                          resellerUser: matchingUser.login || matchingUser.email,
                          resellerEmail: matchingUser.email
                        }));
                      } else {
                        handleResellerFieldChange('resellerId', newValue);
                      }
                    } else if (newValue) {
                      // User selected from dropdown
                      setResellerData(prev => ({
                        ...prev,
                        resellerId: newValue.id,
                        resellerUser: newValue.login || newValue.email,
                        resellerEmail: newValue.email
                      }));
                    } else {
                      // Cleared selection
                      setResellerData(prev => ({
                        ...prev,
                        resellerId: '',
                        resellerUser: '',
                        resellerEmail: ''
                      }));
                    }
                  }}
                  onFocus={fetchResellerUsers}
                  loading={resellerUsersLoading}
                  disabled={resellerUsersLoading}
                  open={resellerAutocompleteOpen}
                  onOpen={() => setResellerAutocompleteOpen(true)}
                  onClose={() => setTimeout(() => setResellerAutocompleteOpen(false), 0)}
                  filterOptions={(options, { inputValue }) => {
                    if (!inputValue) {
                      // Show only first 10 users when no input
                      return options.slice(0, 10);
                    }
                    // Filter from all users when typing
                    return options.filter(option => {
                      const id = option.id.toString().toLowerCase();
                      const name = (option.name || '').toLowerCase();
                      const email = (option.email || '').toLowerCase();
                      const login = (option.login || '').toLowerCase();
                      const searchValue = inputValue.toLowerCase();
                      return id.includes(searchValue) || 
                             name.includes(searchValue) || 
                             email.includes(searchValue) || 
                             login.includes(searchValue);
                    });
                  }}
                  freeSolo={true}
                  selectOnFocus={false}
                  clearOnBlur={false}
                  handleHomeEndKeys={true}
                  autoSelect={false}
                  autoComplete={false}
                  disablePortal={true}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                  label={t('resellerId')}
                  required
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {resellerUsersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                      }}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={key} {...otherProps}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                          <Typography variant="body2" style={{ color: colors.text, fontWeight: '500' }}>
                            {option.id} - {option.name || option.email || `User ${option.id}`}
                          </Typography>
                          <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px' }}>
                            {option.login || option.email || 'No login/email'}
                          </Typography>
                        </div>
                      </Box>
                    );
                  }}
                  noOptionsText={resellerUsersError ? `${t('sharedError')}: ${resellerUsersError}` : t('sharedNoData')}
                  PopperComponent={(props) => {
                    const { disablePortal, anchorEl, ...filteredProps } = props;
                    return (
                      <div 
                        {...filteredProps} 
                        style={{ 
                          ...props.style, 
                          zIndex: 10001
                        }} 
                      />
                    );
                  }}
                  sx={{
                    '& .MuiAutocomplete-popper': {
                      zIndex: '10001 !important',
                    },
                    '& .MuiAutocomplete-listbox': {
                      zIndex: '10001 !important',
                    },
                    '& .MuiPaper-root': {
                      zIndex: '10001 !important',
                    }
                  }}
                />
                
                <TextField
                  fullWidth
                        value={resellerData.companyName}
                        onChange={(e) => handleResellerFieldChange('companyName', e.target.value)}
                        label={t('resellerCompanyName')}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                        value={resellerData.logo}
                        onChange={(e) => handleResellerFieldChange('logo', e.target.value)}
                        label={t('resellerLogotype')}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                        value={resellerData.url}
                        onChange={(e) => handleResellerFieldChange('url', e.target.value)}
                        label={t('resellerAppUrl')}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                    </div>
                  )}

                  {/* Contact Tab */}
                  {activeResellerTab === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <TextField
                  fullWidth
                        value={resellerData.resellerUser}
                        label={t('resellerUser')}
                  required
                  InputProps={{
                    readOnly: true
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                        value={resellerData.resellerEmail}
                        label={t('resellerEmail')}
                        type="email"
                  required
                  InputProps={{
                    readOnly: true
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                  value={resellerData.whatsapp}
                  onChange={(e) => handleResellerFieldChange('whatsapp', e.target.value)}
                  label={t('resellerWhatsapp')}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                  value={resellerData.billingEmail}
                  onChange={(e) => handleResellerFieldChange('billingEmail', e.target.value)}
                  label={t('resellerBillingEmail')}
                  type="email"
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                  value={resellerData.supportEmail}
                  onChange={(e) => handleResellerFieldChange('supportEmail', e.target.value)}
                  label={t('resellerSupportEmail')}
                  type="email"
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                    </div>
                  )}

                  {/* Permissions Tab */}
                  {activeResellerTab === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <TextField
                  fullWidth
                  value={resellerData.resellerLimit}
                  onChange={(e) => handleResellerFieldChange('resellerLimit', e.target.value)}
                  label={t('resellerLimit')}
                  type="number"
                  required
                  inputProps={{ min: 1 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                  value={resellerData.deviceLimit}
                  onChange={(e) => handleResellerFieldChange('deviceLimit', e.target.value)}
                  label={t('userDeviceLimit')}
                  type="number"
                  required
                  inputProps={{ min: 1 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                
                <TextField
                  fullWidth
                  value={resellerData.userLimit}
                  onChange={(e) => handleResellerFieldChange('userLimit', e.target.value)}
                  label={t('userUserLimit')}
                  type="number"
                  required
                  inputProps={{ min: 1 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': { color: colors.primary }
                    },
                  }}
                />
                    </div>
                  )}
                </Box>
                
                {/* Error Messages - Below Form Fields */}
                {resellerErrors.length > 0 && (
                  <div style={{
                    padding: '16px',
                    border: `2px solid #f44336`,
                    borderRadius: '8px',
                    backgroundColor: '#ffebee',
                    marginTop: '16px'
                  }}>
                    <Typography variant="body2" style={{ color: '#d32f2f', fontWeight: '600', marginBottom: '8px' }}>
                      {t('sharedError')}: {t('sharedRequiredFields')}
                    </Typography>
                    {resellerErrors.map((error, index) => (
                      <Typography key={`reseller-error-${index}-${error.slice(0, 20)}`} variant="body2" style={{ color: '#d32f2f', marginBottom: '4px' }}>
                        • {error}
                      </Typography>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div style={{
                padding: '16px 20px',
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                backgroundColor: colors.surface,
              }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowResellerDrawer(false)}
                  style={{
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  {t('sharedCancel')}
                </Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    const errors = [];
                    
                    // Validate required fields
                    const requiredFields = [
                      { key: 'resellerId', label: t('resellerId') },
                      { key: 'resellerUser', label: t('resellerUser') },
                      { key: 'resellerEmail', label: t('resellerEmail') },
                      { key: 'companyName', label: t('resellerCompanyName') },
                      { key: 'logo', label: t('resellerLogotype') },
                      { key: 'url', label: t('resellerAppUrl') },
                      { key: 'whatsapp', label: t('resellerWhatsapp') },
                      { key: 'billingEmail', label: t('resellerBillingEmail') },
                      { key: 'supportEmail', label: t('resellerSupportEmail') },
                      { key: 'resellerLimit', label: t('resellerLimit') },
                      { key: 'deviceLimit', label: t('userDeviceLimit') },
                      { key: 'userLimit', label: t('userUserLimit') }
                    ];

                    // Special validation for resellerId - must be a valid user ID
                    if (!resellerData.resellerId || resellerData.resellerId === '' || isNaN(resellerData.resellerId)) {
                      errors.push(t('resellerId') + ' (must select a valid user)');
                    }

                    requiredFields.forEach(field => {
                      const value = resellerData[field.key];
                      if (!value || (typeof value === 'string' && value.trim() === '')) {
                        errors.push(field.label);
                      }
                    });

                    // Validate email format
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (resellerData.resellerEmail && !emailRegex.test(resellerData.resellerEmail)) {
                      errors.push(`${t('resellerEmail')} has invalid format`);
                    }
                    if (resellerData.billingEmail && !emailRegex.test(resellerData.billingEmail)) {
                      errors.push(`${t('resellerBillingEmail')} has invalid format`);
                    }
                    if (resellerData.supportEmail && !emailRegex.test(resellerData.supportEmail)) {
                      errors.push(`${t('resellerSupportEmail')} has invalid format`);
                    }

                    // Validate number fields are positive
                    if (resellerData.resellerLimit) {
                      const limit = parseInt(resellerData.resellerLimit);
                      if (isNaN(limit) || limit < 1) {
                        errors.push(`${t('resellerLimit')} must be a positive number`);
                      }
                    }
                    if (resellerData.deviceLimit) {
                      const limit = parseInt(resellerData.deviceLimit);
                      if (isNaN(limit) || limit < 1) {
                        errors.push(`${t('userDeviceLimit')} must be a positive number`);
                      }
                    }
                    if (resellerData.userLimit) {
                      const limit = parseInt(resellerData.userLimit);
                      if (isNaN(limit) || limit < 1) {
                        errors.push(`${t('userUserLimit')} must be a positive number`);
                      }
                    }

                    // If there are errors, show them and stop
                    if (errors.length > 0) {
                      setResellerErrors(errors);
                      return;
                    }

                    // Clear any previous errors
                    setResellerErrors([]);

                    // Create JSON object with all reseller fields
                    const resellerJson = {
                      currentDomain: resellerData.currentDomain,
                      parentUserId: resellerData.parentUserId,
                      parentUser: resellerData.parentUser,
                      parentEmail: resellerData.parentEmail,
                      resellerId: resellerData.resellerId.trim(),
                      resellerUser: resellerData.resellerUser.trim(),
                      resellerEmail: resellerData.resellerEmail.trim(),
                      companyName: resellerData.companyName.trim(),
                      logotype: resellerData.logo.trim(),
                      appUrl: resellerData.url.trim(),
                      whatsapp: resellerData.whatsapp.trim(),
                      billingEmail: resellerData.billingEmail.trim(),
                      supportEmail: resellerData.supportEmail.trim(),
                      resellerLimit: parseInt(resellerData.resellerLimit) || 0,
                      deviceLimit: parseInt(resellerData.deviceLimit) || 0,
                      userLimit: parseInt(resellerData.userLimit) || 0,
                      timestamp: new Date().toISOString(),
                      createdBy: user?.name || 'Unknown',
                      createdById: user?.id || null
                    };
                    
                    // Console log the JSON object
                    
                    // Upload file to server
                    await handleResellerFileUpload(resellerJson);
                  }}
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.text,
                  }}
                >
                  {t('sharedSave')}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preferences Drawer */}
      <AnimatePresence>
        {showPreferencesDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreferencesDrawer(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
              }}
            />
            
            {/* Preferences Drawer */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: desktop ? '400px' : '100vw',
                height: '100vh',
                backgroundColor: colors.surface,
                borderLeft: desktop ? `1px solid ${colors.border}` : 'none',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconButton
                    onClick={() => setShowPreferencesDrawer(false)}
                    size="small"
                    style={{ color: colors.textSecondary }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                    {activePreferencesTab === 0 && t('mapTitle')}
                    {activePreferencesTab === 1 && t('deviceTitle')}
                    {activePreferencesTab === 2 && t('sharedSound')}
                    {activePreferencesTab === 3 && t('userToken')}
                    {activePreferencesTab === 4 && t('sharedInfoTitle')}
                  </Typography>
                </div>
              </div>

              {/* Content */}
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                paddingBottom: '200px'
              }}>
                {/* Preferences Tabs */}
                <Tabs
                  value={activePreferencesTab}
                  onChange={(e, newValue) => setActivePreferencesTab(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    marginBottom: '16px',
                  }}
                  sx={{
                    '& .MuiTab-root': {
                      color: '#666666',
                      fontSize: '12px',
                      fontWeight: '500',
                      textTransform: 'none',
                      minHeight: '40px',
                      padding: '8px 16px',
                      '&.Mui-selected': {
                        color: '#1976d2',
                        fontWeight: '600',
                        backgroundColor: 'transparent',
                      },
                      '&:hover': {
                        color: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      },
                      '&.Mui-selected:hover': {
                        color: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.15)',
                      },
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#1976d2',
                      height: '2px',
                    },
                  }}
                >
                  <Tab label={t('mapTitle')} />
                  <Tab label={t('deviceTitle')} />
                  <Tab label={t('sharedSound')} />
                  <Tab label={t('userToken')} />
                  <Tab label={t('sharedInfoTitle')} />
                </Tabs>

                {/* Map Tab */}
                {activePreferencesTab === 0 && (
                  <Box sx={{ paddingTop: '16px' }}>
                    {!readonly && (
                      <>
                        {/* Map Settings */}
                        <div style={{ marginBottom: '24px' }}>
                          <Typography variant="subtitle1" style={{ color: colors.text, marginBottom: '16px', fontWeight: '500' }}>
                            {t('mapTitle')}
                          </Typography>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>{t('mapActive')}</InputLabel>
                    <Select
                      label={t('mapActive')}
                      value={preferencesAttributes.activeMapStyles?.split(',') || ['locationIqStreets', 'locationIqDark', 'openFreeMap']}
                      onChange={(e) => {
                        setPreferencesAttributes({ ...preferencesAttributes, activeMapStyles: e.target.value.join(',') });
                      }}
                      multiple
                      MenuProps={{
                        disablePortal: false,
                        style: { zIndex: 10010 },
                        PaperProps: {
                          style: {
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            zIndex: 10010,
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: colors.secondary,
                          '& fieldset': { borderColor: colors.border },
                          '&:hover fieldset': { borderColor: colors.primary },
                          '&.Mui-focused fieldset': { borderColor: colors.primary },
                        },
                        '& .MuiInputLabel-root': {
                          color: colors.textSecondary,
                          '&.Mui-focused': { color: colors.primary }
                        },
                      }}
                    >
                      {mapStyles.map((style) => (
                        <MenuItem key={style.id} value={style.id}>
                          <Typography component="span" color={style.available ? 'textPrimary' : 'error'}>{style.title}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>{t('mapOverlay')}</InputLabel>
                    <Select
                      label={t('mapOverlay')}
                      value={preferencesAttributes.selectedMapOverlay || ''}
                      onChange={(e) => {
                        setPreferencesAttributes({ ...preferencesAttributes, selectedMapOverlay: e.target.value });
                      }}
                      MenuProps={{
                        disablePortal: false,
                        style: { zIndex: 10010 },
                        PaperProps: {
                          style: {
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            zIndex: 10010,
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: colors.secondary,
                          '& fieldset': { borderColor: colors.border },
                          '&:hover fieldset': { borderColor: colors.primary },
                          '&.Mui-focused fieldset': { borderColor: colors.primary },
                        },
                        '& .MuiInputLabel-root': {
                          color: colors.textSecondary,
                          '&.Mui-focused': { color: colors.primary }
                        },
                      }}
                    >
                      <MenuItem value="">{'\u00a0'}</MenuItem>
                      {mapOverlays.map((overlay) => (
                        <MenuItem key={overlay.id} value={overlay.id}>
                          <Typography component="span" color={overlay.available ? 'textPrimary' : 'error'}>{overlay.title}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <Autocomplete
                    multiple
                    freeSolo
                    openOnFocus
                    blurOnSelect={false}
                    open={popupInfoOpen}
                    onOpen={() => setPopupInfoOpen(true)}
                    onClose={() => setPopupInfoOpen(false)}
                    options={Object.keys(positionAttributes)}
                    getOptionLabel={(option) => {
                      if (typeof option === 'object' && option.inputValue) {
                        return option.inputValue;
                      }
                      return positionAttributes[option]?.name || option;
                    }}
                    value={preferencesAttributes.positionItems?.split(',') || ['fixTime', 'address', 'speed', 'totalDistance']}
                    onChange={(_, newValue) => {
                      setPreferencesAttributes({ ...preferencesAttributes, positionItems: newValue.map((x) => (typeof x === 'string' ? x : x.inputValue)).join(','), });
                    }}
                    filterOptions={(options, params) => {
                      const filtered = createFilter(options, params);
                      if (params.inputValue && !options.includes(params.inputValue)) {
                        filtered.push({ inputValue: params.inputValue, name: `${t('sharedAdd')} "${params.inputValue}"` });
                      }
                      return filtered;
                    }}
                    renderOption={(props, option) => (
                      <li {...props}>{option.name ? option.name : (positionAttributes[option]?.name || option)}</li>
                    )}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label={t('attributePopupInfo')} 
                        margin="normal"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: colors.secondary,
                            '& fieldset': { borderColor: colors.border },
                            '&:hover fieldset': { borderColor: colors.primary },
                            '&.Mui-focused fieldset': { borderColor: colors.primary },
                          },
                          '& .MuiInputLabel-root': {
                            color: colors.textSecondary,
                            '&.Mui-focused': { color: colors.primary }
                          },
                        }}
                      />
                    )}
                    ListboxProps={{
                      disablePortal: false,
                      style: {
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        zIndex: 99999,
                      }
                    }}
                    PopperComponent={(props) => (
                      <div {...props} style={{ ...props.style, zIndex: 99999 }} />
                    )}
                  />
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>{t('mapLiveRoutes')}</InputLabel>
                    <Select
                      label={t('mapLiveRoutes')}
                      value={preferencesAttributes.mapLiveRoutes || 'none'}
                      onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, mapLiveRoutes: e.target.value })}
                      MenuProps={{
                        disablePortal: false,
                        style: { zIndex: 10010 },
                        PaperProps: {
                          style: {
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            zIndex: 10010,
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: colors.secondary,
                          '& fieldset': { borderColor: colors.border },
                          '&:hover fieldset': { borderColor: colors.primary },
                          '&.Mui-focused fieldset': { borderColor: colors.primary },
                        },
                        '& .MuiInputLabel-root': {
                          color: colors.textSecondary,
                          '&.Mui-focused': { color: colors.primary }
                        },
                      }}
                    >
                      <MenuItem value="none">{t('sharedDisabled')}</MenuItem>
                      <MenuItem value="selected">{t('deviceSelected')}</MenuItem>
                      <MenuItem value="all">{t('notificationAlways')}</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>{t('mapDirection')}</InputLabel>
                    <Select
                      label={t('mapDirection')}
                      value={preferencesAttributes.mapDirection || 'selected'}
                      onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, mapDirection: e.target.value })}
                      MenuProps={{
                        disablePortal: false,
                        style: { zIndex: 10010 },
                        PaperProps: {
                          style: {
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            zIndex: 10010,
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: colors.secondary,
                          '& fieldset': { borderColor: colors.border },
                          '&:hover fieldset': { borderColor: colors.primary },
                          '&.Mui-focused fieldset': { borderColor: colors.primary },
                        },
                        '& .MuiInputLabel-root': {
                          color: colors.textSecondary,
                          '&.Mui-focused': { color: colors.primary }
                        },
                      }}
                    >
                      <MenuItem value="none">{t('sharedDisabled')}</MenuItem>
                      <MenuItem value="selected">{t('deviceSelected')}</MenuItem>
                      <MenuItem value="all">{t('notificationAlways')}</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormGroup style={{ marginTop: '16px' }}>
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={preferencesAttributes.hasOwnProperty('mapGeofences') ? preferencesAttributes.mapGeofences : true}
                          onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, mapGeofences: e.target.checked })}
                          sx={{
                            color: colors.textSecondary,
                            '&:hover': {
                              backgroundColor: `${colors.primary}20`,
                            },
                            '&.Mui-checked': {
                              color: colors.primary,
                              '&:hover': {
                                backgroundColor: `${colors.primary}30`,
                              },
                            },
                            '&.MuiCheckbox-root': {
                              color: colors.textSecondary,
                            },
                          }}
                        />
                      )}
                      label={t('attributeShowGeofences')}
                      style={{ color: colors.text }}
                    />
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={preferencesAttributes.hasOwnProperty('mapFollow') ? preferencesAttributes.mapFollow : false}
                          onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, mapFollow: e.target.checked })}
                          sx={{
                            color: colors.textSecondary,
                            '&:hover': {
                              backgroundColor: `${colors.primary}20`,
                            },
                            '&.Mui-checked': {
                              color: colors.primary,
                              '&:hover': {
                                backgroundColor: `${colors.primary}30`,
                              },
                            },
                            '&.MuiCheckbox-root': {
                              color: colors.textSecondary,
                            },
                          }}
                        />
                      )}
                      label={t('deviceFollow')}
                      style={{ color: colors.text }}
                    />
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={preferencesAttributes.hasOwnProperty('mapCluster') ? preferencesAttributes.mapCluster : true}
                          onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, mapCluster: e.target.checked })}
                          sx={{
                            color: colors.textSecondary,
                            '&:hover': {
                              backgroundColor: `${colors.primary}20`,
                            },
                            '&.Mui-checked': {
                              color: colors.primary,
                              '&:hover': {
                                backgroundColor: `${colors.primary}30`,
                              },
                            },
                            '&.MuiCheckbox-root': {
                              color: colors.textSecondary,
                            },
                          }}
                        />
                      )}
                      label={t('mapClustering')}
                      style={{ color: colors.text }}
                    />
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={preferencesAttributes.hasOwnProperty('mapOnSelect') ? preferencesAttributes.mapOnSelect : true}
                          onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, mapOnSelect: e.target.checked })}
                          sx={{
                            color: colors.textSecondary,
                            '&:hover': {
                              backgroundColor: `${colors.primary}20`,
                            },
                            '&.Mui-checked': {
                              color: colors.primary,
                              '&:hover': {
                                backgroundColor: `${colors.primary}30`,
                              },
                            },
                            '&.MuiCheckbox-root': {
                              color: colors.textSecondary,
                            },
                          }}
                        />
                      )}
                      label={t('mapOnSelect')}
                      style={{ color: colors.text }}
                    />
                  </FormGroup>
                        </div>
                      </>
                    )}
                  </Box>
                )}

                {/* Device Tab */}
                {activePreferencesTab === 1 && (
                  <Box sx={{ paddingTop: '16px' }}>
                    {!readonly && (
                      <>
                        {/* Device Settings */}
                        <div style={{ marginBottom: '24px' }}>
                          <Typography variant="subtitle1" style={{ color: colors.text, marginBottom: '16px', fontWeight: '500' }}>
                            {t('deviceTitle')}
                          </Typography>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>{t('devicePrimaryInfo')}</InputLabel>
                    <Select
                      label={t('devicePrimaryInfo')}
                      value={preferencesAttributes.devicePrimary || 'name'}
                      onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, devicePrimary: e.target.value })}
                      MenuProps={{
                        disablePortal: false,
                        style: { zIndex: 10010 },
                        PaperProps: {
                          style: {
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            zIndex: 10010,
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: colors.secondary,
                          '& fieldset': { borderColor: colors.border },
                          '&:hover fieldset': { borderColor: colors.primary },
                          '&.Mui-focused fieldset': { borderColor: colors.primary },
                        },
                        '& .MuiInputLabel-root': {
                          color: colors.textSecondary,
                          '&.Mui-focused': { color: colors.primary }
                        },
                      }}
                    >
                      {deviceFields.map((field) => (
                        <MenuItem key={field.id} value={field.id}>
                          {t(field.name)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>{t('deviceSecondaryInfo')}</InputLabel>
                    <Select
                      label={t('deviceSecondaryInfo')}
                      value={preferencesAttributes.deviceSecondary || ''}
                      onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, deviceSecondary: e.target.value })}
                      MenuProps={{
                        disablePortal: false,
                        style: { zIndex: 10010 },
                        PaperProps: {
                          style: {
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            zIndex: 10010,
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: colors.secondary,
                          '& fieldset': { borderColor: colors.border },
                          '&:hover fieldset': { borderColor: colors.primary },
                          '&.Mui-focused fieldset': { borderColor: colors.primary },
                        },
                        '& .MuiInputLabel-root': {
                          color: colors.textSecondary,
                          '&.Mui-focused': { color: colors.primary }
                        },
                      }}
                    >
                      <MenuItem value="">{'\u00a0'}</MenuItem>
                      {deviceFields.map((field) => (
                        <MenuItem key={field.id} value={field.id}>
                          {t(field.name)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                        </div>
                      </>
                    )}
                  </Box>
                )}

                {/* Sound Tab */}
                {activePreferencesTab === 2 && (
                  <Box sx={{ paddingTop: '16px' }}>
                    {!readonly && (
                      <>
                        {/* Sound Settings */}
                        <div style={{ marginBottom: '24px' }}>
                          <Typography variant="subtitle1" style={{ color: colors.text, marginBottom: '16px', fontWeight: '500' }}>
                            {t('sharedSound')}
                          </Typography>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>{t('eventsSoundEvents')}</InputLabel>
                    <Select
                      label={t('eventsSoundEvents')}
                      value={preferencesAttributes.soundEvents?.split(',') || []}
                      onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, soundEvents: e.target.value.join(',') })}
                      multiple
                      MenuProps={{
                        disablePortal: false,
                        style: { zIndex: 10010 },
                        PaperProps: {
                          style: {
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            zIndex: 10010,
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: colors.secondary,
                          '& fieldset': { borderColor: colors.border },
                          '&:hover fieldset': { borderColor: colors.primary },
                          '&.Mui-focused fieldset': { borderColor: colors.primary },
                        },
                        '& .MuiInputLabel-root': {
                          color: colors.textSecondary,
                          '&.Mui-focused': { color: colors.primary }
                        },
                      }}
                    >
                      {/* Event types would be loaded from API */}
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>{t('eventsSoundAlarms')}</InputLabel>
                    <Select
                      label={t('eventsSoundAlarms')}
                      value={preferencesAttributes.soundAlarms?.split(',') || ['sos']}
                      onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, soundAlarms: e.target.value.join(',') })}
                      multiple
                      MenuProps={{
                        disablePortal: false,
                        style: { zIndex: 10010 },
                        PaperProps: {
                          style: {
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            zIndex: 10010,
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: colors.secondary,
                          '& fieldset': { borderColor: colors.border },
                          '&:hover fieldset': { borderColor: colors.primary },
                          '&.Mui-focused fieldset': { borderColor: colors.primary },
                        },
                        '& .MuiInputLabel-root': {
                          color: colors.textSecondary,
                          '&.Mui-focused': { color: colors.primary }
                        },
                      }}
                    >
                      {alarms.map((alarm) => (
                        <MenuItem key={alarm.key} value={alarm.key}>
                          {alarm.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                        </div>
                      </>
                    )}
                  </Box>
                )}

                {/* User Token Tab */}
                {activePreferencesTab === 3 && (
                  <Box sx={{ paddingTop: '16px' }}>
                    {/* User Token */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography variant="subtitle1" style={{ color: colors.text, marginBottom: '16px', fontWeight: '500' }}>
                        {t('userToken')}
                      </Typography>
                  
                  <TextField
                    fullWidth
                    label={t('userExpirationTime')}
                    type="date"
                    value={tokenExpiration}
                    onChange={(e) => {
                      setTokenExpiration(e.target.value);
                      setToken(null);
                    }}
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: colors.secondary,
                        '& fieldset': { borderColor: colors.border },
                        '&:hover fieldset': { borderColor: colors.primary },
                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                      },
                      '& .MuiInputLabel-root': {
                        color: colors.textSecondary,
                        '&.Mui-focused': { color: colors.primary }
                      },
                    }}
                  />
                  
                  <FormControl fullWidth margin="normal">
                    <OutlinedInput
                      multiline
                      rows={6}
                      readOnly
                      type="text"
                      value={token || ''}
                      endAdornment={(
                        <InputAdornment position="end">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <IconButton size="small" edge="end" onClick={generateToken} disabled={!!token}>
                              <CachedIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" edge="end" onClick={() => navigator.clipboard.writeText(token)} disabled={!token}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </div>
                        </InputAdornment>
                      )}
                      sx={{
                        backgroundColor: colors.secondary,
                        '& fieldset': { borderColor: colors.border },
                        '&:hover fieldset': { borderColor: colors.primary },
                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                      }}
                    />
                  </FormControl>
                    </div>
                  </Box>
                )}

                {/* System Info Tab */}
                {activePreferencesTab === 4 && (
                  <Box sx={{ paddingTop: '16px' }}>
                    {!readonly && (
                      <>
                        {/* System Info */}
                        <div style={{ marginBottom: '24px' }}>
                          <Typography variant="subtitle1" style={{ color: colors.text, marginBottom: '16px', fontWeight: '500' }}>
                            {t('sharedInfoTitle')}
                          </Typography>
                  
                  <TextField
                    fullWidth
                    value={versionApp}
                    label={t('settingsAppVersion')}
                    disabled
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: colors.secondary,
                        '& fieldset': { borderColor: colors.border },
                      },
                      '& .MuiInputLabel-root': {
                        color: colors.textSecondary,
                      },
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    value={versionServer || '-'}
                    label={t('settingsServerVersion')}
                    disabled
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: colors.secondary,
                        '& fieldset': { borderColor: colors.border },
                      },
                      '& .MuiInputLabel-root': {
                        color: colors.textSecondary,
                      },
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    value={socket ? t('deviceStatusOnline') : t('deviceStatusOffline')}
                    label={t('settingsConnection')}
                    disabled
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: colors.secondary,
                        '& fieldset': { borderColor: colors.border },
                      },
                      '& .MuiInputLabel-root': {
                        color: colors.textSecondary,
                      },
                    }}
                  />
                  
                  <Button
                    variant="outlined"
                    onClick={() => window.location.href = '/emulator'}
                    style={{
                      borderColor: colors.border,
                      color: colors.text,
                      marginTop: '16px',
                    }}
                  >
                    {t('sharedEmulator')}
                  </Button>
                  
                  {admin && (
                    <Button
                      variant="outlined"
                      onClick={handleReboot}
                      style={{
                        borderColor: '#f44336',
                        color: '#f44336',
                        marginTop: '16px',
                        marginLeft: '12px',
                      }}
                    >
                      {t('serverReboot')}
                    </Button>
                  )}
                        </div>
                      </>
                    )}
                  </Box>
                )}

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  marginTop: '32px',
                  paddingTop: '20px',
                  borderTop: `1px solid ${colors.border}`,
                }}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowPreferencesDrawer(false)}
                    style={{
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  >
                    {t('sharedCancel')}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePreferencesSave}
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.text,
                    }}
                  >
                    {t('sharedSave')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Announcement Drawer - Slides in from right */}
      <AnimatePresence>
        {showAnnouncementDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 10000,
              }}
              onClick={() => setShowAnnouncementDrawer(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: desktop ? '400px' : '100vw',
                height: '100vh',
                backgroundColor: colors.surface,
                borderLeft: desktop ? `1px solid ${colors.border}` : 'none',
                zIndex: 10001,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <ChevronLeftIcon 
                  style={{ 
                    cursor: 'pointer', 
                    color: colors.textSecondary,
                    fontSize: '24px'
                  }}
                  onClick={() => setShowAnnouncementDrawer(false)}
                />
                <Typography variant="h6" style={{ color: colors.text, fontWeight: '600' }}>
                  {t('serverAnnouncement')}
                </Typography>
              </div>

              {/* Content */}
              <div style={{
                flex: 1,
                padding: '20px',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                {/* Form Fields */}
                    {/* Users Multi-Select */}
                    <Box sx={{ position: 'relative', width: '100%' }}>
                      <TextField
                        ref={usersInputRef}
                        label={t('settingsUsers')}
                        value={usersInputValue}
                        onChange={handleUsersInputChange}
                        onFocus={handleUsersFocus}
                        onBlur={handleUsersBlur}
                        fullWidth
                        autoComplete="off"
                        placeholder={t('reportShow')}
                      />
                      {usersAutocompleteOpen && filteredUsersOptions.length > 0 && (
                        <Paper
                          sx={(theme) => ({
                            position: 'fixed',
                            zIndex: 10002,
                            maxHeight: '200px',
                            minWidth: '200px',
                            overflow: 'auto',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: theme.shape.borderRadius,
                            boxShadow: theme.shadows[8],
                            backgroundColor: theme.palette.background.paper,
                            mt: 0.5,
                            '&::-webkit-scrollbar': {
                              display: 'none',
                            },
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                          })}
                          style={{
                            left: usersInputRef.current?.getBoundingClientRect().left || 0,
                            top: (usersInputRef.current?.getBoundingClientRect().bottom || 0) + 4,
                            width: usersInputRef.current?.getBoundingClientRect().width || 200,
                          }}
                        >
                          <List dense>
                            {filteredUsersOptions.map((option, index) => (
                              <ListItem
                                key={option.id}
                                onClick={() => handleUsersOptionSelect(option)}
                                style={{
                                  backgroundColor: index === usersHighlightedIndex ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                                  cursor: 'pointer',
                                }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                  }
                                }}
                              >
                                <ListItemText primary={option.name} />
                              </ListItem>
                            ))}
                          </List>
                        </Paper>
                      )}
                      {/* Selected Users Chips */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {announcementData.users?.map((user) => (
                          <Chip
                            key={user.id}
                            label={user.name}
                            onDelete={() => handleUsersRemove(user)}
                            deleteIcon={<CloseIcon />}
                            size="small"
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Notificators Single-Select */}
                    <Box sx={{ position: 'relative', width: '100%' }}>
                      <TextField
                        ref={notificatorsInputRef}
                        label={t('notificationNotificators')}
                        value={notificatorsInputValue}
                        onChange={handleNotificatorsInputChange}
                        onFocus={handleNotificatorsFocus}
                        onBlur={handleNotificatorsBlur}
                        fullWidth
                        autoComplete="off"
                        placeholder={t('reportShow')}
                      />
                      {notificatorsAutocompleteOpen && filteredNotificatorsOptions.length > 0 && (
                        <Paper
                          sx={(theme) => ({
                            position: 'fixed',
                            zIndex: 10002,
                            maxHeight: '200px',
                            minWidth: '200px',
                            overflow: 'auto',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: theme.shape.borderRadius,
                            boxShadow: theme.shadows[8],
                            backgroundColor: theme.palette.background.paper,
                            mt: 0.5,
                            '&::-webkit-scrollbar': {
                              display: 'none',
                            },
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                          })}
                          style={{
                            left: notificatorsInputRef.current?.getBoundingClientRect().left || 0,
                            top: (notificatorsInputRef.current?.getBoundingClientRect().bottom || 0) + 4,
                            width: notificatorsInputRef.current?.getBoundingClientRect().width || 200,
                          }}
                        >
                          <List dense>
                            {filteredNotificatorsOptions.map((option, index) => (
                              <ListItem
                                key={option.type}
                                onClick={() => handleNotificatorsOptionSelect(option)}
                                style={{
                                  backgroundColor: index === notificatorsHighlightedIndex ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                  }
                                }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                  }
                                }}
                              >
                                <ListItemText primary={t(prefixString('notificator', option.type))} />
                              </ListItem>
                            ))}
                          </List>
                        </Paper>
                      )}
                      {/* Selected Notificator Chip */}
                      {announcementData.notificator && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          <Chip
                            label={t(prefixString('notificator', announcementData.notificator))}
                            onDelete={() => setAnnouncementData({
                              ...announcementData,
                              notificator: ''
                            })}
                            deleteIcon={<CloseIcon />}
                            size="small"
                          />
                        </Box>
                      )}
                    </Box>

                {/* Message Fields */}
                <TextField
                      fullWidth
                      value={announcementData.message.subject || ''}
                      onChange={(e) => setAnnouncementData({ 
                        ...announcementData, 
                        message: { ...announcementData.message, subject: e.target.value }
                      })}
                      label={t('sharedSubject')}
                      variant="outlined"
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={announcementData.message.body || ''}
                      onChange={(e) => setAnnouncementData({ 
                        ...announcementData, 
                        message: { ...announcementData.message, body: e.target.value }
                      })}
                      label={t('commandMessage')}
                      variant="outlined"
                    />
              </div>

              {/* Footer */}
              <div style={{
                padding: '20px',
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowAnnouncementDrawer(false)}
                  style={{
                    borderColor: colors.border,
                    color: colors.textSecondary,
                  }}
                >
                  {t('sharedCancel')}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => sendAnnouncementMutation.mutate(announcementData)}
                  disabled={sendAnnouncementMutation.isPending || !announcementData.users?.length || !announcementData.notificator || !announcementData.message.subject || !announcementData.message.body}
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.text,
                  }}
                >
                  {sendAnnouncementMutation.isPending ? t('sharedSending') : t('commandSend')}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      

      {/* Mobile Drawer Menu */}
      {!desktop && (
        <AnimatePresence>
          {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
              }}
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: desktop ? '320px' : '280px',
                height: '100vh',
                backgroundColor: colors.surface,
                borderRight: `1px solid ${colors.border}`,
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
              }}
            >
              {/* Drawer Header */}
              <div style={{
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}>
                {(() => {
                  // Priority: Reseller logo > Server logo > Server inverted logo > Fallback
                  const logoUrl = getLogoUrl() || logo || logoInverted;
                  
                  return (
                    <img 
                      src={logoUrl || fallbackLogo} 
                      alt="Server Logo" 
                      style={{ 
                        maxWidth: '100%',
                        maxHeight: '36px',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        // Fallback to server logo or default
                        const fallbackUrl = logo || logoInverted || fallbackLogo;
                        e.target.src = fallbackUrl;
                      }}
                    />
                  );
                })()}
              </div>

              {/* Drawer Content */}
              <div style={{ 
                flex: 1, 
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {/* Menu Items */}
                <div style={{ 
                  flex: 1,
                  overflow: 'auto',
                  padding: '0'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0'
                  }}>
                  {/* Reports */}
                  {!disableReports && (
                    <button
                      onClick={() => {
                        setReportsPopoverVisible(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <PieChart size={18} color={colors.textSecondary} style={{ marginRight: '12px' }} />
                      {t('reportTitle')}
                    </button>
                  )}

                  {/* Settings */}
                  <button
                    onClick={() => {
                      setShowPreferencesDrawer(true);
                      setDrawerOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 20px',
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                      margin: '0',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: colors.text,
                      fontSize: '14px',
                      fontWeight: '400',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.menuHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <SettingsIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                    {t('settingsTitle')}
                  </button>

                  {/* Notifications */}
                  {!readonly && (
                    <button
                      onClick={() => {
                        setShowNotificationsPopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <NotificationsOutlinedIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('sharedNotifications')}
                    </button>
                  )}

                  {/* User Profile */}
                  {!readonly && (
                    <button
                      onClick={() => {
                        setShowUserPopover(false);
                        setEditingUserId(user.id);
                        setShowUsersPopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <PersonIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('settingsUser')}
                    </button>
                  )}

                  {/* Devices Management */}
                  {!readonly && (
                    <button
                      onClick={() => {
                        setShowDevicesPopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <SmartphoneIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('deviceTitle')}
                    </button>
                  )}

                  {/* Groups */}
                  {!readonly && !features.disableGroups && (
                    <button
                      onClick={() => {
                        setShowGroupsPopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <FolderIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('settingsGroups')}
                    </button>
                  )}

                  {/* Drivers */}
                  {!readonly && !features.disableDrivers && (
                    <button
                      onClick={() => {
                        setShowDriversPopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <PersonIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('sharedDrivers')}
                    </button>
                  )}

                  {/* Calendars */}
                  {!readonly && !features.disableCalendars && (
                    <button
                      onClick={() => {
                        setShowCalendarsPopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <TodayIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('sharedCalendars')}
                    </button>
                  )}

                  {/* Computed Attributes */}
                  {!readonly && !features.disableComputedAttributes && (
                    <button
                      onClick={() => {
                        setShowComputedAttributesPopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <StorageIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('sharedComputedAttributes')}
                    </button>
                  )}

                  {/* Maintenance */}
                  {!readonly && !features.disableMaintenance && (
                    <button
                      onClick={() => {
                        setShowMaintenancePopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <BuildIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('sharedMaintenance')}
                    </button>
                  )}

                  {/* Saved Commands */}
                  {!readonly && !features.disableSavedCommands && (
                    <button
                      onClick={() => {
                        setShowCommandsPopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <PublishIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('sharedSavedCommands')}
                    </button>
                  )}

                  {/* Billing Link */}
                  {billingLink && (
                    <button
                      onClick={() => {
                        window.open(billingLink, '_blank');
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <PaymentIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('userBilling')}
                    </button>
                  )}

                  {/* Support Link */}
                  {supportLink && (
                    <button
                      onClick={() => {
                        window.open(supportLink, '_blank');
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <HelpIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('settingsSupport')}
                    </button>
                  )}

                  {/* Manager Section - Server Announcement */}
                  {manager && (
                    <button
                      onClick={() => {
                        setShowAnnouncementDrawer(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <CampaignIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('serverAnnouncement')}
                    </button>
                  )}

                  {/* Manager Section - Server Settings */}
                  {manager && admin && (
                    <button
                      onClick={() => {
                        setShowServerDrawer(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <StorageIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('settingsServer')}
                    </button>
                  )}
                  
                  {/* Users Management */}
                  {manager && (
                    <button
                      onClick={() => {
                        setShowUsersPopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        boxShadow: 'none',
                        borderRadius: '0',
                        margin: '0',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <PeopleIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('settingsUsers')}
                    </button>
                  )}

                  {/* Reseller Management */}
                  {(admin || isReseller) && (
                    <button
                      onClick={() => {
                        setShowResellersPopover(true);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        boxShadow: 'none',
                        borderRadius: '0',
                        margin: '0',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '400',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.menuHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <FolderIcon style={{ fontSize: 18, color: colors.textSecondary, marginRight: '12px' }} />
                      {t('resellerPanel')}
                    </button>
                  )}

                  </div>
                </div>

                {/* Logout Button - Fixed at Bottom */}
                <div style={{
                  padding: '0',
                  borderTop: `1px solid ${colors.border}`
                }}>
                  <button
                    onClick={() => {
                      setShowLogoutModal(true);
                      setDrawerOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 20px',
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                      margin: '0',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: '#EF4444',
                      fontSize: '14px',
                      fontWeight: '400',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.menuHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <ExitToAppIcon style={{ fontSize: 18, color: '#EF4444', marginRight: '12px' }} />
                    {t('loginLogout')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
          )}
        </AnimatePresence>
      )}

      
    </div>
  );
};

export default MainPage;
