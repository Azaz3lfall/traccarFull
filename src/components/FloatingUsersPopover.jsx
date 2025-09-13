import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { formatBoolean } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useManager } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';

const FloatingUsersPopover = ({ 
  desktop, 
  isMenuExpanded, 
  isVisible, 
  onClose 
}) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const manager = useManager();
  const queryClient = useQueryClient();

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
    enabled: isVisible, // Only fetch when popover is visible
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

    if (editingUser.id) {
      updateUserMutation.mutate({ id: editingUser.id, userData: editingUser });
    } else {
      createUserMutation.mutate(editingUser);
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
          borderRadius: !desktop ? '0px' : '0px 16px 16px 0px',
          height: '100%',
          overflow: 'hidden',
          boxShadow: !desktop ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: 'none',
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
            <div>
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.3 }}>
                {t('settingsUsers')}
              </Typography>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingUser({ name: '', email: '', password: '', administrator: false, disabled: false });
                  setEditDialog(true);
                }}
                size="small"
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
                size="small"
                style={{ color: colors.textSecondary }}
              >
                <CloseIcon fontSize="small" />
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
                  size="small"
                  style={{ color: colors.primary }}
                />
              }
              label={t('userTemporary')}
              style={{ color: colors.text, fontSize: '12px' }}
            />
          </div>

          {/* Users Table */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow style={{ backgroundColor: colors.surface }}>
                    <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                      {t('sharedName')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                      {t('userEmail')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                      {t('userAdmin')}
                    </TableCell>
                    <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                      {t('sharedStatus')}
                    </TableCell>
                    <TableCell align="center" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                      {t('sharedActions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <CircularProgress style={{ color: colors.primary }} size={24} />
                          <Typography style={{ color: colors.textSecondary, lineHeight: 0.8, fontSize: '12px' }}>
                            {t('sharedLoading')}...
                          </Typography>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" style={{ padding: '20px', color: colors.error, lineHeight: 0.8, fontSize: '12px' }}>
                        {t('sharedError')}: {error.message}
                      </TableCell>
                    </TableRow>
                  ) : paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" style={{ padding: '20px', color: colors.textSecondary, lineHeight: 0.8, fontSize: '12px' }}>
                        {t('sharedNoData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {paginatedUsers.map((user, index) => (
                        <TableRow
                          key={user.id}
                          style={{ 
                            borderBottom: `1px solid ${colors.border}`,
                            backgroundColor: index % 2 === 0 ? colors.surface : (colors.background === '#000000' || colors.background === '#121212' || colors.surface === '#1e1e1e' ? '#404040' : '#f8f9fa')
                          }}
                          sx={{ '& .MuiTableCell-root': { padding: '9px 12px' } }}
                        >
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
                                <Typography variant="body2" style={{ color: colors.text, fontWeight: '500', lineHeight: 1.3, fontSize: '11px' }}>
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
                          <TableCell style={{ color: colors.text, lineHeight: 1.3, fontSize: '11px' }}>
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
                          <TableCell align="center">
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <IconButton
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  size="small"
                  style={{
                    color: colors.text,
                    width: '24px',
                    height: '24px',
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
                  style={{
                    '& .MuiPaginationItem-root': {
                      color: colors.text,
                      fontSize: '10px',
                      minWidth: '24px',
                      height: '24px',
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
                    width: '24px',
                    height: '24px',
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
            <DialogTitle style={{ color: colors.text, fontSize: '14px' }}>
              {t('sharedRemove')} {userToDelete?.name}
            </DialogTitle>
            <DialogContent>
              <Typography style={{ color: colors.textSecondary, fontSize: '12px' }}>
                {t('sharedRemoveConfirm')} "{userToDelete?.name}"?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setDeleteDialog(false)}
                size="small"
                style={{ color: colors.textSecondary }}
              >
                {t('sharedCancel')}
              </Button>
              <Button
                onClick={() => deleteUserMutation.mutate(userToDelete?.id)}
                size="small"
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
            <DialogTitle style={{ color: colors.text, fontSize: '14px' }}>
              {editingUser?.id ? t('sharedEdit') : t('sharedAdd')} {t('settingsUser')}
            </DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
                <TextField
                  label={t('sharedName')}
                  value={editingUser?.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  fullWidth
                  size="small"
                  style={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
                <TextField
                  label={t('userEmail')}
                  type="email"
                  value={editingUser?.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  fullWidth
                  size="small"
                  style={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
                {!editingUser?.id && (
                  <TextField
                    label={t('userPassword')}
                    type="password"
                    value={editingUser?.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    fullWidth
                    size="small"
                    style={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingUser?.administrator || false}
                        onChange={(e) => setEditingUser({ ...editingUser, administrator: e.target.checked })}
                        size="small"
                        style={{ color: colors.primary }}
                      />
                    }
                    label={t('userAdmin')}
                    style={{ color: colors.text, fontSize: '12px' }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingUser?.disabled || false}
                        onChange={(e) => setEditingUser({ ...editingUser, disabled: e.target.checked })}
                        size="small"
                        style={{ color: colors.primary }}
                      />
                    }
                    label={t('sharedDisabled')}
                    style={{ color: colors.text, fontSize: '12px' }}
                  />
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setEditDialog(false)}
                size="small"
                style={{ color: colors.textSecondary }}
              >
                {t('sharedCancel')}
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={!editingUser?.name || !editingUser?.email || (!editingUser?.id && !editingUser?.password)}
                size="small"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.text,
                }}
              >
                {t('sharedSave')}
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingUsersPopover;
