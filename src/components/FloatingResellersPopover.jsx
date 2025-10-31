import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import getBuildStatusManager from '../utils/simpleBuildStatusManager';
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
  Box,
  Alert,
  Snackbar,
  Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ChevronLeft as ChevronLeftIcon,
  Folder as FolderIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Web as WebIcon,
  CheckCircle as CheckIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Block as BlockIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  Save as SaveIcon,
  BugReport as BugReportIcon,
  Smartphone as SmartphoneIcon,
  Android as AndroidIcon,
  Apple as AppleIcon,
  Download as DownloadIcon,
  Store as StoreIcon,
  PhoneIphone as PhoneIphoneIcon,
  ShoppingCart as ShoppingCartIcon,
  Apps as AppsIcon,
  Extension as ExtensionIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import { BsGooglePlay, BsAndroid, BsFiletypeXlsx } from "react-icons/bs";
import { LuCameraOff } from "react-icons/lu";
import { GoArchive, GoServer } from "react-icons/go";
import * as XLSX from 'xlsx';
import resellersConfig from '../config/resellersConfig';
import { useCatch } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useManager, useAdministrator } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { compressImage, validateImageFile } from '../utils/imageCompression';
import { resellersActions } from '../store';
import { groupsActions } from '../store/groups';
import { devicesActions } from '../store/devices';
import { useSelector } from 'react-redux';
import CustomPagination from './CustomPagination';

const FloatingResellersPopover = ({
  desktop,
  isMenuExpanded,
  isVisible,
  onClose
}) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const manager = useManager();
  const admin = useAdministrator();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);

  // Helper function to check if user can edit a specific reseller
  const canEditReseller = useCallback((reseller) => {
    // Return false if reseller is null or undefined
    if (!reseller) return false;

    // Admin can edit all resellers
    if (admin) return true;
    // Non-admin users can only edit resellers they created
    // Convert both to strings for comparison to handle type mismatch
    return String(reseller.parentUserId) === String(user?.id);
  }, [admin, user?.id]);

  // State management
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [resellerToDelete, setResellerToDelete] = useState(null);
  const [logsDialog, setLogsDialog] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsDeleting, setLogsDeleting] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingReseller, setEditingReseller] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');

  // New image fields for mobile app
  const [selectedFavicon, setSelectedFavicon] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [faviconError, setFaviconError] = useState('');

  const [selectedAppImage, setSelectedAppImage] = useState(null);
  const [appImagePreview, setAppImagePreview] = useState(null);
  const [appImageError, setAppImageError] = useState('');

  const [selectedNotificationIcon, setSelectedNotificationIcon] = useState(null);
  const [notificationIconPreview, setNotificationIconPreview] = useState(null);
  const [notificationIconError, setNotificationIconError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  // Build state management with localStorage
  const [buildStates, setBuildStates] = useState({});
  const [buildStatusModal, setBuildStatusModal] = useState({ open: false, reseller: null, buildType: null });
  const [cleanAppsModal, setCleanAppsModal] = useState({ open: false, reseller: null });
  const [iosBuildTypeModal, setIosBuildTypeModal] = useState({ open: false, reseller: null });
  const [massImporterModal, setMassImporterModal] = useState({ open: false, reseller: null });
  const [uploadedXlsxFile, setUploadedXlsxFile] = useState(null);
  const [importProgress, setImportProgress] = useState({ open: false, current: 0, total: 0, status: '' });
  const [serverModal, setServerModal] = useState({ open: false, reseller: null });
  const [serverFormData, setServerFormData] = useState({ serverUrl: '', login: '', password: '' });
  const [serverQueryLoading, setServerQueryLoading] = useState(false);
  const [serverQueryStartTime, setServerQueryStartTime] = useState(null);
  const [serverQueryEndTime, setServerQueryEndTime] = useState(null);
  const [serverQueryExecutionTime, setServerQueryExecutionTime] = useState(null);
  const [errorModal, setErrorModal] = useState({ open: false, message: '', title: '' });
  const [buildLoading, setBuildLoading] = useState({});
  const [cleanLoading, setCleanLoading] = useState({});

  // Load build states from localStorage on component mount
  useEffect(() => {
    const loadBuildStates = async () => {
      try {
        const savedStates = localStorage.getItem('resellerBuildStates');
        if (savedStates) {
          const parsedStates = JSON.parse(savedStates);
          setBuildStates(parsedStates);
        }
      } catch (error) {
        console.error('Error loading build states from localStorage:', error);
      }
    };

    loadBuildStates();
  }, []);

  // Save build states to localStorage whenever they change
  useEffect(() => {
    const saveBuildStates = async () => {
      try {
        localStorage.setItem('resellerBuildStates', JSON.stringify(buildStates));
      } catch (error) {
        console.error('Error saving build states to localStorage:', error);
      }
    };

    saveBuildStates();
  }, [buildStates]);

  // Expose updateBuildState globally for polling system
  useEffect(() => {
    window.updateReactBuildState = (key, state) => {
      const [resellerId, buildType] = key.split('_');
      if (resellerId && buildType) {
        setBuildStates(prev => ({
          ...prev,
          [`${resellerId}_${buildType}`]: state
        }));
      }
    };

    return () => {
      delete window.updateReactBuildState;
    };
  }, []);

  // Optional: Clean up global polling when component unmounts
  // Note: This is optional since polling is global and should continue
  // even when the reseller panel is closed
  useEffect(() => {
    return () => {
      // Uncomment if you want to stop global polling when this component unmounts
      // buildStatusManager.stopGlobalPolling();
    };
  }, []);

  // Get build state for a specific reseller and build type
  const getBuildState = (resellerId, buildType) => {
    const key = `${resellerId}_${buildType}`;
    const buildData = buildStates[key];
    if (buildData && typeof buildData === 'object') {
      return buildData.status || 'NOT_BUILDED';
    }
    return buildData || 'NOT_BUILDED';
  };

  // Update build state for a specific reseller and build type
  const updateBuildState = (resellerId, buildType, state, resellerData = null) => {
    const key = `${resellerId}_${buildType}`;

    setBuildStates(prev => {
      const newState = {
        ...prev,
        [key]: {
          status: state,
          resellerData: resellerData || prev[key]?.resellerData || null,
          timestamp: new Date().toISOString()
        }
      };
      return newState;
    });
  };

  // Mass Importer functions
  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['userLogin', 'userFullName', 'userEmail', 'userUserLimit', 'userDeviceLimit', 'deviceName', 'deviceUniqueId', 'devicePhone', 'deviceModel'],
      ['john.doe', 'John Doe', 'john@example.com', '10', '50', 'Device 1', 'IMEI123456', '+1234567890', 'GPS Tracker 2024'],
      ['jane.smith', 'Jane Smith', 'jane@example.com', '5', '25', 'Device 2', 'IMEI789012', '+0987654321', 'Fleet Manager Pro']
    ]);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, 'template.xlsx');
  };

  const queryServerUsers = async (serverUrl, login, password) => {
    try {
      // Ensure serverUrl doesn't have trailing slash
      const cleanServerUrl = serverUrl.trim().replace(/\/$/, '');
      const apiUrl = `${cleanServerUrl}/api/users`;
      
      // Create Basic Auth header
      const credentials = btoa(`${login}:${password}`);
      const authHeader = `Basic ${credentials}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Server users query result:', data);
      return data;
    } catch (error) {
      console.error('Error querying server users:', error);
      throw error;
    }
  };

  const queryServerDevices = async (serverUrl, login, password) => {
    try {
      // Ensure serverUrl doesn't have trailing slash
      const cleanServerUrl = serverUrl.trim().replace(/\/$/, '');
      const apiUrl = `${cleanServerUrl}/api/devices?all=true`;
      
      // Create Basic Auth header
      const credentials = btoa(`${login}:${password}`);
      const authHeader = `Basic ${credentials}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Server devices query result:', data);
      return data;
    } catch (error) {
      console.error('Error querying server devices:', error);
      throw error;
    }
  };

  const queryUsersByDeviceId = async (serverUrl, login, password, deviceId) => {
    try {
      // Ensure serverUrl doesn't have trailing slash
      const cleanServerUrl = serverUrl.trim().replace(/\/$/, '');
      const apiUrl = `${cleanServerUrl}/api/users?deviceId=${deviceId}`;
      
      // Create Basic Auth header
      const credentials = btoa(`${login}:${password}`);
      const authHeader = `Basic ${credentials}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error querying users for deviceId ${deviceId}:`, error);
      throw error;
    }
  };

  const formatExecutionTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleQueryData = async () => {
    // Prevent multiple concurrent queries
    if (serverQueryLoading) {
      return;
    }
    
    // Validate all fields are mandatory
    if (!serverFormData.serverUrl || !serverFormData.serverUrl.trim()) {
      setSnackbar({ open: true, message: t('allFieldsMandatory'), severity: 'error' });
      return;
    }
    if (!serverFormData.login || !serverFormData.login.trim()) {
      setSnackbar({ open: true, message: t('allFieldsMandatory'), severity: 'error' });
      return;
    }
    if (!serverFormData.password || !serverFormData.password.trim()) {
      setSnackbar({ open: true, message: t('allFieldsMandatory'), severity: 'error' });
      return;
    }
    
    // Validate HTTPS
    const trimmedUrl = serverFormData.serverUrl.trim();
    if (!trimmedUrl.startsWith('https://')) {
      setSnackbar({ open: true, message: t('serverImportOnlyHttps'), severity: 'error' });
      return;
    }
    
    // Set start time and loading state together
    const startTime = new Date();
    setServerQueryStartTime(startTime);
    setServerQueryEndTime(null);
    setServerQueryExecutionTime(null);
    setServerQueryLoading(true);
    try {
      // Query users first
      await queryServerUsers(
        serverFormData.serverUrl,
        serverFormData.login,
        serverFormData.password
      );
      
      // Then query devices
      const devices = await queryServerDevices(
        serverFormData.serverUrl,
        serverFormData.login,
        serverFormData.password
      );
      
      // For each device, query users by deviceId
      if (devices && Array.isArray(devices)) {
        for (const device of devices) {
          if (device.id) {
            try {
              const users = await queryUsersByDeviceId(
                serverFormData.serverUrl,
                serverFormData.login,
                serverFormData.password,
                device.id
              );
              console.log('Device name:', device.name || device.id, 'Users:', users);
            } catch (error) {
              console.error(`Failed to get users for device ${device.name || device.id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      const endTime = new Date();
      const executionTime = endTime - startTime;
      setServerQueryEndTime(endTime);
      setServerQueryExecutionTime(executionTime);
      setServerQueryLoading(false);
    }
  };

  const handleXlsxFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('Selected file:', file.name, file.type);
      
      // Check if file is valid XLSX/XLS
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        console.error('Invalid file type. Please select an .xlsx or .xls file.');
        setSnackbar({ open: true, message: t('massImporterInvalidFileType'), severity: 'error' });
        return;
      }
      
      setUploadedXlsxFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          console.log('Parsed XLSX content:', jsonData);
        } catch (error) {
          console.error('Error parsing XLSX file:', error);
          setSnackbar({ open: true, message: t('massImporterParseError'), severity: 'error' });
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleImport = async () => {
    if (!uploadedXlsxFile) {
      setSnackbar({ open: true, message: t('massImporterPleaseSelectFile'), severity: 'error' });
      return;
    }

    try {
      // Parse XLSX file
      const parseFile = () => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet);
              
              // Validate columns
              const expectedColumns = ['userLogin', 'userFullName', 'userEmail', 'userUserLimit', 'userDeviceLimit', 'deviceName', 'deviceUniqueId', 'devicePhone', 'deviceModel'];
              const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
              const missingColumns = expectedColumns.filter(col => !headers.includes(col));
              
              if (missingColumns.length > 0) {
                reject(new Error(t('massImporterMissingColumns', { columns: missingColumns.join(', ') })));
                return;
              }
              
              resolve(jsonData);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(uploadedXlsxFile);
        });
      };

      const data = await parseFile();
      
      // Open progress modal
      setImportProgress({ open: true, current: 0, total: data.length, status: t('massImporterStartingImport') });
      
      // Create group for the reseller
      const reseller = massImporterModal.reseller;
      let groupId = null;
      
      if (reseller && reseller.companyName) {
        setImportProgress({ 
          open: true, 
          current: 0, 
          total: data.length, 
          status: t('massImporterCreatingGroup') 
        });
        
        const groupPayload = {
          name: reseller.companyName,
          groupId: null,
          attributes: {}
        };
        
        const groupResponse = await fetchOrThrow('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupPayload)
        });
        
        const newGroup = await groupResponse.json();
        groupId = newGroup.id;
        
        // Update Redux store
        dispatch(groupsActions.add(newGroup));
        // Invalidate query caches
        queryClient.invalidateQueries(['groups']);
        queryClient.invalidateQueries(['devices']);
      }
      
      // Fetch existing users
      const usersResponse = await fetchOrThrow('/api/users');
      const existingUsers = await usersResponse.json();
      const userLookup = new Map();
      existingUsers.forEach(user => {
        if (user.login) userLookup.set(user.login.toLowerCase(), user);
        if (user.email) userLookup.set(user.email.toLowerCase(), user);
      });

      // Statistics
      let createdUsers = 0;
      let createdDevices = 0;
      let createdPermissions = 0;
      let skippedUsers = 0;
      const rowDetails = []; // Track detailed status of each row

      // Iterate through each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        setImportProgress({ 
          open: true, 
          current: i + 1, 
          total: data.length, 
          status: t('massImporterProcessingRow', { current: i + 1, total: data.length }) 
        });

        // Initialize row details
        const rowDetail = {
          row: i + 1,
          userLogin: row.userLogin,
          userFullName: row.userFullName,
          userEmail: row.userEmail,
          deviceName: row.deviceName,
          deviceUniqueId: row.deviceUniqueId,
          devicePhone: row.devicePhone,
          deviceModel: row.deviceModel,
          userStatus: null,
          userCreated: false,
          userSkipped: false,
          userError: null,
          userId: null,
          deviceStatus: null,
          deviceId: null,
          deviceError: null,
          permissions: {
            userToDevice: { created: false, error: null },
            resellerToDevice: { created: false, error: null },
            resellerToGroup: { created: false, error: null }
          }
        };

        try {
          // STEP 1: Check if user exists or create
          let userId = null;
          const userKey = row.userLogin?.toLowerCase();
          const emailKey = row.userEmail?.toLowerCase();
          
          if (userLookup.has(userKey) || userLookup.has(emailKey)) {
            userId = userLookup.get(userKey)?.id || userLookup.get(emailKey)?.id;
            skippedUsers++;
            rowDetail.userSkipped = true;
            rowDetail.userStatus = 'Skipped (already exists)';
          } else {
            // Create new user
            const userPayload = {
              name: row.userFullName || row.userLogin,
              login: row.userLogin,
              email: row.userEmail,
              password: row.userLogin,
              readonly: false,
              administrator: false,
              map: "googleRoad",
              latitude: 0,
              longitude: 0,
              zoom: 0,
              coordinateFormat: null,
              disabled: false,
              expirationTime: null,
              deviceLimit: parseInt(row.userDeviceLimit) || 0,
              userLimit: parseInt(row.userUserLimit) || 0,
              deviceReadonly: false,
              limitCommands: false,
              disableReports: false,
              fixedEmail: false,
              poiLayer: null,
              totpKey: null,
              temporary: false,
              attributes: {
                activeMapStyles: "locationIqStreets,locationIqDark,openFreeMap,osm,openTopoMap,carto,googleRoad,googleSatellite,googleHybrid",
                positionItems: "fixTime,address,totalDistance,course,altitude,accuracy,protocol,deviceTime,serverTime,index,hdop,vdop,pdop,sat,satVisible,rssi,coolantTemp,engineTemp,gps,roaming,latitude,longitude,event,alarm,status,odometer,serviceOdometer,tripOdometer,hours,steps,heartRate,valid,blocked,speed,ignition",
                mapLiveRoutes: "selected",
                mapFollow: true,
                speedUnit: "kmh",
                mapOnSelect: false,
                mapCluster: true,
                accessLevel: "{\"mainMenu\":true,\"deviceList\":true,\"reports\":true,\"geofences\":true,\"settings\":true,\"notifications\":true,\"account\":true,\"devices\":true,\"groups\":true,\"drivers\":true,\"calendars\":true,\"computedAttributes\":true,\"maintenance\":true,\"savedCommands\":true,\"announcement\":true,\"server\":true,\"users\":true,\"resellerPanel\":true,\"editSensors\":true,\"stopEngine\":true,\"resumeEngine\":true,\"replay\":true,\"sendCommand\":true,\"shareDevice\":true,\"anchor\":true,\"totalDistance\":true,\"hours\":true,\"changePicture\":true,\"moreInfo\":true}",
                mapGeofences: true,
                timezone: "America/Sao_Paulo"
              }
            };

            const userResponse = await fetchOrThrow('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userPayload)
            });
            
            const newUser = await userResponse.json();
            userId = newUser.id;
            userLookup.set(userKey, newUser);
            if (emailKey) userLookup.set(emailKey, newUser);
            createdUsers++;
            rowDetail.userCreated = true;
            rowDetail.userStatus = 'Created';
          }
          
          rowDetail.userId = userId;
          rowDetail.userStatus = rowDetail.userStatus || 'Created';

          // STEP 2: Create device
          const devicePayload = {
            name: row.deviceName,
            uniqueId: row.deviceUniqueId,
            groupId: groupId,
            phone: row.devicePhone || "",
            model: row.deviceModel || "",
            contact: "",
            category: "default",
            calendarId: null,
            expirationTime: null,
            disabled: false,
            attributes: {}
          };

          const deviceResponse = await fetchOrThrow('/api/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(devicePayload)
          });
          
          const newDevice = await deviceResponse.json();
          rowDetail.deviceId = newDevice.id;
          rowDetail.deviceStatus = 'Created';
          
          // Update Redux store with new device
          dispatch(devicesActions.update([newDevice]));
          
          createdDevices++;

          // STEP 3: Create permissions (User to Device)
          await fetchOrThrow('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              deviceId: newDevice.id
            })
          });
          
          createdPermissions++;
          rowDetail.permissions.userToDevice.created = true;

          // Create permission: Reseller (as userId) to Device
          if (reseller && reseller.resellerId) {
            await fetchOrThrow('/api/permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: reseller.resellerId,
                deviceId: newDevice.id
              })
            });
            
            createdPermissions++;
            rowDetail.permissions.resellerToDevice.created = true;
          }

          // Create permission: Reseller (as userId) to Group
          if (reseller && reseller.resellerId && groupId) {
            await fetchOrThrow('/api/permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: reseller.resellerId,
                groupId: groupId
              })
            });
            
            createdPermissions++;
            rowDetail.permissions.resellerToGroup.created = true;
          }

        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          
          // Extract first line of error message
          const errorMessage = error.message.split('\n')[0];
          
          // Try to capture which step failed based on error message and current state
          if (!rowDetail.userId) {
            rowDetail.userError = errorMessage;
            rowDetail.userStatus = `Failed: ${errorMessage}`;
          } else if (!rowDetail.deviceId) {
            rowDetail.deviceError = errorMessage;
            rowDetail.deviceStatus = `Failed: ${errorMessage}`;
          } else {
            // Permission error - determine which one
            if (!rowDetail.permissions.userToDevice.created) {
              rowDetail.permissions.userToDevice.error = errorMessage;
            } else if (reseller?.resellerId && !rowDetail.permissions.resellerToDevice.created) {
              rowDetail.permissions.resellerToDevice.error = errorMessage;
            } else if (reseller?.resellerId && groupId && !rowDetail.permissions.resellerToGroup.created) {
              rowDetail.permissions.resellerToGroup.error = errorMessage;
            }
          }
        } finally {
          // Always push row details, whether success or error
          rowDetails.push(rowDetail);
        }
      }

      // Close progress modal
      setImportProgress({ open: false, current: 0, total: 0, status: '' });
      
      // Revalidate devices and groups to propagate changes
      queryClient.invalidateQueries(['devices']);
      queryClient.invalidateQueries(['groups']);
      queryClient.invalidateQueries(['users']);
      
      // Generate log file
      const logContent = generateImportLog({
        reseller,
        totalRows: data.length,
        createdUsers,
        skippedUsers,
        createdDevices,
        createdPermissions,
        rowDetails
      });
      
      // Auto-download log file
      downloadLogFile(logContent, reseller?.companyName || 'import');
      
      // Show results
      const errorCount = rowDetails.filter(r => r.userError || r.deviceError || r.permissions.userToDevice.error || r.permissions.resellerToDevice.error || r.permissions.resellerToGroup.error).length;
      const summary = t('massImporterCompleted', {
        createdUsers,
        skippedUsers,
        createdDevices,
        createdPermissions,
        errors: errorCount
      });
      console.log(summary);
      setSnackbar({ 
        open: true, 
        message: summary, 
        severity: errorCount > 0 ? 'warning' : 'success' 
      });
      
      setMassImporterModal({ open: false, reseller: null });
      setUploadedXlsxFile(null);
      
    } catch (error) {
      console.error('Import error:', error);
      setImportProgress({ open: false, current: 0, total: 0, status: '' });
      setSnackbar({ open: true, message: t('massImporterImportFailed', { error: error.message }), severity: 'error' });
    }
  };

  // Helper function to generate import log content
  const generateImportLog = ({ reseller, totalRows, createdUsers, skippedUsers, createdDevices, createdPermissions, rowDetails }) => {
    const timestamp = new Date().toISOString();
    const resellerName = reseller?.companyName || 'Unknown Reseller';
    const resellerAppUrl = reseller?.appUrl || 'N/A';
    
    let log = `MASS IMPORTER LOG - ${resellerName}\n`;
    log += `${'='.repeat(80)}\n\n`;
    log += `Generated: ${timestamp}\n`;
    log += `Reseller: ${resellerName}\n`;
    log += `App URL: ${resellerAppUrl}\n`;
    log += `Total Rows Processed: ${totalRows}\n`;
    log += `${'='.repeat(80)}\n\n`;
    
    // Summary
    log += `SUMMARY:\n`;
    log += `${'-'.repeat(80)}\n`;
    log += `Users Created: ${createdUsers}\n`;
    log += `Users Skipped: ${skippedUsers}\n`;
    log += `Devices Created: ${createdDevices}\n`;
    log += `Permissions Created: ${createdPermissions}\n`;
    
    // Count permissions by type
    const userToDeviceCount = rowDetails.filter(r => r.permissions.userToDevice.created).length;
    const resellerToDeviceCount = rowDetails.filter(r => r.permissions.resellerToDevice.created).length;
    const resellerToGroupCount = rowDetails.filter(r => r.permissions.resellerToGroup.created).length;
    
    log += `  - User → Device: ${userToDeviceCount}\n`;
    log += `  - Reseller → Device: ${resellerToDeviceCount}\n`;
    log += `  - Reseller → Group: ${resellerToGroupCount}\n`;
    
    const errorCount = rowDetails.filter(r => r.userError || r.deviceError || r.permissions.userToDevice.error || r.permissions.resellerToDevice.error || r.permissions.resellerToGroup.error).length;
    log += `Rows with Errors: ${errorCount}\n`;
    log += `${'='.repeat(80)}\n\n`;
    
    // Detailed Row-by-Row Report
    log += `DETAILED ROW-BY-ROW REPORT:\n`;
    log += `${'='.repeat(80)}\n\n`;
    
    rowDetails.forEach((detail) => {
      log += `Row ${detail.row}: ${detail.userLogin || 'N/A'}\n`;
      log += `${'-'.repeat(80)}\n`;
      
      // User Status
      log += `  USER:\n`;
      log += `    Status: ${detail.userStatus || 'Not processed'}\n`;
      if (detail.userError) {
        log += `    Error: ${detail.userError}\n`;
      }
      if (detail.userId) {
        log += `    ID: ${detail.userId}\n`;
      }
      
      // Device Status
      log += `  DEVICE:\n`;
      log += `    Name: ${detail.deviceName}\n`;
      log += `    Unique ID: ${detail.deviceUniqueId}\n`;
      log += `    Status: ${detail.deviceStatus || 'Not processed'}\n`;
      if (detail.deviceError) {
        log += `    Error: ${detail.deviceError}\n`;
      }
      if (detail.deviceId) {
        log += `    ID: ${detail.deviceId}\n`;
      }
      
      // Permissions Status
      log += `  PERMISSIONS:\n`;
      
      // User → Device
      if (detail.permissions.userToDevice.created) {
        log += `    ✓ User → Device: Created\n`;
      } else if (detail.permissions.userToDevice.error) {
        log += `    ✗ User → Device: FAILED - ${detail.permissions.userToDevice.error}\n`;
      } else {
        log += `    - User → Device: Not created\n`;
      }
      
      // Reseller → Device
      if (detail.permissions.resellerToDevice.created) {
        log += `    ✓ Reseller → Device: Created\n`;
      } else if (detail.permissions.resellerToDevice.error) {
        log += `    ✗ Reseller → Device: FAILED - ${detail.permissions.resellerToDevice.error}\n`;
      } else if (detail.userId && detail.deviceId) {
        log += `    - Reseller → Device: Not created (missing resellerId)\n`;
      }
      
      // Reseller → Group
      if (detail.permissions.resellerToGroup.created) {
        log += `    ✓ Reseller → Group: Created\n`;
      } else if (detail.permissions.resellerToGroup.error) {
        log += `    ✗ Reseller → Group: FAILED - ${detail.permissions.resellerToGroup.error}\n`;
      } else if (detail.userId && detail.deviceId && reseller?.resellerId) {
        log += `    - Reseller → Group: Not created (missing groupId)\n`;
      }
      
      log += `\n`;
    });
    
    log += `END OF LOG\n`;
    log += `${'='.repeat(80)}\n`;
    
    return log;
  };

  // Helper function to download log file
  const downloadLogFile = (content, filename) => {
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mass-import-log-${filename}-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading log file:', error);
    }
  };

  // Build functions for mobile apps
  const handleBuildApp = async (reseller, buildType) => {
    if (!reseller || !reseller.appUrl || !reseller.companyName) {
      setSnackbar({
        open: true,
        message: 'Missing required reseller data for build',
        severity: 'error'
      });
      return;
    }

    // Use appUrl as the unique identifier
    const resellerId = reseller.appUrl;
    const currentState = getBuildState(resellerId, buildType);

    // Handle different states
    if (currentState === 'NOT_BUILDED') {
      // For iOS, show build type selection modal
      if (buildType === 'ios') {
        setIosBuildTypeModal({ open: true, reseller });
        return;
      }
      // Start new build for other types
      await startBuild(reseller, buildType);
    } else if (currentState === 'BUILDING') {
      // Show status modal
      setBuildStatusModal({
        open: true,
        reseller,
        buildType
      });
    } else if (currentState === 'BUILD_ERROR') {
      // Show error modal with retry option
      setBuildStatusModal({
        open: true,
        reseller,
        buildType
      });
    } else if (currentState === 'BUILDED') {
      // Download the file
      await downloadBuild(reseller, buildType);
    }
  };

  // Handle iOS build type selection
  const handleIosBuildType = async (reseller, iosBuildType) => {
    setIosBuildTypeModal({ open: false, reseller: null });
    await startBuild(reseller, `ios_${iosBuildType}`);
  };

  // Handle iOS button click - check for existing iOS builds first
  const handleIosButtonClick = async (reseller) => {
    const resellerId = reseller.appUrl;
    const simulatorState = getBuildState(resellerId, 'ios_simulator');
    const deviceState = getBuildState(resellerId, 'ios_device');

    // Check if any iOS build is active (building, built, or error)
    const hasSimulatorBuild = simulatorState === 'BUILDING' || simulatorState === 'BUILDED' || simulatorState === 'BUILD_ERROR';
    const hasDeviceBuild = deviceState === 'BUILDING' || deviceState === 'BUILDED' || deviceState === 'BUILD_ERROR';

    if (hasSimulatorBuild && hasDeviceBuild) {
      // Both exist, prioritize the one that's currently building
      if (simulatorState === 'BUILDING') {
        setBuildStatusModal({ open: true, reseller, buildType: 'ios_simulator' });
      } else if (deviceState === 'BUILDING') {
        setBuildStatusModal({ open: true, reseller, buildType: 'ios_device' });
      } else {
        // Both are built or error, show simulator first
        setBuildStatusModal({ open: true, reseller, buildType: 'ios_simulator' });
      }
    } else if (hasSimulatorBuild) {
      setBuildStatusModal({ open: true, reseller, buildType: 'ios_simulator' });
    } else if (hasDeviceBuild) {
      setBuildStatusModal({ open: true, reseller, buildType: 'ios_device' });
    } else {
      // No existing iOS builds, show build type selection modal
      setIosBuildTypeModal({ open: true, reseller });
    }
  };

  // Get iOS button title based on build states
  const getIosButtonTitle = (appUrl) => {
    const simulatorState = getBuildState(appUrl, 'ios_simulator');
    const deviceState = getBuildState(appUrl, 'ios_device');

    // Check if any iOS build is active
    const hasSimulatorBuild = simulatorState === 'BUILDING' || simulatorState === 'BUILDED' || simulatorState === 'BUILD_ERROR';
    const hasDeviceBuild = deviceState === 'BUILDING' || deviceState === 'BUILDED' || deviceState === 'BUILD_ERROR';

    if (hasSimulatorBuild || hasDeviceBuild) {
      // If both exist, prioritize the one that's building
      if (simulatorState === 'BUILDING' || deviceState === 'BUILDING') {
        return t('checkStatus');
      } else if (simulatorState === 'BUILDED' || deviceState === 'BUILDED') {
        return t('download');
      } else if (simulatorState === 'BUILD_ERROR' || deviceState === 'BUILD_ERROR') {
        return t('retry');
      }
    }

    return t('build');
  };

  // Start a new build
  const startBuild = async (reseller, buildType) => {
    const resellerId = reseller.appUrl;
    const buildKey = `${resellerId}_${buildType}`;

    try {
      const buildData = {
        appUrl: reseller.appUrl,
        companyName: reseller.companyName,
        parentUserId: reseller.parentUserId,
        resellerId: reseller.resellerId,
        currentDomain: reseller.currentDomain || 'gps',
        buildType: buildType // Add build type to request
      };


      // Show loading while waiting for API response
      setBuildLoading(prev => ({ ...prev, [buildKey]: true }));

      const response = await fetch(resellersConfig.ENDPOINTS.BUILD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Store reseller data for polling system
      const resellerDataForPolling = {
        appUrl: reseller.appUrl,
        parentUserId: reseller.parentUserId,
        currentDomain: reseller.currentDomain || 'gps'
      };

      // Update state to BUILDING after successful API call with reseller data

      updateBuildState(resellerId, buildType, 'BUILDING', resellerDataForPolling);

      // Verify the state was set immediately
      const immediateState = getBuildState(resellerId, buildType);

      // Verify the state was set after a delay
      setTimeout(() => {
        const currentState = getBuildState(resellerId, buildType);

        // Also check localStorage directly
        const localStorageState = localStorage.getItem('resellerBuildStates');
      }, 100);

      setSnackbar({
        open: true,
        message: `${buildType.toUpperCase()} build started successfully!`,
        severity: 'success'
      });

      // Show status modal
      setBuildStatusModal({
        open: true,
        reseller,
        buildType
      });

      // Clear loading state immediately after API call
      setBuildLoading(prev => {
        const newState = { ...prev, [buildKey]: false };
        return newState;
      });

      // Add build to global polling system
      getBuildStatusManager().addBuildToPolling(resellerId, buildType);

    } catch (error) {
      console.error(`❌ Error starting ${buildType.toUpperCase()} build:`, error);
      updateBuildState(resellerId, buildType, 'BUILD_ERROR');
      setSnackbar({
        open: true,
        message: `${t('failedToStartBuild')} ${buildType.toUpperCase()} build: ${error.message}`,
        severity: 'error'
      });
      // Clear loading state on error too
      setBuildLoading(prev => ({ ...prev, [buildKey]: false }));
    }
  };

  // Check build status
  const checkBuildStatus = async (reseller, buildType) => {
    const resellerId = reseller.appUrl; // Use appUrl as unique identifier

    try {

      const statusUrl = resellersConfig.ENDPOINTS.BUILD_STATUS(
        reseller.appUrl,
        reseller.parentUserId,
        reseller.currentDomain || 'gps',
        buildType
      );


      const response = await fetch(statusUrl);
      const status = await response.json();


      // Use the buildStatus from the server response
      const serverBuildStatus = status.data.buildStatus;

      // Get current state before updating
      const currentLocalState = getBuildState(resellerId, buildType);

      // Only update state if it's different from current state
      // and if the server returns a valid status
      if (serverBuildStatus === 'BUILDED' && currentLocalState !== 'BUILDED') {
        updateBuildState(resellerId, buildType, 'BUILDED');
        return { status: 'BUILDED', data: status.data };
      } else if (serverBuildStatus === 'BUILDING') {
        // Always allow transitioning to BUILDING to show progress
        if (currentLocalState !== 'BUILDING') {
          updateBuildState(resellerId, buildType, 'BUILDING');
        }
        return { status: 'BUILDING', data: status.data };
      } else if (serverBuildStatus === 'PARTIAL_BUILDED') {
        updateBuildState(resellerId, buildType, 'PARTIAL_BUILDED');
        return { status: 'PARTIAL_BUILDED', data: status.data };
      } else if (serverBuildStatus === 'NOT_BUILDED') {
        // Don't downgrade from BUILDING or BUILDED to NOT_BUILDED
        // This prevents accidental restarts
        if (currentLocalState === 'NOT_BUILDED' || currentLocalState === 'BUILD_ERROR') {
          return { status: 'NOT_BUILDED', data: status.data };
        }
        // If we were building but server says not builded, keep BUILDING state
        return { status: currentLocalState, data: status.data };
      }
    } catch (error) {
      console.error(`❌ Error checking build status:`, error);
      // Only update to ERROR if not already built
      if (getBuildState(resellerId, buildType) !== 'BUILDED') {
        updateBuildState(resellerId, buildType, 'BUILD_ERROR');
      }
      return { status: 'BUILD_ERROR', error: error.message };
    }
  };

  // Note: Polling is now handled by the global buildStatusManager
  // No need for individual polling functions in this component

  // Download build file
  const downloadBuild = async (reseller, buildType) => {
    try {

      // Construct download URL (simplified - only need appUrl and buildType)
      const downloadUrl = resellersConfig.ENDPOINTS.DOWNLOAD(
        reseller.appUrl,
        buildType
      );


      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${reseller.appUrl}.${buildType}`;
      link.target = '_blank';

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSnackbar({
        open: true,
        message: `${buildType.toUpperCase()} ${t('downloadStarted')}`,
        severity: 'success'
      });
    } catch (error) {
      console.error(`❌ Error downloading ${buildType.toUpperCase()}:`, error);
      setSnackbar({
        open: true,
        message: `${t('downloadFailed')} ${buildType.toUpperCase()}: ${error.message}`,
        severity: 'error'
      });
    }
  };

  // Clean apps function
  const cleanApps = async (reseller, cleanType) => {
    const cleanKey = `${reseller.appUrl}_${cleanType}`;

    try {
      // Set loading state
      setCleanLoading(prev => ({ ...prev, [cleanKey]: true }));


      const requestBody = {
        appUrl: reseller.appUrl,
        resellerId: reseller.resellerId, // Use reseller.resellerId (not reseller.id)
        cleanType: cleanType
      };

      const response = await fetch(resellersConfig.ENDPOINTS.CLEAN_APPS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();

      // Reset build states in localStorage
      // Now that reseller.id is properly set, we can use it for build keys
      const resellerId = reseller.id;

      const buildKeysToReset = [];
      if (cleanType === 'apk' || cleanType === 'both') {
        buildKeysToReset.push(`${resellerId}_apk`);
      }
      if (cleanType === 'aab' || cleanType === 'both') {
        buildKeysToReset.push(`${resellerId}_aab`);
      }
      if (cleanType === 'ios' || cleanType === 'ios_simulator' || cleanType === 'ios_device' || cleanType === 'both') {
        // For iOS cleaning, we need to reset both ios_simulator and ios_device keys
        // since the backend cleans the same .app file for all iOS build types
        buildKeysToReset.push(`${resellerId}_ios_simulator`);
        buildKeysToReset.push(`${resellerId}_ios_device`);
        // Also reset the old ios key for backward compatibility
        buildKeysToReset.push(`${resellerId}_ios`);
      }


      setBuildStates(prev => {
        const newStates = { ...prev };
        buildKeysToReset.forEach(key => {
          delete newStates[key];
        });
        return newStates;
      });

      // Update localStorage
      const savedStates = localStorage.getItem('resellerBuildStates');
      if (savedStates) {
        const states = JSON.parse(savedStates);
        buildKeysToReset.forEach(key => {
          delete states[key];
        });
        localStorage.setItem('resellerBuildStates', JSON.stringify(states));
      }

      setSnackbar({
        open: true,
        message: `${cleanType === 'both' ? t('allAppsCleanedSuccessfully') : cleanType.toUpperCase() + ' ' + t('appsCleanedSuccessfully')}`,
        severity: 'success'
      });

      setCleanAppsModal({ open: false, reseller: null });
    } catch (error) {
      console.error(`❌ Error cleaning ${cleanType}:`, error);
      setSnackbar({
        open: true,
        message: `${t('errorCleaning')} ${cleanType}`,
        severity: 'error'
      });
    } finally {
      // Clear loading state
      setCleanLoading(prev => ({ ...prev, [cleanKey]: false }));
    }
  };

  const [usersFetched, setUsersFetched] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [domainCheckResult, setDomainCheckResult] = useState(null);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [domainValid, setDomainValid] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isCompressingFavicon, setIsCompressingFavicon] = useState(false);
  const [isCompressingAppImage, setIsCompressingAppImage] = useState(false);
  const [isCompressingNotificationIcon, setIsCompressingNotificationIcon] = useState(false);

  // Fetch resellers with TanStack Query
  const { data: resellersData, isLoading, error, refetch } = useQuery({
    queryKey: ['resellers', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID is required');
      }

      const response = await fetch(resellersConfig.ENDPOINTS.LIST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentUserId: user.id,
          currentDomain: window.location.hostname
        }),
      });

      if (!response.ok) {
        throw new Error(t('failedToFetchResellers'));
      }

      const data = await response.json();
      return data.resellers || [];
    },
    enabled: isVisible && !!user?.id, // Only fetch when popover is visible and user is logged in
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Add missing id field to resellers (use appUrl as id since it's unique)
  const resellersWithId = (resellersData || [])
    .filter(reseller => reseller.appUrl) // Filter out resellers without appUrl
    .map((reseller, index) => ({
      ...reseller,
      id: reseller.appUrl || `reseller_${index}` // Use appUrl as unique identifier, fallback to index
    }));

  // Filter resellers based on search keyword
  const filteredResellers = resellersWithId.filter(reseller =>
    reseller.companyName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    reseller.appUrl?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    reseller.resellerEmail?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    reseller.resellerUser?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  // Debounced fetch users function
  const debouncedFetchUsers = useCallback(() => {
    const timeoutId = setTimeout(async () => {
      if (usersFetched) return; // Only fetch once

      setUsersLoading(true);
      setUsersError(null);

      try {
        const response = await fetch('/api/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(t('failedToFetchUsers'));
        }

        const data = await response.json();
        // Store all users for filtering, but show only first 10 initially
        setUsers(data || []);
        setUsersFetched(true);

        // Open autocomplete and focus after data loads
        setTimeout(() => {
          setAutocompleteOpen(true);
          setTimeout(() => {
            const input = document.querySelector('input[aria-autocomplete="list"]');
            if (input) {
              input.focus();
            }
          }, 100);
        }, 0);
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsersError(error.message);
      } finally {
        setUsersLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [usersFetched]);

  // Function to trigger debounced fetch
  const fetchUsers = () => {
    if (!usersFetched) {
      debouncedFetchUsers();
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredResellers.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedResellers = filteredResellers.slice(startIndex, startIndex + pageSize);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Reset all state when component unmounts
      setSearchKeyword('');
      setSelectedReseller(null);
      setAnchorEl(null);
      setDeleteDialog(false);
      setResellerToDelete(null);
      handleCloseEditDialog();
      setPage(1);
    };
  }, []);


  // Handle edit reseller
  const handleEdit = (reseller) => {
    setEditingReseller({
      ...reseller,
    });
    setIsEditMode(true);
    setActiveTab(0);
    setEditDialog(true);
    setAnchorEl(null);
  };

  // Handle delete reseller
  const handleDelete = (reseller) => {
    setResellerToDelete(reseller);
    setDeleteDialog(true);
    setAnchorEl(null);
  };

  const handleLogs = async (reseller) => {

    setSelectedReseller(reseller);
    setLogsDialog(true);
    setLogsLoading(true);
    setAnchorEl(null);

    try {
      const response = await fetchOrThrow(resellersConfig.ENDPOINTS.LOGS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: reseller.appUrl }),
      });


      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        console.error(`❌ ${t('failedToFetchLogs')}, status:`, response.status);
        setLogs([]);
      }
    } catch (error) {
      console.error('❌ Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleDeleteLogs = async () => {
    if (!selectedReseller) return;

    setLogsDeleting(true);

    try {
      const response = await fetchOrThrow(resellersConfig.ENDPOINTS.LOGS_DELETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: selectedReseller.appUrl }),
      });

      if (response.ok) {
        setLogs([]); // Clear the logs in the UI
        // Optionally show a success message
      } else {
        console.error('❌ Failed to delete logs');
      }
    } catch (error) {
      console.error('❌ Error deleting logs:', error);
    } finally {
      setLogsDeleting(false);
    }
  };

  // Handle delete confirmation
  const confirmDelete = () => {
    if (resellerToDelete) {
      deleteResellerMutation.mutate(resellerToDelete);
    }
  };

  // Handle delete cancellation
  const cancelDelete = () => {
    setDeleteDialog(false);
    setResellerToDelete(null);
  };

  // Handle domain checking
  const handleCheckDomain = async () => {
    const domain = editingReseller?.appUrl || editingReseller?.url;
    if (!domain || domain.trim() === '') {
      setSnackbar({ open: true, message: t('domainCheckEmptyError'), severity: 'error' });
      return;
    }

    setIsCheckingDomain(true);
    setDomainCheckResult(null);
    setDomainValid(false);

    try {
      const response = await fetch(resellersConfig.ENDPOINTS.CHECK_DOMAIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      const result = await response.json();
      setDomainCheckResult(result);

      if (result.success) {
        setDomainValid(true);
        setSnackbar({
          open: true,
          message: `✅ ${t('domainCheckSuccessTitle').replace('{ipAddress}', result.ipAddress)}`,
          severity: 'success'
        });
      } else {
        setDomainValid(false);
        setSnackbar({
          open: true,
          message: `❌ ${t('domainCheckErrorTitle').replace('{message}', result.message)}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error checking domain:', error);
      setDomainValid(false);
      setSnackbar({
        open: true,
        message: t('domainCheckNetworkError'),
        severity: 'error'
      });
    } finally {
      setIsCheckingDomain(false);
    }
  };

  // Mutations
  const createResellerMutation = useMutation({
    mutationFn: async (resellerData) => {
      // Create FormData to send both validation data and image
      const formData = new FormData();

      // Add all reseller data as JSON
      formData.append('resellerData', JSON.stringify(resellerData));

      // Add individual fields for backend processing
      Object.keys(resellerData).forEach(key => {
        formData.append(key, resellerData[key]);
      });

      // Add images if selected
      if (selectedImage && resellerData.appUrl) {
        formData.append('image', selectedImage);
        formData.append('filename', `${resellerData.appUrl}.png`);
      }

      // Add favicon if selected
      if (selectedFavicon && resellerData.appUrl) {
        formData.append('favicon', selectedFavicon);
        formData.append('faviconFilename', `${resellerData.appUrl}_favicon.png`);
      }

      // Add app image if selected
      if (selectedAppImage && resellerData.appUrl) {
        formData.append('appImage', selectedAppImage);
        formData.append('appImageFilename', `${resellerData.appUrl}_app.png`);
      }

      // Add notification icon if selected
      if (selectedNotificationIcon && resellerData.appUrl) {
        formData.append('notificationIcon', selectedNotificationIcon);
        formData.append('notificationIconFilename', `${resellerData.appUrl}_notification.png`);
      }

      const response = await fetch(resellersConfig.ENDPOINTS.CREATE, {
        method: 'POST',
        body: formData, // Send as FormData instead of JSON
      });

      if (!response.ok) {
        const error = await response.json();

        // Handle domain conflict specifically
        if (response.status === 409 && error.details) {
          const { domain, whatsapp, existingReseller } = error.details;

          if (domain) {
            throw new Error(`Domain '${domain}' is already registered by ${existingReseller.company} (${existingReseller.email})`);
          } else if (whatsapp) {
            throw new Error(`WhatsApp number '${whatsapp}' is already registered by ${existingReseller.company} (${existingReseller.email})`);
          }
        }

        throw new Error(error.message || 'Failed to create reseller');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers', user?.id] });
      queryClient.refetchQueries({ queryKey: ['resellers', user?.id] });
      handleCloseEditDialog();
      setSnackbar({ open: true, message: t('resellerCreatedSuccess'), severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `${t('resellerCreateError')}: ${error.message}`, severity: 'error' });
    },
  });

  const updateResellerMutation = useMutation({
    mutationFn: async ({ id, ...resellerData }) => {
      // Create FormData to send both validation data and images
      const formData = new FormData();

      // Add all reseller data as JSON
      formData.append('resellerData', JSON.stringify(resellerData));

      // Add individual fields for backend processing
      Object.keys(resellerData).forEach(key => {
        formData.append(key, resellerData[key]);
      });

      // Add images if selected
      if (selectedImage && resellerData.appUrl) {
        formData.append('image', selectedImage);
        formData.append('filename', `${resellerData.appUrl}.png`);
      }

      // Add favicon if selected
      if (selectedFavicon && resellerData.appUrl) {
        formData.append('favicon', selectedFavicon);
        formData.append('faviconFilename', `${resellerData.appUrl}_favicon.png`);
      }

      // Add app image if selected
      if (selectedAppImage && resellerData.appUrl) {
        formData.append('appImage', selectedAppImage);
        formData.append('appImageFilename', `${resellerData.appUrl}_app.png`);
      }

      // Add notification icon if selected
      if (selectedNotificationIcon && resellerData.appUrl) {
        formData.append('notificationIcon', selectedNotificationIcon);
        formData.append('notificationIconFilename', `${resellerData.appUrl}_notification.png`);
      }

      const response = await fetch(resellersConfig.ENDPOINTS.UPDATE(id), {
        method: 'PUT',
        body: formData, // Send as FormData instead of JSON
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update reseller');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers', user?.id] });
      queryClient.refetchQueries({ queryKey: ['resellers', user?.id] });
      handleCloseEditDialog();
      setSnackbar({ open: true, message: t('resellerUpdatedSuccess'), severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `${t('resellerUpdateError')}: ${error.message}`, severity: 'error' });
    },
  });

  const deleteResellerMutation = useMutation({
    mutationFn: async (reseller) => {
      const response = await fetch(resellersConfig.ENDPOINTS.DELETE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentDomain: window.location.hostname,
          appUrl: reseller.appUrl,
          parentUserId: user?.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete reseller');
      }

      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers', user?.id] });
      queryClient.refetchQueries({ queryKey: ['resellers', user?.id] });
      setDeleteDialog(false);
      setResellerToDelete(null);
      setSnackbar({ open: true, message: t('resellerDeletedSuccess'), severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `${t('resellerDeleteError')}: ${error.message}`, severity: 'error' });
    },
  });

  // Handle save reseller
  const handleSaveReseller = async (e) => {
    e?.preventDefault(); // Prevent form submission
    if (!editingReseller) return;

    // Validate that a user is selected
    if (!editingReseller.resellerId || editingReseller.resellerId === '') {
      setSnackbar({ open: true, message: t('pleaseSelectUserForResellerId'), severity: 'error' });
      return;
    }

    // Validate that all required images are selected
    if (!selectedImage && !editingReseller.logotype && !editingReseller.logo) {
      setSnackbar({ open: true, message: t('companyLogoRequired'), severity: 'error' });
      return;
    }

    if (!selectedFavicon) {
      setSnackbar({ open: true, message: t('faviconImageRequired'), severity: 'error' });
      return;
    }

    if (!selectedAppImage) {
      setSnackbar({ open: true, message: t('appImageRequired'), severity: 'error' });
      return;
    }

    if (!selectedNotificationIcon) {
      setSnackbar({ open: true, message: t('notificationIconRequired'), severity: 'error' });
      return;
    }

    // Create payload matching the exact structure you specified
    const fullPayload = {
      currentDomain: window.location.hostname,
      parentUserId: user?.id || '',
      parentUser: user?.name || user?.login || '',
      parentEmail: user?.email || '',
      resellerId: editingReseller.resellerId || '',
      resellerUser: editingReseller.resellerUser || '',
      resellerEmail: editingReseller.resellerEmail || '',
      companyName: editingReseller.companyName || '',
      logotype: editingReseller.logotype || editingReseller.logo || '',
      appUrl: editingReseller.appUrl || editingReseller.url || '',
      whatsapp: editingReseller.whatsapp || '',
      billingEmail: editingReseller.billingEmail || '',
      supportEmail: editingReseller.supportEmail || '',
      resellerLimit: parseInt(editingReseller.resellerLimit) || 0,
      deviceLimit: parseInt(editingReseller.deviceLimit) || 0,
      userLimit: parseInt(editingReseller.userLimit) || 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };


    if (isEditMode) {
      // Update existing reseller
      updateResellerMutation.mutate({ id: editingReseller.id || editingReseller.resellerId, ...fullPayload });
    } else {
      // Create new reseller - validation happens first, then image upload
      createResellerMutation.mutate(fullPayload);
    }
  };

  // Handle closing edit dialog
  const handleCloseEditDialog = () => {
    setEditDialog(false);
    setEditingReseller(null);
    setIsEditMode(false);
    setSelectedImage(null);
    setImagePreview(null);
    setImageError('');

    // Reset new image fields
    setSelectedFavicon(null);
    setFaviconPreview(null);
    setFaviconError('');

    setSelectedAppImage(null);
    setAppImagePreview(null);
    setAppImageError('');

    setSelectedNotificationIcon(null);
    setNotificationIconPreview(null);
    setNotificationIconError('');

    setDomainCheckResult(null);
    setDomainValid(false);
  };

  // Handle image selection with compression
  const handleImageSelect = useCatch(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset file input
    event.target.value = '';

    // Validate file type and size
    const validation = validateImageFile(file, 2048); // 2MB max input
    if (!validation.success) {
      setErrorModal({
        open: true,
        title: t('imageUploadError'),
        message: t('resellerImageValidationError', { maxSize: 2048 })
      });
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    // Clear previous errors
    setImageError('');
    setIsCompressingImage(true);

    try {
      const originalSizeKB = (file.size / 1024).toFixed(1);

      // Check if image is already small enough (under 15KB)
      if (file.size <= 15 * 1024) {
        // Image is already small enough, no compression needed
        setSelectedImage(file);

        // Create preview from original file
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);

        setSnackbar({
          open: true,
          message: t('resellerImageAlreadySmall', { size: originalSizeKB }),
          severity: 'success'
        });
      } else {
        // Compress the image
        const compressedFile = await compressImage(file, {
          maxSizeKB: 15,
          minSizeKB: 10,
          maxWidth: 400,
          maxHeight: 400,
          outputFormat: 'image/png',
          initialQuality: 0.8
        });

        // Set the compressed image
        setSelectedImage(compressedFile);

        // Create preview from compressed file
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(compressedFile);

        // Show compression success message
        const compressedSizeKB = (compressedFile.size / 1024).toFixed(1);
        setSnackbar({
          open: true,
          message: t('resellerImageCompressedSuccess', { originalSize: originalSizeKB, compressedSize: compressedSizeKB }),
          severity: 'success'
        });
      }

    } catch (error) {
      console.error('Error compressing image:', error);
      setImageError(t('resellerImageCompressionError'));
      setSelectedImage(null);
      setImagePreview(null);
    } finally {
      setIsCompressingImage(false);
    }
  });

  // Handle favicon selection (must be square)
  const handleFaviconSelect = useCatch(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';
    setFaviconError('');

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorModal({
        open: true,
        title: t('faviconUploadError'),
        message: t('pleaseSelectValidImageFile')
      });
      return;
    }

    // Check if image is square
    const img = new Image();
    img.onload = async () => {
      if (img.width !== img.height) {
        setErrorModal({
          open: true,
          title: t('faviconUploadError'),
          message: t('faviconMustBeSquare')
        });
        setSelectedFavicon(null);
        setFaviconPreview(null);
        return;
      }

      // Image is square, compress and proceed
      setIsCompressingFavicon(true);
      try {
        const compressedFile = await compressImage(file, {
          maxSizeKB: 20,
          minSizeKB: 5,
          maxWidth: 64,
          maxHeight: 64,
          outputFormat: 'image/png',
          initialQuality: 0.9
        });

        setSelectedFavicon(compressedFile);
        const reader = new FileReader();
        reader.onload = (e) => {
          setFaviconPreview(e.target.result);
        };
        reader.readAsDataURL(compressedFile);
        setIsCompressingFavicon(false);
      } catch (error) {
        console.error('Error compressing favicon:', error);
        setErrorModal({
          open: true,
          title: t('faviconUploadError'),
          message: t('errorCompressingImage')
        });
        setIsCompressingFavicon(false);
      }
    };
    img.src = URL.createObjectURL(file);
  });

  // Handle app image selection (must be 1024x1024)
  const handleAppImageSelect = useCatch(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';
    setAppImageError('');

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorModal({
        open: true,
        title: t('appImageUploadError'),
        message: t('pleaseSelectValidImageFile')
      });
      return;
    }

    // Check dimensions
    const img = new Image();
    img.onload = async () => {
      if (img.width !== 1024 || img.height !== 1024) {
        setErrorModal({
          open: true,
          title: t('appImageUploadError'),
          message: t('appImageMustBeExactSize')
        });
        setSelectedAppImage(null);
        setAppImagePreview(null);
        return;
      }

      // Image has correct dimensions, compress and proceed
      setIsCompressingAppImage(true);
      try {
        const compressedFile = await compressImage(file, {
          maxSizeKB: 200,
          minSizeKB: 50,
          maxWidth: 1024,
          maxHeight: 1024,
          outputFormat: 'image/png',
          initialQuality: 0.8
        });

        setSelectedAppImage(compressedFile);
        const reader = new FileReader();
        reader.onload = (e) => {
          setAppImagePreview(e.target.result);
        };
        reader.readAsDataURL(compressedFile);
        setIsCompressingAppImage(false);
      } catch (error) {
        console.error('Error compressing app image:', error);
        setErrorModal({
          open: true,
          title: t('appImageUploadError'),
          message: t('errorCompressingImage')
        });
        setIsCompressingAppImage(false);
      }
    };
    img.src = URL.createObjectURL(file);
  });

  // Handle notification icon selection (must be 192x192)
  const handleNotificationIconSelect = useCatch(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';
    setNotificationIconError('');

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorModal({
        open: true,
        title: t('notificationIconUploadError'),
        message: t('pleaseSelectValidImageFile')
      });
      return;
    }

    // Check dimensions
    const img = new Image();
    img.onload = async () => {
      if (img.width !== 192 || img.height !== 192) {
        setErrorModal({
          open: true,
          title: t('notificationIconUploadError'),
          message: t('notificationIconMustBeExactSize')
        });
        setSelectedNotificationIcon(null);
        setNotificationIconPreview(null);
        return;
      }

      // Image has correct dimensions, compress and proceed
      setIsCompressingNotificationIcon(true);
      try {
        const compressedFile = await compressImage(file, {
          maxSizeKB: 30,
          minSizeKB: 10,
          maxWidth: 192,
          maxHeight: 192,
          outputFormat: 'image/png',
          initialQuality: 0.9
        });

        setSelectedNotificationIcon(compressedFile);
        const reader = new FileReader();
        reader.onload = (e) => {
          setNotificationIconPreview(e.target.result);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Error compressing notification icon:', error);
        setNotificationIconError(t('errorCompressingImage'));
      }
    };
    img.src = URL.createObjectURL(file);
  });

  // Upload image to server
  const uploadImage = async (file, appUrl, parentUserId, resellerId) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('filename', `${appUrl}.png`);
    formData.append('appUrl', appUrl);
    formData.append('parentUserId', parentUserId);
    formData.append('resellerId', resellerId);

    try {
      const response = await fetch(resellersConfig.ENDPOINTS.UPLOAD, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return result.url || result.filename;
      } else {
        const error = await response.json();
        console.error('❌ Error uploading image:', error);
        throw new Error(error.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Network error uploading image:', error);
      throw error;
    }
  };

  // Menu actions - memoized to prevent recreation on every render
  const actions = useMemo(() => [
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      handler: handleEdit,
      show: (reseller) => canEditReseller(reseller),
    },
    {
      key: 'logs',
      title: 'Logs',
      icon: <BugReportIcon fontSize="small" />,
      handler: handleLogs,
      show: (reseller) => canEditReseller(reseller),
    },
    {
      key: 'clean-apps',
      title: t('cleanApps'),
      icon: <RefreshIcon fontSize="small" />,
      handler: (reseller) => {
        setCleanAppsModal({ open: true, reseller });
        setAnchorEl(null); // Close the action menu
      },
      show: (reseller) => canEditReseller(reseller),
    },
    {
      key: 'mass-importer',
      title: t('massImporter'),
      icon: <GoArchive fontSize="small" />,
      handler: (reseller) => {
        setMassImporterModal({ open: true, reseller });
        setAnchorEl(null); // Close the action menu
      },
      show: (reseller) => canEditReseller(reseller),
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: handleDelete,
      show: (reseller) => canEditReseller(reseller),
    },
  ], [t, canEditReseller, handleEdit, handleLogs, handleDelete]);

  const getStatusIcon = useCallback((reseller) => {
    if (reseller.status === 'inactive') return <BlockIcon />;
    return <CheckIcon />;
  }, []);

  const getStatusColor = useCallback((reseller) => {
    return reseller.status === 'active' ? colors.success : colors.error;
  }, [colors.success, colors.error]);

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="floating-resellers-popover"
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: 'fixed',
              top: !desktop ? '0px' : '8px',
              left: !desktop ? '0px' : (isMenuExpanded ? '200px' : '63px'),
              width: !desktop ? '100vw' : `calc(100vw - ${isMenuExpanded ? '200px' : '63px'} - 10px)`,
              height: !desktop ? '100vh' : 'calc(100vh - 16px)',
              zIndex: 9999,
              pointerEvents: 'auto',
              transition: 'left 0.3s ease'
            }}
          >
            <div style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: !desktop ? '0px' : '0px 16px 16px 0px',
              height: '100%',
              overflow: 'hidden',
              boxShadow: !desktop ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconButton
                    onClick={onClose}
                    size="small"
                    style={{ color: colors.textSecondary }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                    {t('resellerPanel')}
                  </Typography>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <IconButton
                    onClick={() => {
                      setEditingReseller({
                        id: null,
                        resellerId: '',
                        name: '',
                        email: '',
                        phone: '',
                        website: '',
                        status: 'active',
                        resellerLimit: 5,
                        deviceLimit: 50,
                        userLimit: 25,
                        logo: '',
                        whatsapp: '',
                        billingEmail: '',
                        supportEmail: '',
                        appUrl: '',
                        logotype: ''
                      });
                      setIsEditMode(false);
                      setActiveTab(0);
                      setEditDialog(true);
                    }}
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.text,
                      width: '40px',
                      height: '40px',
                    }}
                    title={t('sharedAdd')}
                  >
                    <AddIcon />
                  </IconButton>
                </div>
              </div>

              {/* Search */}
              <div style={{
                padding: '12px 20px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}>
                <TextField
                  placeholder={t('sharedSearch')}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon style={{ color: colors.textSecondary }} fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    flex: 1,
                    minWidth: '120px',
                    '& .MuiOutlinedInputRoot': {
                      borderRadius: '8px',
                    },
                  }}
                />
              </div>

              {/* Resellers Table */}
              <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow style={{ backgroundColor: colors.surface }}>
                        <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('resellerCompany')}
                        </TableCell>
                        {desktop && (
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('userEmail')}
                          </TableCell>
                        )}
                        {desktop && (
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('sharedPhone')}
                          </TableCell>
                        )}
                        <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          Apps
                        </TableCell>
                        <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('sharedActions')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={desktop ? 5 : 3} align="center" style={{ padding: '20px' }}>
                            <CircularProgress size={24} />
                          </TableCell>
                        </TableRow>
                      ) : error ? (
                        <TableRow>
                          <TableCell colSpan={desktop ? 5 : 3} align="center" style={{ padding: '20px', color: colors.error }}>
                            Error loading resellers: {error.message}
                          </TableCell>
                        </TableRow>
                      ) : paginatedResellers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={desktop ? 5 : 3} align="center" style={{ padding: '20px', color: colors.textSecondary, lineHeight: 1.2, fontSize: '12px' }}>
                            {searchKeyword ? 'No resellers found matching your search' : t('sharedNoData')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {paginatedResellers.map((reseller, index) => (
                            <TableRow
                              key={`reseller-${index}`}
                              style={{
                                backgroundColor: index % 2 === 0 ? 'transparent' : colors.secondary,
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.hover;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : colors.secondary;
                              }}
                              sx={{ '& .MuiTableCell-root': { padding: '9px 12px' } }}
                            >
                              <TableCell>
                                <div>
                                  <Typography variant="body2" style={{ color: colors.text, fontWeight: '500', lineHeight: 1.8, fontSize: '13px' }}>
                                    {reseller.companyName || t('sharedUnknown')}
                                  </Typography>
                                  {reseller.appUrl && (
                                    <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px' }}>
                                      {reseller.appUrl}
                                    </Typography>
                                  )}
                                  {!desktop && (
                                    <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '11px', display: 'block', marginTop: '2px' }}>
                                      {reseller.resellerEmail || '-'}
                                    </Typography>
                                  )}
                                </div>
                              </TableCell>
                              {desktop && (
                                <TableCell style={{ color: colors.text, lineHeight: 1.8, fontSize: '13px' }}>
                                  {reseller.resellerEmail || '-'}
                                </TableCell>
                              )}
                              {desktop && (
                                <TableCell style={{ color: colors.text, lineHeight: 1.8, fontSize: '13px' }}>
                                  {reseller.whatsapp || '-'}
                                </TableCell>
                              )}
                              <TableCell>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <IconButton
                                    size="small"
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      border: `1px solid ${colors.border}`,
                                      color: buildLoading[`${reseller.appUrl}_aab`] ? colors.primary : colors.text,
                                      padding: '4px'
                                    }}
                                    onClick={() => handleBuildApp(reseller, 'aab')}
                                    disabled={buildLoading[`${reseller.appUrl}_aab`]}
                                    title={`AAB ${getBuildState(reseller.appUrl, 'aab') === 'NOT_BUILDED' ? t('build') : getBuildState(reseller.appUrl, 'aab') === 'BUILDING' ? t('checkStatus') : getBuildState(reseller.appUrl, 'aab') === 'BUILDED' ? t('download') : t('retry')}`}
                                  >
                                    {buildLoading[`${reseller.appUrl}_aab`] ? (
                                      <CircularProgress size={12} />
                                    ) : (
                                      <BsGooglePlay style={{ fontSize: '14px' }} />
                                    )}
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      border: `1px solid ${colors.border}`,
                                      color: buildLoading[`${reseller.appUrl}_apk`] ? colors.primary : colors.text,
                                      padding: '4px'
                                    }}
                                    onClick={() => handleBuildApp(reseller, 'apk')}
                                    disabled={buildLoading[`${reseller.appUrl}_apk`]}
                                    title={`APK ${getBuildState(reseller.appUrl, 'apk') === 'NOT_BUILDED' ? t('build') : getBuildState(reseller.appUrl, 'apk') === 'BUILDING' ? t('checkStatus') : getBuildState(reseller.appUrl, 'apk') === 'BUILDED' ? t('download') : t('retry')}`}
                                  >
                                    {buildLoading[`${reseller.appUrl}_apk`] ? (
                                      <CircularProgress size={12} />
                                    ) : (
                                      <AndroidIcon style={{ fontSize: '16px' }} />
                                    )}
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      border: `1px solid ${colors.border}`,
                                      color: (buildLoading[`${reseller.appUrl}_ios_simulator`] || buildLoading[`${reseller.appUrl}_ios_device`]) ? colors.primary : colors.text,
                                      padding: '4px'
                                    }}
                                    onClick={() => handleIosButtonClick(reseller)}
                                    disabled={buildLoading[`${reseller.appUrl}_ios_simulator`] || buildLoading[`${reseller.appUrl}_ios_device`]}
                                    title={`iOS ${getIosButtonTitle(reseller.appUrl)}`}
                                  >
                                    {(buildLoading[`${reseller.appUrl}_ios_simulator`] || buildLoading[`${reseller.appUrl}_ios_device`]) ? (
                                      <CircularProgress size={12} />
                                    ) : (
                                      <AppleIcon style={{ fontSize: '16px' }} />
                                    )}
                                  </IconButton>
                                </div>
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  onClick={(e) => {
                                    setSelectedReseller(reseller);
                                    setAnchorEl(e.currentTarget);
                                  }}
                                  size="small"
                                  style={{ color: colors.textSecondary, padding: '2px' }}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  padding: '8px 16px',
                  borderTop: `1px solid ${colors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Typography style={{ color: colors.textSecondary, fontSize: '11px', lineHeight: 0.8 }}>
                    {page} / {totalPages} ({filteredResellers.length} {t('resellerPanel')})
                  </Typography>
                  <CustomPagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    colors={colors}
                    size="small"
                    showFirstLastButtons={true}
                  />
                </div>
              )}

              {/* Actions Menu */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                style={{ zIndex: 10002 }}
                PaperProps={{
                  style: {
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    minWidth: '140px',
                    zIndex: 10002,
                  },
                }}
              >
                {actions
                  .filter(action => {
                    if (typeof action.show === 'function') {
                      return action.show(selectedReseller);
                    }
                    return action.show !== false;
                  })
                  .map((action) => (
                    <MenuItem
                      key={action.key}
                      onClick={() => action.handler(selectedReseller)}
                      style={{ 
                        color: colors.text, 
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ 
                        width: '24px', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        {action.icon}
                      </div>
                      <span style={{ marginLeft: '6px' }}>{action.title}</span>
                    </MenuItem>
                  ))}
              </Menu>

              {/* Logs Dialog */}
              <AnimatePresence>
                {logsDialog && (
                  <motion.div
                    key="logs-dialog"
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
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10000,
                      padding: '20px'
                    }}
                    onClick={() => setLogsDialog(false)}
                  >
                    <motion.div
                      initial={{ y: -50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -50, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: '16px',
                        maxWidth: '800px',
                        width: '100%',
                        height: '70vh',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: `1px solid ${colors.border}`,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div style={{
                        padding: '20px 24px 16px',
                        borderBottom: `1px solid ${colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <IconButton
                            onClick={() => setLogsDialog(false)}
                            style={{
                              color: colors.textSecondary,
                              padding: '8px'
                            }}
                            title="Close logs"
                          >
                            <ChevronLeftIcon fontSize="small" />
                          </IconButton>
                          <div>
                            <Typography style={{
                              fontSize: '18px',
                              fontWeight: '600',
                              color: colors.text,
                              margin: 0
                            }}>
                              {t('logsTitle')} - {selectedReseller?.appUrl}
                            </Typography>
                            <Typography style={{
                              fontSize: '14px',
                              color: colors.textSecondary,
                              margin: '4px 0 0 0'
                            }}>
                              {logs.length} {t('logsEntries')}
                            </Typography>
                          </div>
                        </div>
                        <IconButton
                          onClick={handleDeleteLogs}
                          disabled={logsDeleting}
                          style={{
                            color: logsDeleting ? colors.textSecondary : colors.error,
                            padding: '8px',
                            opacity: logsDeleting ? 0.6 : 1
                          }}
                          title="Delete logs for this domain"
                        >
                          {logsDeleting ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                      </div>

                      {/* Content */}
                      <div style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '16px 24px 24px'
                      }}>
                        {logsLoading ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            gap: '16px'
                          }}>
                            <div style={{
                              position: 'relative',
                              width: '120px',
                              height: '120px',
                              backgroundColor: colors.surface,
                              borderRadius: '50%',
                              boxShadow: `0 4px 12px ${colors.border}20`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <CircularProgress
                                size={100}
                                thickness={4}
                                color="inherit"
                              />
                            </div>
                            <Typography variant="body2" style={{ color: colors.textSecondary }}>
                              {t('logsLoading')}
                            </Typography>
                          </div>
                        ) : logs.length === 0 ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: colors.textSecondary
                          }}>
                            {t('logsNoLogsAvailable')}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {logs.map((log, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: '12px 16px',
                                  backgroundColor: log.status === 'ERROR' ? '#FEF2F2' : '#F0FDF4',
                                  border: `1px solid ${log.status === 'ERROR' ? '#FECACA' : '#BBF7D0'}`,
                                  borderRadius: '8px',
                                  borderLeft: `4px solid ${log.status === 'ERROR' ? '#EF4444' : '#10B981'}`
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '4px'
                                }}>
                                  <Typography style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: log.status === 'ERROR' ? '#DC2626' : '#059669',
                                    margin: 0
                                  }}>
                                    {log.step}
                                  </Typography>
                                  <Typography style={{
                                    fontSize: '11px',
                                    color: '#666666',
                                    margin: 0
                                  }}>
                                    {new Date(log.timestamp).toLocaleString()}
                                  </Typography>
                                </div>
                                <Typography style={{
                                  fontSize: '13px',
                                  color: '#000000',
                                  margin: '4px 0 0 0'
                                }}>
                                  {log.message}
                                </Typography>
                                {log.error && (
                                  <Typography style={{
                                    fontSize: '12px',
                                    color: '#DC2626',
                                    margin: '8px 0 0 0',
                                    fontFamily: 'monospace',
                                    backgroundColor: '#FEF2F2',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #FECACA'
                                  }}>
                                    {t('logsError')}: {log.error}
                                  </Typography>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Delete Confirmation Modal */}
              <AnimatePresence>
                {deleteDialog && (
                  <motion.div
                    key="delete-dialog"
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
                    onClick={cancelDelete}
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
                        {t('sharedDeleteConfirm')} "{resellerToDelete?.companyName}"?
                      </p>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'space-between'
                      }}>
                        <button
                          onClick={cancelDelete}
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
                          onClick={confirmDelete}
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
                          {t('sharedRemove')}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Edit Reseller Drawer */}
              <AnimatePresence>
                {editDialog && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      key="edit-drawer-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={handleCloseEditDialog}
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
                      key="edit-drawer-content"
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
                        justifyContent: 'space-between',
                        background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <IconButton
                            onClick={handleCloseEditDialog}
                            size="small"
                            style={{ color: colors.textSecondary }}
                          >
                            <ChevronLeftIcon fontSize="small" />
                          </IconButton>
                          <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                            {t('resellerPanel')}
                          </Typography>
                        </div>
                        <IconButton
                          onClick={handleSaveReseller}
                          disabled={
                            createResellerMutation.isPending ||
                            updateResellerMutation.isPending ||
                            (!isEditMode && !domainValid) // Only require domain validation for new resellers
                          }
                          style={{
                            backgroundColor: colors.primary,
                            color: colors.text,
                            width: '40px',
                            height: '40px',
                          }}
                          title={createResellerMutation.isPending || updateResellerMutation.isPending ? t('sharedSaving') : t('sharedSave')}
                        >
                          {(createResellerMutation.isPending || updateResellerMutation.isPending) ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <SaveIcon />
                          )}
                        </IconButton>
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
                        {editingReseller && (
                          <>
                            {/* Reseller Tabs */}
                            <Tabs
                              value={activeTab}
                              onChange={(e, newValue) => setActiveTab(newValue)}
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
                              {activeTab === 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <Autocomplete
                                    fullWidth
                                    options={users}
                                    getOptionLabel={(option) => {
                                      if (typeof option === 'string') return option;
                                      const name = option.name || option.email || `User ${option.id}`;
                                      return `${option.id} - ${name}`;
                                    }}
                                    value={users.find(user => user.id === editingReseller.resellerId) || null}
                                    onChange={(event, newValue) => {
                                      if (typeof newValue === 'string') {
                                        // User typed something, find matching user
                                        const matchingUser = users.find(user => {
                                          const name = user.name || user.email || `User ${user.id}`;
                                          const displayName = `${user.id} - ${name}`;
                                          return displayName.toLowerCase() === newValue.toLowerCase();
                                        });
                                        if (matchingUser) {
                                          setEditingReseller({
                                            ...editingReseller,
                                            resellerId: matchingUser.id,
                                            resellerUser: matchingUser.login || matchingUser.email,
                                            resellerEmail: matchingUser.email
                                          });
                                        } else {
                                          setEditingReseller({
                                            ...editingReseller,
                                            resellerId: newValue
                                          });
                                        }
                                      } else if (newValue) {
                                        // User selected from dropdown
                                        setEditingReseller({
                                          ...editingReseller,
                                          resellerId: newValue.id,
                                          resellerUser: newValue.login || newValue.email,
                                          resellerEmail: newValue.email
                                        });
                                      } else {
                                        // Cleared selection
                                        setEditingReseller({
                                          ...editingReseller,
                                          resellerId: '',
                                          resellerUser: '',
                                          resellerEmail: ''
                                        });
                                      }
                                    }}
                                    onFocus={fetchUsers}
                                    loading={usersLoading}
                                    disabled={usersLoading}
                                    open={autocompleteOpen}
                                    onOpen={() => setAutocompleteOpen(true)}
                                    onClose={() => setTimeout(() => setAutocompleteOpen(false), 0)}
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
                                              {usersLoading ? <CircularProgress color="inherit" size={20} /> : null}
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
                                    noOptionsText={usersError ? `${t('sharedError')}: ${usersError}` : t('sharedNoData')}
                                  />

                                  <TextField
                                    fullWidth
                                    value={editingReseller.companyName || ''}
                                    onChange={(e) => setEditingReseller({ ...editingReseller, companyName: e.target.value })}
                                    label={t('resellerCompanyName')}
                                    required
                                    sx={{
                                      '& .MuiOutlinedInputRoot': {
                                        backgroundColor: colors.secondary,
                                        '& fieldset': { borderColor: colors.border },
                                        '&:hover fieldset': { borderColor: colors.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                                      },
                                      '& .MuiInputLabelRoot': {
                                        color: colors.textSecondary,
                                        '&.Mui-focused': { color: colors.primary }
                                      },
                                    }}
                                  />

                                  <TextField
                                    fullWidth
                                    value={editingReseller.appUrl || editingReseller.url || ''}
                                    onChange={(e) => {
                                      setEditingReseller({ ...editingReseller, appUrl: e.target.value });
                                      // Reset domain validation when URL changes
                                      setDomainValid(false);
                                      setDomainCheckResult(null);
                                    }}
                                    label={t('resellerAppUrl')}
                                    required
                                    InputProps={{
                                      readOnly: isEditMode,
                                      endAdornment: !isEditMode && (
                                        <InputAdornment position="end">
                                          <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={handleCheckDomain}
                                            disabled={isCheckingDomain || !editingReseller?.appUrl?.trim()}
                                            sx={{
                                              minWidth: 'auto',
                                              px: 1,
                                              py: 0.5,
                                              fontSize: '0.75rem',
                                              backgroundColor: domainValid ? colors.success : colors.secondary,
                                              color: domainValid ? 'white' : colors.textPrimary,
                                              borderColor: domainValid ? colors.success : colors.border,
                                              '&:hover': {
                                                backgroundColor: domainValid ? colors.success : colors.primary,
                                                borderColor: domainValid ? colors.success : colors.primary,
                                              },
                                              '&:disabled': {
                                                backgroundColor: colors.disabled,
                                                color: colors.textDisabled,
                                                borderColor: colors.border,
                                              }
                                            }}
                                          >
                                            {isCheckingDomain ? (
                                              <CircularProgress size={16} />
                                            ) : domainValid ? (
                                              <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'white' }} />
                                            ) : (
                                              t('domainCheckButton')
                                            )}
                                          </Button>
                                        </InputAdornment>
                                      )
                                    }}
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        backgroundColor: colors.secondary,
                                        '& fieldset': {
                                          borderColor: domainValid ? colors.success : colors.border
                                        },
                                        '&:hover fieldset': {
                                          borderColor: domainValid ? colors.success : colors.primary
                                        },
                                        '&.Mui-focused fieldset': {
                                          borderColor: domainValid ? colors.success : colors.primary
                                        },
                                      },
                                      '& .MuiInputLabel-root': {
                                        color: colors.textSecondary,
                                        '&.Mui-focused': { color: colors.primary }
                                      },
                                    }}
                                  />
                                  {!isEditMode && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: colors.textSecondary,
                                        fontSize: '0.75rem',
                                        mt: 0.5,
                                        fontStyle: 'italic'
                                      }}
                                    >
                                      {t('domainCheckInstruction')}
                                    </Typography>
                                  )}
                                  {isEditMode && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: colors.warning || colors.textSecondary,
                                        fontSize: '0.75rem',
                                        mt: 0.5,
                                        fontStyle: 'italic',
                                        whiteSpace: 'pre-line'
                                      }}
                                    >
                                      {t('domainCannotChangeActiveReseller')}
                                    </Typography>
                                  )}
                                  {domainCheckResult && (
                                    <Alert
                                      severity={domainCheckResult.success ? 'success' : 'error'}
                                      sx={{ mt: 1, fontSize: '0.875rem' }}
                                    >
                                      {domainCheckResult.success ? (
                                        `✅ ${t('domainCheckSuccess').replace('{ipAddress}', domainCheckResult.ipAddress)}`
                                      ) : (
                                        `❌ ${t('domainCheckError').replace('{message}', domainCheckResult.message)}`
                                      )}
                                    </Alert>
                                  )}

                                  {/* Image Upload Fields - Two per row layout */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                    {/* Row 1: Logo and Favicon */}
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                      {/* Logo Upload Field */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
                                        <input
                                          type="file"
                                          accept=".png"
                                          onChange={handleImageSelect}
                                          style={{ display: 'none' }}
                                          id="logotype-upload"
                                        />
                                        <label htmlFor="logotype-upload" style={{ display: 'none' }}>
                                          <Button
                                            variant="outlined"
                                            component="span"
                                            fullWidth
                                            style={{
                                              borderColor: colors.border,
                                              color: colors.text,
                                              height: '56px',
                                              borderStyle: 'dashed',
                                            }}
                                          >
                                            {isCompressingImage ? (
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CircularProgress size={16} />
                                                {t('resellerCompressingImage')}
                                              </Box>
                                            ) : selectedImage ? t('resellerChangeLogo') : t('resellerSelectLogo')}
                                          </Button>
                                        </label>

                                        {/* Logo Preview Box */}
                                        <label htmlFor="logotype-upload" style={{ cursor: 'pointer' }}>
                                          <div style={{
                                            width: '140px',
                                            height: '140px',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '8px',
                                            backgroundColor: colors.secondary,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '12px',
                                            transition: 'all 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = colors.hover;
                                            e.target.style.borderColor = colors.primary;
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = colors.secondary;
                                            e.target.style.borderColor = colors.border;
                                          }}
                                        >
                                          {isCompressingImage ? (
                                            <>
                                              <CircularProgress size={32} style={{ color: colors.primary }} />
                                              <div 
                                                style={{ 
                                                  color: colors.textSecondary, 
                                                  textAlign: 'center',
                                                  fontSize: '12px'
                                                }}
                                              >
                                                {t('resellerCompressingImage')}
                                              </div>
                                            </>
                                          ) : imagePreview ? (
                                            <>
                                              <img
                                                src={imagePreview}
                                                alt="Logo preview"
                                                style={{
                                                  width: '65px',
                                                  height: '65px',
                                                  objectFit: 'contain',
                                                  borderRadius: '4px'
                                                }}
                                              />
                                              <div 
                                                style={{ 
                                                  color: colors.textSecondary, 
                                                  textAlign: 'center',
                                                  fontSize: '12px'
                                                }}
                                              >
                                                {(selectedImage?.size / 1024).toFixed(1)}KB
                                              </div>
                                            </>
                                          ) : editingReseller.logo ? (
                                            <>
                                              <img
                                                src={editingReseller.logo}
                                                alt="Current logo"
                                                style={{
                                                  width: '65px',
                                                  height: '65px',
                                                  objectFit: 'contain',
                                                  borderRadius: '4px'
                                                }}
                                              />
                                              <Typography 
                                                variant="caption" 
                                                style={{ 
                                                  color: colors.textSecondary, 
                                                  textAlign: 'center',
                                                  display: 'block',
                                                  width: '100%',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'nowrap'
                                                }}
                                                title={`${selectedImage?.name} (${(selectedImage?.size / 1024).toFixed(1)}KB)`}
                                              >
                                                Current: {editingReseller.logo}
                                              </Typography>
                                            </>
                                          ) : (
                                            <>
                                              <LuCameraOff style={{ fontSize: '48px', color: colors.textSecondary }} />
                                              <Typography variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                                                {t('resellerLogotype')}
                                              </Typography>
                                            </>
                                          )}
                                        </div>
                                        </label>

                                      </div>

                                      {/* Favicon Upload Field */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
                                        <input
                                          type="file"
                                          accept=".png"
                                          onChange={handleFaviconSelect}
                                          style={{ display: 'none' }}
                                          id="favicon-upload"
                                        />
                                        <label htmlFor="favicon-upload" style={{ display: 'none' }}>
                                          <Button
                                            variant="outlined"
                                            component="span"
                                            fullWidth
                                            style={{
                                              borderColor: colors.border,
                                              color: colors.text,
                                              height: '56px',
                                              borderStyle: 'dashed',
                                            }}
                                          >
                                            {selectedFavicon ? 'Change Favicon' : 'Select Favicon'}
                                          </Button>
                                        </label>

                                        {/* Favicon Preview Box */}
                                        <label htmlFor="favicon-upload" style={{ cursor: 'pointer' }}>
                                          <div style={{
                                            width: '140px',
                                            height: '140px',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '8px',
                                            backgroundColor: colors.secondary,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '12px',
                                            transition: 'all 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = colors.hover;
                                            e.target.style.borderColor = colors.primary;
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = colors.secondary;
                                            e.target.style.borderColor = colors.border;
                                          }}
                                        >
                                          {faviconPreview ? (
                                            <>
                                              <img
                                                src={faviconPreview}
                                                alt="Favicon preview"
                                                style={{
                                                  width: '65px',
                                                  height: '65px',
                                                  objectFit: 'contain',
                                                  borderRadius: '4px'
                                                }}
                                              />
                                              <div 
                                                style={{ 
                                                  color: colors.textSecondary, 
                                                  textAlign: 'center',
                                                  fontSize: '12px'
                                                }}
                                              >
                                                {(selectedFavicon?.size / 1024).toFixed(1)}KB
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <LuCameraOff style={{ fontSize: '48px', color: colors.textSecondary }} />
                                              <Typography variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                                                {t('resellerFavicon')}
                                              </Typography>
                                            </>
                                          )}
                                        </div>
                                        </label>

                                      </div>
                                    </div>

                                    {/* Row 2: App Image and Notification Icon */}
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                      {/* App Image Upload Field */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
                                        <input
                                          type="file"
                                          accept=".png"
                                          onChange={handleAppImageSelect}
                                          style={{ display: 'none' }}
                                          id="app-image-upload"
                                        />
                                        <label htmlFor="app-image-upload" style={{ display: 'none' }}>
                                          <Button
                                            variant="outlined"
                                            component="span"
                                            fullWidth
                                            style={{
                                              borderColor: colors.border,
                                              color: colors.text,
                                              height: '56px',
                                              borderStyle: 'dashed',
                                            }}
                                          >
                                            {selectedAppImage ? t('changeAppImage') : t('selectAppImage')}
                                          </Button>
                                        </label>

                                        {/* App Image Preview Box */}
                                        <label htmlFor="app-image-upload" style={{ cursor: 'pointer' }}>
                                          <div style={{
                                            width: '140px',
                                            height: '140px',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '8px',
                                            backgroundColor: colors.secondary,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '12px',
                                            transition: 'all 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = colors.hover;
                                            e.target.style.borderColor = colors.primary;
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = colors.secondary;
                                            e.target.style.borderColor = colors.border;
                                          }}
                                        >
                                          {appImagePreview ? (
                                            <>
                                              <img
                                                src={appImagePreview}
                                                alt="App image preview"
                                                style={{
                                                  width: '65px',
                                                  height: '65px',
                                                  objectFit: 'contain',
                                                  borderRadius: '4px'
                                                }}
                                              />
                                              <div 
                                                style={{ 
                                                  color: colors.textSecondary, 
                                                  textAlign: 'center',
                                                  fontSize: '12px'
                                                }}
                                              >
                                                {(selectedAppImage?.size / 1024).toFixed(1)}KB
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <LuCameraOff style={{ fontSize: '48px', color: colors.textSecondary }} />
                                              <Typography variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                                                {t('resellerAppIcon')}
                                              </Typography>
                                            </>
                                          )}
                                        </div>
                                        </label>

                                      </div>

                                      {/* Notification Icon Upload Field */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
                                        <input
                                          type="file"
                                          accept=".png"
                                          onChange={handleNotificationIconSelect}
                                          style={{ display: 'none' }}
                                          id="notification-icon-upload"
                                        />
                                        <label htmlFor="notification-icon-upload" style={{ display: 'none' }}>
                                          <Button
                                            variant="outlined"
                                            component="span"
                                            fullWidth
                                            style={{
                                              borderColor: colors.border,
                                              color: colors.text,
                                              height: '56px',
                                              borderStyle: 'dashed',
                                            }}
                                          >
                                            {selectedNotificationIcon ? 'Change Icon' : 'Select Icon'}
                                          </Button>
                                        </label>

                                        {/* Notification Icon Preview Box */}
                                        <label htmlFor="notification-icon-upload" style={{ cursor: 'pointer' }}>
                                          <div style={{
                                            width: '140px',
                                            height: '140px',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '8px',
                                            backgroundColor: colors.secondary,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '12px',
                                            transition: 'all 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = colors.hover;
                                            e.target.style.borderColor = colors.primary;
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = colors.secondary;
                                            e.target.style.borderColor = colors.border;
                                          }}
                                        >
                                          {notificationIconPreview ? (
                                            <>
                                              <img
                                                src={notificationIconPreview}
                                                alt="Notification icon preview"
                                                style={{
                                                  width: '65px',
                                                  height: '65px',
                                                  objectFit: 'contain',
                                                  borderRadius: '4px'
                                                }}
                                              />
                                              <div 
                                                style={{ 
                                                  color: colors.textSecondary, 
                                                  textAlign: 'center',
                                                  fontSize: '12px'
                                                }}
                                              >
                                                {(selectedNotificationIcon?.size / 1024).toFixed(1)}KB
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <LuCameraOff style={{ fontSize: '48px', color: colors.textSecondary }} />
                                              <Typography variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                                                {t('resellerNotificationIcon')}
                                              </Typography>
                                            </>
                                          )}
                                        </div>
                                        </label>

                                      </div>
                                    </div>
                                  </div>


                                </div>
                              )}

                              {/* Contact Tab */}
                              {activeTab === 1 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <TextField
                                    fullWidth
                                    value={editingReseller.resellerUser || ''}
                                    label={t('resellerUser')}
                                    required
                                    InputProps={{
                                      readOnly: true
                                    }}
                                    sx={{
                                      '& .MuiOutlinedInputRoot': {
                                        backgroundColor: colors.secondary,
                                        '& fieldset': { borderColor: colors.border },
                                        '&:hover fieldset': { borderColor: colors.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                                      },
                                      '& .MuiInputLabelRoot': {
                                        color: colors.textSecondary,
                                        '&.Mui-focused': { color: colors.primary }
                                      },
                                    }}
                                  />

                                  <TextField
                                    fullWidth
                                    value={editingReseller.resellerEmail || ''}
                                    label={t('resellerEmail')}
                                    type="email"
                                    required
                                    InputProps={{
                                      readOnly: true
                                    }}
                                    sx={{
                                      '& .MuiOutlinedInputRoot': {
                                        backgroundColor: colors.secondary,
                                        '& fieldset': { borderColor: colors.border },
                                        '&:hover fieldset': { borderColor: colors.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                                      },
                                      '& .MuiInputLabelRoot': {
                                        color: colors.textSecondary,
                                        '&.Mui-focused': { color: colors.primary }
                                      },
                                    }}
                                  />

                                  <TextField
                                    fullWidth
                                    value={editingReseller.whatsapp || ''}
                                    onChange={(e) => setEditingReseller({ ...editingReseller, whatsapp: e.target.value })}
                                    label={t('resellerWhatsapp')}
                                    required
                                    sx={{
                                      '& .MuiOutlinedInputRoot': {
                                        backgroundColor: colors.secondary,
                                        '& fieldset': { borderColor: colors.border },
                                        '&:hover fieldset': { borderColor: colors.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                                      },
                                      '& .MuiInputLabelRoot': {
                                        color: colors.textSecondary,
                                        '&.Mui-focused': { color: colors.primary }
                                      },
                                    }}
                                  />

                                  <TextField
                                    fullWidth
                                    value={editingReseller.billingEmail || ''}
                                    onChange={(e) => setEditingReseller({ ...editingReseller, billingEmail: e.target.value })}
                                    label={t('resellerBillingEmail')}
                                    type="email"
                                    required
                                    sx={{
                                      '& .MuiOutlinedInputRoot': {
                                        backgroundColor: colors.secondary,
                                        '& fieldset': { borderColor: colors.border },
                                        '&:hover fieldset': { borderColor: colors.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                                      },
                                      '& .MuiInputLabelRoot': {
                                        color: colors.textSecondary,
                                        '&.Mui-focused': { color: colors.primary }
                                      },
                                    }}
                                  />

                                  <TextField
                                    fullWidth
                                    value={editingReseller.supportEmail || ''}
                                    onChange={(e) => setEditingReseller({ ...editingReseller, supportEmail: e.target.value })}
                                    label={t('resellerSupportEmail')}
                                    type="email"
                                    required
                                    sx={{
                                      '& .MuiOutlinedInputRoot': {
                                        backgroundColor: colors.secondary,
                                        '& fieldset': { borderColor: colors.border },
                                        '&:hover fieldset': { borderColor: colors.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                                      },
                                      '& .MuiInputLabelRoot': {
                                        color: colors.textSecondary,
                                        '&.Mui-focused': { color: colors.primary }
                                      },
                                    }}
                                  />
                                </div>
                              )}

                              {/* Permissions Tab */}
                              {activeTab === 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <TextField
                                    fullWidth
                                    value={editingReseller.resellerLimit || ''}
                                    onChange={(e) => setEditingReseller({ ...editingReseller, resellerLimit: e.target.value })}
                                    label={t('resellerLimit')}
                                    type="number"
                                    required
                                    inputProps={{ min: 1 }}
                                    sx={{
                                      '& .MuiOutlinedInputRoot': {
                                        backgroundColor: colors.secondary,
                                        '& fieldset': { borderColor: colors.border },
                                        '&:hover fieldset': { borderColor: colors.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                                      },
                                      '& .MuiInputLabelRoot': {
                                        color: colors.textSecondary,
                                        '&.Mui-focused': { color: colors.primary }
                                      },
                                    }}
                                  />

                                  <TextField
                                    fullWidth
                                    value={editingReseller.deviceLimit || ''}
                                    onChange={(e) => setEditingReseller({ ...editingReseller, deviceLimit: e.target.value })}
                                    label={t('userDeviceLimit')}
                                    type="number"
                                    required
                                    inputProps={{ min: 1 }}
                                    sx={{
                                      '& .MuiOutlinedInputRoot': {
                                        backgroundColor: colors.secondary,
                                        '& fieldset': { borderColor: colors.border },
                                        '&:hover fieldset': { borderColor: colors.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                                      },
                                      '& .MuiInputLabelRoot': {
                                        color: colors.textSecondary,
                                        '&.Mui-focused': { color: colors.primary }
                                      },
                                    }}
                                  />

                                  <TextField
                                    fullWidth
                                    value={editingReseller.userLimit || ''}
                                    onChange={(e) => setEditingReseller({ ...editingReseller, userLimit: e.target.value })}
                                    label={t('userUserLimit')}
                                    type="number"
                                    required
                                    inputProps={{ min: 1 }}
                                    sx={{
                                      '& .MuiOutlinedInputRoot': {
                                        backgroundColor: colors.secondary,
                                        '& fieldset': { borderColor: colors.border },
                                        '&:hover fieldset': { borderColor: colors.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                                      },
                                      '& .MuiInputLabelRoot': {
                                        color: colors.textSecondary,
                                        '&.Mui-focused': { color: colors.primary }
                                      },
                                    }}
                                  />
                                </div>
                              )}
                            </Box>
                          </>
                        )}
                      </div>

                    </motion.div>
                  </>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={10000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Build Status Modal */}
        {buildStatusModal.open && (
          <motion.div
            key="build-status-modal"
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
              zIndex: 10005,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setBuildStatusModal({ open: false, reseller: null, buildType: null })}
          >
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconButton
                    onClick={() => setBuildStatusModal({ open: false, reseller: null, buildType: null })}
                    size="small"
                    style={{ color: colors.textSecondary }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                    {t('buildStatusTitle')} - {buildStatusModal.reseller?.companyName}
                  </Typography>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '24px' }}>
                {buildStatusModal.reseller && buildStatusModal.buildType && (
                  <BuildStatusContent
                    reseller={buildStatusModal.reseller}
                    buildType={buildStatusModal.buildType}
                    getBuildState={getBuildState}
                    checkBuildStatus={checkBuildStatus}
                    updateBuildState={updateBuildState}
                    onClose={() => setBuildStatusModal({ open: false, reseller: null, buildType: null })}
                    onRetry={async () => {
                      await startBuild(buildStatusModal.reseller, buildStatusModal.buildType);
                    }}
                    colors={colors}
                    resellersConfig={resellersConfig}
                    t={t}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Clean Apps Modal */}
        {cleanAppsModal.open && (
          <motion.div
            key="clean-apps-modal"
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
              zIndex: 10003,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setCleanAppsModal({ open: false, reseller: null })}
          >
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconButton
                    onClick={() => setCleanAppsModal({ open: false, reseller: null })}
                    size="small"
                    style={{ color: colors.textSecondary }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
{t('cleanApps')} - {cleanAppsModal.reseller?.companyName}
                  </Typography>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px', color: colors.text, fontSize: '16px' }}>
                  {t('selectAppsToClean')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => cleanApps(cleanAppsModal.reseller, 'apk')}
                    disabled={cleanLoading[`${cleanAppsModal.reseller?.appUrl}_apk`]}
                    style={{
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      backgroundColor: 'transparent',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: cleanLoading[`${cleanAppsModal.reseller?.appUrl}_apk`] ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: cleanLoading[`${cleanAppsModal.reseller?.appUrl}_apk`] ? 0.6 : 1
                    }}
                  >
                    {cleanLoading[`${cleanAppsModal.reseller?.appUrl}_apk`] ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <BsAndroid size={20} />
                    )}
{t(cleanLoading[`${cleanAppsModal.reseller?.appUrl}_apk`] ? 'cleaningApk' : 'cleanApkOnly')}
                  </button>

                  <button
                    onClick={() => cleanApps(cleanAppsModal.reseller, 'aab')}
                    disabled={cleanLoading[`${cleanAppsModal.reseller?.appUrl}_aab`]}
                    style={{
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      backgroundColor: 'transparent',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: cleanLoading[`${cleanAppsModal.reseller?.appUrl}_aab`] ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: cleanLoading[`${cleanAppsModal.reseller?.appUrl}_aab`] ? 0.6 : 1
                    }}
                  >
                    {cleanLoading[`${cleanAppsModal.reseller?.appUrl}_aab`] ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <BsGooglePlay size={20} />
                    )}
{t(cleanLoading[`${cleanAppsModal.reseller?.appUrl}_aab`] ? 'cleaningAab' : 'cleanAabOnly')}
                  </button>

                  <button
                    onClick={() => cleanApps(cleanAppsModal.reseller, 'ios_simulator')}
                    disabled={cleanLoading[`${cleanAppsModal.reseller?.appUrl}_ios_simulator`]}
                    style={{
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      backgroundColor: 'transparent',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: cleanLoading[`${cleanAppsModal.reseller?.appUrl}_ios_simulator`] ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: cleanLoading[`${cleanAppsModal.reseller?.appUrl}_ios_simulator`] ? 0.6 : 1
                    }}
                  >
                    {cleanLoading[`${cleanAppsModal.reseller?.appUrl}_ios_simulator`] ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <AppleIcon size={20} />
                    )}
{t(cleanLoading[`${cleanAppsModal.reseller?.appUrl}_ios_simulator`] ? 'cleaningIosSimulator' : 'cleanIosSimulatorOnly')}
                  </button>

                  <button
                    onClick={() => cleanApps(cleanAppsModal.reseller, 'ios_device')}
                    disabled={cleanLoading[`${cleanAppsModal.reseller?.appUrl}_ios_device`]}
                    style={{
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      backgroundColor: 'transparent',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: cleanLoading[`${cleanAppsModal.reseller?.appUrl}_ios_device`] ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: cleanLoading[`${cleanAppsModal.reseller?.appUrl}_ios_device`] ? 0.6 : 1
                    }}
                  >
                    {cleanLoading[`${cleanAppsModal.reseller?.appUrl}_ios_device`] ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SmartphoneIcon size={20} />
                    )}
{t(cleanLoading[`${cleanAppsModal.reseller?.appUrl}_ios_device`] ? 'cleaningIosDevice' : 'cleanIosDeviceOnly')}
                  </button>

                  <button
                    onClick={() => cleanApps(cleanAppsModal.reseller, 'both')}
                    disabled={cleanLoading[`${cleanAppsModal.reseller?.appUrl}_both`]}
                    style={{
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      backgroundColor: 'transparent',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: cleanLoading[`${cleanAppsModal.reseller?.appUrl}_both`] ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: cleanLoading[`${cleanAppsModal.reseller?.appUrl}_both`] ? 0.6 : 1
                    }}
                  >
                    {cleanLoading[`${cleanAppsModal.reseller?.appUrl}_both`] ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <RefreshIcon />
                    )}
{t(cleanLoading[`${cleanAppsModal.reseller?.appUrl}_both`] ? 'cleaningAll' : 'cleanAll')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* iOS Build Type Selection Modal */}
        {iosBuildTypeModal.open && (
          <motion.div
            key="ios-build-type-modal"
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
              zIndex: 10004,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setIosBuildTypeModal({ open: false, reseller: null })}
          >
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => setIosBuildTypeModal({ open: false, reseller: null })}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.text,
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ChevronLeftIcon style={{ fontSize: '24px' }} />
                  </button>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600' }}>
                    {t('iosBuildType')}
                  </Typography>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '24px' }}>
                <Typography variant="body1" style={{ color: colors.text, marginBottom: '24px', textAlign: 'center' }}>
                  {t('chooseIosBuildType')} <strong>{iosBuildTypeModal.reseller?.companyName}</strong>
                </Typography>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Simulator Build */}
                  <button
                    onClick={() => handleIosBuildType(iosBuildTypeModal.reseller, 'simulator')}
                    style={{
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      backgroundColor: 'transparent',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    <AppleIcon size={20} />
                    {t('iosSimulator')}
                  </button>

                  {/* Physical Device Build */}
                  <button
                    onClick={() => handleIosBuildType(iosBuildTypeModal.reseller, 'device')}
                    style={{
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      backgroundColor: 'transparent',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    <SmartphoneIcon size={20} />
                    {t('physicalDevice')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Mass Importer Modal */}
      <AnimatePresence>
        {massImporterModal.open && (
          <motion.div
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
              zIndex: 10000,
              padding: '20px'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMassImporterModal({ open: false, reseller: null })}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '12px',
                padding: '0',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'hidden',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconButton
                    onClick={() => setMassImporterModal({ open: false, reseller: null })}
                    size="small"
                    style={{ color: colors.textSecondary }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                    {t('massImporterTitle')} - {massImporterModal.reseller?.companyName}
                  </Typography>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '24px' }}>
                <Typography variant="body1" style={{ color: colors.text, marginBottom: '16px' }}>
                  {t('massImporterDescription')}
                </Typography>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
                    <Typography variant="subtitle2" style={{ color: colors.text }}>
                      {t('uploadXlsxFile')}
                    </Typography>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div
                        onClick={() => setServerModal({ open: true, reseller: massImporterModal.reseller })}
                        style={{
                          width: '48px',
                          height: '48px',
                          padding: '0',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          backgroundColor: colors.secondary,
                          color: colors.text,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
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
                        <GoServer style={{ fontSize: '24px', color: colors.text }} />
                      </div>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        id="xlsx-upload"
                        onChange={handleXlsxFileChange}
                      />
                      <label htmlFor="xlsx-upload" style={{ cursor: 'pointer' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            padding: '0',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            backgroundColor: colors.secondary,
                            color: colors.text,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
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
                          <BsFiletypeXlsx style={{ fontSize: '24px', color: colors.text }} />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>


                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleDownloadTemplate}
                    style={{
                      padding: '10px 20px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      backgroundColor: colors.secondary,
                      color: colors.text,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
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
                    <DownloadIcon style={{ fontSize: '18px' }} />
                    template.xlsx
                  </button>
                  <button
                    onClick={handleImport}
                    style={{
                      padding: '10px 20px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      backgroundColor: colors.secondary,
                      color: colors.text,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
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
                    {t('sharedImport')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Progress Modal */}
      <AnimatePresence>
        {importProgress.open && (
          <motion.div
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '12px',
                padding: '24px',
                width: '450px',
                maxWidth: '450px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CircularProgress size={24} thickness={4} style={{ color: colors.primary }} />
                <span style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>
                  {t('massImporterImporting')}
                </span>
              </div>
              
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: '14px', color: colors.text, marginBottom: '8px' }}>
                  {importProgress.status}
                </div>
                {importProgress.total > 0 && (
                  <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                    {t('massImporterProgress', { current: importProgress.current, total: importProgress.total })}
                  </div>
                )}
              </div>
              
              {importProgress.total > 0 && (
                <div style={{ width: '100%', backgroundColor: colors.primary, borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(importProgress.current / importProgress.total) * 100}%`,
                      height: '100%',
                      backgroundColor: colors.border,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {errorModal.open && (
          <motion.div
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
              zIndex: 10000,
              padding: '20px'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setErrorModal({ open: false, message: '', title: '' })}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '12px',
                padding: '0',
                maxWidth: '400px',
                width: '100%',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconButton
                    onClick={() => setErrorModal({ open: false, message: '', title: '' })}
                    size="small"
                    style={{ color: colors.textSecondary }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0 }}>
                    {errorModal.title}
                  </Typography>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '24px' }}>
                <Typography variant="body1" style={{ color: colors.text }}>
                  {errorModal.message}
                </Typography>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Server Modal */}
      <AnimatePresence>
        {serverModal.open && (
          <motion.div
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
              zIndex: 10000,
              padding: '20px'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setServerModal({ open: false, reseller: null });
              setServerFormData({ serverUrl: '', login: '', password: '' });
              setServerQueryStartTime(null);
              setServerQueryEndTime(null);
              setServerQueryExecutionTime(null);
            }}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '12px',
                padding: '0',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'hidden',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconButton
                    onClick={() => {
                      setServerModal({ open: false, reseller: null });
                      setServerFormData({ serverUrl: '', login: '', password: '' });
                      setServerQueryStartTime(null);
                      setServerQueryEndTime(null);
                      setServerQueryExecutionTime(null);
                    }}
                    size="small"
                    style={{ color: colors.textSecondary }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                    Server Import
                  </Typography>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <TextField
                    fullWidth
                    label="Server URL"
                    value={serverFormData.serverUrl}
                    onChange={(e) => setServerFormData({ ...serverFormData, serverUrl: e.target.value })}
                    required
                    sx={{
                      '& .MuiOutlinedInputRoot': {
                        backgroundColor: colors.secondary,
                        '& fieldset': { borderColor: colors.border },
                        '&:hover fieldset': { borderColor: colors.primary },
                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                      },
                      '& .MuiInputLabelRoot': {
                        color: colors.textSecondary,
                        '&.Mui-focused': { color: colors.primary }
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Login"
                    value={serverFormData.login}
                    onChange={(e) => setServerFormData({ ...serverFormData, login: e.target.value })}
                    required
                    sx={{
                      '& .MuiOutlinedInputRoot': {
                        backgroundColor: colors.secondary,
                        '& fieldset': { borderColor: colors.border },
                        '&:hover fieldset': { borderColor: colors.primary },
                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                      },
                      '& .MuiInputLabelRoot': {
                        color: colors.textSecondary,
                        '&.Mui-focused': { color: colors.primary }
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={serverFormData.password}
                    onChange={(e) => setServerFormData({ ...serverFormData, password: e.target.value })}
                    required
                    sx={{
                      '& .MuiOutlinedInputRoot': {
                        backgroundColor: colors.secondary,
                        '& fieldset': { borderColor: colors.border },
                        '&:hover fieldset': { borderColor: colors.primary },
                        '&.Mui-focused fieldset': { borderColor: colors.primary },
                      },
                      '& .MuiInputLabelRoot': {
                        color: colors.textSecondary,
                        '&.Mui-focused': { color: colors.primary }
                      },
                    }}
                  />
                </div>

                {/* Start Time Display */}
                {serverQueryStartTime && (
                  <div style={{ marginBottom: '16px' }}>
                    <Typography variant="body2" style={{ color: colors.textSecondary, fontSize: '14px' }}>
                      Started at: {serverQueryStartTime.toLocaleString()}
                      {serverQueryEndTime && serverQueryExecutionTime && (
                        <>
                          {' | '}
                          Finished at: {serverQueryEndTime.toLocaleString()}
                          <span style={{ fontSize: '12px', marginLeft: '8px' }}>
                            ({formatExecutionTime(serverQueryExecutionTime)})
                          </span>
                        </>
                      )}
                    </Typography>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setServerModal({ open: false, reseller: null });
                      setServerFormData({ serverUrl: '', login: '', password: '' });
                      setServerQueryStartTime(null);
                      setServerQueryEndTime(null);
                      setServerQueryExecutionTime(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      backgroundColor: colors.secondary,
                      color: colors.text,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = colors.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = colors.secondary;
                    }}
                  >
                    {t('sharedCancel')}
                  </button>
                  <button
                    onClick={handleQueryData}
                    disabled={serverQueryLoading}
                    style={{
                      padding: '10px 20px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      backgroundColor: colors.secondary,
                      color: colors.text,
                      cursor: serverQueryLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      opacity: serverQueryLoading ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (!serverQueryLoading) {
                        e.target.style.backgroundColor = colors.hover;
                        e.target.style.color = colors.text;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!serverQueryLoading) {
                        e.target.style.backgroundColor = colors.secondary;
                        e.target.style.color = colors.text;
                      }
                    }}
                  >
                    {serverQueryLoading && (
                      <CircularProgress size={16} style={{ color: colors.text }} />
                    )}
                    Query Data
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Build Status Modal Content Component
const BuildStatusContent = ({ reseller, buildType, getBuildState, checkBuildStatus, updateBuildState, onClose, onRetry, colors, resellersConfig, t }) => {
  const [statusData, setStatusData] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);

  const currentState = getBuildState(reseller.appUrl, buildType);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setError(null);
    try {
      const result = await checkBuildStatus(reseller, buildType);
      setStatusData(result.data);
    } catch (err) {
      console.error(`❌ BuildStatusContent: Error checking status:`, err);
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetry = async () => {
    updateBuildState(reseller.appUrl, buildType, 'NOT_BUILDED');
    await onRetry();
  };

  useEffect(() => {
    if (currentState === 'BUILDING') {
      handleCheckStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '24px' }}>
        <Typography variant="h6" style={{ color: colors.text, marginBottom: '8px' }}>
          {buildType === 'apk' ? t('apkBuildStatus') : buildType === 'aab' ? t('aabBuildStatus') : t('iosBuildStatus')}
        </Typography>
        <Typography variant="body2" style={{ color: colors.textSecondary }}>
          {reseller.companyName} - {reseller.appUrl}
        </Typography>
      </div>

      {currentState === 'NOT_BUILDED' && (
        <div>
          <Typography variant="body1" style={{ color: colors.text, marginBottom: '16px' }}>
            Build not started yet.
          </Typography>
          <Button
            variant="contained"
            onClick={handleRetry}
            style={{ backgroundColor: colors.primary, color: 'white' }}
          >
            Start Build
          </Button>
        </div>
      )}

      {currentState === 'BUILDING' && (
        <div>
          <CircularProgress size={48} color="inherit" style={{ marginBottom: '16px' }} />
          <Typography variant="body1" style={{ color: colors.text, marginBottom: '16px' }}>
{buildType === 'apk' ? t('buildingApk') : buildType === 'aab' ? t('buildingAab') : t('buildingIos')}
          </Typography>
          <Button
            variant="outlined"
            onClick={handleCheckStatus}
            disabled={isChecking}
            sx={{
              borderColor: colors.border,
              color: isChecking ? colors.primary : colors.text
            }}
          >
{t(isChecking ? 'checking' : 'checkStatus')}
          </Button>
        </div>
      )}

      {currentState === 'BUILDED' && (
        <div>
          <CheckIcon style={{ fontSize: 48, color: colors.success, marginBottom: '16px' }} />
          <Typography variant="body1" style={{ color: colors.text, marginBottom: '16px' }}>
            Build completed successfully!
          </Typography>
          {statusData && (
            <div style={{ marginBottom: '16px' }}>
              <Typography variant="body2" style={{ color: colors.textSecondary }}>
                APK Size: {statusData.apkSize ? `${(statusData.apkSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
              </Typography>
              <Typography variant="body2" style={{ color: colors.textSecondary }}>
                AAB Size: {statusData.aabSize ? `${(statusData.aabSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
              </Typography>
              <Typography variant="body2" style={{ color: colors.textSecondary }}>
                iOS Size: {statusData.iosSize ? `${(statusData.iosSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
              </Typography>
            </div>
          )}
          <Button
            variant="outlined"
            onClick={() => {
              // Trigger download (simplified - only need appUrl and buildType)
              const downloadUrl = resellersConfig.ENDPOINTS.DOWNLOAD(
                reseller.appUrl,
                buildType
              );

              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = `${reseller.appUrl}.${buildType}`;
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            sx={{
              borderColor: colors.border,
              color: colors.text,
              marginRight: '8px'
            }}
          >
{t('download')}
          </Button>
        </div>
      )}

      {currentState === 'BUILD_ERROR' && (
        <div>
          <BlockIcon style={{ fontSize: 48, color: colors.error, marginBottom: '16px' }} />
          <Typography variant="body1" style={{ color: colors.text, marginBottom: '16px' }}>
            {t('buildFailed')}
          </Typography>
          {error && (
            <Typography variant="body2" style={{ color: colors.error, marginBottom: '16px' }}>
              {error}
            </Typography>
          )}
          <Button
            variant="outlined"
            onClick={handleRetry}
            sx={{
              borderColor: colors.border,
              color: colors.text
            }}
          >
            Try Again
          </Button>
        </div>
      )}

    </div>
  );
};

export default FloatingResellersPopover;
