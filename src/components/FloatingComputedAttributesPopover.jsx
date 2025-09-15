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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
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
  ExpandMore as ExpandMoreIcon,
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
import { snackBarDurationLongMs } from '../common/util/duration';

const allowedProperties = ['valid', 'latitude', 'longitude', 'altitude', 'speed', 'course', 'address', 'accuracy'];

const FloatingComputedAttributesPopover = ({ 
  desktop, 
  isMenuExpanded, 
  isVisible, 
  onClose 
}) => {
  console.log('=== FloatingComputedAttributesPopover RENDER ===');
  console.log('Props:', { desktop, isMenuExpanded, isVisible, onClose });
  
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

  console.log('FloatingComputedAttributesPopover state:', { editDialog, isVisible });

  // Fetch computed attributes with TanStack Query
  console.log('=== TEST: Before useQuery ===');
  const { data: attributes = [], isLoading, error } = useQuery({
    queryKey: ['computedAttributes'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/attributes/computed');
      return response.json();
    },
    enabled: isVisible, // Only fetch when popover is visible
  });
  console.log('=== TEST: After useQuery ===');

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

  // Pagination
  const totalPages = Math.ceil(filteredAttributes.length / pageSize);
  const paginatedAttributes = filteredAttributes.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Handle edit attribute
  const handleEdit = (attribute) => {
    setEditingAttribute({
      ...attribute,
      attributes: attribute.attributes || {}
    });
    setActiveTab(0);
    setEditDialog(true);
    setAnchorEl(null);
  };

  // Handle delete attribute
  const handleDelete = (attribute) => {
    setAttributeToDelete(attribute);
    setDeleteDialog(true);
    setAnchorEl(null);
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
      setDeleteDialog(false);
      setAttributeToDelete(null);
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
                  {t('sharedComputedAttributes')}
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
                        <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                          {t('sharedAttribute')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                          {t('sharedExpression')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                          {t('sharedType')}
                        </TableCell>
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
                          <TableCell style={{ color: colors.textSecondary }}>
                            {attribute.attribute}
                          </TableCell>
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
              {t('sharedRemove')} {attributeToDelete?.description}
            </DialogTitle>
            <DialogContent>
              <Typography style={{ color: colors.textSecondary }}>
                {t('sharedRemoveConfirm')} "{attributeToDelete?.description}"?
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
                onClick={() => deleteAttributeMutation.mutate(attributeToDelete.id)}
                style={{ color: colors.error }}
                disabled={deleteAttributeMutation.isPending}
              >
                {deleteAttributeMutation.isPending ? (
                  <CircularProgress size={16} />
                ) : (
                  t('sharedRemove')
                )}
              </Button>
            </DialogActions>
          </Dialog>

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
                    width: '500px',
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
                  <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Required Fields */}
                      <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="subtitle1" style={{ color: colors.text }}>
                            {t('sharedRequired')}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
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
                            <Autocomplete
                              freeSolo
                              value={options.find((option) => option.key === editingAttribute?.attribute) || editingAttribute?.attribute || null}
                              onChange={(_, option) => {
                                const attribute = option ? option.key || option.inputValue || option : null;
                                if (option && (option.type || option.inputValue)) {
                                  setEditingAttribute({ ...editingAttribute, attribute, type: option.type });
                                } else {
                                  setEditingAttribute({ ...editingAttribute, attribute });
                                }
                              }}
                              filterOptions={(options, params) => {
                                const filtered = filter(options, params);
                                if (params.inputValue && !options.some((x) => (typeof x === 'object' ? x.key : x) === params.inputValue)) {
                                  filtered.push({ inputValue: params.inputValue, name: `${t('sharedAdd')} "${params.inputValue}"` });
                                }
                                return filtered;
                              }}
                              options={options}
                              getOptionLabel={(option) => typeof option === 'object' ? option.inputValue || option.name : option }
                              renderOption={(props, option) => <li {...props}>{option.name || option}</li>}
                              ListboxProps={{
                                style: { 
                                  zIndex: 10004,
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${colors.border}`,
                                }
                              }}
                              renderInput={(params) => (
                                <TextField 
                                  {...params} 
                                  label={t('sharedAttribute')}
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
                              )}
                            />

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
                        </AccordionDetails>
                      </Accordion>

                      {/* Extra Fields */}
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="subtitle1" style={{ color: colors.text }}>
                            {t('sharedExtra')}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
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
                        </AccordionDetails>
                      </Accordion>

                      {/* Test Section */}
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="subtitle1" style={{ color: colors.text }}>
                            {t('sharedTest')}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Device Selection */}
                            <SelectField
                              value={deviceId}
                              onChange={(e) => setDeviceId(Number(e.target.value))}
                              endpoint="/api/devices"
                              label={t('sharedDevice')}
                              zIndex={10004}
                              style={{
                                '& .MuiOutlinedInput-root': {
                                  backgroundColor: colors.secondary,
                                  '& fieldset': { borderColor: colors.border },
                                  '&:hover fieldset': { borderColor: colors.primary },
                                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                                }
                              }}
                            />
                            
                            {/* Test Button */}
                            <Button
                              variant="outlined"
                              startIcon={<PlayArrowIcon />}
                              onClick={testAttribute}
                              disabled={!deviceId}
                              style={{
                                borderColor: colors.primary,
                                color: colors.primary,
                                textTransform: 'none',
                                alignSelf: 'flex-start',
                                '&:hover': {
                                  borderColor: colors.primary,
                                  backgroundColor: `${colors.primary}10`,
                                },
                                '&:disabled': {
                                  borderColor: colors.border,
                                  color: colors.textSecondary,
                                }
                              }}
                            >
                              {t('sharedTestExpression')}
                            </Button>
                          </div>
                        </AccordionDetails>
                      </Accordion>
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
