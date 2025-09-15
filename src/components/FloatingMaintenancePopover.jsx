import { useState, useEffect } from 'react';
import { useEffectAsync } from '../reactHelper';
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
  Typography,
  Box,
  Chip,
  Switch,
  FormControlLabel,
  Pagination,
  CircularProgress,
  Alert,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { formatBoolean } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useRestriction } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { prefixString } from '../common/util/stringUtils';
import { sessionActions } from '../store';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import { formatDistance, formatSpeed } from '../common/util/formatter';
import { useAttributePreference } from '../common/util/preferences';
import dayjs from 'dayjs';

const FloatingMaintenancePopover = ({ 
  desktop, 
  isMenuExpanded, 
  isVisible, 
  onClose 
}) => {
  console.log('=== FloatingMaintenancePopover RENDER ===');
  console.log('Props:', { desktop, isMenuExpanded, isVisible, onClose });
  
  const t = useTranslation();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const limitMaintenance = useRestriction('limitMaintenance');
  const positionAttributes = usePositionAttributes(t);
  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');

  // State management
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [activeTab, setActiveTab] = useState(0);
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);

  console.log('FloatingMaintenancePopover state:', { maintenanceTypes, editDialog, isVisible });

  // Fetch maintenances with TanStack Query
  console.log('=== TEST: Before useQuery ===');
  const { data: maintenances = [], isLoading, error } = useQuery({
    queryKey: ['maintenances'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/maintenance');
      return response.json();
    },
    enabled: isVisible, // Only fetch when popover is visible
  });
  console.log('=== TEST: After useQuery ===');

  // Fetch maintenance types when popover is visible
  useEffectAsync(async () => {
    if (!isVisible) return;
    
    console.log('=== FloatingMaintenancePopover: Loading maintenance types (isVisible=true) ===');
    try {
      // Get available position attributes for maintenance types
      const availableTypes = Object.keys(positionAttributes).filter(key => {
        const attr = positionAttributes[key];
        return attr && (attr.dataType === 'distance' || attr.dataType === 'hours' || key.endsWith('Time'));
      });
      
      console.log('Available maintenance types:', availableTypes);
      setMaintenanceTypes(availableTypes);
    } catch (error) {
      console.error('=== FloatingMaintenancePopover: Failed to load maintenance types ===', error);
      setMaintenanceTypes([]);
    }
  }, [isVisible, positionAttributes]);

  // Convert attribute value for display (with units)
  const convertAttribute = (key, start, value) => {
    const attribute = positionAttributes[key];
    if (key.endsWith('Time')) {
      if (start) {
        return dayjs(value).locale('en').format('YYYY-MM-DD');
      }
      return `${value / 86400000} ${t('sharedDays')}`;
    }
    if (attribute && attribute.dataType) {
      switch (attribute.dataType) {
        case 'speed':
          return formatSpeed(value, speedUnit, t);
        case 'distance':
          return formatDistance(value, distanceUnit, t);
        case 'hours':
          return `${value / 3600000} ${t('sharedHours')}`;
        default:
          return value;
      }
    }
    return value;
  };

  // Display raw values for maintenance list (no unit conversion)
  const displayRawValue = (key, start, value) => {
    if (key.endsWith('Time')) {
      if (start) {
        return dayjs(value).locale('en').format('YYYY-MM-DD');
      }
      return `${value / 86400000} ${t('sharedDays')}`;
    }
    // For maintenance list, show raw values without unit conversion
    return value;
  };

  // Filter maintenances based on search
  const filteredMaintenances = maintenances.filter(maintenance => {
    const matchesSearch = !searchKeyword || 
      (maintenance.name && maintenance.name.toLowerCase().includes(searchKeyword.toLowerCase())) ||
      (maintenance.type && maintenance.type.toLowerCase().includes(searchKeyword.toLowerCase()));
    return matchesSearch;
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  // Pagination
  const totalPages = Math.ceil(filteredMaintenances.length / pageSize);
  const paginatedMaintenances = filteredMaintenances.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Handle edit maintenance
  const handleEdit = (maintenance) => {
    setEditingMaintenance({
      ...maintenance,
      attributes: maintenance.attributes || {}
    });
    setActiveTab(0);
    setEditDialog(true);
    setAnchorEl(null);
  };

  // Handle delete maintenance
  const handleDelete = (maintenance) => {
    setMaintenanceToDelete(maintenance);
    setDeleteDialog(true);
    setAnchorEl(null);
  };

  // Mutations
  const createMaintenanceMutation = useMutation({
    mutationFn: async (maintenanceData) => {
      const response = await fetchOrThrow('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setEditDialog(false);
      setEditingMaintenance(null);
    },
  });

  const updateMaintenanceMutation = useMutation({
    mutationFn: async ({ id, maintenanceData }) => {
      const response = await fetchOrThrow(`/api/maintenance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setEditDialog(false);
      setEditingMaintenance(null);
    },
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: async (maintenanceId) => {
      await fetchOrThrow(`/api/maintenance/${maintenanceId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setDeleteDialog(false);
      setMaintenanceToDelete(null);
    },
  });

  // Handle save maintenance
  const handleSaveMaintenance = () => {
    if (editingMaintenance.id) {
      updateMaintenanceMutation.mutate({ id: editingMaintenance.id, maintenanceData: editingMaintenance });
    } else {
      createMaintenanceMutation.mutate(editingMaintenance);
    }
  };

  // Menu actions
  const actions = [
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      handler: handleEdit,
      show: !limitMaintenance,
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: handleDelete,
      show: !limitMaintenance,
    },
  ];

  const getMaintenanceTypeIcon = (type) => {
    return <BuildIcon />;
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="floating-maintenance-popover"
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
                  {t('sharedMaintenance')}
                </Typography>
              </div>
            </div>

            {/* Search and Filters */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder={t('sharedSearch')}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon style={{ color: colors.textSecondary, marginRight: '8px' }} />,
                    style: { color: colors.text }
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
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingMaintenance({
                      name: '',
                      type: '',
                      start: 0,
                      period: 0,
                      attributes: {}
                    });
                    setActiveTab(0);
                    setEditDialog(true);
                  }}
                  disabled={limitMaintenance}
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.text,
                    textTransform: 'none',
                    fontWeight: '500',
                  }}
                >
                  {t('sharedAdd')}
                </Button>
              </div>
            </div>

            {/* Maintenances List */}
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
              ) : error ? (
                <Alert severity="error" style={{ margin: '20px 0' }}>
                  {t('sharedError')}: {error.message}
                </Alert>
              ) : paginatedMaintenances.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  color: colors.textSecondary,
                  textAlign: 'center'
                }}>
                  <BuildIcon style={{ fontSize: 48, marginBottom: '16px', opacity: 0.5 }} />
                  <Typography variant="h6" style={{ marginBottom: '8px' }}>
                    {searchKeyword ? t('sharedNoResults') : t('sharedNoData')}
                  </Typography>
                  <Typography variant="body2" style={{ opacity: 0.7 }}>
                    {searchKeyword ? t('sharedNoResultsDescription') : t('sharedNoDataDescription')}
                  </Typography>
                </div>
              ) : (
                <TableContainer style={{ padding: '0 20px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow style={{ backgroundColor: colors.secondary }}>
                        <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                          {t('sharedName')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                          {t('sharedType')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                          {t('maintenanceStart')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                          {t('maintenancePeriod')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600', width: '60px' }}>
                          {t('sharedActions')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedMaintenances.map((maintenance, index) => (
                        <TableRow
                          key={maintenance.id}
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
                        >
                          <TableCell style={{ color: colors.text }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {getMaintenanceTypeIcon(maintenance.type)}
                              <span style={{ fontWeight: '500' }}>{maintenance.name}</span>
                            </div>
                          </TableCell>
                          <TableCell style={{ color: colors.textSecondary }}>
                            {maintenance.type ? positionAttributes[maintenance.type]?.name || maintenance.type : '-'}
                          </TableCell>
                          <TableCell style={{ color: colors.textSecondary }}>
                            {displayRawValue(maintenance.type, true, maintenance.start)}
                          </TableCell>
                          <TableCell style={{ color: colors.textSecondary }}>
                            {displayRawValue(maintenance.type, false, maintenance.period)}
                          </TableCell>
                          <TableCell style={{ padding: '4px' }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setSelectedMaintenance(maintenance);
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
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '20px',
                  borderTop: `1px solid ${colors.border}`,
                  marginTop: '16px'
                }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                    size="small"
                    showFirstButton
                    showLastButton
                    style={{
                      '& .MuiPaginationItem-root': {
                        color: colors.text,
                        '&.Mui-selected': {
                          backgroundColor: colors.primary,
                          color: colors.text,
                        },
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Menu */}
          <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={() => setAnchorEl(null)}
            style={{ zIndex: 10002 }}
            PaperProps={{
              style: {
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                boxShadow: colors.shadow,
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
                  onClick={() => action.handler(selectedMaintenance)}
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
            <DialogTitle style={{ color: colors.text }}>
              {t('sharedRemove')} {maintenanceToDelete?.name}
            </DialogTitle>
            <DialogContent>
              <Typography style={{ color: colors.textSecondary }}>
                {t('sharedRemoveConfirm')} "{maintenanceToDelete?.name}"?
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
                onClick={() => deleteMaintenanceMutation.mutate(maintenanceToDelete.id)}
                style={{ color: colors.error }}
                disabled={deleteMaintenanceMutation.isPending}
              >
                {deleteMaintenanceMutation.isPending ? (
                  <CircularProgress size={16} />
                ) : (
                  t('sharedRemove')
                )}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Maintenance Drawer */}
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
                    setEditingMaintenance(null);
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
                    width: '400px',
                    height: '100vh',
                    backgroundColor: colors.surface,
                    zIndex: 10001,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                  }}>
                    <IconButton
                      onClick={() => {
                        setEditDialog(false);
                        setEditingMaintenance(null);
                      }}
                      size="small"
                      style={{ color: colors.textSecondary }}
                    >
                      <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0 }}>
                      {editingMaintenance?.id ? t('sharedEdit') : t('sharedAdd')} {t('sharedMaintenance')}
                    </Typography>
                  </div>

                  {/* Form */}
                  <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Name */}
                      <TextField
                        label={t('sharedName')}
                        value={editingMaintenance?.name || ''}
                        onChange={(e) => setEditingMaintenance({
                          ...editingMaintenance,
                          name: e.target.value
                        })}
                        fullWidth
                        variant="outlined"
                        size="small"
                        style={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: colors.secondary,
                            '& fieldset': { borderColor: colors.border },
                            '&:hover fieldset': { borderColor: colors.primary },
                            '&.Mui-focused fieldset': { borderColor: colors.primary },
                          }
                        }}
                      />

                      {/* Type */}
                      <FormControl fullWidth size="small">
                        <InputLabel style={{ color: colors.textSecondary }}>
                          {t('sharedType')}
                        </InputLabel>
                        <Select
                          value={editingMaintenance?.type || ''}
                          onChange={(e) => setEditingMaintenance({
                            ...editingMaintenance,
                            type: e.target.value,
                            start: 0,
                            period: 0
                          })}
                          label={t('sharedType')}
                          MenuProps={{
                            style: { zIndex: 10003 },
                            PaperProps: {
                              style: { zIndex: 10003 }
                            }
                          }}
                          style={{
                            backgroundColor: colors.secondary,
                            color: colors.text,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: colors.border,
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: colors.primary,
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: colors.primary,
                            },
                          }}
                        >
                          {maintenanceTypes.map((type) => (
                            <MenuItem key={type} value={type} style={{ color: colors.text }}>
                              {positionAttributes[type]?.name || type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Start */}
                      <TextField
                        type={editingMaintenance?.type?.endsWith('Time') ? 'date' : 'number'}
                        value={editingMaintenance?.type?.endsWith('Time') 
                          ? dayjs(editingMaintenance?.start).format('YYYY-MM-DD')
                          : editingMaintenance?.start || ''
                        }
                        onChange={(e) => {
                          const value = editingMaintenance?.type?.endsWith('Time')
                            ? dayjs(e.target.value).valueOf()
                            : parseFloat(e.target.value) || 0;
                          setEditingMaintenance({
                            ...editingMaintenance,
                            start: value
                          });
                        }}
                        label={t('maintenanceStart')}
                        fullWidth
                        variant="outlined"
                        size="small"
                        style={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: colors.secondary,
                            '& fieldset': { borderColor: colors.border },
                            '&:hover fieldset': { borderColor: colors.primary },
                            '&.Mui-focused fieldset': { borderColor: colors.primary },
                          }
                        }}
                      />

                      {/* Period */}
                      <TextField
                        type="number"
                        value={editingMaintenance?.period || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setEditingMaintenance({
                            ...editingMaintenance,
                            period: value
                          });
                        }}
                        label={t('maintenancePeriod')}
                        fullWidth
                        variant="outlined"
                        size="small"
                        style={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: colors.secondary,
                            '& fieldset': { borderColor: colors.border },
                            '&:hover fieldset': { borderColor: colors.primary },
                            '&.Mui-focused fieldset': { borderColor: colors.primary },
                          }
                        }}
                      />
                    </div>
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
                        setEditingMaintenance(null);
                      }}
                      style={{ color: colors.textSecondary }}
                    >
                      {t('sharedCancel')}
                    </Button>
                    <Button
                      onClick={handleSaveMaintenance}
                      variant="contained"
                      disabled={createMaintenanceMutation.isPending || updateMaintenanceMutation.isPending}
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.text,
                      }}
                    >
                      {(createMaintenanceMutation.isPending || updateMaintenanceMutation.isPending) ? (
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingMaintenancePopover;
