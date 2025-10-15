import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
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
  Pagination,
  Tabs,
  Tab,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Alert,
  Snackbar,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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
  Inventory as InventoryIcon,
  Store as StoreIcon,
  PhoneIphone as PhoneIphoneIcon,
  ShoppingCart as ShoppingCartIcon,
  Apps as AppsIcon,
  Extension as ExtensionIcon,
} from '@mui/icons-material';
import { BsGooglePlay, BsAndroid } from "react-icons/bs";
import resellersConfig from '../config/resellersConfig';
import { useCatch } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useManager, useAdministrator } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { compressImage, validateImageFile } from '../utils/imageCompression';
import { resellersActions } from '../store';
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
  const [buildLoading, setBuildLoading] = useState({});

  // Load build states from localStorage on component mount
  useEffect(() => {
    const savedStates = localStorage.getItem('resellerBuildStates');
    if (savedStates) {
      try {
        setBuildStates(JSON.parse(savedStates));
      } catch (error) {
        console.error('Error loading build states from localStorage:', error);
      }
    }
  }, []);

  // Save build states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('resellerBuildStates', JSON.stringify(buildStates));
  }, [buildStates]);

  // Get build state for a specific reseller and build type
  const getBuildState = (resellerId, buildType) => {
    const key = `${resellerId}_${buildType}`;
    return buildStates[key] || 'NOT_BUILDED';
  };

  // Update build state for a specific reseller and build type
  const updateBuildState = (resellerId, buildType, state) => {
    const key = `${resellerId}_${buildType}`;
    setBuildStates(prev => ({
      ...prev,
      [key]: state
    }));
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

    const currentState = getBuildState(reseller.id, buildType);
    
    // Handle different states
    if (currentState === 'NOT_BUILDED') {
      // Start new build
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

  // Start a new build
  const startBuild = async (reseller, buildType) => {
    const buildKey = `${reseller.id}_${buildType}`;
    
    try {
      const buildData = {
        appUrl: reseller.appUrl,
        companyName: reseller.companyName,
        parentUserId: reseller.parentUserId,
        resellerId: reseller.resellerId,
        currentDomain: reseller.currentDomain || 'gps',
        buildType: buildType // Add build type to request
      };

      console.log(`🏗️ Starting ${buildType.toUpperCase()} build for reseller:`, buildData);

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
      console.log(`✅ ${buildType.toUpperCase()} build started:`, result);

      // Update state to BUILDING after successful API call
      updateBuildState(reseller.id, buildType, 'BUILDING');

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

    } catch (error) {
      console.error(`❌ Error starting ${buildType.toUpperCase()} build:`, error);
      updateBuildState(reseller.id, buildType, 'BUILD_ERROR');
      setSnackbar({
        open: true,
        message: `Failed to start ${buildType.toUpperCase()} build: ${error.message}`,
        severity: 'error'
      });
    } finally {
      // Always clear loading state
      setBuildLoading(prev => ({ ...prev, [buildKey]: false }));
    }
  };

  // Check build status
  const checkBuildStatus = async (reseller, buildType) => {
    try {
      const statusUrl = resellersConfig.ENDPOINTS.BUILD_STATUS(
        reseller.resellerId,
        reseller.appUrl,
        reseller.parentUserId,
        reseller.currentDomain || 'gps'
      );
      
      console.log(`🔍 Checking build status:`, statusUrl);
      
      const response = await fetch(statusUrl);
      const status = await response.json();
      
      console.log(`📊 Build status response:`, status);

      if (status.data.buildComplete) {
        updateBuildState(reseller.id, buildType, 'BUILDED');
        return { status: 'BUILDED', data: status.data };
      } else if (status.data.isBuilding) {
        updateBuildState(reseller.id, buildType, 'BUILDING');
        return { status: 'BUILDING', data: status.data };
      } else {
        updateBuildState(reseller.id, buildType, 'BUILD_ERROR');
        return { status: 'BUILD_ERROR', data: status.data };
      }
    } catch (error) {
      console.error(`❌ Error checking build status:`, error);
      updateBuildState(reseller.id, buildType, 'BUILD_ERROR');
      return { status: 'BUILD_ERROR', error: error.message };
    }
  };

  // Download build file
  const downloadBuild = async (reseller, buildType) => {
    try {
      console.log(`📥 Downloading ${buildType.toUpperCase()} for reseller:`, reseller);
      
      // Construct download URL (simplified - only need appUrl and buildType)
      const downloadUrl = resellersConfig.ENDPOINTS.DOWNLOAD(
        reseller.appUrl,
        buildType
      );
      
      console.log('🌐 Download URL:', downloadUrl);
      
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
        message: `${buildType.toUpperCase()} download started!`,
        severity: 'success'
      });
    } catch (error) {
      console.error(`❌ Error downloading ${buildType.toUpperCase()}:`, error);
      setSnackbar({
        open: true,
        message: `Failed to download ${buildType.toUpperCase()}: ${error.message}`,
        severity: 'error'
      });
    }
  };

  // Clean apps function
  const cleanApps = async (reseller, cleanType) => {
    try {
      console.log(`🧹 Cleaning ${cleanType} for reseller:`, reseller);
      console.log('🔗 Clean apps endpoint:', resellersConfig.ENDPOINTS.CLEAN_APPS);
      console.log('🔍 Reseller keys:', Object.keys(reseller));
      console.log('🔍 Reseller appUrl:', reseller.appUrl);
      console.log('🔍 Reseller id:', reseller.id);
      
      const requestBody = {
        appUrl: reseller.appUrl,
        resellerId: reseller.id, // Use reseller.id instead of reseller.resellerId
        cleanType: cleanType
      };
      console.log('📤 Request body:', requestBody);
      
      const response = await fetch(resellersConfig.ENDPOINTS.CLEAN_APPS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Clean apps result:', result);

      // Reset build states in localStorage
      const buildKey = `${reseller.id}_apk`;
      const buildKeyAab = `${reseller.id}_aab`;
      console.log('🔑 Build keys to reset:', { buildKey, buildKeyAab, cleanType });
      
      setBuildStates(prev => {
        const newStates = { ...prev };
        if (cleanType === 'apk' || cleanType === 'both') {
          delete newStates[buildKey];
        }
        if (cleanType === 'aab' || cleanType === 'both') {
          delete newStates[buildKeyAab];
        }
        return newStates;
      });

      // Update localStorage
      const savedStates = localStorage.getItem('resellerBuildStates');
      if (savedStates) {
        const states = JSON.parse(savedStates);
        if (cleanType === 'apk' || cleanType === 'both') {
          delete states[buildKey];
        }
        if (cleanType === 'aab' || cleanType === 'both') {
          delete states[buildKeyAab];
        }
        localStorage.setItem('resellerBuildStates', JSON.stringify(states));
      }

      setSnackbar({
        open: true,
        message: `${cleanType.toUpperCase()} apps cleaned successfully`,
        severity: 'success'
      });

      setCleanAppsModal({ open: false, reseller: null });
    } catch (error) {
      console.error(`❌ Error cleaning ${cleanType}:`, error);
      setSnackbar({
        open: true,
        message: `Error cleaning ${cleanType}`,
        severity: 'error'
      });
    }
  };

  const [usersFetched, setUsersFetched] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [domainCheckResult, setDomainCheckResult] = useState(null);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [domainValid, setDomainValid] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);

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
        throw new Error('Failed to fetch resellers');
      }

      const data = await response.json();
      return data.resellers || [];
    },
    enabled: isVisible && !!user?.id, // Only fetch when popover is visible and user is logged in
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Filter resellers based on search keyword
  const filteredResellers = (resellersData || []).filter(reseller =>
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
          throw new Error('Failed to fetch users');
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
    console.log('🔍 Opening logs for reseller:', reseller);
    console.log('🔍 Domain:', reseller.appUrl);
    
    setSelectedReseller(reseller);
    setLogsDialog(true);
    setLogsLoading(true);
    setAnchorEl(null);
    
    try {
      console.log('🔍 Making request to', resellersConfig.ENDPOINTS.LOGS);
      const response = await fetchOrThrow(resellersConfig.ENDPOINTS.LOGS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: reseller.appUrl }),
      });
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Response data:', data);
        console.log('🔍 Logs count:', data.logs?.length || 0);
        setLogs(data.logs || []);
      } else {
        console.error('❌ Failed to fetch logs, status:', response.status);
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
      console.log('🗑️ Deleting logs for domain:', selectedReseller.appUrl);
      const response = await fetchOrThrow(resellersConfig.ENDPOINTS.LOGS_DELETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: selectedReseller.appUrl }),
      });
      
      if (response.ok) {
        console.log('🗑️ Logs deleted successfully');
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
      setSnackbar({ open: true, message: 'Please select a user for Reseller ID', severity: 'error' });
      return;
    }

    // Validate that all required images are selected
    if (!selectedImage && !editingReseller.logotype && !editingReseller.logo) {
      setSnackbar({ open: true, message: 'Company logo is required', severity: 'error' });
      return;
    }
    
    if (!selectedFavicon) {
      setSnackbar({ open: true, message: 'Favicon image is required', severity: 'error' });
      return;
    }
    
    if (!selectedAppImage) {
      setSnackbar({ open: true, message: 'App image (1024x1024) is required', severity: 'error' });
      return;
    }
    
    if (!selectedNotificationIcon) {
      setSnackbar({ open: true, message: 'Notification icon (192x192) is required', severity: 'error' });
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
      setImageError(t('resellerImageValidationError', { maxSize: 2048 }));
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
      setFaviconError('Please select a valid image file');
      return;
    }

    // Check if image is square
    const img = new Image();
    img.onload = async () => {
      if (img.width !== img.height) {
        setFaviconError('Favicon must be square (width = height)');
        setSelectedFavicon(null);
        setFaviconPreview(null);
        return;
      }

      // Image is square, compress and proceed
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
      } catch (error) {
        console.error('Error compressing favicon:', error);
        setFaviconError('Error compressing image');
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
      setAppImageError('Please select a valid image file');
      return;
    }

    // Check dimensions
    const img = new Image();
    img.onload = async () => {
      if (img.width !== 1024 || img.height !== 1024) {
        setAppImageError('App image must be exactly 1024x1024 pixels');
        setSelectedAppImage(null);
        setAppImagePreview(null);
        return;
      }

      // Image has correct dimensions, compress and proceed
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
      } catch (error) {
        console.error('Error compressing app image:', error);
        setAppImageError('Error compressing image');
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
      setNotificationIconError('Please select a valid image file');
      return;
    }

    // Check dimensions
    const img = new Image();
    img.onload = async () => {
      if (img.width !== 192 || img.height !== 192) {
        setNotificationIconError('Notification icon must be exactly 192x192 pixels');
        setSelectedNotificationIcon(null);
        setNotificationIconPreview(null);
        return;
      }

      // Image has correct dimensions, compress and proceed
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
        setNotificationIconError('Error compressing image');
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
      title: 'Clean Apps',
      icon: <DeleteIcon fontSize="small" />,
      handler: (reseller) => {
        setCleanAppsModal({ open: true, reseller });
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
                                    color: buildLoading[`${reseller.id}_aab`] ? colors.primary : colors.text,
                                    padding: '4px'
                                  }}
                                  onClick={() => handleBuildApp(reseller, 'aab')}
                                  disabled={buildLoading[`${reseller.id}_aab`]}
                                  title={`AAB ${getBuildState(reseller.id, 'aab') === 'NOT_BUILDED' ? 'Build' : getBuildState(reseller.id, 'aab') === 'BUILDING' ? 'Check Status' : getBuildState(reseller.id, 'aab') === 'BUILDED' ? 'Download' : 'Retry'}`}
                                >
                                  {buildLoading[`${reseller.id}_aab`] ? (
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
                                    color: buildLoading[`${reseller.id}_apk`] ? colors.primary : colors.text,
                                    padding: '4px'
                                  }}
                                  onClick={() => handleBuildApp(reseller, 'apk')}
                                  disabled={buildLoading[`${reseller.id}_apk`]}
                                  title={`APK ${getBuildState(reseller.id, 'apk') === 'NOT_BUILDED' ? 'Build' : getBuildState(reseller.id, 'apk') === 'BUILDING' ? 'Check Status' : getBuildState(reseller.id, 'apk') === 'BUILDED' ? 'Download' : 'Retry'}`}
                                >
                                  {buildLoading[`${reseller.id}_apk`] ? (
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
                                    color: buildLoading[`${reseller.id}_ios`] ? colors.primary : colors.text,
                                    padding: '4px'
                                  }}
                                  onClick={() => handleBuildApp(reseller, 'ios')}
                                  disabled={buildLoading[`${reseller.id}_ios`]}
                                  title={`iOS ${getBuildState(reseller.id, 'ios') === 'NOT_BUILDED' ? 'Build' : getBuildState(reseller.id, 'ios') === 'BUILDING' ? 'Check Status' : getBuildState(reseller.id, 'ios') === 'BUILDED' ? 'Download' : 'Retry'}`}
                                >
                                  {buildLoading[`${reseller.id}_ios`] ? (
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
                    style={{ color: colors.text, fontSize: '12px' }}
                  >
                    {action.icon}
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
                                
                                {/* Image Upload Field */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <input
                                    type="file"
                                    accept=".png"
                                    onChange={handleImageSelect}
                                    style={{ display: 'none' }}
                                    id="logotype-upload"
                                  />
                                  <label htmlFor="logotype-upload">
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
                                  
                                  {/* Image Preview */}
                                  {imagePreview && (
                                    <div style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      padding: '12px',
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: '8px',
                                      backgroundColor: colors.secondary
                                    }}>
                                      <img
                                        src={imagePreview}
                                        alt="Logo preview"
                                        style={{
                                          maxWidth: '120px',
                                          maxHeight: '120px',
                                          objectFit: 'contain',
                                          borderRadius: '4px'
                                        }}
                                      />
                                      <Typography variant="caption" style={{ color: colors.textSecondary }}>
                                        {selectedImage?.name} ({(selectedImage?.size / 1024).toFixed(1)}KB)
                                      </Typography>
                                    </div>
                                  )}
                                  
                                  {/* Error Message */}
                                  {imageError && (
                                    <Typography variant="caption" style={{ color: '#f44336' }}>
                                      {imageError}
                                    </Typography>
                                  )}
                                  
                                  {/* Current Logo Display */}
                                  {!imagePreview && editingReseller.logo && (
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      padding: '8px',
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: '8px',
                                      backgroundColor: colors.secondary
                                    }}>
                                      <Typography variant="body2" style={{ color: colors.textSecondary }}>
                                        Current: {editingReseller.logo}
                                      </Typography>
                                    </div>
                                  )}
                                </div>

                                {/* Favicon Upload Field */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <Typography variant="subtitle2" style={{ color: colors.text, fontWeight: '600' }}>
                                    Favicon Image (Square)
                                  </Typography>
                                  <input
                                    type="file"
                                    accept=".png"
                                    onChange={handleFaviconSelect}
                                    style={{ display: 'none' }}
                                    id="favicon-upload"
                                  />
                                  <label htmlFor="favicon-upload">
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
                                      {selectedFavicon ? 'Change Favicon' : 'Select Favicon (Square)'}
                                    </Button>
                                  </label>
                                  
                                  {/* Favicon Preview */}
                                  {faviconPreview && (
                                    <div style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      padding: '12px',
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: '8px',
                                      backgroundColor: colors.secondary
                                    }}>
                                      <img
                                        src={faviconPreview}
                                        alt="Favicon preview"
                                        style={{
                                          width: '64px',
                                          height: '64px',
                                          objectFit: 'contain',
                                          borderRadius: '4px'
                                        }}
                                      />
                                      <Typography variant="caption" style={{ color: colors.textSecondary }}>
                                        {selectedFavicon?.name} ({(selectedFavicon?.size / 1024).toFixed(1)}KB)
                                      </Typography>
                                    </div>
                                  )}
                                  
                                  {/* Favicon Error Message */}
                                  {faviconError && (
                                    <Typography variant="caption" style={{ color: '#f44336' }}>
                                      {faviconError}
                                    </Typography>
                                  )}
                                </div>

                                {/* App Image Upload Field */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <Typography variant="subtitle2" style={{ color: colors.text, fontWeight: '600' }}>
                                    App Image (1024x1024)
                                  </Typography>
                                  <input
                                    type="file"
                                    accept=".png"
                                    onChange={handleAppImageSelect}
                                    style={{ display: 'none' }}
                                    id="app-image-upload"
                                  />
                                  <label htmlFor="app-image-upload">
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
                                      {selectedAppImage ? 'Change App Image' : 'Select App Image (1024x1024)'}
                                    </Button>
                                  </label>
                                  
                                  {/* App Image Preview */}
                                  {appImagePreview && (
                                    <div style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      padding: '12px',
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: '8px',
                                      backgroundColor: colors.secondary
                                    }}>
                                      <img
                                        src={appImagePreview}
                                        alt="App image preview"
                                        style={{
                                          width: '120px',
                                          height: '120px',
                                          objectFit: 'contain',
                                          borderRadius: '4px'
                                        }}
                                      />
                                      <Typography variant="caption" style={{ color: colors.textSecondary }}>
                                        {selectedAppImage?.name} ({(selectedAppImage?.size / 1024).toFixed(1)}KB)
                                      </Typography>
                                    </div>
                                  )}
                                  
                                  {/* App Image Error Message */}
                                  {appImageError && (
                                    <Typography variant="caption" style={{ color: '#f44336' }}>
                                      {appImageError}
                                    </Typography>
                                  )}
                                </div>

                                {/* Notification Icon Upload Field */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <Typography variant="subtitle2" style={{ color: colors.text, fontWeight: '600' }}>
                                    Notification Icon (192x192)
                                  </Typography>
                                  <input
                                    type="file"
                                    accept=".png"
                                    onChange={handleNotificationIconSelect}
                                    style={{ display: 'none' }}
                                    id="notification-icon-upload"
                                  />
                                  <label htmlFor="notification-icon-upload">
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
                                      {selectedNotificationIcon ? 'Change Notification Icon' : 'Select Notification Icon (192x192)'}
                                    </Button>
                                  </label>
                                  
                                  {/* Notification Icon Preview */}
                                  {notificationIconPreview && (
                                    <div style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      padding: '12px',
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: '8px',
                                      backgroundColor: colors.secondary
                                    }}>
                                      <img
                                        src={notificationIconPreview}
                                        alt="Notification icon preview"
                                        style={{
                                          width: '80px',
                                          height: '80px',
                                          objectFit: 'contain',
                                          borderRadius: '4px'
                                        }}
                                      />
                                      <Typography variant="caption" style={{ color: colors.textSecondary }}>
                                        {selectedNotificationIcon?.name} ({(selectedNotificationIcon?.size / 1024).toFixed(1)}KB)
                                      </Typography>
                                    </div>
                                  )}
                                  
                                  {/* Notification Icon Error Message */}
                                  {notificationIconError && (
                                    <Typography variant="caption" style={{ color: '#f44336' }}>
                                      {notificationIconError}
                                    </Typography>
                                  )}
                                </div>
                                
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
        <Dialog
          open={buildStatusModal.open}
          onClose={() => setBuildStatusModal({ open: false, reseller: null, buildType: null })}
          maxWidth="sm"
          fullWidth
        >
        <DialogTitle style={{ color: colors.text, borderBottom: `1px solid ${colors.border}` }}>
          Build Status - {buildStatusModal.reseller?.companyName}
        </DialogTitle>
        <DialogContent style={{ padding: '24px' }}>
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
            />
          )}
        </DialogContent>
        </Dialog>
      )}

    </AnimatePresence>

    {/* Clean Apps Modal - Outside AnimatePresence to avoid key conflicts */}
    {cleanAppsModal.open && (
      <Dialog
        open={cleanAppsModal.open}
        onClose={() => setCleanAppsModal({ open: false, reseller: null })}
        maxWidth="sm"
        fullWidth
        style={{ zIndex: 10003 }}
        PaperProps={{
          style: { zIndex: 10003 }
        }}
      >
        <DialogTitle style={{ color: colors.text, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IconButton
              onClick={() => setCleanAppsModal({ open: false, reseller: null })}
              size="small"
              style={{ color: colors.textSecondary }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <span>Clean Apps - {cleanAppsModal.reseller?.companyName}</span>
          </div>
        </DialogTitle>
        <DialogContent style={{ padding: '24px' }}>
          <Typography variant="body1" style={{ marginBottom: '24px', color: colors.text }}>
            Select which apps you want to clean for this reseller:
          </Typography>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button
              variant="outlined"
              onClick={() => cleanApps(cleanAppsModal.reseller, 'apk')}
              style={{ 
                borderColor: colors.border, 
                color: colors.text,
                justifyContent: 'flex-start',
                padding: '12px 16px'
              }}
              startIcon={<BsAndroid size={20} />}
            >
              Clean APK Only
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => cleanApps(cleanAppsModal.reseller, 'aab')}
              style={{ 
                borderColor: colors.border, 
                color: colors.text,
                justifyContent: 'flex-start',
                padding: '12px 16px'
              }}
              startIcon={<BsGooglePlay size={20} />}
            >
              Clean AAB Only
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => cleanApps(cleanAppsModal.reseller, 'both')}
              style={{ 
                borderColor: colors.error, 
                color: colors.error,
                justifyContent: 'flex-start',
                padding: '12px 16px'
              }}
              startIcon={<DeleteIcon />}
            >
              Clean Both APK & AAB
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

// Build Status Modal Content Component
const BuildStatusContent = ({ reseller, buildType, getBuildState, checkBuildStatus, updateBuildState, onClose, onRetry, colors, resellersConfig }) => {
  const [statusData, setStatusData] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);

  const currentState = getBuildState(reseller.id, buildType);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setError(null);
    try {
      const result = await checkBuildStatus(reseller, buildType);
      setStatusData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetry = async () => {
    updateBuildState(reseller.id, buildType, 'NOT_BUILDED');
    await onRetry();
  };

  useEffect(() => {
    if (currentState === 'BUILDING') {
      handleCheckStatus();
    }
  }, [currentState]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '24px' }}>
        <Typography variant="h6" style={{ color: colors.text, marginBottom: '8px' }}>
          {buildType.toUpperCase()} Build Status
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
          <CircularProgress size={48} style={{ color: colors.primary, marginBottom: '16px' }} />
          <Typography variant="body1" style={{ color: colors.text, marginBottom: '16px' }}>
            Building {buildType.toUpperCase()}...
          </Typography>
          <Button
            variant="outlined"
            onClick={handleCheckStatus}
            disabled={isChecking}
            style={{ borderColor: colors.primary, color: colors.primary }}
          >
            {isChecking ? 'Checking...' : 'Check Status'}
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
            </div>
          )}
          <Button
            variant="contained"
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
            style={{ backgroundColor: colors.primary, color: 'white', marginRight: '8px' }}
          >
            Download
          </Button>
        </div>
      )}

      {currentState === 'BUILD_ERROR' && (
        <div>
          <BlockIcon style={{ fontSize: 48, color: colors.error, marginBottom: '16px' }} />
          <Typography variant="body1" style={{ color: colors.text, marginBottom: '16px' }}>
            Build failed
          </Typography>
          {error && (
            <Typography variant="body2" style={{ color: colors.error, marginBottom: '16px' }}>
              {error}
            </Typography>
          )}
          <Button
            variant="contained"
            onClick={handleRetry}
            style={{ backgroundColor: colors.primary, color: 'white' }}
          >
            Try Again
          </Button>
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        <Button
          variant="outlined"
          onClick={onClose}
          style={{ borderColor: colors.border, color: colors.text }}
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export default FloatingResellersPopover;
