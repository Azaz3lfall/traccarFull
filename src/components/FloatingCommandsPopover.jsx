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
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { useCatch } from '../reactHelper';
import { formatBoolean } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useRestriction } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { prefixString } from '../common/util/stringUtils';
import { sessionActions } from '../store';

const FloatingCommandsPopover = ({ 
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
  
  const limitCommands = useRestriction('limitCommands');

  // State management
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [commandToDelete, setCommandToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingCommand, setEditingCommand] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [activeTab, setActiveTab] = useState(0);
  const [commandTypes, setCommandTypes] = useState([]);
  const [validationError, setValidationError] = useState('');


  // Test if we can execute code after state declarations

  // Fetch commands with TanStack Query
  const { data: commands = [], isLoading, error } = useQuery({
    queryKey: ['commands'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/commands');
      return response.json();
    },
    enabled: isVisible, // Only fetch when popover is visible
  });

  // Fetch command types when popover is visible
  useEffectAsync(async () => {
    if (!isVisible) return;
    
    try {
      const response = await fetchOrThrow('/api/commands/types');
      
      const types = await response.json();
      
      // The API returns objects with {type: "value"}, we need to extract the type values
      const validTypes = Array.isArray(types) 
        ? types.map(item => item.type).filter(type => typeof type === 'string' && type.length > 0)
        : [];
      
      setCommandTypes(validTypes);
    } catch (error) {
      console.error('=== FloatingCommandsPopover: Failed to load command types ===', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setCommandTypes([]);
    }
  }, [isVisible]);

  // Filter commands based on search
  const filteredCommands = commands.filter(command => {
    const matchesSearch = !searchKeyword || 
      (command.description && command.description.toLowerCase().includes(searchKeyword.toLowerCase())) ||
      (command.type && command.type.toLowerCase().includes(searchKeyword.toLowerCase()));
    return matchesSearch;
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  // Pagination
  const totalPages = Math.ceil(filteredCommands.length / pageSize);
  const paginatedCommands = filteredCommands.slice(
    (page - 1) * pageSize,
    page * pageSize
  );


  // Handle edit command
  const handleEdit = (command) => {
    setEditingCommand({
      ...command,
      attributes: command.attributes || {}
    });
    setActiveTab(0);
    setEditDialog(true);
    setAnchorEl(null);
    setValidationError(''); // Clear validation error
  };

  // Handle delete command
  const handleDelete = (command) => {
    setCommandToDelete(command);
    setDeleteDialog(true);
    setAnchorEl(null);
  };

  // Mutations
  const createCommandMutation = useMutation({
    mutationFn: async (commandData) => {
      const response = await fetchOrThrow('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commands'] });
      setEditDialog(false);
      setEditingCommand(null);
    },
  });

  const updateCommandMutation = useMutation({
    mutationFn: async ({ id, commandData }) => {
      const response = await fetchOrThrow(`/api/commands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commands'] });
      setEditDialog(false);
      setEditingCommand(null);
    },
  });

  const deleteCommandMutation = useMutation({
    mutationFn: async (commandId) => {
      await fetchOrThrow(`/api/commands/${commandId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commands'] });
      setDeleteDialog(false);
      setCommandToDelete(null);
    },
  });

  // Handle save command
  const handleSaveCommand = () => {
    // Clear previous validation error
    setValidationError('');
    
    // Validate custom command data
    if (editingCommand.type === 'custom' && (!editingCommand.attributes?.data || editingCommand.attributes.data.trim() === '')) {
      setValidationError(t('commandCustomDataRequired'));
      return;
    }

    if (editingCommand.id) {
      updateCommandMutation.mutate({ id: editingCommand.id, commandData: editingCommand });
    } else {
      createCommandMutation.mutate(editingCommand);
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    if (editingCommand.type === 'custom') {
      return editingCommand.attributes?.data && editingCommand.attributes.data.trim() !== '';
    }
    return true;
  };

  // Menu actions
  const actions = [
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      handler: handleEdit,
      show: !limitCommands,
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: handleDelete,
      show: !limitCommands,
    },
  ];

  const getCommandTypeIcon = (type) => {
    // You can add specific icons for different command types
    return <EditIcon />;
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="floating-commands-popover"
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
                  {t('sharedSavedCommands')}
                </Typography>
              </div>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingCommand({
                    description: '',
                    type: '',
                    textChannel: false,
                    attributes: {}
                  });
                  setActiveTab(0);
                  setEditDialog(true);
                  setValidationError(''); // Clear validation error
                }}
                disabled={limitCommands}
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

            {/* Commands List */}
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
              ) : paginatedCommands.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  color: colors.textSecondary,
                  textAlign: 'center'
                }}>
                  <SendIcon style={{ fontSize: 48, marginBottom: '16px', opacity: 0.5 }} />
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
                          {t('sharedType')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                          {t('commandCustom')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600' }}>
                          {t('commandSendSms')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600', width: '60px' }}>
                          {t('sharedActions')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedCommands.map((command, index) => (
                        <TableRow
                          key={command.id}
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
                              {getCommandTypeIcon(command.type)}
                              <span style={{ fontWeight: '500' }}>{command.description}</span>
                            </div>
                          </TableCell>
                          <TableCell style={{ color: colors.textSecondary }}>
                            {command.type ? t(prefixString('command', String(command.type))) : '-'}
                          </TableCell>
                          <TableCell style={{ color: colors.textSecondary }}>
                            {command.type === 'custom' && command.attributes?.data ? (
                              <Tooltip 
                                title={command.attributes.data}
                                placement="top"
                                arrow
                                componentsProps={{
                                  tooltip: {
                                    style: {
                                      backgroundColor: colors.surface,
                                      color: colors.text,
                                      border: `1px solid ${colors.border}`,
                                      fontSize: '12px',
                                      fontFamily: 'monospace',
                                      maxWidth: '400px',
                                      whiteSpace: 'pre-wrap'
                                    }
                                  }
                                }}
                              >
                                <div style={{
                                  maxWidth: '200px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontFamily: 'monospace',
                                  fontSize: '12px',
                                  backgroundColor: colors.secondary,
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: `1px solid ${colors.border}`,
                                  cursor: 'help'
                                }}>
                                  {command.attributes.data}
                                </div>
                              </Tooltip>
                            ) : '-'}
                          </TableCell>
                          <TableCell style={{ color: colors.textSecondary }}>
                            {formatBoolean(command.textChannel, t)}
                          </TableCell>
                          <TableCell style={{ padding: '4px' }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setSelectedCommand(command);
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
                  onClick={() => action.handler(selectedCommand)}
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
              {t('sharedRemove')} {commandToDelete?.description}
            </DialogTitle>
            <DialogContent>
              <Typography style={{ color: colors.textSecondary }}>
                {t('sharedRemoveConfirm')} "{commandToDelete?.description}"?
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
                onClick={() => deleteCommandMutation.mutate(commandToDelete.id)}
                style={{ color: colors.error }}
                disabled={deleteCommandMutation.isPending}
              >
                {deleteCommandMutation.isPending ? (
                  <CircularProgress size={16} />
                ) : (
                  t('sharedRemove')
                )}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Command Drawer */}
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
                    setEditingCommand(null);
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
                        setEditingCommand(null);
                      }}
                      size="small"
                      style={{ color: colors.textSecondary }}
                    >
                      <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0 }}>
                      {editingCommand?.id ? t('sharedEdit') : t('sharedAdd')} {t('sharedCommand')}
                    </Typography>
                  </div>

                  {/* Form */}
                  <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Description */}
                      <TextField
                        label={t('sharedDescription')}
                        value={editingCommand?.description || ''}
                        onChange={(e) => setEditingCommand({
                          ...editingCommand,
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

                      {/* Type */}
                      <FormControl fullWidth size="small">
                        <InputLabel style={{ color: colors.textSecondary }}>
                          {t('sharedType')}
                        </InputLabel>
                        <Select
                          value={editingCommand?.type || ''}
                          onChange={(e) => {
                            setEditingCommand({
                              ...editingCommand,
                              type: e.target.value
                            });
                            setValidationError(''); // Clear validation error when type changes
                          }}
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
                          {commandTypes.length > 0 ? commandTypes.map((type) => {
                            return (
                              <MenuItem key={type} value={type} style={{ color: colors.text }}>
                                {t(prefixString('command', String(type || '')))}
                              </MenuItem>
                            );
                          }) : (
                            <MenuItem disabled style={{ color: colors.textSecondary }}>
                              {t('sharedNoData')}
                            </MenuItem>
                          )}
                        </Select>
                      </FormControl>

                      {/* Custom Command Data Input - Only show when type is 'custom' */}
                      {editingCommand?.type === 'custom' && (
                        <div>
                          <TextField
                            label={t('commandData')}
                            value={editingCommand?.attributes?.data || ''}
                            onChange={(e) => {
                              setEditingCommand({
                                ...editingCommand,
                                attributes: {
                                  ...editingCommand.attributes,
                                  data: e.target.value
                                }
                              });
                              // Clear validation error when user starts typing
                              if (validationError) {
                                setValidationError('');
                              }
                            }}
                            fullWidth
                            variant="outlined"
                            size="small"
                            multiline
                            rows={3}
                            placeholder={t('commandCustomPlaceholder')}
                            error={!!validationError}
                            helperText={validationError}
                            style={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: validationError ? colors.error : colors.border },
                                '&:hover fieldset': { borderColor: validationError ? colors.error : colors.primary },
                                '&.Mui-focused fieldset': { borderColor: validationError ? colors.error : colors.primary },
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Text Channel */}
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={editingCommand?.textChannel || false}
                            onChange={(e) => setEditingCommand({
                              ...editingCommand,
                              textChannel: e.target.checked
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
                        label={t('commandSendSms')}
                        sx={{ color: colors.text }}
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
                        setEditingCommand(null);
                      }}
                      style={{ color: colors.textSecondary }}
                    >
                      {t('sharedCancel')}
                    </Button>
                    <Button
                      onClick={handleSaveCommand}
                      variant="contained"
                      disabled={createCommandMutation.isPending || updateCommandMutation.isPending || !isFormValid()}
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.text,
                      }}
                    >
                      {(createCommandMutation.isPending || updateCommandMutation.isPending) ? (
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

export default FloatingCommandsPopover;
