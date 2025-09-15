import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  FormControlLabel,
  Pagination,
  CircularProgress,
  Alert,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  Tabs,
  Tab,
} from '@mui/material';
import { MuiFileInput } from 'mui-file-input';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { formatStatus } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useRestriction } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { prefixString } from '../common/util/stringUtils';
import { sessionActions, devicesActions } from '../store';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import useDeviceAttributes from '../common/attributes/useDeviceAttributes';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';
import deviceCategories from '../common/util/deviceCategories';

const FloatingDevicesPopover = ({ 
  desktop, 
  isMenuExpanded, 
  isVisible, 
  onClose 
}) => {
  
  const t = useTranslation();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const limitDevices = useRestriction('limitDevices');
  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const deviceAttributes = useDeviceAttributes(t);

  // State management
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [activeTab, setActiveTab] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const [groupInputRef, setGroupInputRef] = useState(null);
  const [categoryInputRef, setCategoryInputRef] = useState(null);
  const [calendarInputRef, setCalendarInputRef] = useState(null);


  // Fetch devices with TanStack Query
  const { data: devices = [], isLoading, error } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/devices');
      const data = await response.json();
      return data;
    },
    enabled: isVisible,
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


  // Filter devices based on search keyword
  const filteredDevices = devices.filter(device =>
    device.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    device.uniqueId?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    device.phone?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    device.model?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    device.contact?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredDevices.length / pageSize);
  const paginatedDevices = filteredDevices.slice((page - 1) * pageSize, page * pageSize);

  // Create device mutation
  const createDeviceMutation = useMutation({
    mutationFn: async (deviceData) => {
      const response = await fetchOrThrow('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData),
      });
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      console.log('Device created successfully:', data);
      queryClient.invalidateQueries(['devices']);
      dispatch(devicesActions.update([data]));
      setEditDialog(false);
      setEditingDevice(null);
      setActiveTab(0);
    },
    onError: (error) => {
      console.error('Create device error:', error);
    },
  });

  // Update device mutation
  const updateDeviceMutation = useMutation({
    mutationFn: async ({ id, deviceData }) => {
      console.log('=== UPDATE DEVICE DEBUG ===');
      console.log('Device ID:', id);
      console.log('Device data to update:', deviceData);
      console.log('API URL:', `/api/devices/${id}`);
      
      try {
        const response = await fetchOrThrow(`/api/devices/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deviceData),
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Update device response:', result);
        return result;
      } catch (error) {
        console.error('Update device fetch error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Device updated successfully:', data);
      queryClient.invalidateQueries(['devices']);
      dispatch(devicesActions.update([data]));
      setEditDialog(false);
      setEditingDevice(null);
      setActiveTab(0);
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
      setDeleteDialog(false);
      setDeviceToDelete(null);
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


    console.log('Saving device:', editingDevice);

    if (editingDevice.id) {
      console.log('Updating existing device with ID:', editingDevice.id);
      updateDeviceMutation.mutate({ id: editingDevice.id, deviceData: editingDevice });
    } else {
      console.log('Creating new device');
      createDeviceMutation.mutate(editingDevice);
    }
  };

  // Click outside handlers for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (groupInputRef && !groupInputRef.contains(event.target)) {
        setGroupDropdownOpen(false);
      }
      if (categoryInputRef && !categoryInputRef.contains(event.target)) {
        setCategoryDropdownOpen(false);
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
    });
    setEditDialog(true);
    setActiveTab(0);
  };

  const handleEditDevice = (device) => {
    setEditingDevice(device);
    setEditDialog(true);
    setActiveTab(0);
  };

  const handleDeleteClick = (device) => {
    setDeviceToDelete(device);
    setDeleteDialog(true);
    setAnchorEl(null);
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
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: handleDeleteClick,
      show: !limitDevices,
    },
  ];

  if (!isVisible) return null;


  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddDevice}
                  disabled={limitDevices}
                  size="small"
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.text,
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'none',
                    padding: '6px 12px',
                    minWidth: 'auto',
                  }}
                >
                  {t('sharedAdd')}
                </Button>
              </div>
            </div>

            {/* Search */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('sharedSearch')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon style={{ color: colors.textSecondary, marginRight: '8px' }} />,
                }}
                style={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: colors.secondary,
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: colors.primary },
                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                  }
                }}
              />
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
                  <TableContainer style={{ padding: '0 20px' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow style={{ backgroundColor: colors.surface }}>
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('sharedName')}
                          </TableCell>
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('deviceIdentifier')}
                          </TableCell>
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('deviceStatus')}
                          </TableCell>
                          <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
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
                            <TableCell>
                              <Typography variant="body2" style={{ color: colors.text, fontWeight: '500', lineHeight: 1.8, fontSize: '13px' }}>
                                {device.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                                {device.uniqueId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={formatStatus(device.status, t)}
                                size="small"
                                style={{
                                  backgroundColor: device.status === 'online' ? colors.success : colors.error,
                                  color: colors.text,
                                  fontSize: '10px',
                                  height: '16px',
                                }}
                              />
                            </TableCell>
                            <TableCell align="right" style={{ padding: '4px' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                      <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(e, newPage) => setPage(newPage)}
                        size="small"
                        color="primary"
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
                borderRadius: '8px',
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
                    width: '500px',
                    height: '100vh',
                    backgroundColor: colors.surface,
                    borderLeft: `1px solid ${colors.border}`,
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
                    background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                  }}>
                    <IconButton
                      onClick={() => {
                        setEditDialog(false);
                        setEditingDevice(null);
                      }}
                      size="small"
                      style={{ color: colors.text, marginRight: '12px' }}
                    >
                      <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0 }}>
                      {editingDevice?.id ? t('deviceEdit') : t('deviceAdd')}
                    </Typography>
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
                          label={t('deviceIdentifier')}
                          value={editingDevice?.uniqueId || ''}
                          onChange={(e) => setEditingDevice({ ...editingDevice, uniqueId: e.target.value })}
                          size="small"
                          helperText={t('deviceIdentifierHelp')}
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
                        {groupDropdownOpen && (
                          <div style={{
                            position: 'fixed',
                            zIndex: 10004,
                            maxHeight: '200px',
                            overflow: 'auto',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
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
                          label={t('deviceModel')}
                          value={editingDevice?.model || ''}
                          onChange={(e) => setEditingDevice({ ...editingDevice, model: e.target.value })}
                          size="small"
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
                          label={t('deviceContact')}
                          value={editingDevice?.contact || ''}
                          onChange={(e) => setEditingDevice({ ...editingDevice, contact: e.target.value })}
                          size="small"
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
                          label={t('deviceCategory')}
                          value={t(`category${(editingDevice?.category || 'default').replace(/^\w/, (c) => c.toUpperCase())}`)}
                          onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                          readOnly
                          size="small"
                          ref={setCategoryInputRef}
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
                        {categoryDropdownOpen && (
                          <div style={{
                            position: 'fixed',
                            zIndex: 10004,
                            maxHeight: '200px',
                            overflow: 'auto',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            backgroundColor: colors.surface,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            left: categoryInputRef?.getBoundingClientRect().left || 0,
                            top: (categoryInputRef?.getBoundingClientRect().bottom || 0) + 4,
                            width: categoryInputRef?.getBoundingClientRect().width || 200,
                          }}>
                            {deviceCategories.map((category) => (
                              <div
                                key={category}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  color: colors.text,
                                  fontSize: '14px',
                                  borderBottom: `1px solid ${colors.border}`,
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEditingDevice({ ...editingDevice, category: category });
                                  setCategoryDropdownOpen(false);
                                }}
                              >
                                {t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`)}
                              </div>
                            ))}
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
                        {calendarDropdownOpen && (
                          <div style={{
                            position: 'fixed',
                            zIndex: 10004,
                            maxHeight: '200px',
                            overflow: 'auto',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
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
                    </Box>
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '16px 20px',
                    borderTop: `1px solid ${colors.border}`,
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                  }}>
                    <Button
                      onClick={() => {
                        setEditDialog(false);
                        setEditingDevice(null);
                      }}
                      style={{ color: colors.textSecondary }}
                    >
                      {t('sharedCancel')}
                    </Button>
                    <Button
                      onClick={() => {
                        handleSaveDevice();
                      }}
                      variant="contained"
                      disabled={createDeviceMutation.isPending || updateDeviceMutation.isPending}
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.text,
                      }}
                    >
                      {(createDeviceMutation.isPending || updateDeviceMutation.isPending) ? (
                        <CircularProgress size={16} />
                      ) : (
                        t('sharedSave')
                      )}
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialog}
            onClose={() => setDeleteDialog(false)}
            style={{ zIndex: 10003 }}
            PaperProps={{
              style: {
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                zIndex: 10003,
              },
            }}
          >
            <DialogTitle style={{ color: colors.text, padding: '16px 20px' }}>
              {t('sharedConfirmDelete')}
            </DialogTitle>
            <DialogContent style={{ color: colors.text, padding: '0 20px' }}>
              <Typography variant="body2" style={{ color: colors.textSecondary }}>
                {t('sharedRemoveConfirm')} "{deviceToDelete?.name}"?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setDeleteDialog(false)}
                style={{ color: colors.textSecondary }}
              >
                {t('sharedCancel')}
              </Button>
              <Button
                onClick={() => deleteDeviceMutation.mutate(deviceToDelete.id)}
                style={{ color: colors.error }}
                disabled={deleteDeviceMutation.isPending}
              >
                {deleteDeviceMutation.isPending ? (
                  <CircularProgress size={16} />
                ) : (
                  t('sharedRemove')
                )}
              </Button>
            </DialogActions>
          </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingDevicesPopover;