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
  Typography,
  Box,
  Chip,
  Switch,
  FormControlLabel,
  Pagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
} from '@mui/icons-material';
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

  // Fetch commands with TanStack Query
  const { data: commands = [], isLoading, error } = useQuery({
    queryKey: ['commands'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/commands');
      return response.json();
    },
    enabled: isVisible, // Only fetch when popover is visible
  });

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

  // Handle command send
  const handleSend = useCatch(async (command) => {
    // This would need to be implemented based on how commands are sent
    console.log('Send command:', command);
    setAnchorEl(null);
  });

  // Handle edit command
  const handleEdit = (command) => {
    setEditingCommand({
      ...command,
      attributes: command.attributes || {}
    });
    setActiveTab(0);
    setEditDialog(true);
    setAnchorEl(null);
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
    if (editingCommand.id) {
      updateCommandMutation.mutate({ id: editingCommand.id, commandData: editingCommand });
    } else {
      createCommandMutation.mutate(editingCommand);
    }
  };

  // Menu actions
  const actions = [
    {
      key: 'send',
      title: t('commandSend'),
      icon: <SendIcon fontSize="small" />,
      handler: handleSend,
      show: !limitCommands,
    },
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
    return <SendIcon />;
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
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0 }}>
                {t('sharedSavedCommands')}
              </Typography>
              <IconButton
                onClick={onClose}
                size="small"
                style={{ color: colors.textSecondary }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
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
                    setEditingCommand({
                      description: '',
                      type: '',
                      textChannel: false,
                      attributes: {}
                    });
                    setActiveTab(0);
                    setEditDialog(true);
                  }}
                  disabled={limitCommands}
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

            {/* Commands List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <CircularProgress style={{ color: colors.primary }} />
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
                <TableContainer style={{ marginTop: '16px' }}>
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
                          {t('commandSendSms')}
                        </TableCell>
                        {!limitCommands && (
                          <TableCell style={{ color: colors.text, fontWeight: '600', width: '60px' }}>
                            {t('sharedActions')}
                          </TableCell>
                        )}
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
                            {t(prefixString('command', command.type))}
                          </TableCell>
                          <TableCell style={{ color: colors.textSecondary }}>
                            {formatBoolean(command.textChannel, t)}
                          </TableCell>
                          {!limitCommands && (
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
                          )}
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
                  padding: '20px 0',
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
            PaperProps={{
              style: {
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                boxShadow: colors.shadow,
                minWidth: '160px',
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
          <AnimatePresence>
            {deleteDialog && commandToDelete && (
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: '12px',
                    padding: '24px',
                    maxWidth: '400px',
                    width: '90%',
                    boxShadow: colors.shadow,
                  }}
                >
                  <Typography variant="h6" style={{ color: colors.text, marginBottom: '16px' }}>
                    {t('sharedConfirmDelete')}
                  </Typography>
                  <Typography variant="body2" style={{ color: colors.textSecondary, marginBottom: '24px' }}>
                    {t('sharedConfirmDeleteDescription')}: {commandToDelete.description}
                  </Typography>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button
                      onClick={() => setDeleteDialog(false)}
                      style={{ color: colors.textSecondary }}
                    >
                      {t('sharedCancel')}
                    </Button>
                    <Button
                      onClick={() => deleteCommandMutation.mutate(commandToDelete.id)}
                      variant="contained"
                      color="error"
                      disabled={deleteCommandMutation.isPending}
                    >
                      {deleteCommandMutation.isPending ? (
                        <CircularProgress size={16} />
                      ) : (
                        t('sharedDelete')
                      )}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCommandsPopover;
