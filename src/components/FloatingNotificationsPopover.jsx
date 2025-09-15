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
  Link as LinkIcon,
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { formatStatus, formatBoolean, formatNotificationTitle } from '../common/util/formatter';
import { useTranslation, useTranslationKeys } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useRestriction } from '../common/util/permissions';
import LinkField from '../common/components/LinkField';
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
  const [connectionsDialog, setConnectionsDialog] = useState(false);
  const [selectedNotificationForConnections, setSelectedNotificationForConnections] = useState(null);

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
      setDeleteDialog(false);
      setNotificationToDelete(null);
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

  // Handle notification connections
  const handleConnections = (notification) => {
    setSelectedNotificationForConnections(notification);
    setConnectionsDialog(true);
    setAnchorEl(null);
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
      key: 'connections',
      title: t('sharedConnections'),
      icon: <LinkIcon fontSize="small" />,
      handler: handleConnections,
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
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: !desktop ? '0px' : '0px 16px 16px 0px',
            height: '100%',
            overflow: 'hidden',
            boxShadow: !desktop ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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
                        <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('sharedDescription')}
                        </TableCell>
                        <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('notificationType')}
                        </TableCell>
                        <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('notificationAlways')}
                        </TableCell>
                        <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('sharedAlarms')}
                        </TableCell>
                        <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('notificationNotificators')}
                        </TableCell>
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
                          <TableCell>
                            <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                              {formatBoolean(notification.always, t)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                              {formatList('alarm', notification.attributes?.alarms)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" style={{ color: colors.textSecondary, lineHeight: 1.8, fontSize: '13px' }}>
                              {formatList('notificator', notification.notificators)}
                            </Typography>
                          </TableCell>
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
                    width: '500px',
                    height: '100vh',
                    backgroundColor: colors.surface,
                    borderLeft: `1px solid ${colors.border}`,
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
                          <SelectField
                            value={editingNotification?.type || ''}
                            onChange={(e) => setEditingNotification({ ...editingNotification, type: e.target.value })}
                            endpoint="/api/notifications/types"
                            keyGetter={(it) => it.type}
                            titleGetter={(it) => t(prefixString('event', it.type))}
                            label={t('sharedType')}
                            zIndex={10003}
                          />
                          
                          {editingNotification?.type === 'alarm' && (
                            <SelectField
                              multiple
                              value={editingNotification?.attributes?.alarms ? editingNotification.attributes.alarms.split(/[, ]+/) : []}
                              onChange={(e) => setEditingNotification({ 
                                ...editingNotification, 
                                attributes: { ...editingNotification.attributes, alarms: e.target.value.join() } 
                              })}
                              data={alarms}
                              keyGetter={(it) => it.key}
                              label={t('sharedAlarms')}
                              zIndex={10003}
                            />
                          )}
                          
                          <SelectField
                            multiple
                            value={editingNotification?.notificators ? editingNotification.notificators.split(/[, ]+/) : []}
                            onChange={(e) => setEditingNotification({ ...editingNotification, notificators: e.target.value.join() })}
                            endpoint="/api/notifications/notificators"
                            keyGetter={(it) => it.type}
                            titleGetter={(it) => t(prefixString('notificator', it.type))}
                            label={t('notificationNotificators')}
                            zIndex={10003}
                          />
                          
                          {editingNotification?.notificators?.includes('command') && (
                            <SelectField
                              value={editingNotification?.commandId || ''}
                              onChange={(e) => setEditingNotification({ ...editingNotification, commandId: Number(e.target.value) })}
                              endpoint="/api/commands"
                              titleGetter={(it) => it.description}
                              label={t('sharedSavedCommand')}
                              zIndex={10003}
                            />
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
                          
                          <SelectField
                            value={editingNotification?.calendarId || ''}
                            onChange={(e) => setEditingNotification({ ...editingNotification, calendarId: Number(e.target.value) })}
                            endpoint="/api/calendars"
                            label={t('sharedCalendar')}
                            zIndex={10003}
                          />
                          
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
                {t('sharedRemoveConfirm')} "{notificationToDelete?.description || notificationToDelete?.type}"?
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
                onClick={() => deleteNotificationMutation.mutate(notificationToDelete.id)}
                style={{ color: colors.error }}
                disabled={deleteNotificationMutation.isPending}
              >
                {deleteNotificationMutation.isPending ? (
                  <CircularProgress size={16} />
                ) : (
                  t('sharedRemove')
                )}
              </Button>
            </DialogActions>
          </Dialog>

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
                    width: '500px',
                    height: '100vh',
                    backgroundColor: colors.surface,
                    borderLeft: `1px solid ${colors.border}`,
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
                        {t('sharedConnections')} - {selectedNotificationForConnections?.description || selectedNotificationForConnections?.type}
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
                    {selectedNotificationForConnections && (
                      <>
                        <LinkField
                          endpointAll="/api/devices"
                          endpointLinked={`/api/devices?notificationId=${selectedNotificationForConnections.id}`}
                          baseId={selectedNotificationForConnections.id}
                          keyBase="notificationId"
                          keyLink="deviceId"
                          titleGetter={(it) => `${it.name} (${it.uniqueId})`}
                          label={t('deviceTitle')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/users"
                          endpointLinked={`/api/users?notificationId=${selectedNotificationForConnections.id}`}
                          baseId={selectedNotificationForConnections.id}
                          keyBase="notificationId"
                          keyLink="userId"
                          titleGetter={(it) => it.name}
                          label={t('settingsUsers')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/groups"
                          endpointLinked={`/api/groups?notificationId=${selectedNotificationForConnections.id}`}
                          baseId={selectedNotificationForConnections.id}
                          keyBase="notificationId"
                          keyLink="groupId"
                          label={t('settingsGroups')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/geofences"
                          endpointLinked={`/api/geofences?notificationId=${selectedNotificationForConnections.id}`}
                          baseId={selectedNotificationForConnections.id}
                          keyBase="notificationId"
                          keyLink="geofenceId"
                          label={t('sharedGeofences')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/calendars"
                          endpointLinked={`/api/calendars?notificationId=${selectedNotificationForConnections.id}`}
                          baseId={selectedNotificationForConnections.id}
                          keyBase="notificationId"
                          keyLink="calendarId"
                          label={t('sharedCalendars')}
                          zIndex={50000}
                        />
                      </>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingNotificationsPopover;
