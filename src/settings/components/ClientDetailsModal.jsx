import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Chip,
  Switch,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  DirectionsCar as DirectionsCarIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  AccountBalance as AccountBalanceIcon,
  TaskAlt as SettleIcon,
} from '@mui/icons-material';
import { useThemeColors } from '../../common/components/ThemeProvider';
import { fetchClients, updateClient, clientsActions, fetchClientFinancialSummary, settleBillingCycleManually } from '../../store';
import { fetchTraccarUsers } from '../../store';
import { fetchVehicles } from '../../store';
import { useDispatch, useSelector } from 'react-redux';
import UserVehiclesAssociationModal from './UserVehiclesAssociationModal';
import UserManagementPopover from '../../components/UserManagementPopover';
import ManualSettlementDialog from './ManualSettlementDialog';

const getCoreApiUrl = () => (import.meta.env.VITE_CORE_API_URL || '');

const cycleStatusLabel = (value) => {
  const map = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Vencido',
    cancelled: 'Cancelado',
  };
  const key = String(value || '').toLowerCase();
  return map[key] || value || '-';
};

const asaasStatusLabel = (status) => {
  const map = {
    PENDING: 'Pendente',
    OVERDUE: 'Em atraso',
    RECEIVED: 'Recebida',
    CONFIRMED: 'Confirmada',
  };
  return map[String(status || '').toUpperCase()] || (status || '-');
};

const planIntervalLabel = (value) => {
  const map = {
    WEEKLY: 'Semanal',
    MONTHLY: 'Mensal',
    YEARLY: 'Anual',
  };
  return map[value] || value || '-';
};

const ClientDetailsModal = ({ open, onClose, client }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const colorsRaw = useThemeColors();
  const CORE_API_URL = getCoreApiUrl();

  const safeColor = (c, fallback) => {
    if (!c) return fallback;
    if (typeof c === 'string') return c;
    return c.main || c.primary || fallback;
  };

  const id = client?.id;
  const { items: clients } = useSelector((state) => state.clients);
  const { items: traccarUsers = [] } = useSelector((state) => state.users || {});
  const { vehicles } = useSelector((state) => state.fleet || {});
  const { status, error } = useSelector((state) => state.clients);

  const [activeTab, setActiveTab] = useState(0);
  const [clientUsers, setClientUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    type: 'PJ',
    tax_id: '',
    contact_phone: '',
    email: '',
    address: '',
    cep: '',
  });
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [addUserMode, setAddUserMode] = useState('existing');
  const [addUserTraccarId, setAddUserTraccarId] = useState(null);
  const [addUserErrors, setAddUserErrors] = useState({});
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [showUserCreatePopover, setShowUserCreatePopover] = useState(false);
  const [associationModalOpen, setAssociationModalOpen] = useState(false);
  const [associationUser, setAssociationUser] = useState(null);
  const [availableUsersForLinking, setAvailableUsersForLinking] = useState([]);
  const [allTraccarUsers, setAllTraccarUsers] = useState([]);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState(null);
  const [financeUiSuccess, setFinanceUiSuccess] = useState('');
  const [billingBlockedDraft, setBillingBlockedDraft] = useState(false);
  const [billingSaveStatus, setBillingSaveStatus] = useState('idle');
  const [settlementDialog, setSettlementDialog] = useState({ open: false, charge: null });

  const baseUrl = CORE_API_URL || '';

  const fetchClientUsers = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${baseUrl}/api/clients/${id}/users`);
      if (res.ok) {
        const data = await res.json();
        setClientUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Erro ao buscar usuários do cliente:', e);
    }
  };

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        type: client.type || 'PJ',
        tax_id: client.tax_id || '',
        contact_phone: client.contact_phone || '',
        email: client.email || '',
        address: client.address || '',
        cep: client.cep || '',
      });
    }
  }, [client]);

  useEffect(() => {
    if (open) {
      dispatch(fetchClients());
      dispatch(fetchTraccarUsers());
      dispatch(fetchVehicles());
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (open && id) {
      setLoading(true);
      fetchClientUsers().finally(() => setLoading(false));
      const fetchAllTraccarUsers = async () => {
        try {
          const res = await fetch(`${baseUrl}/api/clients/${id}/traccar-users`);
          if (res.ok) {
            const data = await res.json();
            setAllTraccarUsers(Array.isArray(data) ? data : []);
          }
        } catch (e) {
          console.error('Erro ao buscar usuários Traccar:', e);
        }
      };
      fetchAllTraccarUsers();
    }
  }, [open, id, baseUrl]);

  const fetchAvailableUsersForLinking = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${baseUrl}/api/clients/${id}/available-users`);
      if (res.ok) {
        const data = await res.json();
        setAvailableUsersForLinking(Array.isArray(data) ? data : []);
      } else {
        setAvailableUsersForLinking([]);
      }
    } catch (e) {
      console.error('Erro ao buscar usuários disponíveis:', e);
      setAvailableUsersForLinking([]);
    }
  };

  useEffect(() => {
    if (!open) {
      setActiveTab(0);
      setFinanceSummary(null);
      setFinanceError(null);
      setFinanceUiSuccess('');
    }
  }, [open]);

  useEffect(() => {
    if (client) {
      setBillingBlockedDraft(Boolean(client.billing_blocked));
    }
  }, [client?.id, client?.billing_blocked]);

  useEffect(() => {
    if (!open || !id || activeTab !== 3) return;
    let cancelled = false;
    const load = async () => {
      setFinanceLoading(true);
      setFinanceError(null);
      const result = await dispatch(fetchClientFinancialSummary(id));
      if (cancelled) return;
      setFinanceLoading(false);
      if (fetchClientFinancialSummary.fulfilled.match(result)) {
        setFinanceSummary(result.payload);
        if (result.payload?.billing) {
          setBillingBlockedDraft(Boolean(result.payload.billing.billing_blocked));
        }
      } else {
        setFinanceError(result.payload || 'Erro ao carregar resumo financeiro.');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, id, activeTab, dispatch]);

  const handleSaveClient = async () => {
    if (!client || !formData.name?.trim()) return;
    const result = await dispatch(
      updateClient({
        id: client.id,
        clientData: {
          ...client,
          ...formData,
        },
      })
    );
    if (updateClient.fulfilled.match(result)) {
      dispatch(fetchClients());
    }
  };

  useEffect(() => {
    if (addUserModalOpen && id) {
      fetchAvailableUsersForLinking();
    }
  }, [addUserModalOpen, id]);

  const resetSettlementDialog = () => setSettlementDialog({ open: false, charge: null });

  const handleSettlementSubmit = async ({ paidAmount, paidAt, note }) => {
    if (!settlementDialog.charge?.id) {
      return { ok: false, message: 'Cobrança inválida.' };
    }
    const result = await dispatch(
      settleBillingCycleManually({
        cycleId: settlementDialog.charge.id,
        paidAmount,
        paidAt,
        note,
      })
    );
    if (settleBillingCycleManually.fulfilled.match(result)) {
      setFinanceUiSuccess('Baixa manual registrada com sucesso.');
      dispatch(fetchClients());
      const sum = await dispatch(fetchClientFinancialSummary(id));
      if (fetchClientFinancialSummary.fulfilled.match(sum)) {
        setFinanceSummary(sum.payload);
      }
      return { ok: true };
    }
    return { ok: false, message: result.payload || 'Não foi possível registrar a baixa manual.' };
  };

  const handleSaveFinanceAccess = async () => {
    if (!client || !id) return;
    const row = clients.find((c) => c.id === id) || client;
    setBillingSaveStatus('loading');
    setFinanceUiSuccess('');
    dispatch(clientsActions.clearError());
    try {
      const result = await dispatch(
        updateClient({
          id: client.id,
          clientData: {
            ...row,
            ...formData,
            billing_blocked: billingBlockedDraft,
          },
        })
      );
      if (updateClient.fulfilled.match(result)) {
        dispatch(fetchClients());
        const sum = await dispatch(fetchClientFinancialSummary(id));
        if (fetchClientFinancialSummary.fulfilled.match(sum)) {
          setFinanceSummary(sum.payload);
        }
        setFinanceUiSuccess('Acesso atualizado.');
      }
    } finally {
      setBillingSaveStatus('idle');
    }
  };

  const validateAddUser = () => {
    const err = {};
    if (addUserMode === 'existing' && !addUserTraccarId) {
      err.traccar_user_id = 'Selecione um usuário';
    }
    setAddUserErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleAddUser = async () => {
    if (!validateAddUser() || !id || !addUserTraccarId) return;
    setAddUserLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/clients/${id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traccar_user_id: addUserTraccarId }),
      });

      if (res.ok) {
        await fetchClientUsers();
        handleCloseAddUserModal();
      } else {
        const errData = await res.json().catch(() => ({}));
        setAddUserErrors({ submit: errData.message || 'Erro ao adicionar usuário' });
      }
    } catch (e) {
      setAddUserErrors({ submit: e?.message || 'Erro ao adicionar usuário' });
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleUserCreated = async (user) => {
    if (!id || !user?.id) return;
    setAddUserLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/clients/${id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traccar_user_id: user.id }),
      });
      if (res.ok) {
        await fetchClientUsers();
        dispatch(fetchTraccarUsers());
        setShowUserCreatePopover(false);
        setAddUserModalOpen(false);
        setAddUserTraccarId(null);
        setAddUserMode('existing');
        setAddUserErrors({});
      } else {
        const errData = await res.json().catch(() => ({}));
        setAddUserErrors({ submit: errData.message || 'Erro ao vincular usuário' });
      }
    } catch (e) {
      setAddUserErrors({ submit: e?.message || 'Erro ao vincular usuário' });
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleCloseAddUserModal = () => {
    setAddUserModalOpen(false);
    setAddUserTraccarId(null);
    setAddUserMode('existing');
    setAddUserErrors({});
    setShowUserCreatePopover(false);
  };

  const handleRemoveUser = async (traccarUserId) => {
    if (!confirm('Remover este usuário do cliente?')) return;
    try {
      const res = await fetch(`${baseUrl}/api/clients/${id}/users/${traccarUserId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchClientUsers();
      }
    } catch (e) {
      alert('Erro ao remover usuário');
    }
  };

  const handleOpenAssociation = (user) => {
    setAssociationUser(user);
    setAssociationModalOpen(true);
  };

  const handleCloseAssociation = () => {
    setAssociationUser(null);
    setAssociationModalOpen(false);
    fetchClientUsers();
  };

  const clientVehicles = Array.isArray(vehicles)
    ? vehicles.filter((v) => v.client_id === id)
    : [];

  const getUserDisplay = (traccarUserId) => {
    const users = allTraccarUsers.length > 0 ? allTraccarUsers : traccarUsers;
    const u = users.find((x) => x.id === traccarUserId);
    return u ? (u.name || u.email || `ID: ${u.id}`) : `ID: ${traccarUserId}`;
  };

  const alreadyLinkedIds = new Set(clientUsers.map((cu) => cu.traccar_user_id));
  const fallbackFromSession = traccarUsers.filter((u) => !alreadyLinkedIds.has(u.id));
  const availableUsersToShow =
    availableUsersForLinking.length > 0 ? availableUsersForLinking : fallbackFromSession;

  const isAddUserValid = addUserMode === 'existing' ? !!addUserTraccarId : false;

  if (!open) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        disableEnforceFocus={showUserCreatePopover}
        slotProps={{ root: { sx: { zIndex: 99999 } } }}
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            backgroundColor: safeColor(colorsRaw?.surface, '#fff'),
            border: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}`,
            borderRadius: '16px',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}`, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onClose}
            sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF') }}
          >
            Voltar
          </Button>
          <Typography variant="h6" sx={{ color: safeColor(colorsRaw?.text, '#111827') }}>
            DETALHES DO CLIENTE - {client?.name?.slice(0, 3)?.toUpperCase() || '...'}
          </Typography>
        </Box>

        <DialogContent sx={{ p: 2, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Paper
              sx={{
                flex: '1 1 200px',
                minWidth: 200,
                p: 2,
                backgroundColor: safeColor(colorsRaw?.surface, '#fff'),
                border: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}`,
              }}
            >
              <List dense disablePadding>
                <ListItemButton
                  selected={activeTab === 0}
                  onClick={() => setActiveTab(0)}
                  sx={{
                    borderRadius: 1,
                    '&.Mui-selected': { backgroundColor: `${safeColor(colorsRaw?.primary, '#3B82F6')}20` },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Dados Cadastrais" />
                </ListItemButton>
                <ListItemButton
                  selected={activeTab === 1}
                  onClick={() => setActiveTab(1)}
                  sx={{
                    borderRadius: 1,
                    '&.Mui-selected': { backgroundColor: `${safeColor(colorsRaw?.primary, '#3B82F6')}20` },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <DirectionsCarIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Veículos" />
                </ListItemButton>
                <ListItemButton
                  selected={activeTab === 2}
                  onClick={() => setActiveTab(2)}
                  sx={{
                    borderRadius: 1,
                    '&.Mui-selected': { backgroundColor: `${safeColor(colorsRaw?.primary, '#3B82F6')}20` },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PeopleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Usuários" />
                </ListItemButton>
                <ListItemButton
                  selected={activeTab === 3}
                  onClick={() => setActiveTab(3)}
                  sx={{
                    borderRadius: 1,
                    '&.Mui-selected': { backgroundColor: `${safeColor(colorsRaw?.primary, '#3B82F6')}20` },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <AccountBalanceIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Financeiro" />
                </ListItemButton>
              </List>
              <Button
                fullWidth
                startIcon={<ArrowBackIcon />}
                onClick={onClose}
                sx={{ mt: 2, color: safeColor(colorsRaw?.textSecondary, '#9CA3AF') }}
              >
                Voltar
              </Button>
            </Paper>

            <Box sx={{ flex: '2 1 400px', minWidth: 0 }}>
              {activeTab === 0 && (
                <Paper sx={{ p: 3, backgroundColor: safeColor(colorsRaw?.surface, '#fff'), border: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}` }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, color: safeColor(colorsRaw?.text, '#111827') }}>
                    Dados Cadastrais
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Nome"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Tipo"
                      value={formData.type}
                      onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                      fullWidth
                      select
                      SelectProps={{ native: true }}
                    >
                      <option value="PF">Pessoa Física (PF)</option>
                      <option value="PJ">Pessoa Jurídica (PJ)</option>
                    </TextField>
                    <TextField label="CPF/CNPJ" value={formData.tax_id} onChange={(e) => setFormData((p) => ({ ...p, tax_id: e.target.value }))} fullWidth />
                    <TextField label="Telefone" value={formData.contact_phone} onChange={(e) => setFormData((p) => ({ ...p, contact_phone: e.target.value }))} fullWidth />
                    <TextField label="Email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} fullWidth type="email" />
                    <TextField label="Endereço" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} fullWidth multiline rows={2} />
                    <TextField label="CEP" value={formData.cep} onChange={(e) => setFormData((p) => ({ ...p, cep: e.target.value }))} fullWidth />
                  </Box>
                  {error && (
                    <Alert severity="error" sx={{ mt: 2 }} onClose={() => dispatch(clientsActions.clearError())}>
                      {error}
                    </Alert>
                  )}
                  <Button
                    variant="contained"
                    onClick={handleSaveClient}
                    disabled={status === 'loading'}
                    startIcon={status === 'loading' ? <CircularProgress size={20} /> : null}
                    sx={{ mt: 2, backgroundColor: safeColor(colorsRaw?.primary, '#3B82F6') }}
                  >
                    {status === 'loading' ? 'Salvando...' : 'Salvar'}
                  </Button>
                </Paper>
              )}

              {activeTab === 1 && (
                <Paper sx={{ p: 3, backgroundColor: safeColor(colorsRaw?.surface, '#fff'), border: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}` }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, color: safeColor(colorsRaw?.text, '#111827') }}>
                    Veículos ({clientVehicles.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        onClose();
                        navigate('/settings/vehicles', { state: { clientId: id } });
                      }}
                      sx={{ borderColor: safeColor(colorsRaw?.primary, '#3B82F6'), color: safeColor(colorsRaw?.primary, '#3B82F6') }}
                    >
                      Cadastrar Veículo
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Placa</TableCell>
                          <TableCell>Nome</TableCell>
                          <TableCell>Marca/Modelo</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {clientVehicles.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell>{v.plate || '-'}</TableCell>
                            <TableCell>{v.nickname || v.plate || '-'}</TableCell>
                            <TableCell>{[v.make, v.model].filter(Boolean).join(' ') || '-'}</TableCell>
                          </TableRow>
                        ))}
                        {clientVehicles.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              Nenhum veículo cadastrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {activeTab === 2 && (
                <Paper sx={{ p: 3, backgroundColor: safeColor(colorsRaw?.surface, '#fff'), border: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: safeColor(colorsRaw?.text, '#111827') }}>
                      Usuários vinculados
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setAddUserModalOpen(true)}
                      sx={{ borderColor: safeColor(colorsRaw?.primary, '#3B82F6'), color: safeColor(colorsRaw?.primary, '#3B82F6') }}
                    >
                      Adicionar
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Usuário</TableCell>
                          <TableCell>Login</TableCell>
                          <TableCell align="right">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {clientUsers.map((cu) => {
                          const u = traccarUsers.find((x) => x.id === cu.traccar_user_id);
                          return (
                            <TableRow key={cu.traccar_user_id}>
                              <TableCell>{u?.name || u?.email || `ID: ${cu.traccar_user_id}`}</TableCell>
                              <TableCell>{u?.email || '-'}</TableCell>
                              <TableCell align="right">
                                <Tooltip title="Associar veículos">
                                  <IconButton size="small" onClick={() => handleOpenAssociation({ ...cu, name: getUserDisplay(cu.traccar_user_id) })}>
                                    <SettingsIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remover">
                                  <IconButton size="small" color="error" onClick={() => handleRemoveUser(cu.traccar_user_id)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {clientUsers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              Nenhum usuário vinculado. Clique em Adicionar para vincular.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {activeTab === 3 && (
                <Paper sx={{ p: 3, backgroundColor: safeColor(colorsRaw?.surface, '#fff'), border: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}` }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, color: safeColor(colorsRaw?.text, '#111827') }}>
                    Financeiro
                  </Typography>
                  {financeUiSuccess ? (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setFinanceUiSuccess('')}>
                      {financeUiSuccess}
                    </Alert>
                  ) : null}
                  {error && activeTab === 3 ? (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clientsActions.clearError())}>
                      {error}
                    </Alert>
                  ) : null}
                  {financeError ? (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFinanceError(null)}>
                      {financeError}
                    </Alert>
                  ) : null}
                  {financeLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'flex-start' }}>
                        <Box sx={{ flex: '1 1 280px', minWidth: 0 }}>
                          <Typography variant="body2" sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF'), mb: 0.5 }}>
                            Plano
                          </Typography>
                          <Typography variant="body1" sx={{ color: safeColor(colorsRaw?.text, '#111827') }}>
                            {financeSummary?.profile?.plan_name || 'Sem plano'}
                          </Typography>
                          {financeSummary?.profile?.plan_id ? (
                            <Typography variant="caption" sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF'), display: 'block', mt: 0.5 }}>
                              Base: R$ {Number(financeSummary.profile.base_price || 0).toFixed(2)} · {planIntervalLabel(financeSummary.profile.recurring_interval)}
                            </Typography>
                          ) : null}
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                          <Chip
                            size="small"
                            color={financeSummary?.billing?.billing_status === 'inadimplente' ? 'warning' : 'success'}
                            label={financeSummary?.billing?.billing_status === 'inadimplente' ? 'Inadimplente' : 'Ativo'}
                          />
                          {financeSummary?.billing?.billing_blocked ? (
                            <Chip size="small" color="error" label="Bloqueio administrativo" />
                          ) : null}
                        </Box>
                      </Box>

                      <Typography variant="body2" sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF'), mb: 1.5 }}>
                        Mesmo com o bloqueio desligado, clientes marcados como inadimplentes continuam sem acesso à frota até regularizarem as cobranças.
                      </Typography>

                      <FormControlLabel
                        sx={{ mb: 2, alignItems: 'flex-start' }}
                        control={(
                          <Switch
                            checked={billingBlockedDraft}
                            onChange={(e) => setBillingBlockedDraft(e.target.checked)}
                            color="primary"
                          />
                        )}
                        label={(
                          <Box>
                            <Typography variant="body2" sx={{ color: safeColor(colorsRaw?.text, '#111827') }}>
                              Bloquear acesso aos veículos (administrativo)
                            </Typography>
                            <Typography variant="caption" sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF') }}>
                              Independente de plano financeiro. Útil para suspender o cliente manualmente.
                            </Typography>
                          </Box>
                        )}
                      />

                      <Button
                        variant="contained"
                        onClick={handleSaveFinanceAccess}
                        disabled={billingSaveStatus === 'loading' || status === 'loading'}
                        startIcon={billingSaveStatus === 'loading' ? <CircularProgress size={20} /> : null}
                        sx={{ mb: 3, backgroundColor: safeColor(colorsRaw?.primary, '#3B82F6') }}
                      >
                        {billingSaveStatus === 'loading' ? 'Salvando...' : 'Salvar bloqueio de acesso'}
                      </Button>

                      <Typography variant="subtitle2" sx={{ mb: 1, color: safeColor(colorsRaw?.text, '#111827') }}>
                        Cobranças em aberto (internas)
                      </Typography>
                      <TableContainer sx={{ mb: 3 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Competência</TableCell>
                              <TableCell>Vencimento</TableCell>
                              <TableCell>Valor</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell align="right">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(financeSummary?.openCycles || []).map((row) => (
                              <TableRow key={row.id}>
                                <TableCell>{row.cycle_reference || '-'}</TableCell>
                                <TableCell>{row.due_date ? String(row.due_date).slice(0, 10) : '-'}</TableCell>
                                <TableCell>R$ {Number(row.amount || 0).toFixed(2)}</TableCell>
                                <TableCell>{cycleStatusLabel(row.status)}</TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Dar baixa manual">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => setSettlementDialog({
                                        open: true,
                                        charge: { ...row, client_name: client?.name },
                                      })}
                                    >
                                      <SettleIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                            {(!financeSummary?.openCycles || financeSummary.openCycles.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  Nenhuma cobrança interna em aberto.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Typography variant="subtitle2" sx={{ mb: 1, color: safeColor(colorsRaw?.text, '#111827') }}>
                        Faturas em aberto (Asaas)
                      </Typography>
                      {!financeSummary?.asaasCustomerMapped ? (
                        <Typography variant="body2" sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF'), mb: 2 }}>
                          Cliente sem vínculo com cliente Asaas ou integração indisponível.
                        </Typography>
                      ) : (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Descrição</TableCell>
                                <TableCell>Vencimento</TableCell>
                                <TableCell>Valor</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(financeSummary?.asaasOpenInvoices || []).map((inv) => (
                                <TableRow key={inv.id}>
                                  <TableCell>{inv.description || inv.id || '-'}</TableCell>
                                  <TableCell>{inv.dueDate ? String(inv.dueDate).slice(0, 10) : '-'}</TableCell>
                                  <TableCell>R$ {Number(inv.value || 0).toFixed(2)}</TableCell>
                                  <TableCell>{asaasStatusLabel(inv.status)}</TableCell>
                                </TableRow>
                              ))}
                              {(!financeSummary?.asaasOpenInvoices || financeSummary.asaasOpenInvoices.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={4} align="center">
                                    Nenhuma fatura pendente no Asaas.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </>
                  )}
                </Paper>
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <ManualSettlementDialog
        open={settlementDialog.open}
        charge={settlementDialog.charge}
        clientNameFallback={client?.name || ''}
        onClose={resetSettlementDialog}
        onSubmit={handleSettlementSubmit}
      />

      <Dialog
        open={addUserModalOpen}
        onClose={handleCloseAddUserModal}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus={showUserCreatePopover}
        slotProps={{ root: { sx: { zIndex: 100000 } } }}
      >
        <DialogTitle>Adicionar usuário</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" fullWidth sx={{ mt: 1 }}>
            <FormLabel component="legend" sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF'), mb: 1 }}>
              Usuário de Login (Traccar)
            </FormLabel>
            <RadioGroup
              row
              value={addUserMode}
              onChange={(e) => setAddUserMode(e.target.value)}
              sx={{ color: safeColor(colorsRaw?.text, '#111827') }}
            >
              <FormControlLabel value="existing" control={<Radio />} label="Vincular usuário existente" />
              <FormControlLabel value="create" control={<Radio />} label="Criar novo usuário Traccar" />
            </RadioGroup>
            {addUserMode === 'existing' ? (
              <Autocomplete
                options={availableUsersToShow}
                getOptionLabel={(o) => o.name || o.email || `ID: ${o.id}`}
                value={availableUsersToShow.find((u) => u.id === addUserTraccarId) || null}
                onChange={(_, v) => setAddUserTraccarId(v?.id ?? null)}
                slotProps={{ popper: { style: { zIndex: 100001 } } }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Selecione um usuário"
                    error={!!addUserErrors.traccar_user_id}
                    helperText={addUserErrors.traccar_user_id}
                  />
                )}
              />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Typography variant="body2" sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF') }}>
                  Use o formulário completo de criação de usuário (mesmo do cadastro de cliente).
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setShowUserCreatePopover(true)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Abrir formulário de criar usuário
                </Button>
              </Box>
            )}
          </FormControl>
          {addUserErrors.submit && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setAddUserErrors((p) => ({ ...p, submit: null }))}>
              {addUserErrors.submit}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddUserModal}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAddUser}
            disabled={!isAddUserValid || addUserLoading}
            startIcon={addUserLoading ? <CircularProgress size={20} /> : null}
          >
            {addUserLoading ? 'Vinculando...' : 'Vincular'}
          </Button>
        </DialogActions>
      </Dialog>

      {showUserCreatePopover &&
        createPortal(
          <UserManagementPopover
            desktop={true}
            isMenuExpanded={false}
            isVisible={true}
            onClose={() => setShowUserCreatePopover(false)}
            mode="createOnly"
            onUserCreated={handleUserCreated}
            closeOnCreate={true}
          />,
          document.body
        )}

      <UserVehiclesAssociationModal
        open={associationModalOpen}
        onClose={handleCloseAssociation}
        clientId={id}
        clientName={client?.name}
        user={associationUser}
      />
    </>
  );
};

export default ClientDetailsModal;
