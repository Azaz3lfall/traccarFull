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
import {
  DEFAULT_ACTIVE_MAP_STYLES,
  DEFAULT_MAP_ID,
  activeMapStylesContains,
  resolveAppliedMapStyle,
} from '../map/core/mapStyleDefaults';
import useMapOverlays from '../map/overlay/useMapOverlays';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import { useTranslationKeys } from '../common/components/LocalizationProvider';
import { prefixString, unprefixString } from '../common/util/stringUtils';
import { sessionActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';
import resellersConfig from '../config/resellersConfig';
import { resellersActions } from '../store';
import { fetchFleetMap } from '../store';
import { FleetVehicleCard, FloatingFleetList } from '../components/fleet';
import { useCatch } from '../reactHelper';
import { nativePostMessage } from '../common/components/NativeInterface';
import fallbackLogo from '../resources/images/image170.png?inline';
import dayjs from 'dayjs';
import { map } from '../map/core/MapView';
import EventsDrawer from './EventsDrawer';
import LogoutModal from './components/LogoutModal';
import OcorrenciasModal from './components/OcorrenciasModal';
import AnnouncementDrawer from './drawers/AnnouncementDrawer';
import ServerDrawer from './drawers/ServerDrawer';
import ResellerDrawer from './drawers/ResellerDrawer';
import PreferencesDrawer from './drawers/PreferencesDrawer';
import MobileDrawer from './drawers/MobileDrawer';
import FloatingGeofencesPopover from '../components/FloatingGeofencesPopover';
import FloatingReportsPopover from '../components/FloatingReportsPopover';
import FloatingGestaoPopover from '../components/FloatingGestaoPopover';
import FloatingOSPopover from '../components/FloatingOSPopover';
import FloatingClientsPopover from '../components/FloatingClientsPopover';
import FloatingVehiclesPopover from '../components/FloatingVehiclesPopover';
import FloatingChipsPopover from '../components/FloatingChipsPopover';
import FloatingSmsTemplatesPopover from '../components/FloatingSmsTemplatesPopover';
import FloatingFinancialPopover from '../components/FloatingFinancialPopover';
import useFilter from './useFilter';
import MainMap from './MainMap';
import { HEATMAP_FEATURE_ENABLED } from '../map/MapHeatmap';
import FloatingDeviceList from '../components/FloatingDeviceList';
import FloatingStatusCard from '../components/FloatingStatusCard';
import HistoryPanel from '../other/HistoryPanel';
import FloatingUsersPopover from '../components/FloatingUsersPopover';
import FloatingCommandsPopover from '../components/FloatingCommandsPopover';
import FloatingMaintenancePopover from '../components/FloatingMaintenancePopover';
import FloatingComputedAttributesPopover from '../components/FloatingComputedAttributesPopover';
import FloatingCalendarsPopover from '../components/FloatingCalendarsPopover';
import FloatingResellersPopover from '../components/FloatingResellersPopover';
import FloatingDataAnalyticsPopover from '../components/FloatingDataAnalyticsPopover';
import FloatingRolesPopover from '../components/FloatingRolesPopover';
import FloatingDriversPopover from '../components/FloatingDriversPopover';
import FloatingGroupsPopover from '../components/FloatingGroupsPopover';
import FloatingDevicesPopover from '../components/FloatingDevicesPopover';
import FloatingNotificationsPopover from '../components/FloatingNotificationsPopover';
import UsersModal from './UsersModal';
import { 
  Truck, 
  Cpu,
  PieChart, 
  FileText,
  ChevronLeft,
  Map,
  Check,
  Plus,
  Minus,
  Search,
  Sun,
  Moon,
  Activity,
  Users
} from 'lucide-react';
import CropIcon from '@mui/icons-material/Crop';
import { AiOutlineCloudServer } from "react-icons/ai";
import { HiMiniCubeTransparent } from "react-icons/hi2";
import { PiMapPinAreaLight, PiSteeringWheelLight } from "react-icons/pi";
import { 
  AiOutlineSetting, 
  AiOutlineTeam, 
  AiOutlineUser, 
  AiOutlineDatabase, 
  AiOutlineSend, 
  AiOutlineSound, 
  AiOutlineUsergroupAdd,
  AiOutlineCalendar
} from "react-icons/ai";
import { 
  HiOutlineWrenchScrewdriver,
} from "react-icons/hi2";
import { LuShieldAlert } from "react-icons/lu";
import { MdDataObject } from "react-icons/md";
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SimCardIcon from '@mui/icons-material/SimCard';
import MessageIcon from '@mui/icons-material/Message';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HelpIcon from '@mui/icons-material/Help';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import SaveIcon from '@mui/icons-material/Save';
import CachedIcon from '@mui/icons-material/Cached';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation, useLocalization } from '../common/components/LocalizationProvider';
import { useTheme as useCustomTheme, useThemeColors } from '../common/components/ThemeProvider';
import ReactCountryFlag from 'react-country-flag';
import { useResellerBranding } from '../common/hooks/useResellerBranding';
import { uploadToCloudinary, validateCloudinaryConfig } from '../utils/cloudinary';
import { compressImage, validateImageFile } from '../utils/imageCompression';
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
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  useAdministrator,
  useManager,
  useRestriction
} from '../common/util/permissions';
import useFeatures from '../common/util/useFeatures';
import { usePermissions } from './hooks/usePermissions';
import { useMapSearch } from './hooks/useMapSearch';
import { useServerData } from './hooks/useServerData';
import { formatTime, formatNotificationTitle } from '../common/util/formatter';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { eventsActions } from '../store';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
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

  const {
    showSearch, setShowSearch,
    searchQuery,
    searchResults,
    isSearching,
    searchRef, setSearchRef,
    handleSearchChange,
    handleSearchResultClick,
  } = useMapSearch();

  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isDeviceListVisible, setIsDeviceListVisible] = useState(false);
  const [isFleetListVisible, setIsFleetListVisible] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEventsPopover, setShowEventsPopover] = useState(false);
  const [eventsButtonRef, setEventsButtonRef] = useState(null);
  const [showMapSwitcher, setShowMapSwitcher] = useState(false);
  const [mapSwitcherRef, setMapSwitcherRef] = useState(null);
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [userRef, setUserRef] = useState(null);
  const [userPopoverRef, setUserPopoverRef] = useState(null);
  const [showLanguagePopover, setShowLanguagePopover] = useState(false);
  const [languageRef, setLanguageRef] = useState(null);
  const [showUsersPopover, setShowUsersPopover] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error', hasRouteButton: false, deviceInfo: null });

  // Snackbar handler
  const showSnackbar = (messageOrObject, severity = 'error') => {
    if (typeof messageOrObject === 'string') {
      setSnackbar({ open: true, message: messageOrObject, severity, hasRouteButton: false, deviceInfo: null });
    } else {
      setSnackbar({ 
        open: true, 
        message: messageOrObject.message || '', 
        severity: messageOrObject.severity || severity,
        hasRouteButton: messageOrObject.hasRouteButton || false,
        deviceInfo: messageOrObject.deviceInfo || null
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  const [showCommandsPopover, setShowCommandsPopover] = useState(false);
  const [showMaintenancePopover, setShowMaintenancePopover] = useState(false);
  const [showComputedAttributesPopover, setShowComputedAttributesPopover] = useState(false);
  const [showCalendarsPopover, setShowCalendarsPopover] = useState(false);
  const [showDriversPopover, setShowDriversPopover] = useState(false);
  const [showGroupsPopover, setShowGroupsPopover] = useState(false);
  const [showDevicesPopover, setShowDevicesPopover] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [showReplayPopover, setShowReplayPopover] = useState(false);
  const [historyDeviceId, setHistoryDeviceId] = useState(null);
  const [showServerDrawer, setShowServerDrawer] = useState(false);
  const [showPreferencesDrawer, setShowPreferencesDrawer] = useState(false);
  const [showAnnouncementDrawer, setShowAnnouncementDrawer] = useState(false);
  const [showResellerDrawer, setShowResellerDrawer] = useState(false);
  const [showResellersPopover, setShowResellersPopover] = useState(false);
  const [showDataAnalyticsPopover, setShowDataAnalyticsPopover] = useState(false);
  const [showRolesPopover, setShowRolesPopover] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showOcorrenciasModal, setShowOcorrenciasModal] = useState(false);
  const [ocorrenciaNumber, setOcorrenciaNumber] = useState(null);
  const [ocorrenciaData, setOcorrenciaData] = useState({
    numeroOrigem: '',
    dataHoraChamada: '',
    nome: '',
    endereco: '',
    tipoOcorrencia: ''
  });
  const [ocorrenciaAddress, setOcorrenciaAddress] = useState(null); // { lat, lon }
  const [addressSearchResults, setAddressSearchResults] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [ocorrenciaRouteData, setOcorrenciaRouteData] = useState(null);
  const [isSavingOcorrencia, setIsSavingOcorrencia] = useState(false);
  const [addressAutocompleteOpen, setAddressAutocompleteOpen] = useState(false);
  const [deviceIdWithRoute, setDeviceIdWithRoute] = useState(null);
  const [closestDeviceInfo, setClosestDeviceInfo] = useState(null);

  // Get Mapbox access token from user session
  const mapboxToken = useSelector(state => state.session.user?.attributes?.mapboxAccessToken);

  // Handle "Enviar Rota" button click
  const handleEnviarRota = useCallback(() => {
    const deviceInfo = snackbar.deviceInfo || closestDeviceInfo;
    if (deviceInfo) {
      setDeviceIdWithRoute(deviceInfo.deviceId);
      setClosestDeviceInfo(deviceInfo); // Keep it in state too
      showSnackbar('Rota enviada para o dispositivo', 'success');
    }
  }, [snackbar.deviceInfo, closestDeviceInfo]);


  // Address search functionality using Mapbox for Ocorrências
  const searchOcorrenciaAddresses = useCallback(async (query) => {
    if (!query.trim() || query.trim().length < 5) {
      setAddressSearchResults([]);
      setIsSearchingAddress(false);
      return;
    }

    setIsSearchingAddress(true);

    try {
      if (!mapboxToken) {
        throw new Error('Mapbox access token not found');
      }

      // Use default 'pt' for language (existing language variable is declared later in component)
      const mapboxLanguage = 'pt';
      
      const request = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=15&types=address,poi&country=BR&language=${mapboxLanguage}`;
      const response = await fetch(request);
      
      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const results = data.features.map((feature) => {
        return {
          type: 'Feature',
          geometry: feature.geometry,
          place_name: feature.place_name,
          properties: {
            display_name: feature.place_name,
            ...feature.properties
          },
          text: feature.place_name,
          place_type: feature.place_type,
          center: feature.center, // [lon, lat]
        };
      });
      
      setAddressSearchResults(results);
      // Open autocomplete when results are available
      if (results.length > 0) {
        setAddressAutocompleteOpen(true);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setAddressSearchResults([]);
    } finally {
      setIsSearchingAddress(false);
    }
  }, [mapboxToken]);

  // Handle address input change with debouncing
  const addressSearchTimeoutRef = useRef(null);
  const handleAddressInputChange = useCallback((value) => {
    setOcorrenciaData(prev => ({
      ...prev,
      endereco: value
    }));
    
    // Clear address coordinates when input changes
    setOcorrenciaAddress(null);
    
    // Clear previous timeout
    if (addressSearchTimeoutRef.current) {
      clearTimeout(addressSearchTimeoutRef.current);
    }
    
    if (value.trim().length >= 5) {
      // Debounce search with 800ms delay
      addressSearchTimeoutRef.current = setTimeout(() => {
        searchOcorrenciaAddresses(value);
      }, 800);
    } else {
      // Clear results if less than 5 characters
      setAddressSearchResults([]);
      setIsSearchingAddress(false);
      setAddressAutocompleteOpen(false);
    }
  }, [searchOcorrenciaAddresses]);

  // Handle address selection
  const handleAddressSelect = useCallback((result) => {
    const address = result.properties?.display_name || result.text || result.place_name;
    const [lon, lat] = result.center;
    
    setOcorrenciaData(prev => ({
      ...prev,
      endereco: address
    }));
    
    setOcorrenciaAddress({ lat, lon });
    setAddressSearchResults([]);
    setAddressAutocompleteOpen(false);
  }, []);

  // Cleanup timeout when modal closes
  useEffect(() => {
    if (!showOcorrenciasModal) {
      if (addressSearchTimeoutRef.current) {
        clearTimeout(addressSearchTimeoutRef.current);
        addressSearchTimeoutRef.current = null;
      }
      setAddressSearchResults([]);
      setIsSearchingAddress(false);
      setOcorrenciaRouteData(null);
      setAddressAutocompleteOpen(false);
      setClosestDeviceInfo(null);
      setDeviceIdWithRoute(null);
    }
  }, [showOcorrenciasModal]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };
  
  
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
  const activeMapStyles = useAttributePreference('activeMapStyles', DEFAULT_ACTIVE_MAP_STYLES);
  
  // Preferences hooks
  // Translation and permissions - moved early to avoid hoisting issues
  const t = useTranslation();
  const admin = useAdministrator();
  const readonly = useRestriction('readonly');
  
  const mapOverlays = useMapOverlays();
  const positionAttributes = usePositionAttributes(t);
  const user = useSelector((state) => state.session.user);
  const versionApp = import.meta.env.VITE_APP_VERSION;
  
  const hasMainMenuPermission = true;

  const {
    hasReportsPermission,
    hasGeofencesPermission,
    hasSettingsPermission,
    hasNotificationsPermission,
    hasAccountPermission,
    hasDevicesPermission,
    hasGroupsPermission,
    hasDriversPermission,
    hasDeviceListPermission,
    hasOcorrenciasPermission,
    hasCalendarsPermission,
    hasComputedAttributesPermission,
    hasMaintenancePermission,
    hasSavedCommandsPermission,
    hasAnnouncementPermission,
    hasDataAnalyticsPermission,
    hasServerPermission,
    hasUsersPermission,
    hasResellerPanelPermission,
  } = usePermissions();
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
  const [selectedMapStyle, setSelectedMapStyle] = usePersistedState('selectedMapStyle', usePreference('map', DEFAULT_MAP_ID));

  const stylesForSwitcher = useMemo(() => mapStyles.filter(
    (style) => style.available && activeMapStylesContains(activeMapStyles, style.id),
  ), [mapStyles, activeMapStyles]);

  const appliedMapStyleForView = useMemo(() => {
    let filtered = mapStyles.filter((s) => s.available && activeMapStylesContains(activeMapStyles, s.id));
    if (!filtered.length) {
      filtered = mapStyles.filter((s) => s.available);
    }
    const resolved = resolveAppliedMapStyle(selectedMapStyle, filtered);
    return resolved?.id ?? selectedMapStyle;
  }, [mapStyles, activeMapStyles, selectedMapStyle]);

  useEffect(() => {
    if (appliedMapStyleForView !== selectedMapStyle) {
      setSelectedMapStyle(appliedMapStyleForView);
    }
  }, [appliedMapStyleForView, selectedMapStyle, setSelectedMapStyle]);

  const mapHeatmapEnabled = useAttributePreference('mapHeatmap', true);
  
  const handleMapStyleChange = (styleId) => {
    setSelectedMapStyle(styleId);
    setShowMapSwitcher(false);
    // The map will automatically update through the MapView component
  };

  // Toggle heatmap handler
  const handleToggleHeatmap = useCatch(async () => {
    if (!user?.id) return;
    const newValue = !mapHeatmapEnabled;
    try {
      const updatedAttributes = {
        ...user.attributes,
        mapHeatmap: newValue,
      };
      const response = await fetchOrThrow(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, attributes: updatedAttributes }),
      });
      dispatch(sessionActions.updateUser(await response.json()));
    } catch (error) {
      console.error('Error toggling heatmap:', error);
    }
  });

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


  
  // Server attributes hooks
  const commonUserAttributes = useCommonUserAttributes(t);
  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const serverAttributes = useServerAttributes(t);
  
  const {
    serverData,
    setServerData,
    timezones,
    updateServerMutation,
    sendAnnouncementMutation,
  } = useServerData({
    showServerDrawer,
    showAnnouncementDrawer,
    onServerSaved: () => setShowServerDrawer(false),
    onAnnouncementSent: () => setShowAnnouncementDrawer(false),
  });


  // User photo upload handler
  const handlePhotoUpload = useCatch(async (event) => {
    const file = event.target.files[0];
    if (!file || !user?.id) return;
    
    // Reset file input value to allow same file selection again
    event.target.value = '';

    // Validate file
    const validation = validateImageFile(file, 120); // 120KB max input
    if (!validation.success) {
      showSnackbar(validation.message, 'error');
      return;
    }

    // Check Cloudinary configuration
    if (!validateCloudinaryConfig()) {
      showSnackbar(t('userPhotoCloudinaryConfigError'), 'error');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      // Compress the image to target size (10-15KB)
      const compressedFile = await compressImage(file, {
        maxSizeKB: 15,
        minSizeKB: 10,
        maxWidth: 400,
        maxHeight: 400,
        outputFormat: 'image/jpeg',
        initialQuality: 0.8
      });

      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(compressedFile, {
        folder: 'traccar-profiles',
        publicId: `user_${user.id}_${Date.now()}`,
        transformations: {
          width: 200,
          height: 200,
          crop: 'fill',
          gravity: 'face',
          quality: 'auto'
        }
      });

      // Update user with profilePhoto attribute
      const updatedUserData = {
        ...user,
        attributes: {
          ...user.attributes,
          profilePhoto: uploadResult.url
        }
      };


      // Save updated user data
      const response = await fetchOrThrow(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUserData),
      });

      // Update Redux store with the response from server
      const updatedUserFromServer = await response.json();
      dispatch(sessionActions.updateUser(updatedUserFromServer));

      // Show success message with compression info
      const originalSizeKB = (file.size / 1024).toFixed(1);
      const compressedSizeKB = (compressedFile.size / 1024).toFixed(1);
      showSnackbar(
        t('userPhotoUploadSuccess', { originalSize: originalSizeKB, compressedSize: compressedSizeKB }),
        'success'
      );
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      showSnackbar(t('userPhotoUploadError'), 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  });

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

  const handleLanguageChange = useCallback(async (langCode) => {
    setLocalLanguage(langCode);
    if (!user?.id) return;
    try {
      const response = await fetchOrThrow(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user,
          attributes: {
            ...(user.attributes || {}),
            language: langCode,
          },
        }),
      });
      dispatch(sessionActions.updateUser(await response.json()));
    } catch (error) {
      console.error('Failed to persist language preference:', error?.message || error);
    }
  }, [setLocalLanguage, user, dispatch]);
  
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
  const { getLogoUrl, getCompanyName, hasResellerBranding, resellerData: resellerBrandingData } = useResellerBranding();
  
  // Track if domain lookup has completed
  const [domainLookupCompleted, setDomainLookupCompleted] = useState(false);
  
  // Check if domain lookup has completed
  useEffect(() => {
    if (hasResellerBranding !== undefined) {
      setDomainLookupCompleted(true);
    }
  }, [hasResellerBranding]);

  // Check if current user is a reseller
  useEffect(() => {
    const checkResellerStatus = async () => {
      if (!user?.id) {
        dispatch(resellersActions.clearCurrentReseller());
        return;
      }
      if (user.temporary) {
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

  // Format event type using Traccar's formatter with custom sensor support
  const formatEventType = (event) => {
    const device = devices[event.deviceId];

    // Custom label takes priority (used by door sensor events)
    if (event.attributes?.label) return event.attributes.label;

    // Check if this is a custom sensor event in attributes
    if (event.attributes) {
      const customSensorKeys = ['in1', 'in2', 'in3', 'in4', 'out1', 'out2', 'out3', 'out4', 'input', 'output'];
      const customSensorKey = customSensorKeys.find(key => event.attributes.hasOwnProperty(key));
      
      if (customSensorKey) {
        let customSensorName = customSensorKey;
        
        // Get custom sensor name if available
        if (device?.attributes?.customSensors) {
          try {
            const customSensors = JSON.parse(device.attributes.customSensors);
            if (customSensors[customSensorKey]) {
              customSensorName = customSensors[customSensorKey];
            }
          } catch (error) {
            console.error('Error parsing customSensors:', error);
          }
        }
        
        // Format the value
        const value = event.attributes[customSensorKey];
        let formattedValue = value;
        
        // Handle boolean values
        if (typeof value === 'boolean' || value === 0 || value === 1 || value === '0' || value === '1' || value === 'true' || value === 'false') {
          const boolValue = value === true || value === 1 || value === '1' || value === 'true';
          formattedValue = boolValue ? t('sharedYes') : t('sharedNo');
        }
        
        return `${customSensorName}: ${formattedValue}`;
      }
    }
    
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
      if (showUserPopover && userRef && userPopoverRef && 
          !userRef.contains(event.target) && !userPopoverRef.contains(event.target)) {
        setShowUserPopover(false);
      }
    };

    if (showEventsPopover || showMapSwitcher || showSearch || showLanguagePopover || showUserPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEventsPopover, eventsButtonRef, showMapSwitcher, mapSwitcherRef, showSearch, searchRef, showLanguagePopover, languageRef, showUserPopover, userRef, userPopoverRef]);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const devices = useSelector((state) => state.devices.items);
  const currentReplayIndex = useSelector((state) => state.session.currentReplayIndex);
  const selectedPlate = useSelector((state) => state.fleet.selectedPlate);

  // Handle save button - find closest device and get route
  const handleSaveOcorrencia = useCallback(async () => {
    if (!ocorrenciaAddress || !ocorrenciaAddress.lat || !ocorrenciaAddress.lon) {
      showSnackbar('Por favor, selecione um endereço válido', 'error');
      return;
    }

    setIsSavingOcorrencia(true);

    try {
      // Get all online devices with positions
      const onlineDevices = Object.values(devices).filter(device => {
        const position = positions[device.id];
        return position && (device.status === 'online' || position.fixTime);
      });

      if (onlineDevices.length === 0) {
        showSnackbar('Nenhum dispositivo online encontrado', 'error');
        setIsSavingOcorrencia(false);
        return;
      }

      // Calculate distances and find closest device
      let closestDevice = null;
      let minDistance = Infinity;

      onlineDevices.forEach(device => {
        const position = positions[device.id];
        if (position && position.latitude && position.longitude) {
          const distance = calculateDistance(
            ocorrenciaAddress.lat,
            ocorrenciaAddress.lon,
            position.latitude,
            position.longitude
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestDevice = { device, position, distance };
          }
        }
      });

      if (!closestDevice) {
        showSnackbar('Não foi possível encontrar um dispositivo próximo', 'error');
        setIsSavingOcorrencia(false);
        return;
      }

      // Get route from Mapbox Directions API
      if (!mapboxToken) {
        showSnackbar('Token do Mapbox não encontrado', 'error');
        setIsSavingOcorrencia(false);
        return;
      }

      // Build coordinates: device (start) -> address (end)
      // Mapbox expects [lon, lat] format
      const startCoords = `${closestDevice.position.longitude},${closestDevice.position.latitude}`;
      const endCoords = `${ocorrenciaAddress.lon},${ocorrenciaAddress.lat}`;
      const coordinates = `${startCoords};${endCoords}`;

      const request = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${mapboxToken}&geometries=geojson&overview=full&steps=true&language=pt`;
      
      const response = await fetch(request);
      const routeData = await response.json();

      if (routeData.code !== 'Ok' || !routeData.routes || routeData.routes.length === 0) {
        showSnackbar('Erro ao calcular rota', 'error');
        setIsSavingOcorrencia(false);
        return;
      }

      // Set route data to display on map (merge with existing route planner data if any)
      setOcorrenciaRouteData(routeData);
      
      // Select the closest device to highlight it on map
      dispatch(devicesActions.selectId(closestDevice.device.id));

      // Extract route information
      const selectedRoute = routeData.routes[0];
      const routeDistance = selectedRoute.distance / 1000; // Convert to km
      const routeDuration = selectedRoute.duration; // Duration in seconds
      
      // Format duration (hours and minutes)
      const hours = Math.floor(routeDuration / 3600);
      const minutes = Math.floor((routeDuration % 3600) / 60);
      let durationText = '';
      if (hours > 0) {
        durationText = `${hours}h ${minutes}min`;
      } else {
        durationText = `${minutes}min`;
      }

      // Store closest device info for snackbar button
      const deviceInfo = {
        deviceId: closestDevice.device.id,
        deviceName: closestDevice.device.name,
        distance: routeDistance,
        duration: durationText
      };
      setClosestDeviceInfo(deviceInfo);

      // Close modal
      setShowOcorrenciasModal(false);

      // Show snackbar with button and device info
      showSnackbar(
        {
          message: `Viatura livre mais próxima: ${closestDevice.device.name} | Distância: ${routeDistance.toFixed(2)} km | Tempo estimado: ${durationText}`,
          severity: 'success',
          hasRouteButton: true,
          deviceInfo: deviceInfo
        },
        'success'
      );

    } catch (error) {
      console.error('Error saving ocorrência:', error);
      showSnackbar('Erro ao salvar ocorrência', 'error');
    } finally {
      setIsSavingOcorrencia(false);
    }
  }, [ocorrenciaAddress, devices, positions, mapboxToken, dispatch, showSnackbar]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const selectedPosition = filteredPositions.find((position) => selectedDeviceId && position.deviceId === selectedDeviceId);

  const [filteredDevices, setFilteredDevices] = useState([]);

  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = usePersistedState('filter', {
    statuses: [],
    groups: [],
    timeWindow: 'all',
  });
  const [filterSort, setFilterSort] = usePersistedState('filterSort', '');
  const [filterMap, setFilterMap] = usePersistedState('filterMap', false);

  const [eventsOpen, setEventsOpen] = useState(false);
  const [geofencesPopoverVisible, setGeofencesPopoverVisible] = useState(false);
  const [gestaoPopoverVisible, setGestaoPopoverVisible] = useState(false);
  const [osPopoverVisible, setOsPopoverVisible] = useState(false);
  const [clientsPopoverVisible, setClientsPopoverVisible] = useState(false);
  const [vehiclesPopoverVisible, setVehiclesPopoverVisible] = useState(false);
  const [chipsPopoverVisible, setChipsPopoverVisible] = useState(false);
  const [smsTemplatesPopoverVisible, setSmsTemplatesPopoverVisible] = useState(false);
  const [financialPopoverVisible, setFinancialPopoverVisible] = useState(false);
  const [routePlannerData, setRoutePlannerData] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [reportsPopoverVisible, setReportsPopoverVisible] = useState(false);

  const closeAllPanels = useCallback(() => {
    setShowDevicesPopover(false);
    setShowUsersPopover(false);
    setShowCommandsPopover(false);
    setShowMaintenancePopover(false);
    setShowComputedAttributesPopover(false);
    setShowCalendarsPopover(false);
    setShowDriversPopover(false);
    setShowGroupsPopover(false);
    setShowNotificationsPopover(false);
    setShowResellersPopover(false);
    setGeofencesPopoverVisible(false);
    setGestaoPopoverVisible(false);
    setOsPopoverVisible(false);
    setClientsPopoverVisible(false);
    setVehiclesPopoverVisible(false);
    setChipsPopoverVisible(false);
    setSmsTemplatesPopoverVisible(false);
    setFinancialPopoverVisible(false);
    setReportsPopoverVisible(false);
    setShowServerDrawer(false);
    setShowPreferencesDrawer(false);
    setShowAnnouncementDrawer(false);
    setShowResellerDrawer(false);
  }, []);

  const onMapClick = useCallback(() => {
    dispatch(devicesActions.selectId(null));
  }, [dispatch]);

  const handleRouteDataChange = useCallback((routeData) => {
    setRoutePlannerData(routeData);
    setSelectedRouteIndex(0); // Reset to first route when new data comes in
  }, []);

  const handleRouteChange = useCallback((routeIndex) => {
    setSelectedRouteIndex(routeIndex);
  }, []);

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


  // Device IDs from fleet vehicles (for restricting device list to trackers in vehicles)
  const fleetItems = useSelector((state) => state.fleet.items || []);
  const deviceIdsFromFleet = useMemo(() => {
    const ids = new Set();
    fleetItems.forEach((item) => {
      const deviceIds = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id != null ? [item.device_id] : []);
      deviceIds.forEach((id) => ids.add(id));
    });
    return ids;
  }, [fleetItems]);

  // Share links log in as Traccar temporary users: devices exist only in Traccar, not in Core /api/fleet/map.
  // Default desktop layout opens the fleet panel (empty for them); open device list instead.
  useEffect(() => {
    if (user?.temporary && desktop) {
      setIsDeviceListVisible(true);
      setIsFleetListVisible(false);
    }
  }, [user?.temporary, desktop]);

  // Always call useFilter (required by Rules of Hooks)
  const restrictToDeviceIds = user?.temporary
    ? null
    : (isDeviceListVisible && deviceIdsFromFleet.size > 0 ? deviceIdsFromFleet : null);
  useFilter(keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions, desktop, restrictToDeviceIds);

  // Track previous selectedDeviceId to detect when user goes back from selected device
  const prevSelectedDeviceIdRef = useRef(selectedDeviceId);

  // When device is selected, set search to device uniqueId and enable filter on map
  // Works on both mobile and desktop
  useEffect(() => {
    if (selectedDeviceId && devices[selectedDeviceId]) {
      const selectedDevice = devices[selectedDeviceId];
      if (selectedDevice.uniqueId) {
        setKeyword(selectedDevice.uniqueId);
        setFilterMap(true);
      }
      prevSelectedDeviceIdRef.current = selectedDeviceId;
    } else if (!selectedDeviceId && prevSelectedDeviceIdRef.current) {
      // Only clear when transitioning from selected to not selected (user went back)
      setKeyword('');
      setFilterMap(false);
      prevSelectedDeviceIdRef.current = null;
    }
  }, [selectedDeviceId, devices, setKeyword, setFilterMap]);

  // Old desktop-only refresh - now handled by universal refresh below

  // Force refresh devices when device list becomes visible (desktop only)
  useEffect(() => {
    if (desktop && isDeviceListVisible) {
      refreshDevices();
    }
  }, [desktop, isDeviceListVisible, refreshDevices]);

  // Fechar popover de Clientes se usuário não for admin
  useEffect(() => {
    if (!admin && clientsPopoverVisible) {
      setClientsPopoverVisible(false);
    }
  }, [admin, clientsPopoverVisible]);

  // Fetch fleet map on mount and poll every 10 seconds
  useEffect(() => {
    if (!admin && user?.clientBillingBlocked) {
      return undefined;
    }
    dispatch(fetchFleetMap());
    const interval = setInterval(() => {
      dispatch(fetchFleetMap());
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [dispatch, admin, user?.clientBillingBlocked]);

  return (
    <div className={classes.root}>
      {desktop && (
        <MainMap
          filteredPositions={filteredPositions}
          selectedPosition={selectedPosition}
          onMapClick={onMapClick}
          selectedMapStyle={appliedMapStyleForView}
          currentReplayIndex={currentReplayIndex}
          routePlannerData={ocorrenciaRouteData || routePlannerData}
          selectedRouteIndex={selectedRouteIndex}
          onRouteChange={handleRouteChange}
          ocorrenciaDestination={ocorrenciaAddress}
          deviceIdWithRoute={deviceIdWithRoute}
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
                selectedMapStyle={appliedMapStyleForView}
                currentReplayIndex={currentReplayIndex}
                routePlannerData={ocorrenciaRouteData || routePlannerData}
                selectedRouteIndex={selectedRouteIndex}
                onRouteChange={handleRouteChange}
                ocorrenciaDestination={ocorrenciaAddress}
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
        onRouteDataChange={handleRouteDataChange}
      />
      
      <FloatingReportsPopover 
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isDeviceListVisible={isDeviceListVisible}
        isVisible={reportsPopoverVisible}
        onClose={() => setReportsPopoverVisible(false)}
      />
      
      <FloatingGestaoPopover 
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isDeviceListVisible={isDeviceListVisible}
        isVisible={gestaoPopoverVisible}
        onClose={() => setGestaoPopoverVisible(false)}
      />
      
      <FloatingOSPopover 
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={osPopoverVisible}
        onClose={() => setOsPopoverVisible(false)}
      />
      
      <FloatingClientsPopover 
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={clientsPopoverVisible}
        onClose={() => setClientsPopoverVisible(false)}
      />
      
      <FloatingVehiclesPopover 
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={vehiclesPopoverVisible}
        onClose={() => setVehiclesPopoverVisible(false)}
      />
      
      <FloatingChipsPopover 
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={chipsPopoverVisible}
        onClose={() => setChipsPopoverVisible(false)}
      />
      
      <FloatingSmsTemplatesPopover 
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={smsTemplatesPopoverVisible}
        onClose={() => setSmsTemplatesPopoverVisible(false)}
      />
      <FloatingFinancialPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={financialPopoverVisible}
        onClose={() => setFinancialPopoverVisible(false)}
      />
      
      {/* Desktop Menu */}
      {desktop && hasMainMenuPermission && (
        <div style={{
          position: 'fixed',
          top: '8px',
          left: '8px',
          width: isMenuExpanded ? '200px' : '55px',
          height: 'calc(100vh - 16px)',
          backgroundColor: colors.menuSurface,
          borderRadius: (isDeviceListVisible || selectedDeviceId || isFleetListVisible || selectedPlate || showUsersPopover || showCommandsPopover || showMaintenancePopover || showComputedAttributesPopover || showCalendarsPopover || showDriversPopover || showGroupsPopover || showDevicesPopover || showNotificationsPopover || geofencesPopoverVisible || reportsPopoverVisible || showReplayPopover || showResellersPopover || gestaoPopoverVisible || osPopoverVisible || clientsPopoverVisible || vehiclesPopoverVisible || chipsPopoverVisible || smsTemplatesPopoverVisible || financialPopoverVisible) ? '16px 0px 0px 16px' : '16px',
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
                {domainLookupCompleted && (() => {
                  // Priority: Reseller logo > Server logo > Server inverted logo > Fallback
                  const logoUrl = getLogoUrl() || logo || logoInverted;
                  
                  // Only show logo if we have a valid URL
                  if (!logoUrl) return null;
                  
                  return (
                    <img 
                      src={logoUrl} 
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
          
          {/* Fleet List Toggle Button */}
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
            const tooltip = document.getElementById('menu-tooltip-fleet-list');
            if (tooltip) tooltip.remove();
            setIsFleetListVisible(!isFleetListVisible);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.menuHover;
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Lista de Veículos';
              tooltip.id = 'menu-tooltip-fleet-list';
              tooltip.style.cssText = `
                position: fixed;
                left: ${rect.right + 8}px;
                top: ${rect.top + rect.height / 2}px;
                transform: translateY(-50%);
                background: ${colors.menuText};
                color: ${colors.menuSurface};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: '12px';
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
              const tooltip = document.getElementById('menu-tooltip-fleet-list');
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
                Lista de Veículos
              </span>
            )}
          </div>
          
          {/* Device List Toggle Button */}
          {hasDeviceListPermission && (
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
            <Cpu size={18} color={colors.textSecondary} />
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
          )}
          
          {/* Reports Icon */}
          {!disableReports && hasReportsPermission && (
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
              closeAllPanels();
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
          
          {/* Data Analytics Icon */}
          {hasDataAnalyticsPermission && (
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
                const tooltip = document.getElementById('menu-tooltip-data-analytics');
                if (tooltip) tooltip.remove();
                setShowDataAnalyticsPopover(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.menuHover;
                if (!isMenuExpanded) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const tooltip = document.createElement('div');
                  tooltip.textContent = 'Data Analytics';
                  tooltip.id = 'menu-tooltip-data-analytics';
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
                  const tooltip = document.getElementById('menu-tooltip-data-analytics');
                  if (tooltip) tooltip.remove();
                }
              }}>
              <MdDataObject style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  Data Analytics
                </span>
              )}
            </div>
          )}

          {/* Geofences Icon */}
          {hasGeofencesPermission && (
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
            closeAllPanels();
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
            <CropIcon style={{ fontSize: 18, color: colors.textSecondary }} />
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
          )}
          
          {/* Gestão Icon */}
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
            const tooltip = document.getElementById('menu-tooltip-gestao');
            if (tooltip) tooltip.remove();
            closeAllPanels();
            setGestaoPopoverVisible(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.menuHover;
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Gestão';
              tooltip.id = 'menu-tooltip-gestao';
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
              const tooltip = document.getElementById('menu-tooltip-gestao');
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
                lineHeight: '1.6'
              }}>
                Gestão
              </span>
            )}
          </div>

          {/* Ordens de Serviço Icon */}
          {user?.administrator && (
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
            const tooltip = document.getElementById('menu-tooltip-os');
            if (tooltip) tooltip.remove();
            closeAllPanels();
            setOsPopoverVisible(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.menuHover;
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Ordens de Serviço';
              tooltip.id = 'menu-tooltip-os';
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
              const tooltip = document.getElementById('menu-tooltip-os');
              if (tooltip) tooltip.remove();
            }
          }}>
            <FileText size={18} color={colors.textSecondary} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.6'
              }}>
                Ordens de Serviço
              </span>
            )}
          </div>
          )}

          {/* Clientes Icon - apenas para admin */}
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
            const tooltip = document.getElementById('menu-tooltip-clients');
            if (tooltip) tooltip.remove();
            closeAllPanels();
            setClientsPopoverVisible(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.menuHover;
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Clientes';
              tooltip.id = 'menu-tooltip-clients';
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
              const tooltip = document.getElementById('menu-tooltip-clients');
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
                lineHeight: '1.6'
              }}>
                Clientes
              </span>
            )}
          </div>
          )}

          {/* Veículos Icon */}
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
            const tooltip = document.getElementById('menu-tooltip-vehicles');
            if (tooltip) tooltip.remove();
            closeAllPanels();
            setVehiclesPopoverVisible(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.menuHover;
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Veículos';
              tooltip.id = 'menu-tooltip-vehicles';
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
              const tooltip = document.getElementById('menu-tooltip-vehicles');
              if (tooltip) tooltip.remove();
            }
          }}>
            <DirectionsCarIcon style={{ fontSize: 18, color: colors.textSecondary }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.6'
              }}>
                Veículos
              </span>
            )}
          </div>

          {/* Devices Icon (Objetos) */}
          {!readonly && hasDevicesPermission && admin && (
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
              closeAllPanels();
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
              <PiMapPinAreaLight style={{ fontSize: 18, color: colors.textSecondary }} />
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
          
          {/* Users Icon (Usuários) */}
          {manager && hasUsersPermission && (
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
            closeAllPanels();
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
            <AiOutlineUsergroupAdd style={{ fontSize: 18, color: colors.textSecondary }} />
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

          {/* Roles Management */}
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
                const tooltip = document.getElementById('menu-tooltip-roles');
                if (tooltip) tooltip.remove();
                setShowRolesPopover(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.menuHover;
                if (!isMenuExpanded) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const tooltip = document.createElement('div');
                  tooltip.textContent = t('rolesTitle');
                  tooltip.id = 'menu-tooltip-roles';
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
                  const tooltip = document.getElementById('menu-tooltip-roles');
                  if (tooltip) tooltip.remove();
                }
              }}>
              <LuShieldAlert style={{ fontSize: 18, color: colors.textSecondary }} />
              {isMenuExpanded && (
                <span style={{
                  marginLeft: '12px',
                  color: colors.textSecondary,
                  fontSize: '14px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.5'
                }}>
                  {t('rolesTitle')}
                </span>
              )}
            </div>
          )}

          {/* Simcards Icon */}
          {!readonly && hasDevicesPermission && admin && (
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
            const tooltip = document.getElementById('menu-tooltip-chips');
            if (tooltip) tooltip.remove();
            closeAllPanels();
            setChipsPopoverVisible(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.menuHover;
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Simcards';
              tooltip.id = 'menu-tooltip-chips';
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
              const tooltip = document.getElementById('menu-tooltip-chips');
              if (tooltip) tooltip.remove();
            }
          }}>
            <SimCardIcon style={{ fontSize: 18, color: colors.textSecondary }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                Simcards
              </span>
            )}
          </div>
          )}

          {/* Painel SMS Icon */}
          {!readonly && hasDevicesPermission && admin && (
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
            const tooltip = document.getElementById('menu-tooltip-sms-templates');
            if (tooltip) tooltip.remove();
            closeAllPanels();
            setSmsTemplatesPopoverVisible(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.menuHover;
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Painel SMS';
              tooltip.id = 'menu-tooltip-sms-templates';
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
              const tooltip = document.getElementById('menu-tooltip-sms-templates');
              if (tooltip) tooltip.remove();
            }
          }}>
            <MessageIcon style={{ fontSize: 18, color: colors.textSecondary }} />
            {isMenuExpanded && (
              <span style={{
                marginLeft: '12px',
                color: colors.textSecondary,
                fontSize: '14px',
                fontWeight: '400',
                whiteSpace: 'nowrap',
                lineHeight: '1.5'
              }}>
                Painel SMS
              </span>
            )}
          </div>
          )}
          
          {!readonly && hasDevicesPermission && admin && (
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
            const tooltip = document.getElementById('menu-tooltip-financial');
            if (tooltip) tooltip.remove();
            closeAllPanels();
            setFinancialPopoverVisible(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.menuHover;
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Financeiro';
              tooltip.id = 'menu-tooltip-financial';
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
              const tooltip = document.getElementById('menu-tooltip-financial');
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
                Financeiro
              </span>
            )}
          </div>
          )}
          {!readonly && !admin && (
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
            const tooltip = document.getElementById('menu-tooltip-my-financial');
            if (tooltip) tooltip.remove();
            closeAllPanels();
            navigate('/meu-financeiro');
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.menuHover;
            if (!isMenuExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const tooltip = document.createElement('div');
              tooltip.textContent = 'Meu Financeiro';
              tooltip.id = 'menu-tooltip-my-financial';
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
              const tooltip = document.getElementById('menu-tooltip-my-financial');
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
                Meu Financeiro
              </span>
            )}
          </div>
          )}

          {/* Notifications Icon */}
          {!readonly && hasNotificationsPermission && (
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
              closeAllPanels();
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
          
          {/* Calendars Icon */}
          {!readonly && !features.disableCalendars && hasCalendarsPermission && (
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
              closeAllPanels();
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
              <AiOutlineCalendar style={{ fontSize: 18, color: colors.textSecondary }} />
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
          
          {/* Drivers Icon */}
          {!readonly && !features.disableDrivers && hasDriversPermission && (
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
              closeAllPanels();
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
              <PiSteeringWheelLight style={{ fontSize: 18, color: colors.textSecondary }} />
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
          
          {/* Computed Attributes Icon */}
          {!readonly && !features.disableComputedAttributes && hasComputedAttributesPermission && (
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
              closeAllPanels();
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
              <AiOutlineDatabase style={{ fontSize: 18, color: colors.textSecondary }} />
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
          {!readonly && !features.disableMaintenance && hasMaintenancePermission && (
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
              closeAllPanels();
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
              <HiOutlineWrenchScrewdriver style={{ fontSize: 18, color: colors.textSecondary }} />
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
          
          {/* Groups Icon */}
          {!readonly && !features.disableGroups && hasGroupsPermission && (
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
              closeAllPanels();
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
              <AiOutlineTeam style={{ fontSize: 18, color: colors.textSecondary }} />
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
          
          {/* Announcement Icon */}
          {manager && hasAnnouncementPermission && (
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
              closeAllPanels();
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
              <AiOutlineSound style={{ fontSize: 18, color: colors.textSecondary }} />
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
          
          {/* Settings Icon */}
          {hasSettingsPermission && (
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
            closeAllPanels();
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
            <AiOutlineSetting style={{ fontSize: 18, color: colors.textSecondary }} />
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
          )}
          
          {/* Server Icon */}
          {admin && hasServerPermission && (
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
              closeAllPanels();
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
              <AiOutlineCloudServer style={{ fontSize: 18, color: colors.textSecondary }} />
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
          
          {/* Resellers Icon */}
          {(admin || isReseller) && hasResellerPanelPermission && (
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
              closeAllPanels();
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
              <HiMiniCubeTransparent style={{ fontSize: 18, color: colors.textSecondary }} />
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
          
          {/* Saved Commands Icon */}
          {!readonly && !features.disableSavedCommands && hasSavedCommandsPermission && (
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
              closeAllPanels();
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
              <AiOutlineSend style={{ fontSize: 18, color: colors.textSecondary }} />
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
      
      {/* Floating Fleet List */}
      <FloatingFleetList
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={(desktop && (isFleetListVisible || selectedPlate)) || (!desktop && isFleetListVisible)}
        geofencesPopoverVisible={geofencesPopoverVisible}
        onDrawerOpen={() => setDrawerOpen(true)}
      />
      
      {/* History Panel - shown when history mode is active */}
      {historyDeviceId && (
        <HistoryPanel
          deviceId={historyDeviceId}
          onClose={() => setHistoryDeviceId(null)}
          desktop={desktop}
          isMenuExpanded={isMenuExpanded}
        />
      )}
      {/* Floating Status Card - hidden when history mode is active */}
      {!historyDeviceId && (
        <FloatingStatusCard 
          desktop={desktop} 
          isMenuExpanded={isMenuExpanded} 
          isDeviceListVisible={isDeviceListVisible}
          geofencesPopoverVisible={geofencesPopoverVisible}
          showReplayPopover={showReplayPopover}
          setShowReplayPopover={setShowReplayPopover}
          onHideDeviceList={() => setIsDeviceListVisible(false)}
          onShowDeviceList={() => setIsDeviceListVisible(true)}
          onOpenReports={() => {
            closeAllPanels();
            setReportsPopoverVisible(true);
          }}
          onOpenHistory={(deviceId) => setHistoryDeviceId(deviceId)}
        />
      )}
      
      {/* Vertical Control Bar - Left of Device List */}
      <AnimatePresence>
        {true && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
        position: 'fixed',
              top: '8px',
              right: '8px',
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
          <div style={{
            position: 'relative',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: `2px solid #10B981`,
            padding: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Avatar style={{ 
              width: '24px', 
              height: '24px', 
              userSelect: 'none', 
              pointerEvents: 'none',
              backgroundColor: colors.avatarBackground
            }}>
              {(user?.attributes?.profilePhoto || user?.attributes?.avatar) && (
                <AvatarImage 
                  src={user.attributes.profilePhoto || user.attributes.avatar} 
                  alt="User" 
                />
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
          </div>
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
        
        {/* Heatmap Toggle Button - hidden when HEATMAP_FEATURE_ENABLED is false */}
        {HEATMAP_FEATURE_ENABLED && (
        <button
          data-control-button
          onClick={handleToggleHeatmap}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: mapHeatmapEnabled ? '#10B981' : colors.textSecondary,
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
          title={mapHeatmapEnabled ? 'Ocultar Mapa de Calor' : 'Mostrar Mapa de Calor'}>
          <Activity size={18} style={{ userSelect: 'none', pointerEvents: 'none' }} />
        </button>
        )}
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
                {t('noEventsAvailable')}
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
                    marginBottom: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
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
              {stylesForSwitcher
                .map((style, index) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleMapStyleChange(style.id)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      color: appliedMapStyleForView === style.id ? colors.text : colors.textSecondary,
                      backgroundColor: appliedMapStyleForView === style.id ? colors.hover : 'transparent',
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      borderRadius: '0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      borderBottom: index < stylesForSwitcher.length - 1 ? `1px solid ${colors.border}` : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (appliedMapStyleForView !== style.id) {
                        e.target.style.backgroundColor = colors.hover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (appliedMapStyleForView !== style.id) {
                        e.target.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontWeight: appliedMapStyleForView === style.id ? '600' : '400' }}>
                      {style.title}
                    </span>
                    {appliedMapStyleForView === style.id && (
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
                      handleLanguageChange(lang.code);
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
            ref={setUserPopoverRef}
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
            onClick={(e) => e.stopPropagation()}
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
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'relative',
                    width: '48px',
                    height: '48px',
                    marginRight: '12px',
                    borderRadius: '50%',
                    border: `2px solid #10B981`,
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Avatar style={{ 
                      width: '44px', 
                      height: '44px',
                      backgroundColor: colors.avatarBackground
                    }}>
                      {(user?.attributes?.profilePhoto || user?.attributes?.avatar) && (
                        <AvatarImage 
                          src={user.attributes.profilePhoto || user.attributes.avatar} 
                          alt="User"
                          onLoad={() => {
                            // Image loaded successfully
                          }}
                          onError={() => {
                            // Image failed to load, will show fallback
                          }}
                        />
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
                    
                    {/* Loading indicator when uploading */}
                    {isUploadingPhoto && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1001
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          border: `2px solid ${colors.background}`,
                          borderTop: `2px solid ${colors.primary}`,
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                      </div>
                    )}
                  </div>
                  
                  {/* Photo Upload Button */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!isUploadingPhoto) {
                        document.getElementById('user-photo-upload').click();
                      }
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '6px',
                      width: '20px',
                      height: '20px',
                      backgroundColor: isUploadingPhoto ? colors.textSecondary : colors.primary,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isUploadingPhoto ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      zIndex: 1002,
                      border: 'none',
                      opacity: isUploadingPhoto ? 0.7 : 1,
                      transition: 'all 0.2s'
                    }}
                    title={isUploadingPhoto ? t('userPhotoUploading') : t('userPhotoUploadTitle')}
                  >
                    {isUploadingPhoto ? (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        border: `2px solid ${colors.background}`,
                        borderTop: `2px solid ${colors.primary}`,
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="13" r="4" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
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
                onClick={(e) => {
                  e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasAccountPermission || admin) {
                      setShowUserPopover(false);
                      setEditingUserId(user.id);
                      closeAllPanels();
                      setShowUsersPopover(true);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: (hasAccountPermission || admin) ? colors.secondary : colors.disabled,
                    color: (hasAccountPermission || admin) ? colors.text : colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: (hasAccountPermission || admin) ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s',
                    opacity: (hasAccountPermission || admin) ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    if (hasAccountPermission || admin) {
                      e.target.style.backgroundColor = colors.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (hasAccountPermission || admin) {
                      e.target.style.backgroundColor = colors.secondary;
                    }
                  }}
                >
                  {t('settingsUser')}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
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
      <LogoutModal
        open={showLogoutModal}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
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

      {/* Data Analytics Popover */}
      <FloatingDataAnalyticsPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showDataAnalyticsPopover}
        onClose={() => setShowDataAnalyticsPopover(false)}
      />

      {/* Roles Management Popover */}
      <FloatingRolesPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showRolesPopover}
        onClose={() => setShowRolesPopover(false)}
      />

      {/* Users Management Modal */}
      <UsersModal
        open={showUsersModal}
        onClose={() => setShowUsersModal(false)}
      />

      {/* Notifications Management Popover */}
      <FloatingNotificationsPopover
        desktop={desktop}
        isMenuExpanded={isMenuExpanded}
        isVisible={showNotificationsPopover}
        onClose={() => setShowNotificationsPopover(false)}
      />
      
      {/* Server Settings Drawer */}
      <ServerDrawer
        open={showServerDrawer}
        onClose={() => setShowServerDrawer(false)}
        serverData={serverData}
        setServerData={setServerData}
        timezones={timezones}
        mapStyles={mapStyles}
        commonUserAttributes={commonUserAttributes}
        commonDeviceAttributes={commonDeviceAttributes}
        serverAttributes={serverAttributes}
        updateServerMutation={updateServerMutation}
        handleFileChange={handleFileChange}
      />

      {/* Reseller Drawer */}
      <ResellerDrawer
        open={showResellerDrawer}
        onClose={() => setShowResellerDrawer(false)}
      />

      {/* Preferences Drawer */}
      <PreferencesDrawer
        open={showPreferencesDrawer}
        onClose={() => setShowPreferencesDrawer(false)}
      />

      {/* Announcement Drawer */}
      <AnnouncementDrawer
        open={showAnnouncementDrawer}
        onClose={() => setShowAnnouncementDrawer(false)}
        sendMutation={sendAnnouncementMutation}
      />
      {/* Mobile Drawer Menu */}
      {!desktop && (
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          domainLookupCompleted={domainLookupCompleted}
          handlers={{
            showFleetList: () => { closeAllPanels(); setIsFleetListVisible(true); },
            showDeviceList: () => { closeAllPanels(); setIsDeviceListVisible(true); },
            showReports: () => { closeAllPanels(); setReportsPopoverVisible(true); },
            showGeofences: () => { closeAllPanels(); setGeofencesPopoverVisible(true); },
            showGestao: () => { closeAllPanels(); setGestaoPopoverVisible(true); },
            showOs: () => { closeAllPanels(); setOsPopoverVisible(true); },
            showClients: () => { closeAllPanels(); setClientsPopoverVisible(true); },
            showVehicles: () => { closeAllPanels(); setVehiclesPopoverVisible(true); },
            showDevices: () => { closeAllPanels(); setShowDevicesPopover(true); },
            showUsers: () => { closeAllPanels(); setShowUsersPopover(true); },
            showChips: () => { closeAllPanels(); setChipsPopoverVisible(true); },
            showSmsTemplates: () => { closeAllPanels(); setSmsTemplatesPopoverVisible(true); },
            showFinancial: () => { closeAllPanels(); setFinancialPopoverVisible(true); },
            navigateFinanciero: () => closeAllPanels(),
            showNotifications: () => { closeAllPanels(); setShowNotificationsPopover(true); },
            showCalendars: () => { closeAllPanels(); setShowCalendarsPopover(true); },
            showDrivers: () => { closeAllPanels(); setShowDriversPopover(true); },
            showAttributes: () => { closeAllPanels(); setShowComputedAttributesPopover(true); },
            showMaintenance: () => { closeAllPanels(); setShowMaintenancePopover(true); },
            showGroups: () => { closeAllPanels(); setShowGroupsPopover(true); },
            showAnnouncement: () => { closeAllPanels(); setShowAnnouncementDrawer(true); },
            showPreferences: () => { closeAllPanels(); setShowPreferencesDrawer(true); },
            showServer: () => { closeAllPanels(); setShowServerDrawer(true); },
            showResellers: () => { closeAllPanels(); setShowResellersPopover(true); },
            showCommands: () => { closeAllPanels(); setShowCommandsPopover(true); },
            logout: () => setShowLogoutModal(true),
          }}
        />
      )}
      {/* Hidden file input for user photo upload */}
      <input
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        style={{ display: 'none' }}
        id="user-photo-upload"
        disabled={isUploadingPhoto}
      />

      {/* Ocorrências Modal */}
      <OcorrenciasModal
        open={showOcorrenciasModal}
        onClose={() => setShowOcorrenciasModal(false)}
        ocorrenciaNumber={ocorrenciaNumber}
        ocorrenciaData={ocorrenciaData}
        setOcorrenciaData={setOcorrenciaData}
        ocorrenciaAddress={ocorrenciaAddress}
        setOcorrenciaAddress={setOcorrenciaAddress}
        addressSearchResults={addressSearchResults}
        setAddressSearchResults={setAddressSearchResults}
        isSearchingAddress={isSearchingAddress}
        addressAutocompleteOpen={addressAutocompleteOpen}
        setAddressAutocompleteOpen={setAddressAutocompleteOpen}
        handleAddressInputChange={handleAddressInputChange}
        handleAddressSelect={handleAddressSelect}
        handleSaveOcorrencia={handleSaveOcorrencia}
        isSavingOcorrencia={isSavingOcorrencia}
      />
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'success' ? 30000 : 6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          action={
            snackbar.hasRouteButton && (snackbar.deviceInfo || closestDeviceInfo) ? (
              <Button
                variant="contained"
                size="small"
                onClick={handleEnviarRota}
                sx={{
                  textTransform: 'none',
                  fontWeight: '600',
                  backgroundColor: muiTheme.palette.mode === 'dark' ? '#2563eb' : '#1d4ed8',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: muiTheme.palette.mode === 'dark' ? '#1d4ed8' : '#1e40af',
                  }
                }}
              >
                Enviar Rota
              </Button>
            ) : null
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MainPage;
