import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { fetchClients, deleteClient, clientsActions, fetchTraccarUsers } from '../store';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import TableShimmer from '../common/components/TableShimmer';
import useSettingsStyles from './common/useSettingsStyles';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useAdministrator } from '../common/util/permissions';
import ClientDetailsModal from './components/ClientDetailsModal';
import ClientFormModal from '../components/ClientFormModal';

const ClientsPage = () => {
  const admin = useAdministrator();
  const navigate = useNavigate();
  const { classes } = useSettingsStyles();
  const muiTheme = useMuiTheme();
  const colorsRaw = useThemeColors();
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((state) => state.clients);
  const { items: traccarUsers = [] } = useSelector((state) => state.users || {});

  const [openDialog, setOpenDialog] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsClient, setDetailsClient] = useState(null);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!admin) {
      navigate('/settings/preferences', { replace: true });
    }
  }, [admin, navigate]);

  const filteredClients = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    if (!keyword || !keyword.trim()) return list;
    const lower = keyword.trim().toLowerCase();
    return list.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(lower);
      const emailMatch = (c.email || '').toLowerCase().includes(lower);
      const taxMatch = (c.tax_id || '').toLowerCase().includes(lower);
      const phoneMatch = (c.contact_phone || '').toLowerCase().includes(lower);
      const linkedUser = traccarUsers.find((u) => u.id === c.traccar_user_id);
      const linkedName = (linkedUser?.name || linkedUser?.email || '').toLowerCase().includes(lower);
      return nameMatch || emailMatch || taxMatch || phoneMatch || linkedName;
    });
  }, [items, keyword, traccarUsers]);

  const safeColor = (color, fallback) => {
    if (!color) return fallback;
    if (typeof color === 'string') return color;
    if (typeof color === 'object') {
      return color.main || color.primary || color.dark || color.light || fallback;
    }
    return fallback;
  };

  const colors = colorsRaw || {
    primary: '#3B82F6',
    secondary: '#F3F4F6',
    text: '#111827',
    textSecondary: '#9CA3AF',
    border: '#E5E7EB',
    hover: '#F3F4F6',
  };

  useEffect(() => {
    if (!admin) return;
    dispatch(fetchClients());
    dispatch(fetchTraccarUsers());
  }, [dispatch, admin]);

  useEffect(() => {
    if (!openDialog && error) {
      dispatch(clientsActions.clearError());
    }
  }, [openDialog, error, dispatch]);

  const handleOpenDialog = () => {
    setEditingClientId(null);
    setOpenDialog(true);
    dispatch(clientsActions.clearError());
  };

  const handleEditClient = (client) => {
    setEditingClientId(client.id);
    setOpenDialog(true);
    dispatch(clientsActions.clearError());
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingClientId(null);
    dispatch(clientsActions.clearError());
  };

  const handleOpenDeleteConfirmation = (clientId) => {
    setItemToDeleteId(clientId);
    setDeleteConfirmationOpen(true);
  };

  const handleCloseDeleteConfirmation = () => {
    setDeleteConfirmationOpen(false);
    setItemToDeleteId(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDeleteId) return;
    try {
      const result = await dispatch(deleteClient(itemToDeleteId));
      if (deleteClient.fulfilled.match(result)) {
        handleCloseDeleteConfirmation();
      }
    } catch (err) {
      console.error('Erro ao deletar cliente:', err);
    }
  };

  if (!admin) return null;

  const content = (
    <Box sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 3, bgcolor: colors.surface, color: colors.text }}>
          {/* Cabeçalho com botão Novo Cliente */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ color: colors.text }}>
              Gerenciamento de Clientes
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
              sx={{
                bgcolor: muiTheme.palette.primary.main,
                color: muiTheme.palette.primary.contrastText,
                '&:hover': { bgcolor: muiTheme.palette.primary.dark },
              }}
            >
              Novo Cliente
            </Button>
          </Box>

          {/* Mensagem de erro geral */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clientsActions.clearError())}>
              {error}
            </Alert>
          )}

          {/* Busca */}
          <TextField
            fullWidth
            placeholder="Buscar por nome, email, CPF/CNPJ..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            size="small"
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                backgroundColor: colors.secondary,
                '& fieldset': { borderColor: colors.border },
              },
              '& .MuiInputBase-input': { color: colors.text },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Tabela de clientes */}
          <TableContainer>
            <Table className={classes.table}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: colors.text, fontWeight: 600 }}>Nome</TableCell>
                  <TableCell sx={{ color: colors.text, fontWeight: 600 }}>Tipo</TableCell>
                  <TableCell sx={{ color: colors.text, fontWeight: 600 }}>CPF/CNPJ</TableCell>
                  <TableCell sx={{ color: colors.text, fontWeight: 600 }}>Telefone</TableCell>
                  <TableCell sx={{ color: colors.text, fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ color: colors.text, fontWeight: 600 }}>Usuários Vinculados</TableCell>
                  <TableCell sx={{ color: colors.text, fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: colors.text, fontWeight: 600 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {status === 'loading' && items.length === 0 ? (
                  <TableShimmer columns={8} />
                ) : error && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Alert severity="error">{error}</Alert>
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                        {keyword.trim() ? 'Nenhum cliente corresponde à busca' : 'Nenhum cliente encontrado'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => {
                    const linkedUser = traccarUsers.find(u => u.id === client.traccar_user_id);
                    return (
                      <TableRow key={client.id}>
                        <TableCell sx={{ color: colors.text }}>{client.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={client.type}
                            size="small"
                            sx={{
                              bgcolor: colors.secondary,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: colors.text }}>{client.tax_id || '-'}</TableCell>
                        <TableCell sx={{ color: colors.text }}>{client.contact_phone || '-'}</TableCell>
                        <TableCell sx={{ color: colors.text }}>{client.email || '-'}</TableCell>
                        <TableCell sx={{ color: colors.text }}>
                          {client.user_count > 0
                            ? `${client.user_count} usuário${client.user_count !== 1 ? 's' : ''}`
                            : linkedUser
                              ? (linkedUser.name || linkedUser.email || `ID: ${linkedUser.id}`)
                              : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={client.active ? 'Ativo' : 'Inativo'}
                            size="small"
                            color={client.active ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Ver detalhes" arrow>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setDetailsClient(client);
                                setDetailsModalOpen(true);
                              }}
                              sx={{
                                color: '#059669',
                                backgroundColor: 'rgba(5, 150, 105, 0.15)',
                                border: '1.5px solid rgba(5, 150, 105, 0.5)',
                                borderRadius: '6px',
                                padding: '6px',
                                minWidth: '32px',
                                minHeight: '32px',
                                '&:hover': {
                                  backgroundColor: 'rgba(5, 150, 105, 0.25)',
                                  transform: 'scale(1.1)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar cliente" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleEditClient(client)}
                              sx={{
                                color: '#3B82F6', // Azul vibrante que funciona em ambos os temas
                                backgroundColor: 'rgba(59, 130, 246, 0.15)', // Background mais visível
                                border: '1.5px solid rgba(59, 130, 246, 0.5)', // Borda mais espessa e visível
                                borderRadius: '6px',
                                padding: '6px',
                                minWidth: '32px',
                                minHeight: '32px',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.25)',
                                  border: '1.5px solid rgba(59, 130, 246, 0.8)',
                                  color: '#2563EB', // Azul mais escuro no hover
                                  transform: 'scale(1.1)',
                                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir cliente" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDeleteConfirmation(client.id)}
                              color="error"
                              sx={{
                                borderRadius: '6px',
                                padding: '6px',
                                minWidth: '32px',
                                minHeight: '32px',
                                '&:hover': {
                                  transform: 'scale(1.1)',
                                  boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <ClientFormModal
          open={openDialog}
          onClose={handleCloseDialog}
          clientId={editingClientId}
          onSuccess={() => {
            dispatch(fetchClients());
            dispatch(fetchTraccarUsers());
          }}
          compact={false}
        />


        {/* Dialog de confirmação de exclusão */}
        <Dialog
          open={deleteConfirmationOpen}
          onClose={handleCloseDeleteConfirmation}
          sx={{ zIndex: 12000 }}
          PaperProps={{
            sx: {
              backgroundColor: safeColor(colorsRaw?.surface, '#fff'),
              border: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}`,
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              zIndex: 12000,
            },
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            padding: '24px 24px 20px 24px',
            backgroundColor: safeColor(colorsRaw?.surface, '#fff'),
            borderBottom: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}`,
            color: safeColor(colorsRaw?.text, '#000'),
            fontWeight: 600,
          }}>
            Confirmar Exclusão
          </DialogTitle>
          <DialogContent sx={{ 
            padding: '24px',
            backgroundColor: safeColor(colorsRaw?.surface, '#fff'),
          }}>
            <Typography sx={{ color: safeColor(colorsRaw?.text, '#000') }}>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ 
            padding: '16px 24px',
            backgroundColor: safeColor(colorsRaw?.surface, '#fff'),
            borderTop: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}`,
          }}>
            <Button 
              onClick={handleCloseDeleteConfirmation} 
              disabled={status === 'loading'}
              sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF') }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={status === 'loading'}
              startIcon={status === 'loading' ? <CircularProgress size={20} /> : null}
            >
              {status === 'loading' ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Gerenciar Clientes']}>
      {content}
      <ClientDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setDetailsClient(null);
        }}
        client={detailsClient}
      />
    </PageLayout>
  );
};

export default ClientsPage;

// Exportar também o conteúdo para uso em popovers
export const ClientsContent = () => {
  const { classes } = useSettingsStyles();
  const dispatch = useDispatch();
  const muiTheme = useMuiTheme();

  // 1. Pegamos as cores. Seu hook já garante defaults, então não precisamos de muitos fallbacks
  const themeColors = useThemeColors();
  
  // 2. Extraímos para constantes para evitar erros de digitação e garantir strings
  const c = {
    primary: themeColors.primary || '#3B82F6',
    secondary: themeColors.secondary || '#F3F4F6',
    text: themeColors.text || '#111827',
    textSecondary: themeColors.textSecondary || '#9CA3AF',
    border: themeColors.border || '#E5E7EB',
    surface: themeColors.surface || '#FFFFFF',
    hover: themeColors.hover || '#F3F4F6',
  };
  const { items, status, error } = useSelector((state) => state.clients);
  const { items: traccarUsers = [] } = useSelector((state) => state.users || {});

  // Estado local
  const [openDialog, setOpenDialog] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsClient, setDetailsClient] = useState(null);
  const [keyword, setKeyword] = useState('');

  const filteredClients = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    if (!keyword || !keyword.trim()) return list;
    const lower = keyword.trim().toLowerCase();
    return list.filter((client) => {
      const nameMatch = (client.name || '').toLowerCase().includes(lower);
      const emailMatch = (client.email || '').toLowerCase().includes(lower);
      const taxMatch = (client.tax_id || '').toLowerCase().includes(lower);
      const phoneMatch = (client.contact_phone || '').toLowerCase().includes(lower);
      const linkedUser = traccarUsers.find((u) => u.id === client.traccar_user_id);
      const linkedName = (linkedUser?.name || linkedUser?.email || '').toLowerCase().includes(lower);
      return nameMatch || emailMatch || taxMatch || phoneMatch || linkedName;
    });
  }, [items, keyword, traccarUsers]);

  // Buscar clientes e usuários ao montar
  useEffect(() => {
    dispatch(fetchClients());
    dispatch(fetchTraccarUsers());
  }, [dispatch]);

  // Limpar erro ao fechar dialog
  useEffect(() => {
    if (!openDialog && error) {
      dispatch(clientsActions.clearError());
    }
  }, [openDialog, error, dispatch]);

  // Handler para abrir dialog (novo cliente)
  const handleOpenDialog = () => {
    setEditingClientId(null);
    setOpenDialog(true);
    dispatch(clientsActions.clearError());
  };

  // Handler para editar cliente
  const handleEditClient = (client) => {
    setEditingClientId(client.id);
    setOpenDialog(true);
    dispatch(clientsActions.clearError());
  };

  // Handler para fechar dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingClientId(null);
    dispatch(clientsActions.clearError());
  };

  // Handler para abrir diálogo de confirmação de exclusão
  const handleOpenDeleteConfirmation = (clientId) => {
    setItemToDeleteId(clientId);
    setDeleteConfirmationOpen(true);
  };

  // Handler para fechar diálogo de confirmação
  const handleCloseDeleteConfirmation = () => {
    setDeleteConfirmationOpen(false);
    setItemToDeleteId(null);
  };

  // Handler para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!itemToDeleteId) return;
    
    try {
      const result = await dispatch(deleteClient(itemToDeleteId));
      if (deleteClient.fulfilled.match(result)) {
        handleCloseDeleteConfirmation();
        // A lista já é atualizada automaticamente pelo Redux
      }
    } catch (err) {
      console.error('Erro ao deletar cliente:', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, backgroundColor: c.surface }}>
        {/* Cabeçalho */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: c.text }}>
            Gerenciamento de Clientes
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{
              bgcolor: muiTheme.palette.primary.main,
              color: muiTheme.palette.primary.contrastText,
              '&:hover': { bgcolor: muiTheme.palette.primary.dark },
            }}
          >
            Novo Cliente
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clientsActions.clearError())}>
            {error}
          </Alert>
        )}

        {/* Busca */}
        <TextField
          fullWidth
          placeholder="Buscar por nome, email, CPF/CNPJ..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          size="small"
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              backgroundColor: c.secondary,
              '& fieldset': { borderColor: c.border },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {/* Tabela */}
        <TableContainer>
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: c.text, fontWeight: 'bold' }}>Nome</TableCell>
                <TableCell sx={{ color: c.text, fontWeight: 'bold' }}>Tipo</TableCell>
                <TableCell sx={{ color: c.text, fontWeight: 'bold' }}>CPF/CNPJ</TableCell>
                <TableCell sx={{ color: c.text, fontWeight: 'bold' }}>Telefone</TableCell>
                <TableCell sx={{ color: c.text, fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ color: c.text, fontWeight: 'bold' }}>Usuários Vinculados</TableCell>
                <TableCell sx={{ color: c.text, fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: c.text, fontWeight: 'bold' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {status === 'loading' && items.length === 0 ? (
                <TableShimmer columns={8} />
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" sx={{ color: c.textSecondary }}>
                      {keyword.trim() ? 'Nenhum cliente corresponde à busca' : 'Nenhum cliente encontrado'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const linkedUser = traccarUsers.find(u => u.id === client.traccar_user_id);
                  return (
                    <TableRow key={client.id}>
                      <TableCell sx={{ color: c.text }}>{client.name}</TableCell>
                      <TableCell>
                        <Chip label={client.type} size="small" sx={{ backgroundColor: c.secondary, color: c.text }} />
                      </TableCell>
                      <TableCell sx={{ color: c.text }}>{client.tax_id || '-'}</TableCell>
                      <TableCell sx={{ color: c.text }}>{client.contact_phone || '-'}</TableCell>
                      <TableCell sx={{ color: c.text }}>{client.email || '-'}</TableCell>
                      <TableCell sx={{ color: c.text }}>
                         {client.user_count > 0
                           ? `${client.user_count} usuário${client.user_count !== 1 ? 's' : ''}`
                           : linkedUser
                             ? (linkedUser.name || linkedUser.email || `ID: ${linkedUser.id}`)
                             : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={client.active ? 'Ativo' : 'Inativo'} 
                          size="small" 
                          color={client.active ? 'success' : 'default'} 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Ver detalhes">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setDetailsClient(client);
                                setDetailsModalOpen(true);
                              }}
                              sx={{ color: '#059669' }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar cliente">
                            <IconButton
                              size="small"
                              onClick={() => handleEditClient(client)}
                              sx={{ color: muiTheme.palette.primary.main }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir cliente">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDeleteConfirmation(client.id)}
                              color="error"
                              sx={{
                                borderRadius: '6px',
                                padding: '6px',
                                minWidth: '32px',
                                minHeight: '32px',
                                '&:hover': {
                                  transform: 'scale(1.1)',
                                  boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ClientFormModal
        open={openDialog}
        onClose={handleCloseDialog}
        clientId={editingClientId}
        onSuccess={() => {
          dispatch(fetchClients());
          dispatch(fetchTraccarUsers());
        }}
        compact={false}
      />

      {/* Dialog de confirmação de exclusão */}
      <Dialog
        open={deleteConfirmationOpen}
        onClose={handleCloseDeleteConfirmation}
        sx={{ zIndex: 12000 }}
        PaperProps={{
          style: {
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            color: c.text,
            zIndex: 12000,
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${c.border}`, color: c.text, fontWeight: 600 }}>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: c.surface, pt: 3 }}>
          <Typography sx={{ color: c.text }}>
            Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: c.surface, borderTop: `1px solid ${c.border}`, p: 2 }}>
          <Button onClick={handleCloseDeleteConfirmation} sx={{ color: c.textSecondary }}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={status === 'loading'}
            startIcon={status === 'loading' ? <CircularProgress size={20} /> : null}
          >
            {status === 'loading' ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
      <ClientDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setDetailsClient(null);
        }}
        client={detailsClient}
      />
    </Box>
  );
};
