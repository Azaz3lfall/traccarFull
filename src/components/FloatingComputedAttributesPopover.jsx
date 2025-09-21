import { useState, useEffect, useRef } from 'react';
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
  Tabs,
  Tab,
  Snackbar,
  createFilterOptions,
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
  Functions as FunctionsIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { formatBoolean } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useRestriction, useAdministrator } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { prefixString } from '../common/util/stringUtils';
import { sessionActions } from '../store';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import SelectField from '../common/components/SelectField';
import LinkField from '../common/components/LinkField';
import { snackBarDurationLongMs } from '../common/util/duration';

const allowedProperties = ['valid', 'latitude', 'longitude', 'altitude', 'speed', 'course', 'address', 'accuracy'];

const FloatingComputedAttributesPopover = ({ 
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
  
  const limitComputedAttributes = useRestriction('limitComputedAttributes');
  const administrator = useAdministrator();
  const positionAttributes = usePositionAttributes(t);

  // State management
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [activeTab, setActiveTab] = useState(0);
  const [deviceId, setDeviceId] = useState();
  const [testResult, setTestResult] = useState();
  const [devices, setDevices] = useState([]);
  const [attributeDropdownOpen, setAttributeDropdownOpen] = useState(false);
  const [attributeInputValue, setAttributeInputValue] = useState('');
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const [deviceInputValue, setDeviceInputValue] = useState('');
  const attributeInputRef = useRef(null);
  const deviceInputRef = useRef(null);


  // Fetch computed attributes with TanStack Query
  const { data: attributes = [], isLoading, error } = useQuery({
    queryKey: ['computedAttributes'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/attributes/computed');
      return response.json();
    },
    enabled: isVisible, // Only fetch when popover is visible
  });

  // Fetch devices for testing
  useEffectAsync(async () => {
    if (isVisible) {
      try {
        const response = await fetchOrThrow('/api/devices');
        setDevices(await response.json());
      } catch (error) {
        console.error('Failed to load devices:', error);
        setDevices([]);
      }
    }
  }, [isVisible]);

  // Filter attributes based on search
  const filteredAttributes = attributes.filter(attribute => {
    const matchesSearch = !searchKeyword || 
      (attribute.description && attribute.description.toLowerCase().includes(searchKeyword.toLowerCase())) ||
      (attribute.attribute && attribute.attribute.toLowerCase().includes(searchKeyword.toLowerCase())) ||
      (attribute.expression && attribute.expression.toLowerCase().includes(searchKeyword.toLowerCase()));
    return matchesSearch;
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown]')) {
        setAttributeDropdownOpen(false);
        setDeviceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pagination
  const totalPages = Math.ceil(filteredAttributes.length / pageSize);
  const paginatedAttributes = filteredAttributes.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Handle edit attribute
  const handleEdit = (attribute) => {
    setEditingAttribute({
      ...attribute
    });
    setActiveTab(0);
    setEditDialog(true);
    setAnchorEl(null);
    
    // Initialize input values
    const attributeOption = options.find(option => option.key === attribute.attribute);
    setAttributeInputValue(attributeOption ? attributeOption.name : attribute.attribute || '');
    
    const device = devices.find(d => d.id === deviceId);
    setDeviceInputValue(device ? device.name : '');
  };

  // Handle delete attribute
  const handleDelete = (attribute) => {
    setAttributeToDelete(attribute);
    setDeleteDialog(true);
    setAnchorEl(null);
  };

  // Handle confirm delete
  const confirmDelete = () => {
    if (attributeToDelete) {
      deleteAttributeMutation.mutate(attributeToDelete.id);
    }
  };

  // Handle cancel delete
  const cancelDelete = () => {
    setDeleteDialog(false);
    setAttributeToDelete(null);
  };

  // Mutations
  const createAttributeMutation = useMutation({
    mutationFn: async (attributeData) => {
      const response = await fetchOrThrow('/api/attributes/computed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attributeData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computedAttributes'] });
      setEditDialog(false);
      setEditingAttribute(null);
    },
  });

  const updateAttributeMutation = useMutation({
    mutationFn: async ({ id, attributeData }) => {
      const response = await fetchOrThrow(`/api/attributes/computed/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attributeData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computedAttributes'] });
      setEditDialog(false);
      setEditingAttribute(null);
    },
  });

  const deleteAttributeMutation = useMutation({
    mutationFn: async (attributeId) => {
      await fetchOrThrow(`/api/attributes/computed/${attributeId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computedAttributes'] });
      cancelDelete();
    },
  });

  // Handle save attribute
  const handleSaveAttribute = () => {
    if (editingAttribute.id) {
      updateAttributeMutation.mutate({ id: editingAttribute.id, attributeData: editingAttribute });
    } else {
      createAttributeMutation.mutate(editingAttribute);
    }
  };

  // Test attribute expression
  const testAttribute = useCatch(async () => {
    const query = new URLSearchParams({ deviceId });
    const url = `/api/attributes/computed/test?${query.toString()}`;
    const response = await fetchOrThrow(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingAttribute),
    });
    setTestResult(await response.text());
  });

  // Menu actions
  const actions = [
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      handler: handleEdit,
      show: !limitComputedAttributes && administrator,
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: handleDelete,
      show: !limitComputedAttributes && administrator,
    },
  ];

  const getAttributeTypeIcon = (type) => {
    return <FunctionsIcon />;
  };

  // Options for attribute autocomplete
  const options = Object.entries(positionAttributes).filter(([key, value]) => !value.property || allowedProperties.includes(key)).map(([key, value]) => ({
    key,
    name: value.name,
    type: value.type,
  }));

  const filter = createFilterOptions({
    stringify: (option) => option.name,
  });

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="floating-computed-attributes-popover"
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
                  {t('sharedComputedAttributes')}
                </Typography>
              </div>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingAttribute({
                    description: '',
                    attribute: '',
                    expression: '',
                    type: 'string',
                    priority: 0
                  });
                  setActiveTab(0);
                  setEditDialog(true);
                }}
                disabled={limitComputedAttributes || !administrator}
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

            {/* Search and Filters */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('sharedSearch')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon style={{ color: colors.textSecondary, marginRight: '8px' }} />,
                  style: { color: colors.text }
                }}
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

            {/* Attributes List */}
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
                <Alert severity="error" style={{ margin: '20px' }}>
                  {t('sharedError')}: {error.message}
                </Alert>
              ) : paginatedAttributes.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  color: colors.textSecondary,
                  textAlign: 'center'
                }}>
                  <FunctionsIcon style={{ fontSize: 48, marginBottom: '16px', opacity: 0.5 }} />
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
                          {t('sharedDescription')}
                        </TableCell>
                        {desktop && (
                          <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                            {t('sharedAttribute')}
                          </TableCell>
                        )}
                        {desktop && (
                          <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                            {t('sharedExpression')}
                          </TableCell>
                        )}
                        {desktop && (
                          <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                            {t('sharedType')}
                          </TableCell>
                        )}
                        <TableCell style={{ color: colors.text, fontWeight: '600', width: '60px' }}>
                          {t('sharedActions')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedAttributes.map((attribute, index) => (
                        <TableRow
                          key={attribute.id}
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
                              {getAttributeTypeIcon(attribute.type)}
                              <span style={{ fontWeight: '500' }}>{attribute.description}</span>
                            </div>
                          </TableCell>
                          {desktop && (
                            <TableCell style={{ color: colors.textSecondary }}>
                              {attribute.attribute}
                            </TableCell>
                          )}
                          {desktop && (
                            <TableCell style={{ color: colors.textSecondary }}>
                              <Typography variant="body2" style={{ 
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {attribute.expression}
                              </Typography>
                            </TableCell>
                          )}
                          {desktop && (
                            <TableCell style={{ color: colors.textSecondary }}>
                              <Chip
                                label={attribute.type}
                                size="small"
                                style={{
                                  backgroundColor: colors.primary,
                                  color: colors.text,
                                  fontSize: '10px',
                                  height: '20px',
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell style={{ padding: '4px' }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setSelectedAttribute(attribute);
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
                  onClick={() => action.handler(selectedAttribute)}
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
                    {t('sharedDeleteConfirm')} "{attributeToDelete?.description}"?
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
                      disabled={deleteAttributeMutation.isPending}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: deleteAttributeMutation.isPending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: deleteAttributeMutation.isPending ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!deleteAttributeMutation.isPending) {
                          e.target.style.backgroundColor = '#FEE2E2';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!deleteAttributeMutation.isPending) {
                          e.target.style.backgroundColor = '#FEF2F2';
                        }
                      }}
                    >
                      {deleteAttributeMutation.isPending ? (
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

          {/* Edit Attribute Drawer */}
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
                    setEditingAttribute(null);
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
                    zIndex: 10001,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: desktop ? '-2px 0 8px rgba(0, 0, 0, 0.1)' : 'none',
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
                        setEditingAttribute(null);
                      }}
                      size="small"
                      style={{ color: colors.textSecondary }}
                    >
                      <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0 }}>
                      {editingAttribute?.id ? t('sharedEdit') : t('sharedAdd')} {t('sharedComputedAttribute')}
                    </Typography>
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
                      <Tab label={t('sharedTest')} />
                    </Tabs>

                    {/* Tab Content */}
                    <Box style={{ flex: 1, overflow: 'auto', paddingTop: '16px' }}>
                      {/* Required Tab */}
                      {activeTab === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Description */}
                            <TextField
                              label={t('sharedDescription')}
                              value={editingAttribute?.description || ''}
                              onChange={(e) => setEditingAttribute({
                                ...editingAttribute,
                                description: e.target.value
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

                            {/* Attribute */}
                            <div style={{ position: 'relative' }} data-dropdown>
                              <TextField
                                ref={attributeInputRef}
                                label={t('sharedAttribute')}
                                value={attributeInputValue}
                                onChange={(e) => {
                                  setAttributeInputValue(e.target.value);
                                  setAttributeDropdownOpen(true);
                                }}
                                onFocus={() => {
                                  setAttributeDropdownOpen(true);
                                }}
                                size="small"
                                fullWidth
                                style={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: colors.secondary,
                                    '& fieldset': { borderColor: colors.border },
                                    '&:hover fieldset': { borderColor: colors.primary },
                                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                                  }
                                }}
                              />
                              {attributeDropdownOpen && (
                                <div style={{
                                  position: 'fixed',
                                  zIndex: 10004,
                                  maxHeight: '200px',
                                  overflow: 'auto',
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '4px',
                                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                  backgroundColor: colors.surface,
                                  marginTop: '4px',
                                  width: attributeInputRef.current ? attributeInputRef.current.getBoundingClientRect().width : '100%',
                                  left: attributeInputRef.current ? attributeInputRef.current.getBoundingClientRect().left + window.scrollX : 0,
                                  top: attributeInputRef.current ? attributeInputRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
                                }}>
                                  {options
                                    .filter(option => 
                                      option.name.toLowerCase().includes(attributeInputValue.toLowerCase())
                                    )
                                    .map((option) => (
                                      <div
                                        key={option.key}
                                        onClick={() => {
                                          setEditingAttribute({ 
                                            ...editingAttribute, 
                                            attribute: option.key, 
                                            type: option.type 
                                          });
                                          setAttributeInputValue(option.name);
                                          setAttributeDropdownOpen(false);
                                        }}
                                        style={{
                                          padding: '8px 16px',
                                          cursor: 'pointer',
                                          borderBottom: `1px solid ${colors.border}`,
                                          backgroundColor: 'transparent',
                                          color: colors.text,
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.backgroundColor = colors.hover;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.backgroundColor = 'transparent';
                                        }}
                                      >
                                        {option.name}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>

                            {/* Expression */}
                            <TextField
                              value={editingAttribute?.expression || ''}
                              onChange={(e) => setEditingAttribute({
                                ...editingAttribute,
                                expression: e.target.value
                              })}
                              label={t('sharedExpression')}
                              multiline
                              rows={4}
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
                            <FormControl fullWidth size="small" disabled={editingAttribute?.attribute in positionAttributes}>
                              <InputLabel style={{ color: colors.textSecondary }}>
                                {t('sharedType')}
                              </InputLabel>
                              <Select
                                value={editingAttribute?.type || ''}
                                onChange={(e) => setEditingAttribute({
                                  ...editingAttribute,
                                  type: e.target.value
                                })}
                                label={t('sharedType')}
                                MenuProps={{
                                  style: { zIndex: 10004 },
                                  PaperProps: {
                                    style: { 
                                      zIndex: 10004,
                                      backgroundColor: colors.surface,
                                      border: `1px solid ${colors.border}`,
                                    }
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
                                <MenuItem value="string" style={{ color: colors.text }}>
                                  {t('sharedTypeString')}
                                </MenuItem>
                                <MenuItem value="number" style={{ color: colors.text }}>
                                  {t('sharedTypeNumber')}
                                </MenuItem>
                                <MenuItem value="boolean" style={{ color: colors.text }}>
                                  {t('sharedTypeBoolean')}
                                </MenuItem>
                              </Select>
                            </FormControl>
                        </div>
                      )}

                      {/* Extra Tab */}
                      {activeTab === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Priority */}
                          <TextField
                            type="number"
                            value={editingAttribute?.priority || 0}
                            onChange={(e) => setEditingAttribute({
                              ...editingAttribute,
                              priority: Number(e.target.value)
                            })}
                            label={t('sharedPriority')}
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
                      )}

                      {/* Test Tab */}
                      {activeTab === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Device Selection */}
                            <div style={{ position: 'relative' }} data-dropdown>
                              <TextField
                                ref={deviceInputRef}
                                label={t('sharedDevice')}
                                value={deviceInputValue}
                                onChange={(e) => {
                                  setDeviceInputValue(e.target.value);
                                  setDeviceDropdownOpen(true);
                                }}
                                onFocus={() => {
                                  setDeviceDropdownOpen(true);
                                }}
                                size="small"
                                fullWidth
                                style={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: colors.secondary,
                                    '& fieldset': { borderColor: colors.border },
                                    '&:hover fieldset': { borderColor: colors.primary },
                                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                                  }
                                }}
                              />
                              {deviceDropdownOpen && (
                                <div style={{
                                  position: 'fixed',
                                  zIndex: 10004,
                                  maxHeight: '200px',
                                  overflow: 'auto',
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '4px',
                                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                  backgroundColor: colors.surface,
                                  marginTop: '4px',
                                  width: deviceInputRef.current ? deviceInputRef.current.getBoundingClientRect().width : '100%',
                                  left: deviceInputRef.current ? deviceInputRef.current.getBoundingClientRect().left + window.scrollX : 0,
                                  top: deviceInputRef.current ? deviceInputRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
                                }}>
                                  {devices
                                    .filter(device => 
                                      device.name.toLowerCase().includes(deviceInputValue.toLowerCase())
                                    )
                                    .map((device) => (
                                      <div
                                        key={device.id}
                                        onClick={() => {
                                          setDeviceId(device.id);
                                          setDeviceInputValue(device.name);
                                          setDeviceDropdownOpen(false);
                                        }}
                                        style={{
                                          padding: '8px 16px',
                                          cursor: 'pointer',
                                          borderBottom: `1px solid ${colors.border}`,
                                          backgroundColor: 'transparent',
                                          color: colors.text,
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.backgroundColor = colors.hover;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.backgroundColor = 'transparent';
                                        }}
                                      >
                                        {device.name}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Test Button */}
                            <Button
                              variant="outlined"
                              startIcon={<PlayArrowIcon />}
                              onClick={testAttribute}
                              disabled={!deviceId}
                              style={{
                                borderColor: colors.border,
                                color: colors.text,
                                textTransform: 'none',
                                alignSelf: 'flex-start',
                              }}
                            >
                              {t('sharedTestExpression')}
                            </Button>
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
                        setEditingAttribute(null);
                      }}
                      style={{ color: colors.textSecondary }}
                    >
                      {t('sharedCancel')}
                    </Button>
                    <Button
                      onClick={handleSaveAttribute}
                      variant="contained"
                      disabled={createAttributeMutation.isPending || updateAttributeMutation.isPending || !editingAttribute?.description || !editingAttribute?.expression}
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.text,
                      }}
                    >
                      {(createAttributeMutation.isPending || updateAttributeMutation.isPending) ? (
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

          {/* Test Result Snackbar */}
          <Snackbar
            open={!!testResult}
            onClose={() => setTestResult(null)}
            autoHideDuration={snackBarDurationLongMs}
            message={testResult}
            style={{ zIndex: 10004 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingComputedAttributesPopover;
