import { useState, useEffect, useRef } from 'react';
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
import { formatStatus, formatBoolean, formatNotificationTitle } from '../common/util/formatter';
import { useTranslation, useTranslationKeys } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useRestriction } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { prefixString, unprefixString } from '../common/util/stringUtils';
import SelectField from '../common/components/SelectField';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';

const FloatingNotificationsPopover = ({ desktop, isMenuExpanded, isVisible, onClose }) => {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const t = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const limitNotifications = useRestriction('notifications');

  // State management
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [activeTab, setActiveTab] = useState(0);
  
  // Custom dropdown states
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [alarmsDropdownOpen, setAlarmsDropdownOpen] = useState(false);
  const [notificatorsDropdownOpen, setNotificatorsDropdownOpen] = useState(false);
  const [commandDropdownOpen, setCommandDropdownOpen] = useState(false);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  
  // Refs for dropdown positioning
  const typeInputRef = useRef(null);
  const alarmsInputRef = useRef(null);
  const notificatorsInputRef = useRef(null);
  const commandInputRef = useRef(null);
  const calendarInputRef = useRef(null);

  // Fetch notifications with TanStack Query
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/notifications');
      return response.json();
    },
  });

  // Fetch notification types
  const { data: notificationTypes = [] } = useQuery({
    queryKey: ['notificationTypes'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/notifications/types');
      return response.json();
    },
  });

  // Fetch notificators
  const { data: notificators = [] } = useQuery({
    queryKey: ['notificators'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/notifications/notificators');
      return response.json();
    },
  });

  // Fetch commands
  const { data: commands = [] } = useQuery({
    queryKey: ['commands'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/commands');
      return response.json();
    },
  });

  // Fetch calendars
  const { data: calendars = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/calendars');
      return response.json();
    },
  });

  // Get alarms from translation keys
  const alarms = useTranslationKeys((it) => it.startsWith('alarm')).map((it) => ({
    key: unprefixString('alarm', it),
    name: t(it),
  }));

  // Mutations
  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData) => {
      const response = await fetchOrThrow('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setEditDialog(false);
      setEditingNotification(null);
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async ({ id, notificationData }) => {
      const response = await fetchOrThrow(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setEditDialog(false);
      setEditingNotification(null);
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      await fetchOrThrow(`/api/notifications/${notificationId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      cancelDelete();
    },
  });

  // Test notificators
  const testNotificators = useCatch(async () => {
    if (editingNotification?.notificators) {
      await Promise.all(editingNotification.notificators.split(/[, ]+/).map(async (notificator) => {
        await fetchOrThrow(`/api/notifications/test/${notificator}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingNotification),
        });
      }));
    }
  });

  // Click outside handlers for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (typeInputRef.current && !typeInputRef.current.contains(event.target)) {
        setTypeDropdownOpen(false);
      }
      if (alarmsInputRef.current && !alarmsInputRef.current.contains(event.target)) {
        setAlarmsDropdownOpen(false);
      }
      if (notificatorsInputRef.current && !notificatorsInputRef.current.contains(event.target)) {
        setNotificatorsDropdownOpen(false);
      }
      if (commandInputRef.current && !commandInputRef.current.contains(event.target)) {
        setCommandDropdownOpen(false);
      }
      if (calendarInputRef.current && !calendarInputRef.current.contains(event.target)) {
        setCalendarDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSaveNotification = () => {
    if (!editingNotification) {
      return;
    }

    if (editingNotification.id) {
      updateNotificationMutation.mutate({ id: editingNotification.id, notificationData: editingNotification });
    } else {
      createNotificationMutation.mutate(editingNotification);
    }
  };

  const handleEditNotification = (notification) => {
    setEditingNotification(notification);
    setEditDialog(true);
    setActiveTab(0);
  };

  const handleDeleteClick = (notification) => {
    setNotificationToDelete(notification);
    setDeleteDialog(true);
    setAnchorEl(null);
  };

  // Handle confirm delete
  const confirmDelete = () => {
    if (notificationToDelete) {
      deleteNotificationMutation.mutate(notificationToDelete.id);
    }
  };

  // Handle cancel delete
  const cancelDelete = () => {
    setDeleteDialog(false);
    setNotificationToDelete(null);
  };


  const handleAddNotification = () => {
    setEditingNotification({
      type: '',
      notificators: '',
      always: false,
      description: '',
      calendarId: null,
      attributes: {
        alarms: '',
        priority: false,
      },
    });
    setEditDialog(true);
    setActiveTab(0);
  };

  // Format list helper
  const formatList = (prefix, value) => {
    if (value) {
      return value
        .split(/[, ]+/)
        .filter(Boolean)
        .map((it) => t(prefixString(prefix, it)))
        .join(', ');
    }
    return '';
  };

  // Filter and paginate notifications
  const filteredNotifications = notifications.filter(notification =>
    notification.description?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    notification.type?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const totalPages = Math.ceil(filteredNotifications.length / pageSize);
  const paginatedNotifications = filteredNotifications.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Menu actions
  const actions = [
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      handler: handleEditNotification,
      show: !limitNotifications,
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: handleDeleteClick,
      show: !limitNotifications,
    },
  ];

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="floating-notifications-popover"
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
            boxShadow: !desktop ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
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
                style={{ color: colors.textSecondary }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                {t('sharedNotifications')}
              </Typography>
            </div>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNotification}
              disabled={limitNotifications}
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

          {/* Content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {isLoading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <CircularProgress size={40} style={{ color: colors.text }} thickness={4} />
                <Typography style={{ color: colors.textSecondary }}>
                  {t('sharedLoading')}...
                </Typography>
              </div>
            ) : error ? (
              <div style={{ padding: '20px' }}>
                <Alert severity="error" style={{ backgroundColor: colors.error, color: colors.text }}>
                  {t('sharedError')}: {error.message}
                </Alert>
              </div>
            ) : (
              <>
                {/* Search */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                  <TextField
                    fullWidth
                    placeholder={t('sharedSearch')}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: <SearchIcon style={{ color: colors.textSecondary, marginRight: '8px' }} />,
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
                </div>

                {/* Table */}
                <TableContainer style={{ padding: '0 20px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow style={{ backgroundColor: colors.surface }}>
                        <TableCell align="left" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('sharedDescription')}
                        </TableCell>
                        {desktop && (
                          <TableCell align="left" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('notificationType')}
                          </TableCell>
                        )}
                        {desktop && (
                          <TableCell align="left" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('notificationAlways')}
                          </TableCell>
                        )}
                        {desktop && (
                          <TableCell align="left" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('sharedAlarms')}
                          </TableCell>
                        )}
                        {desktop && (
                          <TableCell align="left" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('notificationNotificators')}
                          </TableCell>
                        )}
                        <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('sharedActions')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedNotifications.map((notification, index) => (
                        <TableRow 
                          key={notification.id} 
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
                              {notification.description || '-'}
                            </Typography>
                          </TableCell>
                          {desktop && (
                            <TableCell>
                              <Chip
                                label={t(prefixString('event', notification.type))}
                                size="small"
                                style={{
                                  backgroundColor: colors.primary,
                                  color: colors.text,
                                  fontSize: '10px',
                                  height: '16px',
                                }}
                              />
                            </TableCell>
                          )}
                          {desktop && (
                            <TableCell>
                              <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                                {formatBoolean(notification.always, t)}
                              </Typography>
                            </TableCell>
                          )}
                          {desktop && (
                            <TableCell>
                              <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                                {formatList('alarm', notification.attributes?.alarms)}
                              </Typography>
                            </TableCell>
                          )}
                          {desktop && (
                            <TableCell>
                              <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                                {formatList('notificator', notification.notificators)}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell align="right" style={{ padding: '4px' }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setSelectedNotification(notification);
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
                      onChange={(event, value) => setPage(value)}
                      size="small"
                      sx={{
                        '& .MuiPaginationItem-root': {
                          color: colors.text,
                          '&.Mui-selected': {
                            backgroundColor: colors.primary,
                            color: colors.text,
                          },
                        },
                      }}
                    />
                  </div>
                )}
              </>
            )}
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
                      action.handler(selectedNotification);
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

          {/* Edit Notification Drawer */}
          <AnimatePresence>
            {editDialog && (
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
                  onClick={() => {
                    setEditDialog(false);
                    setEditingNotification(null);
                  }}
                />

                {/* Drawer */}
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
                    zIndex: 10001,
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
                        onClick={() => {
                          setEditDialog(false);
                          setEditingNotification(null);
                        }}
                        size="small"
                        style={{ color: colors.textSecondary }}
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                        {editingNotification?.id ? t('sharedEdit') : t('sharedAdd')} {t('sharedNotification')}
                      </Typography>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <Tabs
                      value={activeTab}
                      onChange={(e, newValue) => setActiveTab(newValue)}
                      style={{ minHeight: '48px' }}
                      sx={{
                        '& .MuiTab-root': {
                          color: '#666666',
                          fontSize: '13px',
                          fontWeight: '500',
                          textTransform: 'none',
                          minHeight: '48px',
                          padding: '0 16px',
                        },
                        '& .Mui-selected': {
                          color: '#1976d2',
                        },
                        '& .MuiTabs-indicator': {
                          backgroundColor: '#1976d2',
                        },
                      }}
                      scrollButtons="auto"
                    >
                      <Tab label={t('sharedRequired')} />
                      <Tab label={t('sharedExtra')} />
                    </Tabs>
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '20px',
                    paddingBottom: '200px',
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activeTab === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Type Dropdown */}
                          <div ref={typeInputRef} style={{ position: 'relative' }}>
                            <TextField
                              fullWidth
                              label={t('sharedType')}
                              value={editingNotification?.type ? t(prefixString('event', editingNotification.type)) : ''}
                              onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                              readOnly
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
                            {typeDropdownOpen && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: typeInputRef.current ? typeInputRef.current.getBoundingClientRect().bottom + 4 : 0,
                                  left: typeInputRef.current ? typeInputRef.current.getBoundingClientRect().left : 0,
                                  width: typeInputRef.current ? typeInputRef.current.getBoundingClientRect().width : 200,
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '4px',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  zIndex: 10004,
                                  maxHeight: '200px',
                                  overflow: 'auto',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {notificationTypes.map((type) => (
                                  <div
                                    key={type.type}
                                    style={{
                                      padding: '8px 12px',
                                      cursor: 'pointer',
                                      color: colors.text,
                                      fontSize: '14px',
                                      borderBottom: `1px solid ${colors.border}`,
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setEditingNotification({ ...editingNotification, type: type.type });
                                      setTypeDropdownOpen(false);
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = colors.hover;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    {t(prefixString('event', type.type))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {editingNotification?.type === 'alarm' && (
                            /* Alarms Dropdown */
                            <div ref={alarmsInputRef} style={{ position: 'relative' }}>
                              <TextField
                                fullWidth
                                label={t('sharedAlarms')}
                                value={editingNotification?.attributes?.alarms ? 
                                  editingNotification.attributes.alarms.split(/[, ]+/).map(alarm => t(prefixString('alarm', alarm))).join(', ') : ''}
                                onClick={() => setAlarmsDropdownOpen(!alarmsDropdownOpen)}
                                readOnly
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
                              {alarmsDropdownOpen && (
                                <div
                                  style={{
                                    position: 'fixed',
                                    top: alarmsInputRef.current ? alarmsInputRef.current.getBoundingClientRect().bottom + 4 : 0,
                                    left: alarmsInputRef.current ? alarmsInputRef.current.getBoundingClientRect().left : 0,
                                    width: alarmsInputRef.current ? alarmsInputRef.current.getBoundingClientRect().width : 200,
                                    backgroundColor: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    zIndex: 10004,
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {alarms.map((alarm) => {
                                    const isSelected = editingNotification?.attributes?.alarms?.split(/[, ]+/).includes(alarm.key);
                                    return (
                                      <div
                                        key={alarm.key}
                                        style={{
                                          padding: '8px 12px',
                                          cursor: 'pointer',
                                          color: colors.text,
                                          fontSize: '14px',
                                          borderBottom: `1px solid ${colors.border}`,
                                          backgroundColor: isSelected ? colors.primary + '20' : 'transparent',
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          const currentAlarms = editingNotification?.attributes?.alarms ? 
                                            editingNotification.attributes.alarms.split(/[, ]+/) : [];
                                          const newAlarms = isSelected 
                                            ? currentAlarms.filter(a => a !== alarm.key)
                                            : [...currentAlarms, alarm.key];
                                          setEditingNotification({ 
                                            ...editingNotification, 
                                            attributes: { ...editingNotification.attributes, alarms: newAlarms.join(', ') } 
                                          });
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = colors.hover;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = isSelected ? colors.primary + '20' : 'transparent';
                                        }}
                                      >
                                        {alarm.name}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Notificators Dropdown */}
                          <div ref={notificatorsInputRef} style={{ position: 'relative' }}>
                            <TextField
                              fullWidth
                              label={t('notificationNotificators')}
                              value={editingNotification?.notificators ? 
                                editingNotification.notificators.split(/[, ]+/).map(notificator => t(prefixString('notificator', notificator))).join(', ') : ''}
                              onClick={() => setNotificatorsDropdownOpen(!notificatorsDropdownOpen)}
                              readOnly
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
                            {notificatorsDropdownOpen && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: notificatorsInputRef.current ? notificatorsInputRef.current.getBoundingClientRect().bottom + 4 : 0,
                                  left: notificatorsInputRef.current ? notificatorsInputRef.current.getBoundingClientRect().left : 0,
                                  width: notificatorsInputRef.current ? notificatorsInputRef.current.getBoundingClientRect().width : 200,
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '4px',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  zIndex: 10004,
                                  maxHeight: '200px',
                                  overflow: 'auto',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {notificators.map((notificator) => {
                                  const isSelected = editingNotification?.notificators?.split(/[, ]+/).includes(notificator.type);
                                  return (
                                    <div
                                      key={notificator.type}
                                      style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        color: colors.text,
                                        fontSize: '14px',
                                        borderBottom: `1px solid ${colors.border}`,
                                        backgroundColor: isSelected ? colors.primary + '20' : 'transparent',
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        const currentNotificators = editingNotification?.notificators ? 
                                          editingNotification.notificators.split(/[, ]+/) : [];
                                        const newNotificators = isSelected 
                                          ? currentNotificators.filter(n => n !== notificator.type)
                                          : [...currentNotificators, notificator.type];
                                        setEditingNotification({ 
                                          ...editingNotification, 
                                          notificators: newNotificators.join(', ') 
                                        });
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.hover;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isSelected ? colors.primary + '20' : 'transparent';
                                      }}
                                    >
                                      {t(prefixString('notificator', notificator.type))}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          
                          {editingNotification?.notificators?.includes('command') && (
                            /* Command Dropdown */
                            <div ref={commandInputRef} style={{ position: 'relative' }}>
                              <TextField
                                fullWidth
                                label={t('sharedSavedCommand')}
                                value={editingNotification?.commandId ? 
                                  commands.find(cmd => cmd.id === editingNotification.commandId)?.description || '' : ''}
                                onClick={() => setCommandDropdownOpen(!commandDropdownOpen)}
                                readOnly
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
                              {commandDropdownOpen && (
                                <div
                                  style={{
                                    position: 'fixed',
                                    top: commandInputRef.current ? commandInputRef.current.getBoundingClientRect().bottom + 4 : 0,
                                    left: commandInputRef.current ? commandInputRef.current.getBoundingClientRect().left : 0,
                                    width: commandInputRef.current ? commandInputRef.current.getBoundingClientRect().width : 200,
                                    backgroundColor: colors.surface,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    zIndex: 10004,
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {commands.map((command) => (
                                    <div
                                      key={command.id}
                                      style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        color: colors.text,
                                        fontSize: '14px',
                                        borderBottom: `1px solid ${colors.border}`,
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setEditingNotification({ ...editingNotification, commandId: command.id });
                                        setCommandDropdownOpen(false);
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.hover;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                      }}
                                    >
                                      {command.description}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <Button
                            variant="outlined"
                            onClick={testNotificators}
                            disabled={!editingNotification?.notificators}
                            style={{
                              borderColor: colors.border,
                              color: colors.text,
                              textTransform: 'none',
                              alignSelf: 'flex-start',
                            }}
                          >
                            {t('sharedTestNotificators')}
                          </Button>
                          
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={editingNotification?.always || false}
                                onChange={(e) => setEditingNotification({ ...editingNotification, always: e.target.checked })}
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
                            label={t('notificationAlways')}
                            sx={{ color: colors.text }}
                          />
                        </div>
                      )}

                      {activeTab === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <TextField
                            fullWidth
                            label={t('sharedDescription')}
                            value={editingNotification?.description || ''}
                            onChange={(e) => setEditingNotification({ ...editingNotification, description: e.target.value })}
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
                          
                          {/* Calendar Dropdown */}
                          <div ref={calendarInputRef} style={{ position: 'relative' }}>
                            <TextField
                              fullWidth
                              label={t('sharedCalendar')}
                              value={editingNotification?.calendarId ? 
                                calendars.find(cal => cal.id === editingNotification.calendarId)?.name || '' : ''}
                              onClick={() => setCalendarDropdownOpen(!calendarDropdownOpen)}
                              readOnly
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
                            {calendarDropdownOpen && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: calendarInputRef.current ? calendarInputRef.current.getBoundingClientRect().bottom + 4 : 0,
                                  left: calendarInputRef.current ? calendarInputRef.current.getBoundingClientRect().left : 0,
                                  width: calendarInputRef.current ? calendarInputRef.current.getBoundingClientRect().width : 200,
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '4px',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  zIndex: 10004,
                                  maxHeight: '200px',
                                  overflow: 'auto',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    color: colors.textSecondary,
                                    fontSize: '14px',
                                    fontStyle: 'italic',
                                    borderBottom: `1px solid ${colors.border}`,
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setEditingNotification({ ...editingNotification, calendarId: null });
                                    setCalendarDropdownOpen(false);
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = colors.hover;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
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
                                      setEditingNotification({ ...editingNotification, calendarId: calendar.id });
                                      setCalendarDropdownOpen(false);
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = colors.hover;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    {calendar.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={editingNotification?.attributes?.priority || false}
                                onChange={(e) => setEditingNotification({ 
                                  ...editingNotification, 
                                  attributes: { ...editingNotification.attributes, priority: e.target.checked } 
                                })}
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
                            label={t('sharedPriority')}
                            sx={{ color: colors.text }}
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
                        setEditingNotification(null);
                      }}
                      style={{ color: colors.textSecondary }}
                    >
                      {t('sharedCancel')}
                    </Button>
                    <Button
                      onClick={() => {
                        handleSaveNotification();
                      }}
                      variant="contained"
                      disabled={createNotificationMutation.isPending || updateNotificationMutation.isPending}
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.text,
                      }}
                    >
                      {(createNotificationMutation.isPending || updateNotificationMutation.isPending) ? (
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
                    {t('sharedDeleteConfirm')} "{notificationToDelete?.description || notificationToDelete?.type}"?
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
                      disabled={deleteNotificationMutation.isPending}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: deleteNotificationMutation.isPending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: deleteNotificationMutation.isPending ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!deleteNotificationMutation.isPending) {
                          e.target.style.backgroundColor = '#FEE2E2';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!deleteNotificationMutation.isPending) {
                          e.target.style.backgroundColor = '#FEF2F2';
                        }
                      }}
                    >
                      {deleteNotificationMutation.isPending ? (
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

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingNotificationsPopover;
