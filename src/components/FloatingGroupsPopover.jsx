import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  Typography,
  CircularProgress,
  Pagination,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft as ChevronLeftIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import useGroupAttributes from '../common/attributes/useGroupAttributes';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';
import { groupsActions } from '../store';

const FloatingGroupsPopover = ({ isVisible, onClose, desktop, isMenuExpanded }) => {
  const colors = useThemeColors();
  const t = useTranslation();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  // State management
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Custom dropdown states
  const [parentGroupDropdownOpen, setParentGroupDropdownOpen] = useState(false);
  
  // Refs for dropdown positioning
  const parentGroupInputRef = useRef(null);

  // Attributes hooks
  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const groupAttributes = useGroupAttributes(t);



  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (parentGroupInputRef.current && !parentGroupInputRef.current.contains(event.target)) {
        setParentGroupDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get groups from Redux store
  const reduxGroups = useSelector((state) => state.groups.items);
  
  // Fetch groups with TanStack Query
  const { data: queryGroups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await fetch('/api/groups');
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      const data = await response.json();
      // Sync with Redux store when data is fetched
      dispatch(groupsActions.refresh(data));
      return data;
    },
    enabled: isVisible,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use Redux groups if available, otherwise fall back to query groups
  const groups = Object.keys(reduxGroups).length > 0 ? Object.values(reduxGroups) : queryGroups;

  // Filter groups based on search keyword
  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredGroups.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + pageSize);

  // Get parent group name
  const getParentGroupName = (groupId) => {
    if (!groupId) return '';
    const parentGroup = groups.find(g => g.id === groupId);
    return parentGroup ? parentGroup.name : '';
  };

  // Actions for group menu
  const actions = [
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      handler: (group) => {
        setSelectedGroup(group);
        setEditingGroup({ 
          ...group, 
          attributes: group.attributes || {}
        });
        setEditDialog(true);
        setActiveTab(0);
        setAnchorEl(null);
      },
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: (group) => {
        setGroupToDelete(group);
        setDeleteDialog(true);
        setAnchorEl(null);
      },
    },
  ];

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: async (groupData) => {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (newGroup) => {
      // Update Redux store
      dispatch(groupsActions.add(newGroup));
      // Invalidate TanStack Query cache
      queryClient.invalidateQueries(['groups']);
      setEditDialog(false);
      setEditingGroup(null);
    },
    onError: (error) => {
      console.error('Error creating group:', error);
      setSnackbar({ open: true, message: error.message || t('sharedError'), severity: 'error' });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (groupData) => {
      const response = await fetch(`/api/groups/${groupData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (updatedGroup) => {
      // Update Redux store
      dispatch(groupsActions.update(updatedGroup));
      // Invalidate TanStack Query cache
      queryClient.invalidateQueries(['groups']);
      setEditDialog(false);
      setEditingGroup(null);
    },
    onError: (error) => {
      console.error('Error updating group:', error);
      setSnackbar({ open: true, message: error.message || t('sharedError'), severity: 'error' });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      const response = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      return groupId; // Return the groupId for Redux action
    },
    onSuccess: (groupId) => {
      // Update Redux store
      dispatch(groupsActions.remove(groupId));
      // Invalidate TanStack Query cache
      queryClient.invalidateQueries(['groups']);
      cancelDelete();
    },
    onError: (error) => {
      console.error('Error deleting group:', error);
      setSnackbar({ open: true, message: error.message || t('sharedError'), severity: 'error' });
    },
  });

  // Handlers
  const handleSaveGroup = () => {
    if (!editingGroup) return;

    const groupData = {
      id: editingGroup.id,
      name: editingGroup.name,
      groupId: editingGroup.groupId || null,
      attributes: editingGroup.attributes || {}
    };

    if (editingGroup.id) {
      updateGroupMutation.mutate(groupData);
    } else {
      createGroupMutation.mutate(groupData);
    }
  };

  const handleDeleteGroup = () => {
    if (groupToDelete) {
      deleteGroupMutation.mutate(groupToDelete.id);
    }
  };

  // Handle confirm delete
  const confirmDelete = () => {
    if (groupToDelete) {
      deleteGroupMutation.mutate(groupToDelete.id);
    }
  };

  // Handle cancel delete
  const cancelDelete = () => {
    setDeleteDialog(false);
    setGroupToDelete(null);
  };

  const handleAddGroup = () => {
    setEditingGroup({
      name: '',
      groupId: null,
      attributes: {},
    });
    setEditDialog(true);
    setActiveTab(0);
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="floating-groups-popover"
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
                style={{ color: colors.textSecondary }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                {t('settingsGroups')}
              </Typography>
            </div>
            <IconButton
              onClick={handleAddGroup}
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
                '& .MuiOutlinedInputRoot': {
                  backgroundColor: colors.secondary,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: colors.primary },
                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                }
              }}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'visible', position: 'relative' }}>
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
                      color: colors.text,
                      position: 'absolute'
                    }} 
                    size={100}
                    thickness={4}
                  />
                </div>
                <Typography 
                  variant="body2" 
                  style={{ 
                    color: colors.textSecondary,
                    fontSize: '14px',
                    fontWeight: '500',
                    marginTop: '16px'
                  }}
                >
                  {t('sharedLoading')}...
                </Typography>
              </div>
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
                        {desktop && (
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('groupParent')}
                          </TableCell>
                        )}
                        <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px', textAlign: 'right' }}>
                          {t('sharedActions')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedGroups.map((group, index) => (
                        <TableRow 
                          key={group.id} 
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
                              {group.name}
                            </Typography>
                          </TableCell>
                          {desktop && (
                            <TableCell>
                              <Typography variant="body2" style={{ color: colors.textSecondary, fontSize: '12px' }}>
                                {getParentGroupName(group.groupId)}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell align="right" style={{ textAlign: 'right', padding: '4px' }}>
                            <IconButton
                              onClick={(e) => {
                                setSelectedGroup(group);
                                setAnchorEl(e.currentTarget);
                              }}
                              size="small"
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
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}>
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
                      onChange={(e, value) => setPage(value)}
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
                            color: 'white',
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
                  onClick={() => action.handler(selectedGroup)}
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
                    {t('sharedDeleteConfirm')} "{groupToDelete?.name}"?
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
                      disabled={deleteGroupMutation.isPending}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: deleteGroupMutation.isPending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: deleteGroupMutation.isPending ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!deleteGroupMutation.isPending) {
                          e.target.style.backgroundColor = '#FEE2E2';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!deleteGroupMutation.isPending) {
                          e.target.style.backgroundColor = '#FEF2F2';
                        }
                      }}
                    >
                      {deleteGroupMutation.isPending ? (
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

          {/* Edit Dialog */}
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
                  onClick={() => setEditDialog(false)}
                />
                
                {/* Edit Drawer */}
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
                    borderLeft: desktop ? `1px solid ${colors.border}` : 'none',
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: desktop ? '-4px 0 20px rgba(0, 0, 0, 0.15)' : 'none',
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
                        onClick={() => setEditDialog(false)}
                        size="small"
                        style={{ color: colors.textSecondary }}
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                        {editingGroup?.id ? t('sharedEdit') : t('sharedAdd')} {t('groupDialog')}
                      </Typography>
                    </div>
                    <IconButton
                      onClick={handleSaveGroup}
                      disabled={createGroupMutation.isPending || updateGroupMutation.isPending || !editingGroup?.name}
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.text,
                        width: '40px',
                        height: '40px',
                      }}
                      title={createGroupMutation.isPending || updateGroupMutation.isPending ? t('sharedSaving') : t('sharedSave')}
                    >
                      {(createGroupMutation.isPending || updateGroupMutation.isPending) ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )}
                    </IconButton>
                  </div>

                  {/* Form */}
                  <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
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
                      <Tab label={t('sharedExtra')} />
                      <Tab label={t('sharedAttributes')} />
                    </Tabs>

                    {/* Tab Content */}
                    <Box style={{ flex: 1, overflow: 'auto', paddingTop: '16px' }}>
                      {/* Required Tab */}
                      {activeTab === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Name */}
                          <TextField
                            label={t('sharedName')}
                            value={editingGroup?.name || ''}
                            onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                            fullWidth
                            variant="outlined"
                            size="small"
                            sx={{
                              '& .MuiOutlinedInputRoot': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              },
                              '& .MuiInputLabel-root': { 
                                color: colors.text,
                                '&.Mui-focused': { color: colors.primary }
                              },
                            }}
                          />
                        </div>
                      )}

                      {/* Extra Tab */}
                      {activeTab === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Parent Group */}
                          <div>
                            <TextField
                              ref={parentGroupInputRef}
                              fullWidth
                              size="small"
                              label={t('groupParent')}
                              value={editingGroup?.groupId ? getParentGroupName(editingGroup.groupId) : ''}
                              onClick={() => setParentGroupDropdownOpen(!parentGroupDropdownOpen)}
                              InputProps={{
                                readOnly: true,
                                endAdornment: <ChevronLeftIcon style={{ transform: 'rotate(-90deg)', color: colors.textSecondary }} />
                              }}
                              sx={{
                                '& .MuiOutlinedInputRoot': {
                                  color: colors.text,
                                  backgroundColor: colors.secondary,
                                  '& fieldset': { borderColor: colors.border },
                                  '&:hover fieldset': { borderColor: colors.primary },
                                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                                },
                                '& .MuiInputLabel-root': { 
                                  color: colors.text,
                                  '&.Mui-focused': { color: colors.primary }
                                },
                              }}
                            />
                            {parentGroupDropdownOpen && (
                              <div 
                                style={{
                                  position: 'fixed',
                                  zIndex: 10010,
                                  maxHeight: '200px',
                                  overflow: 'auto',
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '4px',
                                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                  backgroundColor: colors.surface,
                                  marginTop: '4px',
                                  width: parentGroupInputRef.current ? parentGroupInputRef.current.getBoundingClientRect().width : '100%',
                                  left: parentGroupInputRef.current ? parentGroupInputRef.current.getBoundingClientRect().left : 0,
                                  top: parentGroupInputRef.current ? parentGroupInputRef.current.getBoundingClientRect().bottom + 4 : 0,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingGroup({ ...editingGroup, groupId: null });
                                    setParentGroupDropdownOpen(false);
                                  }}
                                  style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    color: colors.textSecondary,
                                    backgroundColor: colors.surface,
                                    borderBottom: groups.filter(group => group.id !== editingGroup?.id).length > 0 ? `1px solid ${colors.border}` : 'none',
                                    fontStyle: 'italic',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    e.target.style.backgroundColor = colors.backgroundHover;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.stopPropagation();
                                    e.target.style.backgroundColor = colors.surface;
                                  }}
                                >
                                  {t('sharedNone')}
                                </div>
                                {groups
                                  .filter(group => group.id !== editingGroup?.id) // Don't allow self as parent
                                  .map((group, index) => (
                                    <div
                                      key={group.id}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditingGroup({ ...editingGroup, groupId: group.id });
                                        setParentGroupDropdownOpen(false);
                                      }}
                                      style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        color: colors.text,
                                        backgroundColor: colors.surface,
                                        borderBottom: index < groups.filter(g => g.id !== editingGroup?.id).length - 1 ? `1px solid ${colors.border}` : 'none',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.stopPropagation();
                                        e.target.style.backgroundColor = colors.backgroundHover;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.stopPropagation();
                                        e.target.style.backgroundColor = colors.surface;
                                      }}
                                    >
                                      {group.name}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Attributes Tab */}
                      {activeTab === 2 && (
                        <div>
                          <EditAttributesAccordion
                            attribute={null}
                            attributes={editingGroup?.attributes || {}}
                            setAttributes={(attributes) => setEditingGroup({ ...editingGroup, attributes })}
                            definitions={{}}
                            focusAttribute={null}
                            zIndex={10003}
                          />
                        </div>
                      )}
                    </Box>
                  </div>

                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Snackbar */}
          <Dialog
            open={snackbar.open}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            style={{ zIndex: 10004 }}
          >
            <div style={{
              padding: '16px',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.text,
            }}>
              {snackbar.message}
            </div>
          </Dialog>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingGroupsPopover;
