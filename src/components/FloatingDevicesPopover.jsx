import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  TextField,
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
  Box,
  FormControlLabel,
  CircularProgress,
  Alert,
  Checkbox,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { MuiFileInput } from 'mui-file-input';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  Send as SendIcon,
  RestartAlt as RestartAltIcon,
  Map as MapIcon,
  LocationOn as LocationOnIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { formatStatus, formatNotificationTitle, formatTime } from '../common/util/formatter';
import { formatLastUpdate } from '../common/util/timeFilter';
import useTimeFilter from '../hooks/useTimeFilter';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { BsFiletypeXlsx } from "react-icons/bs";

dayjs.extend(relativeTime);
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useRestriction, useManager } from '../common/util/permissions';
import LinkField from '../common/components/LinkField';
import fetchOrThrow from '../common/util/fetchOrThrow';
import CustomPagination from './CustomPagination';

const TELECOM_BASE = import.meta.env.VITE_GESTAO_API_URL
  ? `${import.meta.env.VITE_GESTAO_API_URL}/gestao/telecom`
  : '/gestao/telecom';

const EXCLUDED_MODELS = ['atlasTrax', 'k-tag', 'c-tag'];

const JIMI_IOT_DEFAULTS = {
  iothubServer: 'https://jimi.rastreadorautoram.com.br',
  ftpServerIp: '50.30.32.171',
  ftpPort: '21',
  fileUploadPath: '/',
  token: '123',
  streamingServer: 'https://streaming.rastreadorautoram.com.br',
  midiaServer: 'https://midia.rastreadorautoram.com.br',
};

const GD14_DEFAULTS = {
  iothubServer: 'https://jimi.rastreadorautoram.com.br',
  jt808ServerUrl: 'http://50.30.32.171:7612',
  ftpServerIp: '50.30.32.171',
  ftpPort: '21',
  fileUploadPath: '/',
  token: '123',
  streamingServer: 'https://streaming.rastreadorautoram.com.br',
  midiaServer: 'https://midia.rastreadorautoram.com.br',
  deviceModel: 'GD14',
  channels: '4',
  phone: '',
};
import { devicesActions, errorsActions, fetchVehicles } from '../store';
import DeviceStatusIcons from '../settings/components/DeviceStatusIcons';
import DeviceVehicleHistoryDialog from '../settings/components/DeviceVehicleHistoryDialog';
import SmsSendModal from '../settings/components/SmsSendModal';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import useDeviceAttributes from '../common/attributes/useDeviceAttributes';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';
import deviceCategories from '../common/util/deviceCategories';
import { getDeviceModelOptions } from '../common/util/deviceModels';

// Import device category icons (same as map markers) - optimized imports
import bicycleIcon from '../resources/images/newIcons/bicycle.png';
import boatIcon from '../resources/images/newIcons/boat.png';
import busIcon from '../resources/images/newIcons/bus.png';
import carIcon from '../resources/images/newIcons/car.png';
import camperIcon from '../resources/images/newIcons/camper.png';
import craneIcon from '../resources/images/newIcons/crane.png';
import helicopterIcon from '../resources/images/newIcons/helicopter.png';
import motorcycleIcon from '../resources/images/newIcons/motorcycle.png';
import personIcon from '../resources/images/newIcons/person.png';
import planeIcon from '../resources/images/newIcons/plane.png';
import scooterIcon from '../resources/images/newIcons/scooter.png';
import shipIcon from '../resources/images/newIcons/ship.png';
import tractorIcon from '../resources/images/newIcons/tractor.png';
import trainIcon from '../resources/images/newIcons/train.png';
import tramIcon from '../resources/images/newIcons/tram.png';
import truckIcon from '../resources/images/newIcons/truck.png';
import vanIcon from '../resources/images/newIcons/van.png';
import defaultIcon from '../resources/images/newIcons/default.png';
import animalIcon from '../resources/images/newIcons/animal.png';
import tagIcon from '../resources/images/newIcons/marker_tag.png';

const FloatingDevicesPopover = ({ 
  desktop, 
  isMenuExpanded, 
  isVisible, 
  onClose 
}) => {
  
  const t = useTranslation();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const positions = useSelector((state) => state.session.positions);
  const vehicles = useSelector((state) => state.fleet.vehicles) || [];
  
  const limitDevices = useRestriction('limitDevices');
  const manager = useManager();
  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const deviceAttributes = useDeviceAttributes(t);

  // Device category icons mapping (same as map markers)
  const categoryIcons = {
    animal: animalIcon,
    bicycle: bicycleIcon,
    boat: boatIcon,
    bus: busIcon,
    car: carIcon,
    camper: camperIcon,
    crane: craneIcon,
    helicopter: helicopterIcon,
    motorcycle: motorcycleIcon,
    person: personIcon,
    plane: planeIcon,
    scooter: scooterIcon,
    ship: shipIcon,
    tractor: tractorIcon,
    train: trainIcon,
    tram: tramIcon,
    truck: truckIcon,
    van: vanIcon,
    tag: tagIcon,
    default: defaultIcon,
  };

  // Icon loading component with circular progress
  const IconWithLoading = ({ src, alt, style, fallbackSrc = defaultIcon }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoad = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    return (
      <div style={{ position: 'relative', ...style }}>
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1
          }}>
            <CircularProgress size={16} style={{ color: colors.primary }} />
          </div>
        )}
        <img
          src={hasError ? fallbackSrc : src}
          alt={alt}
          style={{
            ...style,
            opacity: isLoading ? 0.3 : 1,
            transition: 'opacity 0.2s ease'
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  };

  // State management
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [activeTab, setActiveTab] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const [groupInputRef, setGroupInputRef] = useState(null);
  const [categoryInputRef, setCategoryInputRef] = useState(null);
  const [modelInputRef, setModelInputRef] = useState(null);
  const [calendarInputRef, setCalendarInputRef] = useState(null);
  const [connectionsDialog, setConnectionsDialog] = useState(false);
  const [selectedDeviceForConnections, setSelectedDeviceForConnections] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDialogDeviceId, setHistoryDialogDeviceId] = useState(null);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsModalDeviceId, setSmsModalDeviceId] = useState(null);
  const [smsModalDeviceIds, setSmsModalDeviceIds] = useState([]);
  const [smsModalPhone, setSmsModalPhone] = useState('');
  const [selectedSmsDeviceIds, setSelectedSmsDeviceIds] = useState([]);
  const [configPromptOpen, setConfigPromptOpen] = useState(false);
  const [configPromptDeviceId, setConfigPromptDeviceId] = useState(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetDeviceId, setResetDeviceId] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [showUnlinkedOnly, setShowUnlinkedOnly] = useState(false);

  useEffect(() => {
    if (isVisible) {
      dispatch(fetchVehicles());
    }
  }, [isVisible, dispatch]);

  const deviceToVehicle = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {
      const ids = v.deviceIds || (v.devices?.map((d) => d.id)) || (v.device_id != null ? [v.device_id] : []);
      (Array.isArray(ids) ? ids : []).forEach((id) => {
        const key = id != null ? id : null;
        if (key == null) return;
        if (!map[key]) map[key] = [];
        map[key].push(v);
      });
    });
    return map;
  }, [vehicles]);

  const getVehicleDisplay = useCallback((deviceId) => {
    const list = deviceToVehicle[deviceId];
    if (!list || list.length === 0) return '-';
    return list.map((v) => v.nickname || v.plate).join(', ');
  }, [deviceToVehicle]);

  const getClientDisplay = useCallback((deviceId) => {
    const list = deviceToVehicle[deviceId];
    if (!list || list.length === 0) return '-';
    const names = [...new Set(list.map((v) => v.client_name).filter(Boolean))];
    return names.join(', ') || '-';
  }, [deviceToVehicle]);

  const searchValueExtractor = useCallback((device) => {
    if (!device || device.id == null) return '';
    return `${getVehicleDisplay(device.id)} ${getClientDisplay(device.id)}`;
  }, [getVehicleDisplay, getClientDisplay]);

  // Show snackbar notification
  const showSnackbar = (message, severity = 'error') => {
    // Simple console log for now - can be enhanced with proper notification system
    console.log(`${severity.toUpperCase()}: ${message}`);
  };

  // Handle XLSX export - receives devices array (uses displayedDevices when called from UI)
  const handleExport = useCatch(async (devicesToExport) => {
    const devices = devicesToExport ?? filteredDevices;
    const data = devices.map((device) => ({
      [t('deviceIdentifier')]: device.uniqueId,
      [t('sharedName')]: device.name,
      [t('deviceModel')]: device.model,
      [t('sharedPhone')]: device.phone,
      [t('deviceVehicle')]: getVehicleDisplay(device.id),
      [t('deviceClient')]: getClientDisplay(device.id),
      [t('deviceLastUpdate')]: device.lastUpdate ? formatTime(device.lastUpdate, 'minutes') : '-',
      ...(manager ? { [t('deviceStatus')]: formatStatus(device.status, t) } : {}),
    }));

    if (data.length === 0) {
      showSnackbar('No devices to export', 'warning');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t('deviceTitle'));
    const headers = Object.keys(data[0]);

    const titleRow = worksheet.addRow([t('deviceTitle')]);
    worksheet.mergeCells(1, 1, 1, headers.length);
    titleRow.font = { bold: true };

    const border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.border = border;
      cell.font = {};
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1976D2' },
      };
    });
    data.forEach((item) => {
      const row = worksheet.addRow(headers.map((h) => item[h]));
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = border;
        cell.font = {};
      });
    });

    const blob = new Blob(
      [await workbook.xlsx.writeBuffer()],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );
    saveAs(blob, 'devices.xlsx');
  });


  // Fetch devices with TanStack Query
  const { data: devicesData = [], isLoading, error } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/devices?all=true');
      const data = await response.json();
      return data;
    },
    enabled: isVisible,
  });

  const deviceModelOptions = useMemo(
    () => getDeviceModelOptions(devicesData.map((device) => device?.model)),
    [devicesData],
  );

  // Use the reusable time filter hook
  const {
    searchKeyword,
    selectedTimeFilter,
    filteredItems: filteredDevices,
    filterCounts,
    timeFilterOptions,
    handleTimeFilterSelect,
    handleSearchChange,
    getCurrentFilterInfo
  } = useTimeFilter(devicesData, {
    dateField: 'lastUpdate',
    searchFields: ['name', 'uniqueId', 'phone', 'model', 'contact'],
    searchValueExtractor,
    isVisible
  });

  // Fetch groups for dropdown
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/groups');
      return response.json();
    },
    enabled: isVisible,
  });

  // Fetch calendars for dropdown
  const { data: calendars = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/calendars');
      return response.json();
    },
    enabled: isVisible,
  });


  // Reset to page 1 when search or unlinked filter changes
  useEffect(() => {
    setPage(1);
  }, [searchKeyword, showUnlinkedOnly]);

  // Filter devices without vehicle association when showUnlinkedOnly is active
  const displayedDevices = useMemo(() => {
    if (!showUnlinkedOnly) return filteredDevices;
    return filteredDevices.filter((device) => {
      const linked = deviceToVehicle[device?.id];
      return !linked || linked.length === 0;
    });
  }, [filteredDevices, showUnlinkedOnly, deviceToVehicle]);

  const unlinkedCount = useMemo(() => {
    return filteredDevices.filter((device) => {
      const linked = deviceToVehicle[device?.id];
      return !linked || linked.length === 0;
    }).length;
  }, [filteredDevices, deviceToVehicle]);

  // Pagination
  const totalPages = Math.ceil(displayedDevices.length / pageSize);
  const paginatedDevices = displayedDevices.slice((page - 1) * pageSize, page * pageSize);
  const allDisplayedSelected = displayedDevices.length > 0
    && displayedDevices.every((d) => selectedSmsDeviceIds.includes(d.id));

  // Create device mutation
  const createDeviceMutation = useMutation({
    mutationFn: async (deviceData) => {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData),
      });
      
      if (response.status === 200) {
        const result = await response.json();
        return result;
      } else {
        // Any non-200 status is an error
        throw new Error('Device creation failed');
      }
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries(['devices']);
      dispatch(devicesActions.update([data]));
      setEditDialog(false);
      setEditingDevice(null);
      setActiveTab(0);
      dispatch(errorsActions.push(`✅ ${t('deviceCreatedSuccessfully')}`));

      try {
        await fetchOrThrow(`${TELECOM_BASE}/sync/devices-to-chips`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch { /* sync failure is non-blocking */ }

      const model = (data.model || '').toLowerCase();
      if (!EXCLUDED_MODELS.includes(model)) {
        setConfigPromptDeviceId(data.id);
        setConfigPromptOpen(true);
      }
    },
    onError: (error) => {
      console.error('Create device error:', error);
      // Show error message for any non-200 response
      dispatch(errorsActions.push(`❌ ${t('deviceAlreadyExistsOrUpgradePlan')}`));
    },
  });

  // Update device mutation
  const updateDeviceMutation = useMutation({
    mutationFn: async ({ id, deviceData }) => {
      
      try {
        const response = await fetchOrThrow(`/api/devices/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deviceData),
        });
        
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        return result;
      } catch (error) {
        console.error('Update device fetch error:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries(['devices']);
      dispatch(devicesActions.update([data]));
      setEditDialog(false);
      setEditingDevice(null);
      setActiveTab(0);

      try {
        await fetchOrThrow(`${TELECOM_BASE}/sync/devices-to-chips`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch { /* sync failure is non-blocking */ }

      const model = (data.model || '').toLowerCase();
      if (!EXCLUDED_MODELS.includes(model)) {
        setConfigPromptDeviceId(data.id);
        setConfigPromptOpen(true);
      }
    },
    onError: (error) => {
      console.error('Update device mutation error:', error);
    },
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId) => {
      await fetchOrThrow(`/api/devices/${deviceId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      cancelDelete();
    },
  });

  const handleSaveDevice = () => {
    if (!editingDevice) {
      return;
    }

    // Basic validation
    if (!editingDevice.name || !editingDevice.uniqueId) {
      return;
    }

    // Console log iothub state
    console.log('iothub state:', editingDevice.iothub);

    // Store iothub in attributes and remove from top level
    // Ensure all fields are present, even if empty
    const { iothub, ...deviceData } = editingDevice;
    const iothubData = {
      iothubServer: iothub?.iothubServer || '',
      jt808ServerUrl: iothub?.jt808ServerUrl || '',
      ftpServerIp: iothub?.ftpServerIp || '',
      ftpPort: iothub?.ftpPort || '',
      ftpUser: iothub?.ftpUser || '',
      ftpPassword: iothub?.ftpPassword || '',
      fileUploadPath: iothub?.fileUploadPath || '',
      deviceModel: iothub?.deviceModel || '',
      channels: iothub?.channels || '',
      token: iothub?.token || '',
      streamingServer: iothub?.streamingServer || '',
      midiaServer: iothub?.midiaServer || '',
      phone: iothub?.phone || '',
    };
    
    const finalDeviceData = {
      ...deviceData,
      attributes: {
        ...deviceData.attributes,
        iothub: JSON.stringify(iothubData),
      },
    };

    if (editingDevice.id) {
      updateDeviceMutation.mutate({ id: editingDevice.id, deviceData: finalDeviceData });
    } else {
      createDeviceMutation.mutate(finalDeviceData);
    }
  };

  // Sync ftpUser/ftpPassword with uniqueId when model is JC181, JC400 or JC450
  useEffect(() => {
    if (!editDialog || !editingDevice) return;
    const model = editingDevice.model;
    if (!['JC181', 'JC400', 'JC450'].includes(model)) return;
    const uniqueId = editingDevice.uniqueId;
    if (!uniqueId) return;
    const expectedFtpCred = `_${uniqueId}`;
    if (editingDevice?.iothub?.ftpUser === expectedFtpCred && editingDevice?.iothub?.ftpPassword === expectedFtpCred) return;
    setEditingDevice((prev) => {
      if (!prev || !['JC181', 'JC400', 'JC450'].includes(prev.model) || !prev.uniqueId) return prev;
      const exp = `_${prev.uniqueId}`;
      if (prev?.iothub?.ftpUser === exp && prev?.iothub?.ftpPassword === exp) return prev;
      return {
        ...prev,
        iothub: {
          ...(prev?.iothub || {}),
          ftpUser: exp,
          ftpPassword: exp,
        },
      };
    });
  }, [editDialog, editingDevice?.uniqueId, editingDevice?.model]);

  // Keep JT808 phone in iothub config synced with device phone for GD14.
  useEffect(() => {
    if (!editDialog || !editingDevice || editingDevice.model !== 'GD14') return;
    const devicePhone = editingDevice.phone || '';
    if (editingDevice?.iothub?.phone === devicePhone) return;
    setEditingDevice((prev) => {
      if (!prev || prev.model !== 'GD14') return prev;
      const nextPhone = prev.phone || '';
      if (prev?.iothub?.phone === nextPhone) return prev;
      return {
        ...prev,
        iothub: {
          ...(prev?.iothub || {}),
          phone: nextPhone,
        },
      };
    });
  }, [editDialog, editingDevice?.model, editingDevice?.phone, editingDevice?.iothub?.phone]);

  // Click outside handlers for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (groupInputRef && !groupInputRef.contains(event.target)) {
        setGroupDropdownOpen(false);
      }
      if (categoryInputRef && !categoryInputRef.contains(event.target)) {
        setCategoryDropdownOpen(false);
      }
      if (modelInputRef && !modelInputRef.contains(event.target)) {
        setModelDropdownOpen(false);
      }
      if (calendarInputRef && !calendarInputRef.contains(event.target)) {
        setCalendarDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [groupInputRef, categoryInputRef, calendarInputRef]);

  const handleAddDevice = () => {
    setEditingDevice({
      name: '',
      uniqueId: '',
      groupId: null,
      phone: '',
      model: '',
      contact: '',
      category: 'default',
      calendarId: null,
      expirationTime: null,
      disabled: false,
      attributes: {},
      iothub: {
        iothubServer: '',
        jt808ServerUrl: '',
        ftpServerIp: '',
        ftpPort: '',
        ftpUser: '',
        ftpPassword: '',
        fileUploadPath: '',
        deviceModel: '',
        channels: '',
        token: '',
        streamingServer: '',
        midiaServer: '',
        phone: '',
      },
    });
    setEditDialog(true);
    setActiveTab(0);
  };

  const handleEditDevice = (device) => {
    // Read iothub from attributes if it exists
    let iothub = {
      iothubServer: '',
      jt808ServerUrl: '',
      ftpServerIp: '',
      ftpPort: '',
      ftpUser: '',
      ftpPassword: '',
    fileUploadPath: '',
    deviceModel: '',
    channels: '',
    token: '',
    streamingServer: '',
    midiaServer: '',
    phone: '',
    };
    
    if (device.attributes?.iothub) {
      try {
        iothub = JSON.parse(device.attributes.iothub);
      } catch (e) {
        // If parsing fails, use default
      }
    }
    
    setEditingDevice({
      ...device,
      iothub,
    });
    setEditDialog(true);
    setActiveTab(0);
  };

  const handleDeleteClick = (device) => {
    setDeviceToDelete(device);
    setDeleteDialog(true);
    setAnchorEl(null);
  };

  // Handle confirm delete
  const confirmDelete = () => {
    if (deviceToDelete) {
      deleteDeviceMutation.mutate(deviceToDelete.id);
    }
  };

  // Handle cancel delete
  const cancelDelete = () => {
    setDeleteDialog(false);
    setDeviceToDelete(null);
  };

  // Handle device connections
  const handleConnections = (device) => {
    setSelectedDeviceForConnections(device);
    setConnectionsDialog(true);
    setAnchorEl(null);
  };

  const handleResetConfirm = async () => {
    if (!resetDeviceId) return;
    setResetLoading(true);
    setResetError(null);
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/sms/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deviceId: resetDeviceId }),
      });
      const data = await res.json();
      if (data.success) {
        setResetModalOpen(false);
        setResetDeviceId(null);
      } else {
        setResetError(data.error || data.message || 'Erro ao resetar.');
      }
    } catch (e) {
      let errMsg = e.message || 'Erro ao resetar simcard.';
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error) errMsg = parsed.error;
      } catch { /* ignore */ }
      if (errMsg.includes('Cannot POST') || errMsg.includes('404')) {
        errMsg = 'Rota não encontrada. Verifique se o backend de Gestão (porta 3666) está rodando e se o proxy nginx inclui nginx-gestao-proxy.conf.';
      }
      setResetError(errMsg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleFileInput = useCatch(async (newFile) => {
    setImageFile(newFile);
    if (newFile && editingDevice?.id) {
      const response = await fetchOrThrow(`/api/devices/${editingDevice.id}/image`, {
        method: 'POST',
        body: newFile,
      });
      setEditingDevice({ 
        ...editingDevice, 
        attributes: { 
          ...editingDevice.attributes, 
          deviceImage: await response.text() 
        } 
      });
    } else if (!newFile) {
      // eslint-disable-next-line no-unused-vars
      const { deviceImage, ...remainingAttributes } = editingDevice.attributes || {};
      setEditingDevice({ 
        ...editingDevice, 
        attributes: remainingAttributes 
      });
    }
  });

  // Menu actions
  const actions = [
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      handler: handleEditDevice,
      show: !limitDevices,
    },
    {
      key: 'connections',
      title: t('sharedConnections'),
      icon: <LinkIcon fontSize="small" />,
      handler: handleConnections,
      show: !limitDevices,
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: handleDeleteClick,
      show: !limitDevices,
    },
    {
      key: 'sendSms',
      title: t('deviceSendSms'),
      icon: <SendIcon fontSize="small" />,
      handler: (device) => {
        if (device?.id) {
          setSmsModalDeviceId(device.id);
          setSmsModalDeviceIds([]);
          setSmsModalPhone(device.phone || '');
          setSmsModalOpen(true);
        }
        setAnchorEl(null);
      },
      show: true,
    },
    {
      key: 'resetSimcard',
      title: t('deviceResetSimcard'),
      icon: <RestartAltIcon fontSize="small" />,
      handler: (device) => {
        if (device?.id) {
          setResetDeviceId(device.id);
          setResetError(null);
          setResetModalOpen(true);
        }
        setAnchorEl(null);
      },
      show: true,
    },
    {
      key: 'googleMaps',
      title: t('deviceOpenGoogleMaps'),
      icon: <MapIcon fontSize="small" />,
      handler: (device) => {
        const pos = positions[device?.id];
        if (pos?.latitude != null && pos?.longitude != null) {
          window.open(`https://www.google.com/maps?q=${pos.latitude},${pos.longitude}`, '_blank');
        }
      },
      show: true,
    },
    {
      key: 'monitor',
      title: t('deviceMonitor'),
      icon: <LocationOnIcon fontSize="small" />,
      handler: (device) => {
        if (device?.id) {
          dispatch(devicesActions.selectId(device.id));
          navigate('/');
          onClose?.();
        }
      },
      show: true,
    },
    {
      key: 'vehicleHistory',
      title: t('deviceVehicleHistory'),
      icon: <HistoryIcon fontSize="small" />,
      handler: (device) => {
        if (device?.id) {
          setHistoryDialogDeviceId(device.id);
          setHistoryDialogOpen(true);
        }
        setAnchorEl(null);
      },
      show: true,
    },
  ];

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="floating-devices-popover"
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
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}>
            {/* Header */}
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
                  onClick={onClose}
                  size="small"
                  style={{ color: colors.text }}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                  {t('deviceTitle')}
                </Typography>
              </div>
              <IconButton
                onClick={handleAddDevice}
                disabled={limitDevices}
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

            {/* Search */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t('sharedSearchDevices')}
                  value={searchKeyword}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon style={{ color: colors.textSecondary, marginRight: '8px' }} />,
                  }}
                  style={{
                    flex: 1,
                    '& .MuiOutlinedInputRoot': {
                      backgroundColor: colors.secondary,
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primary },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    }
                  }}
                />
              </div>
              
              {/* Time Filter Buttons and Export */}
              <div style={{ 
                marginTop: '12px', 
                paddingTop: '4px',
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '8px'
              }}>
                {/* Time Filter Buttons */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'nowrap',
                  gap: '8px',
                  alignItems: 'center',
                  maxWidth: 'calc(100% - 40px)',
                  overflowX: 'auto',
                  overflowY: 'hidden'
                }}>
                {timeFilterOptions.map((option) => {
                  const isSelected = selectedTimeFilter === option.key;
                  
                  // Special styling for "All" tag - use consistent pattern
                  if (option.key === 'all') {
                    return (
                      <div
                        key={option.key}
                        onClick={() => handleTimeFilterSelect(option.key)}
                        style={{
                          backgroundColor: isSelected ? '#1976d2' : 'transparent',
                          color: isSelected ? '#ffffff' : '#1976d2',
                          border: `1px solid #1976d2`,
                          borderRadius: '6px',
                          padding: '4px 12px',
                          fontSize: '11px',
                          height: '24px',
                          fontWeight: '500',
                          minWidth: 'fit-content',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          userSelect: 'none',
                          boxSizing: 'border-box',
                          outline: 'none',
                          position: 'relative',
                          zIndex: 1,
                          margin: '0',
                          verticalAlign: 'top',
                          WebkitBackfaceVisibility: 'hidden',
                          backfaceVisibility: 'hidden',
                          transform: 'translateZ(0)',
                          willChange: 'auto',
                          opacity: isSelected ? 0.9 : 0.8
                        }}
                      >
                        {option.label}: {filterCounts[option.key]}
                      </div>
                    );
                  }
                  
                  // Regular styling for other tags
                  const textColor = isSelected 
                    ? (option.key === 'gt3h' || option.key === 'gt6h' ? '#333333' : '#ffffff')
                    : option.color;
                  const borderColor = isSelected ? option.color : option.color;
                  
                  return (
                    <div
                      key={option.key}
                      onClick={() => handleTimeFilterSelect(option.key)}
                      style={{
                        backgroundColor: isSelected ? option.color : 'transparent',
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '6px',
                        padding: '4px 12px',
                        fontSize: '11px',
                        height: '24px',
                        fontWeight: '500',
                        minWidth: 'fit-content',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                        boxSizing: 'border-box',
                        outline: 'none',
                        position: 'relative',
                        zIndex: 1,
                        margin: '0',
                        verticalAlign: 'top',
                        WebkitBackfaceVisibility: 'hidden',
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)',
                        willChange: 'auto',
                        opacity: isSelected ? 0.9 : 0.8
                      }}
                    >
                      {option.label}: {filterCounts[option.key]}
                    </div>
                  );
                })}
                {/* Unlinked filter button */}
                <div
                  onClick={() => setShowUnlinkedOnly((prev) => !prev)}
                  style={{
                    backgroundColor: showUnlinkedOnly ? '#1976d2' : 'transparent',
                    color: showUnlinkedOnly ? '#ffffff' : '#1976d2',
                    border: '1px solid #1976d2',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    fontSize: '11px',
                    height: '24px',
                    fontWeight: '500',
                    minWidth: 'fit-content',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    userSelect: 'none',
                    boxSizing: 'border-box',
                    outline: 'none',
                    flexShrink: 0,
                  }}
                  title={t('deviceFilterUnlinked')}
                >
                  <LinkOffIcon style={{ fontSize: 14 }} />
                  {t('deviceFilterUnlinked')}: {unlinkedCount}
                </div>
                </div>
                
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SendIcon />}
                  disabled={selectedSmsDeviceIds.length === 0}
                  onClick={() => {
                    setSmsModalDeviceId(null);
                    setSmsModalDeviceIds(selectedSmsDeviceIds);
                    setSmsModalPhone('');
                    setSmsModalOpen(true);
                  }}
                  sx={{ ml: 1 }}
                >
                  SMS selecionados ({selectedSmsDeviceIds.length})
                </Button>

                {/* XLSX Export Button */}
                <IconButton
                  onClick={() => handleExport(displayedDevices)}
                  size="small"
                  style={{
                    color: colors.text,
                    padding: '4px',
                    marginLeft: '8px'
                  }}
                  title="Export to XLSX"
                >
                  <BsFiletypeXlsx size={16} />
                </IconButton>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
              {isLoading ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  gap: '16px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '120px',
                    height: '120px',
                    backgroundColor: colors.surface,
                    borderRadius: '50%',
                    boxShadow: `0 4px 12px ${colors.border}20`
                  }}>
                    <CircularProgress 
                      style={{ 
                        color: colors.text,
                        position: 'absolute'
                      }} 
                      size={100}
                      thickness={4}
                    />
                  </div>
                  <Typography variant="body2" style={{ color: colors.textSecondary }}>
                    {t('sharedLoading')}...
                  </Typography>
                </div>
              ) : error ? (
                <Alert severity="error" style={{ margin: '20px', backgroundColor: colors.error + '20', color: colors.text }}>
                  {t('sharedError')}: {error.message}
                </Alert>
              ) : (
                <>
                  {/* Table */}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow style={{ backgroundColor: colors.surface }}>
                          <TableCell padding="checkbox" style={{ width: 36 }}>
                            <Checkbox
                              size="small"
                              checked={allDisplayedSelected}
                              indeterminate={!allDisplayedSelected && selectedSmsDeviceIds.length > 0}
                              onChange={() => {
                                if (allDisplayedSelected) {
                                  setSelectedSmsDeviceIds((prev) => prev.filter((id) => !displayedDevices.some((d) => d.id === id)));
                                } else {
                                  setSelectedSmsDeviceIds((prev) => [...new Set([...prev, ...displayedDevices.map((d) => d.id)])]);
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('deviceIdentifier')}
                          </TableCell>
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('sharedName')}
                          </TableCell>
                          {desktop && (
                            <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                              {t('deviceModel')}
                            </TableCell>
                          )}
                          {desktop && (
                            <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                              {t('sharedPhone')}
                            </TableCell>
                          )}
                          {desktop && (
                            <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                              {t('deviceVehicle')}
                            </TableCell>
                          )}
                          {desktop && (
                            <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                              {t('deviceClient')}
                            </TableCell>
                          )}
                          {desktop && (
                            <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                              {t('deviceLastUpdate')}
                            </TableCell>
                          )}
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('deviceStatus')}
                          </TableCell>
                          <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px', textAlign: 'right' }}>
                            {t('sharedActions')}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedDevices.map((device, index) => (
                          <TableRow 
                            key={device.id} 
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
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={selectedSmsDeviceIds.includes(device.id)}
                                onChange={() => {
                                  setSelectedSmsDeviceIds((prev) => (
                                    prev.includes(device.id)
                                      ? prev.filter((id) => id !== device.id)
                                      : [...prev, device.id]
                                  ));
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                                {device.uniqueId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" style={{ color: colors.text, fontWeight: '500', lineHeight: 1.8, fontSize: '13px' }}>
                                {device.name}
                              </Typography>
                            </TableCell>
                            {desktop && (
                              <TableCell>
                                <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                                  {device.model || '-'}
                                </Typography>
                              </TableCell>
                            )}
                            {desktop && (
                              <TableCell>
                                <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                                  {device.phone || '-'}
                                </Typography>
                              </TableCell>
                            )}
                            {desktop && (
                              <TableCell>
                                <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                                  {getVehicleDisplay(device.id)}
                                </Typography>
                              </TableCell>
                            )}
                            {desktop && (
                              <TableCell>
                                <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                                  {getClientDisplay(device.id)}
                                </Typography>
                              </TableCell>
                            )}
                            {desktop && (
                              <TableCell>
                                <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                                  {formatLastUpdate(device, 'lastUpdate', formatTime, device.status)}
                                </Typography>
                              </TableCell>
                            )}
                            <TableCell>
                              <DeviceStatusIcons position={positions[device.id]} />
                            </TableCell>
                            <TableCell align="right" style={{ textAlign: 'right', padding: '4px' }}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setSelectedDevice(device);
                                  setAnchorEl(e.currentTarget);
                                }}
                                style={{ color: colors.textSecondary }}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>


                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{
                      backgroundColor: colors.surface,
                      borderTop: `1px solid ${colors.border}`,
                      padding: '12px 0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '16px',
                      position: 'sticky',
                      bottom: 0,
                      zIndex: 1,
                    }}>
                      <Typography style={{ color: colors.textSecondary, fontSize: '11px', lineHeight: 0.8 }}>
                        {page} / {totalPages} ({displayedDevices.length} {t('sharedDevices')})
                        {selectedTimeFilter !== 'all' && (
                          <span style={{ color: colors.textSecondary, opacity: 0.7 }}>
                            {' '}• {getCurrentFilterInfo().label}
                          </span>
                        )}
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
                </>
              )}
            </div>
          </div>

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
                borderRadius: '6px',
                minWidth: '160px',
                zIndex: 10002,
              }
            }}
          >
            {actions
              .filter(action => action.show !== false)
              .map((action) => (
                <MenuItem
                  key={action.key}
                  onClick={() => {
                    if (action.handler) {
                      action.handler(selectedDevice);
                    }
                    setAnchorEl(null);
                  }}
                  style={{ color: colors.text, fontSize: '12px' }}
                >
                  {action.icon}
                  <span style={{ marginLeft: '6px' }}>{action.title}</span>
                </MenuItem>
              ))}
          </Menu>

          {/* Edit Dialog */}
          <AnimatePresence>
            {editDialog && (
              <>
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
                  onClick={() => {
                    setEditDialog(false);
                    setEditingDevice(null);
                  }}
                />
                <motion.div
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
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
                        onClick={() => {
                          setEditDialog(false);
                          setEditingDevice(null);
                        }}
                        size="small"
                        style={{ color: colors.text }}
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0 }}>
                        {editingDevice?.id ? editingDevice.name : `${t('sharedAdd')} ${t('sharedDevice')}`}
                      </Typography>
                    </div>
                    <IconButton
                      onClick={() => handleSaveDevice()}
                      disabled={createDeviceMutation.isPending || updateDeviceMutation.isPending}
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.text,
                        width: '40px',
                        height: '40px',
                      }}
                      title={createDeviceMutation.isPending || updateDeviceMutation.isPending ? t('sharedSaving') : t('sharedSave')}
                    >
                      {(createDeviceMutation.isPending || updateDeviceMutation.isPending) ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )}
                    </IconButton>
                  </div>

                  {/* Form */}
                  <div style={{ flex: 1, overflow: 'visible', padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
                    {/* Tabs Navigation */}
                    <Tabs
                      value={activeTab}
                      onChange={(e, newValue) => setActiveTab(newValue)}
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
                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
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
                      <Tab label={t('sharedRequired')} />
                      <Tab label={t('sharedExtra')} />
                      <Tab label={t('sharedAttributes')} />
                      <Tab label="Jimi IoT" />
                    </Tabs>

                    {/* Tab Content */}
                    <Box style={{ flex: 1, overflow: 'auto', paddingTop: '16px' }}>
                    {activeTab === 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <TextField
                          fullWidth
                          label={t('sharedName')}
                          value={editingDevice?.name || ''}
                          onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                          size="small"
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
                          label={t('deviceIdentifier')}
                          value={editingDevice?.uniqueId || ''}
                          onChange={(e) => setEditingDevice({ ...editingDevice, uniqueId: e.target.value })}
                          size="small"
                          helperText={t('deviceIdentifierHelp')}
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

                    {activeTab === 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <TextField
                          fullWidth
                          label={t('groupParent')}
                          value={groups.find(g => g.id === editingDevice?.groupId)?.name || ''}
                          onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
                          readOnly
                          size="small"
                          ref={setGroupInputRef}
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
                        {groupDropdownOpen && (
                          <div style={{
                            position: 'fixed',
                            zIndex: 10004,
                            maxHeight: '200px',
                            overflow: 'auto',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            backgroundColor: colors.surface,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            left: groupInputRef?.getBoundingClientRect().left || 0,
                            top: (groupInputRef?.getBoundingClientRect().bottom || 0) + 4,
                            width: groupInputRef?.getBoundingClientRect().width || 200,
                          }}>
                            <div
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                color: colors.textSecondary,
                                fontSize: '14px',
                                borderBottom: `1px solid ${colors.border}`,
                                fontStyle: 'italic',
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setEditingDevice({ ...editingDevice, groupId: null });
                                setGroupDropdownOpen(false);
                              }}
                            >
                              -
                            </div>
                            {groups.map((group) => (
                              <div
                                key={group.id}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  color: colors.text,
                                  fontSize: '14px',
                                  borderBottom: `1px solid ${colors.border}`,
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEditingDevice({ ...editingDevice, groupId: group.id });
                                  setGroupDropdownOpen(false);
                                }}
                              >
                                {group.name}
                              </div>
                            ))}
                          </div>
                        )}

                        <TextField
                          fullWidth
                          label={t('sharedPhone')}
                          value={editingDevice?.phone || ''}
                          onChange={(e) => setEditingDevice({ ...editingDevice, phone: e.target.value })}
                          size="small"
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
                          label={t('deviceModel')}
                          value={editingDevice?.model || ''}
                          onChange={(e) => {
                            setEditingDevice({ ...editingDevice, model: e.target.value });
                            if (!modelDropdownOpen) setModelDropdownOpen(true);
                          }}
                          onFocus={() => setModelDropdownOpen(true)}
                          size="small"
                          ref={setModelInputRef}
                          autoComplete="off"
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
                        {modelDropdownOpen && (
                          <div style={{
                            position: 'fixed',
                            zIndex: 10004,
                            maxHeight: '200px',
                            overflow: 'auto',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            backgroundColor: colors.surface,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            left: modelInputRef?.getBoundingClientRect().left || 0,
                            top: (modelInputRef?.getBoundingClientRect().bottom || 0) + 4,
                            width: modelInputRef?.getBoundingClientRect().width || 200,
                          }}>
                            {deviceModelOptions
                              .filter(m => !editingDevice?.model || m.toLowerCase().includes(editingDevice.model.toLowerCase()))
                              .map((model) => (
                              <div
                                key={model}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  color: colors.text,
                                  fontSize: '14px',
                                  borderBottom: `1px solid ${colors.border}`,
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (model === 'k-tag') {
                                    const attrs = { ...(editingDevice?.attributes || {}) };
                                    if (attrs.ktag_hashedKey === undefined) attrs.ktag_hashedKey = '';
                                    if (attrs.ktag_privateKey === undefined) attrs.ktag_privateKey = '';
                                    setEditingDevice({ ...editingDevice, model: model, attributes: attrs });
                                  } else if (['JC181', 'JC400', 'JC450'].includes(model)) {
                                    const imeiPrefix = editingDevice?.uniqueId ? `_${editingDevice.uniqueId}` : '';
                                    const channels = model === 'JC450' ? '5' : '2';
                                    setEditingDevice({
                                      ...editingDevice,
                                      model: model,
                                      iothub: {
                                        ...JIMI_IOT_DEFAULTS,
                                        ftpUser: imeiPrefix,
                                        ftpPassword: imeiPrefix,
                                        deviceModel: model,
                                        channels,
                                      },
                                    });
                                  } else if (model === 'GD14') {
                                    const fallbackPhone = editingDevice?.phone || '';
                                    setEditingDevice({
                                      ...editingDevice,
                                      model: model,
                                      iothub: {
                                        ...GD14_DEFAULTS,
                                        phone: fallbackPhone,
                                      },
                                    });
                                  } else {
                                    setEditingDevice({ ...editingDevice, model: model });
                                  }
                                  setModelDropdownOpen(false);
                                }}
                              >
                                {model}
                              </div>
                            ))}
                          </div>
                        )}

                        <TextField
                          fullWidth
                          label={t('deviceContact')}
                          value={editingDevice?.contact || ''}
                          onChange={(e) => setEditingDevice({ ...editingDevice, contact: e.target.value })}
                          size="small"
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
                          label={t('deviceCategory')}
                          value={t(`category${(editingDevice?.category || 'default').replace(/^\w/, (c) => c.toUpperCase())}`)}
                          onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                          readOnly
                          size="small"
                          ref={setCategoryInputRef}
                          InputProps={{
                            startAdornment: (
                              <IconWithLoading
                                src={categoryIcons[editingDevice?.category || 'default'] || categoryIcons.default}
                                alt={editingDevice?.category || 'default'}
                                style={{ 
                                  width: editingDevice?.category === 'tag' ? '100px' : '44px', 
                                  height: editingDevice?.category === 'tag' ? '100px' : '44px',
                                  objectFit: 'contain',
                                  marginRight: editingDevice?.category === 'tag' ? '-20px' : '8px',
                                  marginLeft: editingDevice?.category === 'tag' ? '-20px' : '0px'
                                }}
                              />
                            ),
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
                        {categoryDropdownOpen && (
                          <div style={{
                            position: 'fixed',
                            zIndex: 10004,
                            maxHeight: '200px',
                            overflow: 'auto',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            backgroundColor: colors.surface,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            left: categoryInputRef?.getBoundingClientRect().left || 0,
                            top: (categoryInputRef?.getBoundingClientRect().bottom || 0) + 4,
                            width: categoryInputRef?.getBoundingClientRect().width || 200,
                          }}>
                            {deviceCategories.map((category) => {
                              const iconSrc = categoryIcons[category] || categoryIcons.default;
                              const isSelected = editingDevice?.category === category;
                              return (
                                <div
                                  key={category}
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    color: colors.text,
                                    fontSize: '14px',
                                    borderBottom: `1px solid ${colors.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setEditingDevice({ ...editingDevice, category: category });
                                    setCategoryDropdownOpen(false);
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <IconWithLoading
                                      src={iconSrc}
                                      alt={category}
                                      style={{ 
                                        width: category === 'tag' ? '120px' : '48px', 
                                        height: category === 'tag' ? '120px' : '48px',
                                        objectFit: 'contain',
                                        margin: category === 'tag' ? '-30px' : '0px'
                                      }}
                                    />
                                    {t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`)}
                                  </div>
                                  {isSelected && <CheckIcon style={{ color: '#10B981', fontSize: '18px' }} />}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <TextField
                          fullWidth
                          label={t('sharedCalendar')}
                          value={calendars.find(c => c.id === editingDevice?.calendarId)?.name || ''}
                          onClick={() => setCalendarDropdownOpen(!calendarDropdownOpen)}
                          readOnly
                          size="small"
                          ref={setCalendarInputRef}
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
                        {calendarDropdownOpen && (
                          <div style={{
                            position: 'fixed',
                            zIndex: 10004,
                            maxHeight: '200px',
                            overflow: 'auto',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            backgroundColor: colors.surface,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            left: calendarInputRef?.getBoundingClientRect().left || 0,
                            top: (calendarInputRef?.getBoundingClientRect().bottom || 0) + 4,
                            width: calendarInputRef?.getBoundingClientRect().width || 200,
                          }}>
                            <div
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                color: colors.textSecondary,
                                fontSize: '14px',
                                borderBottom: `1px solid ${colors.border}`,
                                fontStyle: 'italic',
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setEditingDevice({ ...editingDevice, calendarId: null });
                                setCalendarDropdownOpen(false);
                              }}
                            >
                              -
                            </div>
                            {calendars.map((calendar) => (
                              <div
                                key={calendar.id}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  color: colors.text,
                                  fontSize: '14px',
                                  borderBottom: `1px solid ${colors.border}`,
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEditingDevice({ ...editingDevice, calendarId: calendar.id });
                                  setCalendarDropdownOpen(false);
                                }}
                              >
                                {calendar.name}
                              </div>
                            ))}
                          </div>
                        )}

                        <TextField
                          fullWidth
                          label={t('userExpirationTime')}
                          type="date"
                          value={editingDevice?.expirationTime ? editingDevice.expirationTime.split('T')[0] : '2099-01-01'}
                          onChange={(e) => {
                            if (e.target.value) {
                              setEditingDevice({ ...editingDevice, expirationTime: new Date(e.target.value).toISOString() });
                            }
                          }}
                          size="small"
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

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={editingDevice?.disabled || false}
                              onChange={(e) => setEditingDevice({ ...editingDevice, disabled: e.target.checked })}
                              sx={{
                                color: colors.text,
                                '&.Mui-checked': {
                                  color: colors.text,
                                },
                                '&.MuiCheckbox-root': {
                                  color: colors.text,
                                }
                              }}
                            />
                          }
                          label={t('sharedDisabled')}
                          sx={{ color: colors.text }}
                        />
                      </div>
                    )}

                    {/* Attributes Tab */}
                    {activeTab === 2 && (
                      <div>
                        {editingDevice?.id && (
                          <div style={{ marginBottom: '16px' }}>
                            <Typography variant="subtitle2" style={{ color: colors.text, marginBottom: '8px' }}>
                              {t('attributeDeviceImage')}
                            </Typography>
                            <MuiFileInput
                              placeholder={t('attributeDeviceImage')}
                              value={imageFile}
                              onChange={handleFileInput}
                              inputProps={{ accept: 'image/*' }}
                              style={{
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
                        <EditAttributesAccordion
                          attribute={null}
                          attributes={editingDevice?.attributes || {}}
                          setAttributes={(attributes) => setEditingDevice({ ...editingDevice, attributes })}
                          definitions={{ ...commonDeviceAttributes, ...deviceAttributes }}
                          focusAttribute={null}
                          zIndex={10003}
                        />
                      </div>
                    )}

                    {/* Jimi IoT Tab */}
                    {activeTab === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <TextField
                          fullWidth
                          label="IoTHub Server"
                          value={editingDevice?.iothub?.iothubServer || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              iothubServer: e.target.value 
                            } 
                          })}
                          size="small"
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
                          label="Device Model"
                          value={editingDevice?.iothub?.deviceModel || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              deviceModel: e.target.value 
                            } 
                          })}
                          size="small"
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
                          label="JT808 Server URL"
                          value={editingDevice?.iothub?.jt808ServerUrl || ''}
                          onChange={(e) => setEditingDevice({
                            ...editingDevice,
                            iothub: {
                              ...(editingDevice?.iothub || {}),
                              jt808ServerUrl: e.target.value,
                            },
                          })}
                          size="small"
                          sx={{
                            '& .MuiOutlinedInputRoot': {
                              backgroundColor: colors.secondary,
                              '& fieldset': { borderColor: colors.border },
                              '&:hover fieldset': { borderColor: colors.primary },
                              '&.Mui-focused fieldset': { borderColor: colors.primary },
                            },
                            '& .MuiInputLabelRoot': {
                              color: colors.textSecondary,
                              '&.Mui-focused': { color: colors.primary },
                            },
                          }}
                        />
                        <TextField
                          fullWidth
                          label="JT808 Phone"
                          value={editingDevice?.iothub?.phone || ''}
                          onChange={(e) => setEditingDevice({
                            ...editingDevice,
                            iothub: {
                              ...(editingDevice?.iothub || {}),
                              phone: e.target.value,
                            },
                          })}
                          size="small"
                          sx={{
                            '& .MuiOutlinedInputRoot': {
                              backgroundColor: colors.secondary,
                              '& fieldset': { borderColor: colors.border },
                              '&:hover fieldset': { borderColor: colors.primary },
                              '&.Mui-focused fieldset': { borderColor: colors.primary },
                            },
                            '& .MuiInputLabelRoot': {
                              color: colors.textSecondary,
                              '&.Mui-focused': { color: colors.primary },
                            },
                          }}
                        />
                        <TextField
                          fullWidth
                          label="FTP Server IP"
                          value={editingDevice?.iothub?.ftpServerIp || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              ftpServerIp: e.target.value 
                            } 
                          })}
                          size="small"
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
                          label="FTP Port"
                          value={editingDevice?.iothub?.ftpPort || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              ftpPort: e.target.value 
                            } 
                          })}
                          size="small"
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
                          label="FTP User"
                          value={editingDevice?.iothub?.ftpUser || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              ftpUser: e.target.value 
                            } 
                          })}
                          size="small"
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
                          label="FTP Password"
                          type="password"
                          value={editingDevice?.iothub?.ftpPassword || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              ftpPassword: e.target.value 
                            } 
                          })}
                          size="small"
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
                          label="File Upload Path"
                          value={editingDevice?.iothub?.fileUploadPath || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              fileUploadPath: e.target.value 
                            } 
                          })}
                          size="small"
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
                          label="Channels"
                          value={editingDevice?.iothub?.channels || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              channels: e.target.value 
                            } 
                          })}
                          size="small"
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
                          label="Token"
                          value={editingDevice?.iothub?.token || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              token: e.target.value 
                            } 
                          })}
                          size="small"
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
                          label="Streaming Server"
                          value={editingDevice?.iothub?.streamingServer || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              streamingServer: e.target.value 
                            } 
                          })}
                          size="small"
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
                          label="Midia Server"
                          value={editingDevice?.iothub?.midiaServer || ''}
                          onChange={(e) => setEditingDevice({ 
                            ...editingDevice, 
                            iothub: { 
                              ...(editingDevice?.iothub || {}), 
                              midiaServer: e.target.value 
                            } 
                          })}
                          size="small"
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
                  </div>

                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Delete Confirmation Modal - Matching logout style */}
          <AnimatePresence>
            {deleteDialog && (
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
                onClick={cancelDelete}
              >
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: '6px',
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
                    {t('sharedDeleteConfirm')} "{deviceToDelete?.name}"?
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
                      disabled={deleteDeviceMutation.isPending}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: deleteDeviceMutation.isPending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: deleteDeviceMutation.isPending ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!deleteDeviceMutation.isPending) {
                          e.target.style.backgroundColor = '#FEE2E2';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!deleteDeviceMutation.isPending) {
                          e.target.style.backgroundColor = '#FEF2F2';
                        }
                      }}
                    >
                      {deleteDeviceMutation.isPending ? (
                        <CircularProgress size={16} style={{ color: '#DC2626' }} />
                      ) : (
                        t('sharedRemove')
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connections Drawer - Slides in from right */}
          <AnimatePresence>
            {connectionsDialog && (
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
                    zIndex: 9999,
                  }}
                  onClick={() => setConnectionsDialog(false)}
                />
                
                {/* Drawer */}
                <motion.div
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
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
                        onClick={() => setConnectionsDialog(false)}
                        size="small"
                        style={{ color: colors.textSecondary }}
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                        {t('sharedConnections')} - {selectedDeviceForConnections?.name}
                      </Typography>
                    </div>
                  </div>

                  {/* Drawer Content */}
                  <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '20px',
                    paddingBottom: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {selectedDeviceForConnections && (
                      <>
                        <LinkField
                          endpointAll="/api/geofences"
                          endpointLinked={`/api/geofences?deviceId=${selectedDeviceForConnections.id}`}
                          baseId={selectedDeviceForConnections.id}
                          keyBase="deviceId"
                          keyLink="geofenceId"
                          label={t('sharedGeofences')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/notifications"
                          endpointLinked={`/api/notifications?deviceId=${selectedDeviceForConnections.id}`}
                          baseId={selectedDeviceForConnections.id}
                          keyBase="deviceId"
                          keyLink="notificationId"
                          titleGetter={(it) => formatNotificationTitle(t, it)}
                          label={t('sharedNotifications')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/drivers"
                          endpointLinked={`/api/drivers?deviceId=${selectedDeviceForConnections.id}`}
                          baseId={selectedDeviceForConnections.id}
                          keyBase="deviceId"
                          keyLink="driverId"
                          titleGetter={(it) => `${it.name} (${it.uniqueId})`}
                          label={t('sharedDrivers')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/attributes/computed"
                          endpointLinked={`/api/attributes/computed?deviceId=${selectedDeviceForConnections.id}`}
                          baseId={selectedDeviceForConnections.id}
                          keyBase="deviceId"
                          keyLink="attributeId"
                          titleGetter={(it) => it.description}
                          label={t('sharedComputedAttributes')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/commands"
                          endpointLinked={`/api/commands?deviceId=${selectedDeviceForConnections.id}`}
                          baseId={selectedDeviceForConnections.id}
                          keyBase="deviceId"
                          keyLink="commandId"
                          titleGetter={(it) => it.description}
                          label={t('sharedSavedCommands')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/maintenance"
                          endpointLinked={`/api/maintenance?deviceId=${selectedDeviceForConnections.id}`}
                          baseId={selectedDeviceForConnections.id}
                          keyBase="deviceId"
                          keyLink="maintenanceId"
                          label={t('sharedMaintenance')}
                          zIndex={50000}
                        />
                      </>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <DeviceVehicleHistoryDialog
            open={historyDialogOpen}
            onClose={() => { setHistoryDialogOpen(false); setHistoryDialogDeviceId(null); }}
            deviceId={historyDialogDeviceId}
          />
          {createPortal(
            <Dialog
              open={configPromptOpen}
              onClose={() => { setConfigPromptOpen(false); setConfigPromptDeviceId(null); }}
              slotProps={{ root: { sx: { zIndex: 99999 } } }}
            >
              <DialogTitle>Configurar dispositivo</DialogTitle>
              <DialogContent>
                <Typography>Deseja configurar o dispositivo agora via SMS?</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => { setConfigPromptOpen(false); setConfigPromptDeviceId(null); }}>
                  Não
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setConfigPromptOpen(false);
                    setSmsModalDeviceId(configPromptDeviceId);
                    setSmsModalDeviceIds([]);
                    setSmsModalOpen(true);
                    setConfigPromptDeviceId(null);
                  }}
                >
                  Sim
                </Button>
              </DialogActions>
            </Dialog>,
            document.body
          )}
          <SmsSendModal
            open={smsModalOpen}
            onClose={() => {
              setSmsModalOpen(false);
              setSmsModalDeviceId(null);
              setSmsModalDeviceIds([]);
              setSmsModalPhone('');
            }}
            deviceId={smsModalDeviceId}
            deviceIds={smsModalDeviceIds}
            phone={smsModalPhone}
          />
          <Dialog
            open={resetModalOpen}
            onClose={() => !resetLoading && setResetModalOpen(false)}
            slotProps={{ root: { sx: { zIndex: 99999 } } }}
          >
            <DialogTitle>{t('deviceResetSimcard')}</DialogTitle>
            <DialogContent>
              {resetError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setResetError(null)}>
                  {resetError}
                </Alert>
              )}
              Deseja resetar o simcard deste dispositivo?
            </DialogContent>
            <DialogActions>
              <Button onClick={() => !resetLoading && setResetModalOpen(false)} disabled={resetLoading}>
                Cancelar
              </Button>
              <Button variant="contained" color="secondary" onClick={handleResetConfirm} disabled={resetLoading}>
                {resetLoading ? <CircularProgress size={20} /> : t('deviceResetSimcard')}
              </Button>
            </DialogActions>
          </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingDevicesPopover;