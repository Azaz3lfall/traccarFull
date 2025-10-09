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
  Switch,
  FormControlLabel,
  Chip,
  Avatar,
  Typography,
  InputAdornment,
  CircularProgress,
  Pagination,
    Tabs,
    Tab,
    Box,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormGroup,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Login as LoginIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Block as BlockIcon,
  CheckCircle as CheckIcon,
  ChevronLeft as ChevronLeftIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { formatBoolean } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useManager, useAdministrator, useRestriction } from '../common/util/permissions';
import CustomPagination from './CustomPagination';
import fetchOrThrow from '../common/util/fetchOrThrow';
import useUserAttributes from '../common/attributes/useUserAttributes';
import useCommonUserAttributes from '../common/attributes/useCommonUserAttributes';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import useServerAttributes from '../common/attributes/useServerAttributes';
import useMapStyles from '../map/core/useMapStyles';
import { map } from '../map/core/MapView';
import SelectField from '../common/components/SelectField';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';
import LinkField from '../common/components/LinkField';
import { formatNotificationTitle } from '../common/util/formatter';
import { sessionActions } from '../store';

const FloatingUsersPopover = ({ 
  desktop, 
  isMenuExpanded, 
  isVisible, 
  onClose,
  userId = null // Optional userId to edit specific user
}) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const manager = useManager();
  const admin = useAdministrator();
  const fixedEmail = useRestriction('fixedEmail');
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Server attributes hooks
  const commonUserAttributes = useCommonUserAttributes(t);
  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const serverAttributes = useServerAttributes(t);
  const mapStyles = useMapStyles();
  const userAttributes = useUserAttributes(t);

  // Zebra striping colors
  const lightThemeZebra = '#f8f9fa';
  const darkThemeZebra = '#353e4b';

  // State management
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showTemporary, setShowTemporary] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [activeTab, setActiveTab] = useState(0);
  const [connectionsDialog, setConnectionsDialog] = useState(false);
  const [selectedUserForConnections, setSelectedUserForConnections] = useState(null);
  const [serverDialog, setServerDialog] = useState(false);
  const [serverData, setServerData] = useState(null);
  const [activeServerTab, setActiveServerTab] = useState(0);
  const [serverLoading, setServerLoading] = useState(false);
  
  const updateServerMutation = useMutation({
    mutationFn: async (data) => {
      await fetchOrThrow('/api/server', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setServerDialog(false);
    },
  });

  // Fetch users with TanStack Query
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users', { excludeAttributes: true }],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/users?excludeAttributes=true');
      return response.json();
    },
    enabled: isVisible, // Only fetch when popover is visible
  });

  // Fetch specific user details when userId is provided
  const { data: specificUser, isLoading: isLoadingSpecificUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await fetchOrThrow(`/api/users/${userId}`);
      return response.json();
    },
    enabled: !!userId && isVisible, // Only fetch when userId is provided and popover is visible
  });

  // Fetch timezones
  const { data: timezones = [], isLoading: timezonesLoading, error: timezonesError } = useQuery({
    queryKey: ['timezones'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/server/timezones');
      const data = await response.json();
      return data;
    },
    enabled: isVisible, // Only fetch when popover is visible
  });

  // Debug logging
  useEffect(() => {
  }, [timezones, timezonesLoading, timezonesError]);

  // Fallback timezones in case API fails
  const fallbackTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  const availableTimezones = timezones.length > 0 ? timezones : fallbackTimezones;

  // Auto-open edit dialog when specific user is loaded
  useEffect(() => {
    if (specificUser && userId && isVisible) {
      setEditingUser({
        ...specificUser,
        attributes: specificUser.attributes || {}
      });
      setActiveTab(0);
      setEditDialog(true);
    }
  }, [specificUser, userId, isVisible]);

  // Filter users based on search and temporary status
  const filteredUsers = users.filter(user => {
    const matchesTemporary = showTemporary || !user.temporary;
    const matchesSearch = !searchKeyword || 
      (user.name && user.name.toLowerCase().includes(searchKeyword.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchKeyword.toLowerCase()));
    return matchesTemporary && matchesSearch;
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchKeyword, showTemporary]);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Clear query cache when component unmounts
      queryClient.removeQueries(['users']);
      
      // Reset all state when component unmounts
      setSearchKeyword('');
      setShowTemporary(false);
      setSelectedUser(null);
      setAnchorEl(null);
      setDeleteDialog(false);
      setUserToDelete(null);
      handleCloseEditDialog();
      setPage(1);
    };
  }, [queryClient]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Handle user login
  const handleLogin = useCatch(async (user) => {
    const response = await fetchOrThrow(`/api/session/${user.id}`);
    const userData = await response.json();
    dispatch(sessionActions.updateUser(userData));
    window.location.reload();
  });

  // Handle user connections
  const handleConnections = (user) => {
    setSelectedUserForConnections(user);
    setConnectionsDialog(true);
    setAnchorEl(null);
  };

  // Handle server settings
  const handleServer = async () => {
    try {
      setServerLoading(true);
      setServerDialog(true);
      setAnchorEl(null);
      
      const response = await fetch('/api/server');
      const server = await response.json();
      setServerData(server);
      setActiveServerTab(0);
    } catch (error) {
      console.error('Failed to fetch server data:', error);
    } finally {
      setServerLoading(false);
    }
  };

  // Handle edit user
  const handleEdit = (user) => {
    setEditingUser({
      ...user,
      attributes: user.attributes || {}
    });
    setActiveTab(0); // Reset to first tab
    setEditDialog(true);
    setAnchorEl(null);
  };

  // Handle closing edit dialog
  const handleCloseEditDialog = () => {
    setEditDialog(false);
    setEditingUser(null);
    // If we were editing a specific user (not from the list), close the entire popover
    if (userId) {
      onClose();
    }
  };

  // Handle delete user
  const handleDelete = (user) => {
    setUserToDelete(user);
    setDeleteDialog(true);
    setAnchorEl(null);
  };

  // Handle delete confirmation
  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
    setDeleteDialog(false);
    setUserToDelete(null);
  };

  // Handle delete cancellation
  const cancelDelete = () => {
    setDeleteDialog(false);
    setUserToDelete(null);
  };

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData) => {
      const response = await fetchOrThrow('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseEditDialog();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }) => {
      const response = await fetchOrThrow(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseEditDialog();
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      await fetchOrThrow(`/api/users/${userId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteDialog(false);
      setUserToDelete(null);
    },
  });

  // Handle save user
  const handleSaveUser = () => {
    if (!editingUser) return;

    // Prepare user data for saving
    const userData = { ...editingUser };
    
    // Handle password field
    if (editingUser.id) {
      // For existing users, only include password if it's not empty
      if (!userData.password || userData.password.trim() === '') {
        delete userData.password; // Remove password field if empty
      }
    } else {
      // For new users, password is required
      if (!userData.password || userData.password.trim() === '') {
        return; // Don't save if password is empty for new users
      }
    }

    if (editingUser.id) {
      updateUserMutation.mutate({ id: editingUser.id, userData });
    } else {
      createUserMutation.mutate(userData);
    }
  };


  // Menu actions
  const actions = [
    {
      key: 'login',
      title: t('loginLogin'),
      icon: <LoginIcon fontSize="small" />,
      handler: handleLogin,
      show: manager,
    },
    {
      key: 'connections',
      title: t('sharedConnections'),
      icon: <LinkIcon fontSize="small" />,
      handler: handleConnections,
    },
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      handler: handleEdit,
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: handleDelete,
    },
  ];


  const getStatusIcon = (user) => {
    if (user.disabled) return <BlockIcon />;
    if (user.administrator) return <AdminIcon />;
    return <CheckIcon />;
  };


  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="floating-users-popover"
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
                onClick={() => {
                  // Invalidate and clear query cache to ensure fresh data on next open
                  queryClient.invalidateQueries(['users']);
                  queryClient.removeQueries(['users']);
                  
                  // Reset all state to ensure clean unmount
                  setSearchKeyword('');
                  setShowTemporary(false);
                  setSelectedUser(null);
                  setAnchorEl(null);
                  setDeleteDialog(false);
                  setUserToDelete(null);
                  handleCloseEditDialog();
                  setPage(1);
                  // Close the component
                  onClose();
                }}
                size="small"
                style={{ color: colors.textSecondary }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                {t('settingsUsers')}
              </Typography>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <IconButton
                onClick={() => {
                  setEditingUser({ 
                    name: '', 
                    email: '', 
                    password: '', 
                    administrator: false, 
                    disabled: false,
                    attributes: {}
                  });
                  setActiveTab(0); // Reset to first tab
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

          {/* Search and Filters */}
          <div style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
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
              style={{
                flex: 1,
                minWidth: '120px',
                '& .MuiOutlinedInputRoot': {
                  borderRadius: '8px',
                },
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showTemporary}
                  onChange={(e) => setShowTemporary(e.target.checked)}
                  size="small"
                  style={{ color: colors.primary }}
                />
              }
              label={t('userTemporary')}
              style={{ color: colors.text, fontSize: '12px' }}
            />
          </div>

          {/* Users Table */}
          <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            {isLoading ? (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                zIndex: 10
              }}>
                <div style={{
                  position: 'relative',
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
                      color: theme === 'dark' ? '#ffffff' : '#000000',
                      position: 'absolute'
                    }} 
                    size={100}
                    thickness={4}
                  />
                </div>
                <Typography style={{ 
                  color: colors.textSecondary, 
                  lineHeight: 1.2, 
                  fontSize: '14px',
                  marginTop: '12px'
                }}>
                  {t('sharedLoading')}...
                </Typography>
              </div>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow style={{ backgroundColor: colors.surface }}>
                      {desktop && (
                        <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('sharedName')}
                        </TableCell>
                      )}
                      <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                        {t('userEmail')}
                      </TableCell>
                      {desktop && (
                        <>
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('userAdmin')}
                          </TableCell>
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('sharedStatus')}
                          </TableCell>
                        </>
                      )}
                      <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                        {t('sharedActions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {error ? (
                      <TableRow>
                        <TableCell colSpan={desktop ? 5 : 2} align="center" style={{ padding: '20px', color: colors.error, lineHeight: 0.8, fontSize: '12px' }}>
                          {t('sharedError')}: {error.message}
                        </TableCell>
                      </TableRow>
                    ) : paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={desktop ? 5 : 2} align="center" style={{ padding: '20px', color: colors.textSecondary, lineHeight: 0.8, fontSize: '12px' }}>
                          {t('sharedNoData')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {paginatedUsers.map((user, index) => (
                        <TableRow
                          key={user.id}
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
                          {desktop && (
                            <TableCell>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Avatar
                                  style={{
                                    backgroundColor: colors.primary,
                                    color: colors.text,
                                    width: '20px',
                                    height: '20px',
                                  }}
                                >
                                  <PersonIcon fontSize="small" />
                                </Avatar>
                                <div>
                                  <Typography variant="body2" style={{ color: colors.text, fontWeight: '500', lineHeight: 1.8, fontSize: '13px' }}>
                                    {user.name || t('sharedUnknown')}
                                  </Typography>
                                  {user.temporary && (
                                    <Chip
                                      label={t('userTemporary')}
                                      size="small"
                                      style={{
                                        backgroundColor: colors.warning,
                                        color: colors.text,
                                        fontSize: '8px',
                                        height: '12px',
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          )}
                          <TableCell style={{ color: colors.text, lineHeight: 1.8, fontSize: '13px' }}>
                            {user.email || '-'}
                          </TableCell>
                          {desktop && (
                            <>
                              <TableCell>
                                <Chip
                                  icon={getStatusIcon(user)}
                                  label={formatBoolean(user.administrator, t)}
                                  size="small"
                                  style={{
                                    backgroundColor: user.administrator ? colors.primary : colors.surface,
                                    color: user.administrator ? colors.text : colors.textSecondary,
                                    fontSize: '10px',
                                    height: '16px',
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={getStatusIcon(user)}
                                  label={user.disabled ? t('sharedDisabled') : t('sharedEnabled')}
                                  size="small"
                                  style={{
                                    backgroundColor: user.disabled ? colors.error : colors.success,
                                    color: colors.text,
                                    fontSize: '10px',
                                    height: '16px',
                                  }}
                                />
                              </TableCell>
                            </>
                          )}
                          <TableCell align="right">
                            <IconButton
                              onClick={(e) => {
                                setSelectedUser(user);
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
            )}
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
                {page} / {totalPages} ({filteredUsers.length} {t('settingsUsers')})
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
              .filter(action => action.show !== false)
              .map((action) => (
                <MenuItem
                  key={action.key}
                  onClick={() => action.handler(selectedUser)}
                  style={{ color: colors.text, fontSize: '12px' }}
                >
                  {action.icon}
                  <span style={{ marginLeft: '6px' }}>{action.title}</span>
                </MenuItem>
              ))}
          </Menu>

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
                 {t('sharedDeleteConfirm')} "{userToDelete?.name}"?
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

          {/* Edit User Drawer - Slides in from right */}
          <AnimatePresence>
            {editDialog && (
              <>
                {/* Backdrop */}
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
                    zIndex: 9999,
                  }}
                  onClick={handleCloseEditDialog}
                />
                
                {/* Drawer */}
                <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  width: desktop ? '400px' : '100vw',
                  height: '100vh',
                backgroundColor: colors.surface,
                  borderLeft: `1px solid ${colors.border}`,
                  zIndex: 10000,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
                }}
              >
                {/* Drawer Header */}
                <div style={{
                  padding: '20px 24px',
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
                      {editingUser?.id ? t('sharedEdit') : t('sharedAdd')} {t('settingsUser')}
                    </Typography>
                  </div>
                  <IconButton
                    onClick={handleSaveUser}
                    disabled={!editingUser?.name || !editingUser?.email || (!editingUser?.id && !editingUser?.password) || createUserMutation.isPending || updateUserMutation.isPending}
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.text,
                      width: '40px',
                      height: '40px',
                    }}
                    title={createUserMutation.isPending || updateUserMutation.isPending ? t('sharedSaving') : t('sharedSave')}
                  >
                    {(createUserMutation.isPending || updateUserMutation.isPending) ? (
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
                  padding: '0 24px 24px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
              {editingUser && (
                <>
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
                    <Tab label={t('sharedRequired')} />
                    <Tab label={t('sharedAccessLevel')} />
                    <Tab label={t('sharedPreferences')} />
                    <Tab label={t('sharedLocation')} />
                    <Tab label={t('sharedPermissions')} />
                    <Tab label={t('sharedAttributes')} />
                  </Tabs>

                  {/* Tab Content */}
                  <Box style={{ flex: 1, overflow: 'auto', paddingTop: '16px' }}>
                    {/* Required Tab */}
                    {activeTab === 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <TextField
                          value={editingUser.name || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                          label={t('sharedName')}
                      fullWidth
                    />
                    <TextField
                          value={editingUser.email || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          label={t('userEmail')}
                          disabled={fixedEmail && editingUser.id}
                      fullWidth
                    />
                    <TextField
                      type="password"
                      value={editingUser.password || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      label={t('userPassword')}
                      placeholder={editingUser.id ? t('userPassword') + ' (leave empty to keep current)' : t('userPassword')}
                      fullWidth
                    />
                      </div>
                    )}

                    {/* Access Level Tab */}
                    {activeTab === 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Check All */}
                        <FormControlLabel
                          control={<Checkbox />}
                          label="Check All"
                          style={{ fontWeight: 'bold', marginBottom: '8px' }}
                        />
                        
                        {/* Two Column Layout */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <FormGroup>
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Main Menu"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Device List"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Reports"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Geofences"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Settings"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Notifications"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Account"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Devices"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Groups"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Drivers"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Calendars"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Computed Attributes"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Maintenance"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Saved Commands"
                            />
                          </FormGroup>
                          
                          <FormGroup>
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Announcement"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Server"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Users"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Reseller Panel"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Edit Sensors"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Stop Engine"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Resume Engine"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Replay"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Send Command"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Share Device"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Anchor"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Total Distance"
                            />
                            <FormControlLabel
                              control={<Checkbox sx={{ '&:hover': { backgroundColor: 'transparent' } }} />}
                              label="Hours"
                            />
                          </FormGroup>
                        </div>
                      </div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <TextField
                          value={editingUser.phone || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                          label={t('sharedPhone')}
                      fullWidth
                    />
                        <FormControl fullWidth>
                      <InputLabel>{t('mapDefault')}</InputLabel>
                      <Select
                        label={t('mapDefault')}
                            value={editingUser.map || 'locationIqStreets'}
                        onChange={(e) => setEditingUser({ ...editingUser, map: e.target.value })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 }
                            }}
                      >
                        {mapStyles.filter((style) => style.available).map((style) => (
                          <MenuItem key={style.id} value={style.id}>
                            <Typography component="span">{style.title}</Typography>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                        <FormControl fullWidth>
                      <InputLabel>{t('settingsCoordinateFormat')}</InputLabel>
                      <Select
                        label={t('settingsCoordinateFormat')}
                            value={editingUser.coordinateFormat || 'dd'}
                        onChange={(e) => setEditingUser({ ...editingUser, coordinateFormat: e.target.value })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 }
                            }}
                      >
                        <MenuItem value="dd">{t('sharedDecimalDegrees')}</MenuItem>
                        <MenuItem value="ddm">{t('sharedDegreesDecimalMinutes')}</MenuItem>
                        <MenuItem value="dms">{t('sharedDegreesMinutesSeconds')}</MenuItem>
                      </Select>
                    </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>{t('settingsSpeedUnit')}</InputLabel>
                          <Select
                            label={t('settingsSpeedUnit')}
                            value={(editingUser.attributes && editingUser.attributes.speedUnit) || 'kn'}
                            onChange={(e) => setEditingUser({ ...editingUser, attributes: { ...editingUser.attributes, speedUnit: e.target.value } })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 }
                            }}
                          >
                            <MenuItem value="kn">{t('sharedKn')}</MenuItem>
                            <MenuItem value="kmh">{t('sharedKmh')}</MenuItem>
                            <MenuItem value="mph">{t('sharedMph')}</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>{t('settingsDistanceUnit')}</InputLabel>
                          <Select
                            label={t('settingsDistanceUnit')}
                            value={(editingUser.attributes && editingUser.attributes.distanceUnit) || 'km'}
                            onChange={(e) => setEditingUser({ ...editingUser, attributes: { ...editingUser.attributes, distanceUnit: e.target.value } })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 }
                            }}
                          >
                            <MenuItem value="km">{t('sharedKm')}</MenuItem>
                            <MenuItem value="mi">{t('sharedMi')}</MenuItem>
                            <MenuItem value="nmi">{t('sharedNmi')}</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>{t('settingsAltitudeUnit')}</InputLabel>
                          <Select
                            label={t('settingsAltitudeUnit')}
                            value={(editingUser.attributes && editingUser.attributes.altitudeUnit) || 'm'}
                            onChange={(e) => setEditingUser({ ...editingUser, attributes: { ...editingUser.attributes, altitudeUnit: e.target.value } })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10002 }
                            }}
                          >
                            <MenuItem value="m">{t('sharedMeters')}</MenuItem>
                            <MenuItem value="ft">{t('sharedFeet')}</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>{t('settingsVolumeUnit')}</InputLabel>
                          <Select
                            label={t('settingsVolumeUnit')}
                            value={(editingUser.attributes && editingUser.attributes.volumeUnit) || 'ltr'}
                            onChange={(e) => setEditingUser({ ...editingUser, attributes: { ...editingUser.attributes, volumeUnit: e.target.value } })}
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
                        <FormControl fullWidth>
                          <InputLabel>{t('sharedTimezone')}</InputLabel>
                          <Select
                            label={t('sharedTimezone')}
                            value={editingUser.attributes && editingUser.attributes.timezone || ''}
                            onChange={(e) => setEditingUser({ ...editingUser, attributes: { ...editingUser.attributes, timezone: e.target.value } })}
                            MenuProps={{
                              disablePortal: false,
                              style: { zIndex: 10005 }
                            }}
                            style={{ width: '100%', minWidth: '100%' }}
                            sx={{ width: '100% !important', minWidth: '100% !important' }}
                          >
                            {availableTimezones.map((timezone) => (
                              <MenuItem key={timezone} value={timezone}>
                                {timezone}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                    <TextField
                          value={editingUser.poiLayer || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, poiLayer: e.target.value })}
                          label={t('mapPoiLayer')}
                      fullWidth
                        />
                      </div>
                    )}

                    {/* Location Tab */}
                    {activeTab === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <TextField
                          type="number"
                          value={editingUser.latitude || 0}
                          onChange={(e) => setEditingUser({ ...editingUser, latitude: Number(e.target.value) })}
                          label={t('positionLatitude')}
                          fullWidth
                        />
                        <TextField
                          type="number"
                          value={editingUser.longitude || 0}
                          onChange={(e) => setEditingUser({ ...editingUser, longitude: Number(e.target.value) })}
                          label={t('positionLongitude')}
                          fullWidth
                        />
                        <TextField
                          type="number"
                          value={editingUser.zoom || 0}
                          onChange={(e) => setEditingUser({ ...editingUser, zoom: Number(e.target.value) })}
                          label={t('serverZoom')}
                          fullWidth
                        />
                      </div>
                    )}

                    {/* Permissions Tab */}
                    {activeTab === 4 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <TextField
                      label={t('userExpirationTime')}
                      type="date"
                          value={editingUser.expirationTime ? editingUser.expirationTime.split('T')[0] : '2099-01-01'}
                      onChange={(e) => {
                        if (e.target.value) {
                          setEditingUser({ ...editingUser, expirationTime: new Date(e.target.value).toISOString() });
                        }
                      }}
                      disabled={!manager}
                          fullWidth
                    />
                    <TextField
                      type="number"
                          value={editingUser.deviceLimit || 0}
                      onChange={(e) => setEditingUser({ ...editingUser, deviceLimit: Number(e.target.value) })}
                          label={t('userDeviceLimit')}
                      disabled={!admin}
                          fullWidth
                    />
                    <TextField
                      type="number"
                          value={editingUser.userLimit || 0}
                      onChange={(e) => setEditingUser({ ...editingUser, userLimit: Number(e.target.value) })}
                          label={t('userUserLimit')}
                      disabled={!admin}
                          fullWidth
                    />
                    <FormGroup>
                      <FormControlLabel
                            control={<Checkbox checked={editingUser.disabled} onChange={(e) => setEditingUser({ ...editingUser, disabled: e.target.checked })} />}
                            label={t('sharedDisabled')}
                            disabled={!manager}
                      />
                      <FormControlLabel
                            control={<Checkbox checked={editingUser.administrator} onChange={(e) => setEditingUser({ ...editingUser, administrator: e.target.checked })} />}
                            label={t('userAdmin')}
                            disabled={!admin}
                      />
                      <FormControlLabel
                            control={<Checkbox checked={editingUser.readonly} onChange={(e) => setEditingUser({ ...editingUser, readonly: e.target.checked })} />}
                            label={t('serverReadonly')}
                            disabled={!manager}
                      />
                      <FormControlLabel
                            control={<Checkbox checked={editingUser.deviceReadonly} onChange={(e) => setEditingUser({ ...editingUser, deviceReadonly: e.target.checked })} />}
                            label={t('userDeviceReadonly')}
                            disabled={!manager}
                      />
                      <FormControlLabel
                            control={<Checkbox checked={editingUser.limitCommands} onChange={(e) => setEditingUser({ ...editingUser, limitCommands: e.target.checked })} />}
                            label={t('userLimitCommands')}
                            disabled={!manager}
                      />
                      <FormControlLabel
                            control={<Checkbox checked={editingUser.disableReports} onChange={(e) => setEditingUser({ ...editingUser, disableReports: e.target.checked })} />}
                            label={t('userDisableReports')}
                            disabled={!manager}
                      />
                      <FormControlLabel
                            control={<Checkbox checked={editingUser.fixedEmail} onChange={(e) => setEditingUser({ ...editingUser, fixedEmail: e.target.checked })} />}
                            label={t('userFixedEmail')}
                            disabled={!manager}
                      />
                    </FormGroup>
                      </div>
                    )}

                    {/* Attributes Tab */}
                    {activeTab === 5 && (
                      <div>
                        <EditAttributesAccordion
                          attribute={null}
                          attributes={editingUser.attributes}
                          setAttributes={(attributes) => setEditingUser({ ...editingUser, attributes })}
                          definitions={{ ...commonUserAttributes, ...userAttributes }}
                          focusAttribute={null}
                          zIndex={10003}
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

          {/* Connections Drawer - Slides in from right */}
          <AnimatePresence>
            {connectionsDialog && (
              <>
                {/* Backdrop */}
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
                    zIndex: 9999,
                  }}
                  onClick={() => setConnectionsDialog(false)}
                />
                
                {/* Drawer */}
                <motion.div
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: desktop ? '400px' : '100vw',
                    height: '100vh',
                    backgroundColor: colors.surface,
                    borderLeft: `1px solid ${colors.border}`,
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  {/* Drawer Header */}
                  <div style={{
                    padding: '20px 24px',
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
                        {t('sharedConnections')} - {selectedUserForConnections?.name}
                      </Typography>
                    </div>
                  </div>

                  {/* Drawer Content */}
                  <div style={{ 
                    flex: 1, 
                    overflow: 'auto', 
                    padding: '24px',
                    paddingBottom: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {selectedUserForConnections && (
                      <>
                        <LinkField
                          endpointAll="/api/devices?all=true&excludeAttributes=true"
                          endpointLinked={`/api/devices?userId=${selectedUserForConnections.id}&excludeAttributes=true`}
                          baseId={selectedUserForConnections.id}
                          keyBase="userId"
                          keyLink="deviceId"
                          titleGetter={(it) => `${it.name} (${it.uniqueId})`}
                          label={t('deviceTitle')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/groups?all=true"
                          endpointLinked={`/api/groups?userId=${selectedUserForConnections.id}`}
                          baseId={selectedUserForConnections.id}
                          keyBase="userId"
                          keyLink="groupId"
                          label={t('settingsGroups')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/geofences?all=true"
                          endpointLinked={`/api/geofences?userId=${selectedUserForConnections.id}`}
                          baseId={selectedUserForConnections.id}
                          keyBase="userId"
                          keyLink="geofenceId"
                          label={t('sharedGeofences')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/notifications?all=true"
                          endpointLinked={`/api/notifications?userId=${selectedUserForConnections.id}`}
                          baseId={selectedUserForConnections.id}
                          keyBase="userId"
                          keyLink="notificationId"
                          titleGetter={(it) => formatNotificationTitle(t, it, true)}
                          label={t('sharedNotifications')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/calendars?all=true"
                          endpointLinked={`/api/calendars?userId=${selectedUserForConnections.id}`}
                          baseId={selectedUserForConnections.id}
                          keyBase="userId"
                          keyLink="calendarId"
                          label={t('sharedCalendars')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/users?all=true&excludeAttributes=true"
                          endpointLinked={`/api/users?userId=${selectedUserForConnections.id}&excludeAttributes=true`}
                          baseId={selectedUserForConnections.id}
                          keyBase="userId"
                          keyLink="managedUserId"
                          label={t('settingsUsers')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/attributes/computed?all=true"
                          endpointLinked={`/api/attributes/computed?userId=${selectedUserForConnections.id}`}
                          baseId={selectedUserForConnections.id}
                          keyBase="userId"
                          keyLink="attributeId"
                          titleGetter={(it) => it.description}
                          label={t('sharedComputedAttributes')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/drivers?all=true"
                          endpointLinked={`/api/drivers?userId=${selectedUserForConnections.id}`}
                          baseId={selectedUserForConnections.id}
                          keyBase="userId"
                          keyLink="driverId"
                          titleGetter={(it) => `${it.name} (${it.uniqueId})`}
                          label={t('sharedDrivers')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/commands?all=true"
                          endpointLinked={`/api/commands?userId=${selectedUserForConnections.id}`}
                          baseId={selectedUserForConnections.id}
                          keyBase="userId"
                          keyLink="commandId"
                          titleGetter={(it) => it.description}
                          label={t('sharedSavedCommands')}
                          zIndex={50000}
                        />
                        <LinkField
                          endpointAll="/api/maintenance?all=true"
                          endpointLinked={`/api/maintenance?userId=${selectedUserForConnections.id}`}
                          baseId={selectedUserForConnections.id}
                          keyBase="userId"
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

          {/* Server Settings Drawer */}
          <AnimatePresence>
            {serverDialog && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setServerDialog(false)}
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
                    borderLeft: `1px solid ${colors.border}`,
                    zIndex: 10000,
                    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
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
                        onClick={() => setServerDialog(false)}
                        size="small"
                        style={{ color: colors.textSecondary }}
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                        {t('settingsServer')}
                      </Typography>
                    </div>
                    <IconButton
                      onClick={() => updateServerMutation.mutate(serverData)}
                      disabled={updateServerMutation.isPending}
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.text,
                        width: '40px',
                        height: '40px',
                      }}
                      title={updateServerMutation.isPending ? t('sharedSaving') : t('sharedSave')}
                    >
                      {updateServerMutation.isPending ? (
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
                    paddingBottom: '200px'
                  }}>
                    {serverLoading ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        gap: '16px',
                        padding: '40px 20px',
                      }}>
                        <CircularProgress 
                          size={40} 
                          style={{ 
                            color: colors.primary,
                            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                          }} 
                        />
                        <Typography 
                          variant="body2" 
                          style={{ 
                            color: colors.textSecondary,
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          {t('sharedLoading')}...
                        </Typography>
                      </div>
                    ) : serverData ? (
                      <>
                        {/* Server Tabs */}
                        <Tabs
                          value={activeServerTab}
                          onChange={(e, newValue) => setActiveServerTab(newValue)}
                          sx={{
                            borderBottom: `1px solid ${colors.border}`,
                            marginBottom: '16px',
                            '& .MuiTabs-indicator': {
                              backgroundColor: colors.primary,
                              height: '3px',
                              borderRadius: '2px',
                            },
                            '& .MuiTab-root': {
                              color: colors.textSecondary,
                              fontSize: '14px',
                              fontWeight: '500',
                              textTransform: 'none',
                              minHeight: '48px',
                              padding: '8px 16px',
                              '&.Mui-selected': {
                                color: colors.primary,
                                fontWeight: '600',
                                backgroundColor: 'transparent',
                              },
                              '&:hover': {
                                color: colors.primary,
                                backgroundColor: `${colors.primary}10`,
                              },
                              '&.Mui-selected:hover': {
                                color: colors.primary,
                                backgroundColor: `${colors.primary}15`,
                              },
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
                                  style: { zIndex: 10002 }
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
                                  style: { zIndex: 10002 }
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
                                  style: { zIndex: 10002 }
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
                                  style: { zIndex: 10002 }
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
                                {availableTimezones.map((timezone) => (
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
                                  />
                                }
                                label={t('serverRegistration')}
                              />
                              <FormControlLabel
                                control={
                                  <Checkbox 
                                    checked={serverData.readonly} 
                                    onChange={(event) => setServerData({ ...serverData, readonly: event.target.checked })} 
                                  />
                                }
                                label={t('serverReadonly')}
                              />
                              <FormControlLabel
                                control={
                                  <Checkbox 
                                    checked={serverData.deviceReadonly} 
                                    onChange={(event) => setServerData({ ...serverData, deviceReadonly: event.target.checked })} 
                                  />
                                }
                                label={t('userDeviceReadonly')}
                              />
                              <FormControlLabel
                                control={
                                  <Checkbox 
                                    checked={serverData.limitCommands} 
                                    onChange={(event) => setServerData({ ...serverData, limitCommands: event.target.checked })} 
                                  />
                                }
                                label={t('userLimitCommands')}
                              />
                              <FormControlLabel
                                control={
                                  <Checkbox 
                                    checked={serverData.disableReports} 
                                    onChange={(event) => setServerData({ ...serverData, disableReports: event.target.checked })} 
                                  />
                                }
                                label={t('userDisableReports')}
                              />
                              <FormControlLabel
                                control={
                                  <Checkbox 
                                    checked={serverData.fixedEmail} 
                                    onChange={(e) => setServerData({ ...serverData, fixedEmail: e.target.checked })} 
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
                            <Typography variant="body2" color="textSecondary" style={{ marginBottom: '16px' }}>
                              {t('sharedSelectFile')}
                            </Typography>
                            {/* File upload would go here - MuiFileInput component */}
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
                    ) : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        gap: '16px',
                        padding: '40px 20px',
                      }}>
                        <Typography 
                          variant="body2" 
                          style={{ 
                            color: colors.textSecondary,
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          {t('sharedError')}
                        </Typography>
                      </div>
                    )}
                  </div>

                </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingUsersPopover;
