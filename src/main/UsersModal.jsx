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
  Switch,
  FormControlLabel,
  Chip,
  Avatar,
  Typography,
  InputAdornment,
  CircularProgress,
  Pagination,
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
  Close as CloseIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { formatBoolean, formatTime } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useManager } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { sessionActions } from '../store';

const UsersModal = ({ open, onClose }) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const manager = useManager();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
  const [pageSize] = useState(10);

  // Fetch users with TanStack Query
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users', { excludeAttributes: true }],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/users?excludeAttributes=true');
      return response.json();
    },
    enabled: open, // Only fetch when modal is open
  });

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
  const handleConnections = (userId) => {
    window.open(`/settings/user/${userId}/connections`, '_blank');
  };

  // Handle edit user
  const handleEdit = (user) => {
    setEditingUser(user);
    setEditDialog(true);
    setAnchorEl(null);
  };

  // Handle delete user
  const handleDelete = (user) => {
    setUserToDelete(user);
    setDeleteDialog(true);
    setAnchorEl(null);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
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
      setEditDialog(false);
      setEditingUser(null);
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
      setEditDialog(false);
      setEditingUser(null);
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

  if (!open) return null;

  return (
    <AnimatePresence>
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
          zIndex: 10001,
          padding: '20px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -50, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '12px',
            width: '95vw',
            height: '95vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
          }}>
            <div>
              <Typography variant="h5" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 0.8 }}>
                {t('settingsUsers')}
              </Typography>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingUser({ name: '', email: '', password: '', administrator: false, disabled: false });
                  setEditDialog(true);
                }}
                style={{
                  backgroundColor: colors.primary,
                  color: colors.text,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: '500',
                }}
              >
                {t('sharedAdd')}
              </Button>
              <IconButton
                onClick={onClose}
                style={{ color: colors.textSecondary }}
              >
                <CloseIcon />
              </IconButton>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            <TextField
              placeholder={t('sharedSearch')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon style={{ color: colors.textSecondary }} />
                  </InputAdornment>
                ),
              }}
              style={{
                flex: 1,
                minWidth: '200px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showTemporary}
                  onChange={(e) => setShowTemporary(e.target.checked)}
                  style={{ color: colors.primary }}
                />
              }
              label={t('userTemporary')}
              style={{ color: colors.text }}
            />
          </div>

          {/* Users Table */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow style={{ backgroundColor: colors.surface }}>
                    <TableCell style={{ color: colors.text, fontWeight: '600', padding: '8px 16px' }}>
                      {t('sharedName')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600', padding: '8px 16px' }}>
                      {t('userEmail')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600', padding: '8px 16px' }}>
                      {t('userAdmin')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600', padding: '8px 16px' }}>
                      {t('sharedStatus')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600', padding: '8px 16px' }}>
                      {t('userExpirationTime')}
                    </TableCell>
                    <TableCell align="center" style={{ color: colors.text, fontWeight: '600', padding: '8px 16px' }}>
                      {t('sharedActions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" style={{ padding: '40px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                          <CircularProgress style={{ color: colors.primary }} size={40} />
                          <Typography style={{ color: colors.textSecondary, lineHeight: 0.8 }}>
                            {t('sharedLoading')}...
                          </Typography>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" style={{ padding: '40px', color: colors.error, lineHeight: 0.8 }}>
                        {t('sharedError')}: {error.message}
                      </TableCell>
                    </TableRow>
                  ) : paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" style={{ padding: '40px', color: colors.textSecondary, lineHeight: 0.8 }}>
                        {t('sharedNoData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {paginatedUsers.map((user, index) => (
                        <TableRow
                          key={user.id}
                          style={{ borderBottom: `1px solid ${colors.border}` }}
                          sx={{ '& .MuiTableCell-root': { padding: '8px 16px' } }}
                        >
                          <TableCell>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Avatar
                                style={{
                                  backgroundColor: colors.primary,
                                  color: colors.text,
                                  width: '28px',
                                  height: '28px',
                                }}
                              >
                                <PersonIcon fontSize="small" />
                              </Avatar>
                              <div>
                                <Typography variant="body2" style={{ color: colors.text, fontWeight: '500', lineHeight: 0.8 }}>
                                  {user.name || t('sharedUnknown')}
                                </Typography>
                                {user.temporary && (
                                  <Chip
                                    label={t('userTemporary')}
                                    size="small"
                                    style={{
                                      backgroundColor: colors.warning,
                                      color: colors.text,
                                      fontSize: '10px',
                                      height: '16px',
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell style={{ color: colors.text, lineHeight: 0.8 }}>
                            {user.email || '-'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(user)}
                              label={formatBoolean(user.administrator, t)}
                              size="small"
                              style={{
                                backgroundColor: user.administrator ? colors.primary : colors.surface,
                                color: user.administrator ? colors.text : colors.textSecondary,
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
                              }}
                            />
                          </TableCell>
                          <TableCell style={{ color: colors.text, lineHeight: 0.8 }}>
                            {user.expirationTime ? formatTime(user.expirationTime, 'date') : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              onClick={(e) => {
                                setSelectedUser(user);
                                setAnchorEl(e.currentTarget);
                              }}
                              style={{ color: colors.textSecondary }}
                            >
                              <MoreVertIcon />
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
              padding: '16px 24px',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}>
              <Typography style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 0.8 }}>
                {page} / {totalPages} ({filteredUsers.length} {t('settingsUsers')})
              </Typography>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconButton
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  size="small"
                  style={{
                    color: colors.text,
                    width: '32px',
                    height: '32px',
                  }}
                >
                  <FirstPageIcon fontSize="small" />
                </IconButton>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(event, value) => setPage(value)}
                  color="primary"
                  size="small"
                  showFirstButton={false}
                  showLastButton={false}
                  siblingCount={0}
                  boundaryCount={1}
                  style={{
                    '& .MuiPaginationItem-root': {
                      color: colors.text,
                      '&.Mui-selected': {
                        backgroundColor: colors.primary,
                        color: colors.text,
                      },
                    },
                  }}
                />
                <IconButton
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  size="small"
                  style={{
                    color: colors.text,
                    width: '32px',
                    height: '32px',
                  }}
                >
                  <LastPageIcon fontSize="small" />
                </IconButton>
              </div>
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
                minWidth: '160px',
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
                  style={{ color: colors.text }}
                >
                  {action.icon}
                  <span style={{ marginLeft: '8px' }}>{action.title}</span>
                </MenuItem>
              ))}
          </Menu>

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
            <DialogTitle style={{ color: colors.text }}>
              {t('sharedRemove')} {userToDelete?.name}
            </DialogTitle>
            <DialogContent>
              <Typography style={{ color: colors.textSecondary }}>
                {t('sharedRemoveConfirm')} "{userToDelete?.name}"?
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
                onClick={confirmDelete}
                style={{ color: colors.error }}
              >
                {t('sharedRemove')}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog
            open={editDialog}
            onClose={() => setEditDialog(false)}
            maxWidth="sm"
            fullWidth
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
            <DialogTitle style={{ color: colors.text }}>
              {editingUser?.id ? t('sharedEdit') : t('sharedAdd')} {t('settingsUser')}
            </DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
                <TextField
                  label={t('sharedName')}
                  value={editingUser?.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  fullWidth
                  style={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
                <TextField
                  label={t('userEmail')}
                  type="email"
                  value={editingUser?.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  fullWidth
                  style={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
                <TextField
                  label={t('userPassword')}
                  type="password"
                  value={editingUser?.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder={editingUser?.id ? t('userPassword') + ' (leave empty to keep current)' : t('userPassword')}
                  fullWidth
                  style={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
                <div style={{ display: 'flex', gap: '16px' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingUser?.administrator || false}
                        onChange={(e) => setEditingUser({ ...editingUser, administrator: e.target.checked })}
                        style={{ color: colors.primary }}
                      />
                    }
                    label={t('userAdmin')}
                    style={{ color: colors.text }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingUser?.disabled || false}
                        onChange={(e) => setEditingUser({ ...editingUser, disabled: e.target.checked })}
                        style={{ color: colors.primary }}
                      />
                    }
                    label={t('sharedDisabled')}
                    style={{ color: colors.text }}
                  />
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setEditDialog(false)}
                style={{ color: colors.textSecondary }}
              >
                {t('sharedCancel')}
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={!editingUser?.name || !editingUser?.email || (!editingUser?.id && !editingUser?.password)}
                style={{
                  backgroundColor: colors.primary,
                  color: colors.text,
                }}
              >
                {t('sharedSave')}
              </Button>
            </DialogActions>
          </Dialog>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UsersModal;
