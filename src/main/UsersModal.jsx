import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
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
  Box,
  InputAdornment,
  Tooltip,
  CircularProgress,
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
} from '@mui/icons-material';
import { useCatch, useEffectAsync } from '../reactHelper';
import { formatBoolean, formatTime } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useManager } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';

const UsersModal = ({ open, onClose }) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const manager = useManager();

  // State management
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showTemporary, setShowTemporary] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Load users when modal opens
  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  // Load users
  const loadUsers = useCatch(async () => {
    setLoading(true);
    try {
      const response = await fetchOrThrow('/api/users?excludeAttributes=true');
      const userData = await response.json();
      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  });

  // Filter users based on search and temporary status
  useEffect(() => {
    let filtered = users.filter(user => 
      showTemporary || !user.temporary
    );

    if (searchKeyword) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchKeyword, showTemporary]);

  // Handle user login
  const handleLogin = useCatch(async (userId) => {
    await fetchOrThrow(`/api/session/${userId}`);
    window.location.replace('/');
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
  const confirmDelete = useCatch(async () => {
    if (userToDelete) {
      await fetchOrThrow(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setDeleteDialog(false);
      setUserToDelete(null);
    }
  });

  // Handle save user
  const handleSaveUser = useCatch(async () => {
    if (!editingUser) return;

    const url = editingUser.id ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser.id ? 'PUT' : 'POST';

    const response = await fetchOrThrow(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingUser),
    });

    const savedUser = await response.json();
    
    if (editingUser.id) {
      setUsers(users.map(u => u.id === savedUser.id ? savedUser : u));
    } else {
      setUsers([...users, savedUser]);
    }

    setEditDialog(false);
    setEditingUser(null);
  });

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

  const getStatusColor = (user) => {
    if (user.disabled) return colors.error;
    if (user.administrator) return colors.primary;
    return colors.success;
  };

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
          zIndex: 10000,
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
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '90vh',
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
              <Typography variant="h5" style={{ color: colors.text, fontWeight: '600', margin: 0 }}>
                {t('settingsUsers')}
              </Typography>
              <Typography variant="body2" style={{ color: colors.textSecondary, marginTop: '4px' }}>
                {t('settingsUsersDescription') || 'Manage user accounts and permissions'}
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
                    <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                      {t('sharedName')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                      {t('userEmail')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                      {t('userAdmin')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                      {t('sharedStatus')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                      {t('userExpirationTime')}
                    </TableCell>
                    <TableCell align="center" style={{ color: colors.text, fontWeight: '600' }}>
                      {t('sharedActions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" style={{ padding: '40px' }}>
                        <CircularProgress style={{ color: colors.primary }} />
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" style={{ padding: '40px', color: colors.textSecondary }}>
                        {t('sharedNoData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence>
                      {filteredUsers.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          style={{ borderBottom: `1px solid ${colors.border}` }}
                        >
                          <TableCell>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <Avatar
                                style={{
                                  backgroundColor: colors.primary,
                                  color: colors.text,
                                  width: '32px',
                                  height: '32px',
                                }}
                              >
                                <PersonIcon fontSize="small" />
                              </Avatar>
                              <div>
                                <Typography variant="body2" style={{ color: colors.text, fontWeight: '500' }}>
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
                          <TableCell style={{ color: colors.text }}>
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
                          <TableCell style={{ color: colors.text }}>
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
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          {/* Actions Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{
              style: {
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                minWidth: '160px',
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
            PaperProps={{
              style: {
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
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
            PaperProps={{
              style: {
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
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
                {!editingUser?.id && (
                  <TextField
                    label={t('userPassword')}
                    type="password"
                    value={editingUser?.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    fullWidth
                    style={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                )}
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
