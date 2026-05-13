import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Autocomplete,
  Tabs,
  Tab,
  Typography,
  MenuItem as MuiMenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Autorenew as SyncIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  SyncAlt as BulkSyncIcon,
  TaskAlt as SettleIcon,
} from '@mui/icons-material';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import useSettingsStyles from './common/useSettingsStyles';
import ManualSettlementDialog from './components/ManualSettlementDialog';
import {
  clearFinancialError,
  deleteFinancialPlan,
  fetchClients,
  fetchAsaasSettings,
  fetchClientBillingHistory,
  fetchClientFinancialProfiles,
  fetchFinancialOverview,
  fetchFinancialPlans,
  importAsaasData,
  saveAsaasSettings,
  setClientAccessOverride,
  settleBillingCycleManually,
  saveClientFinancialProfile,
  saveFinancialPlan,
  syncClientSubscriptionWithOptions,
  bulkSyncAllClients,
  testAsaasConnection,
} from '../store';

const coreUrl = import.meta.env.VITE_CORE_API_URL || '';
const endpoint = (path) => (coreUrl ? `${coreUrl}${path}` : path);

const currency = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const intervalLabel = (value) => ({ ONCE: 'Única vez', MONTHLY: 'Mensal', SEMIANNUAL: 'Semestral', YEARLY: 'Anual' }[value] || value || '-');

const billingStatusLabel = (value) => {
  const key = String(value || '').toLowerCase();
  return { pending: 'Pendente', paid: 'Pago', overdue: 'Vencido', cancelled: 'Cancelado' }[key] || value || '-';
};

const billingStatusColor = (value) => {
  const key = String(value || '').toLowerCase();
  return { paid: 'success', overdue: 'error', pending: 'warning', cancelled: 'default' }[key] || 'default';
};

const defaultPlan = { name: '', description: '', base_price: 0, recurring_interval: 'MONTHLY', active: true, rules: [] };

const defaultRuleDraft = { equipment_signature: '', equipment_count: 1, monthly_price: 0, discount_percent: 0, priority: 100 };

const FinancialPage = () => (
  <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Painel Financeiro']}>
    <FinancialContent />
  </PageLayout>
);

export const FinancialContent = () => {
  const dispatch = useDispatch();
  const { classes } = useSettingsStyles();

  const clients = useSelector((state) => state.clients.items || []);
  const financial = useSelector((state) => state.financial || {});
  const overview = financial.overview || {};
  const metrics = overview.metrics || {};
  const asaasSettings = financial.asaasSettings || {};
  const profiles = financial.profiles || [];
  const plans = financial.plans || [];
  const clientHistory = financial.clientHistory || null;
  const error = financial.error;
  const isLoading = financial.status === 'loading';
  const isActing = financial.actionStatus === 'loading';

  // Asaas config state
  const [apiKey, setApiKey] = useState('');
  const [environment, setEnvironment] = useState('sandbox');

  // UI feedback
  const [keyword, setKeyword] = useState('');
  const [uiWarning, setUiWarning] = useState('');
  const [uiSuccess, setUiSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [overdueMonthFilter, setOverdueMonthFilter] = useState('');

  // Plan dialog
  const [openPlanDialog, setOpenPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(defaultPlan);
  const [ruleDraft, setRuleDraft] = useState(defaultRuleDraft);

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, plan: null });

  // Access override dialog
  const [overrideDialog, setOverrideDialog] = useState({ open: false, client: null, allowAccess: true });
  const [overrideReason, setOverrideReason] = useState('');

  // Manual settlement dialog
  const [settlementDialog, setSettlementDialog] = useState({ open: false, charge: null });

  // Profile / sync dialog (replaces inline assign plan)
  const [profileDialog, setProfileDialog] = useState({
    open: false, client: null, planId: '', duDay: 5, graceDays: 7, billingType: 'BOLETO',
  });

  // Client history dialog
  const [historyDialog, setHistoryDialog] = useState({ open: false, client: null });

  // Bulk sync result dialog
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    dispatch(fetchClients());
    dispatch(fetchFinancialOverview());
    dispatch(fetchFinancialPlans());
    dispatch(fetchClientFinancialProfiles());
    dispatch(fetchAsaasSettings());
  }, [dispatch]);

  useEffect(() => {
    setEnvironment(asaasSettings.asaas_environment || 'sandbox');
  }, [asaasSettings.asaas_environment]);

  // ── Dados do overview ──────────────────────────────────────────────────────

  const currentMonthCharges = useMemo(() => {
    const arr = Array.isArray(overview.current_month_charges) ? overview.current_month_charges : [];
    // de-duplicate por client_id (manter a mais recente)
    const byClient = new Map();
    for (const charge of arr) {
      const key = charge.client_id || charge.client_name;
      if (!key) continue;
      const existing = byClient.get(key);
      if (!existing || new Date(charge.due_date || 0) > new Date(existing.due_date || 0)) {
        byClient.set(key, charge);
      }
    }
    return Array.from(byClient.values()).sort((a, b) => String(a.client_name || '').localeCompare(String(b.client_name || '')));
  }, [overview.current_month_charges]);

  const overdueCharges = useMemo(() => {
    const arr = Array.isArray(overview.overdue_charges) ? overview.overdue_charges : [];
    if (!overdueMonthFilter) return arr;
    return arr.filter((c) => {
      const ref = c.cycle_reference || String(c.due_date || '').slice(0, 7);
      return ref === overdueMonthFilter;
    });
  }, [overview.overdue_charges, overdueMonthFilter]);

  const monthlySeries = Array.isArray(overview.monthly_series) ? overview.monthly_series : [];
  const maxMonthlyValue = Math.max(...monthlySeries.map((item) => Number(item.total || 0)), 1);

  const overdueMonths = useMemo(() => {
    const months = new Set();
    for (const c of (overview.overdue_charges || [])) {
      const ref = c.cycle_reference || String(c.due_date || '').slice(0, 7);
      if (ref) months.add(ref);
    }
    return Array.from(months).sort().reverse();
  }, [overview.overdue_charges]);

  // ── Clientes ───────────────────────────────────────────────────────────────

  const clientRows = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    const merged = clients.map((client) => {
      const profile = profiles.find((item) => item.client_id === client.id);
      return { ...client, profile };
    });
    if (!lower) return merged;
    return merged.filter((row) => (row.name || '').toLowerCase().includes(lower));
  }, [clients, profiles, keyword]);

  // ── Handlers — Asaas config ────────────────────────────────────────────────

  const handleSaveAsaasConfig = async () => {
    if (!apiKey.trim()) return;
    await dispatch(saveAsaasSettings({ apiKey: apiKey.trim(), environment }));
    dispatch(fetchAsaasSettings());
    setApiKey('');
  };

  const handleTestConnection = async () => {
    await dispatch(testAsaasConnection());
    dispatch(fetchAsaasSettings());
  };

  const handleImportAsaasData = async () => {
    setUiWarning(''); setUiSuccess('');
    const result = await dispatch(importAsaasData());
    if (importAsaasData.fulfilled.match(result)) {
      const { imported = {} } = result.payload || {};
      setUiSuccess(`Importação concluída: ${imported.customers || 0} clientes, ${imported.subscriptions || 0} assinaturas, ${imported.payments || 0} cobranças.`);
      dispatch(fetchFinancialOverview());
      dispatch(fetchClientFinancialProfiles());
      dispatch(fetchFinancialPlans());
    } else {
      setUiWarning(result.payload || 'Falha ao importar dados do Asaas.');
    }
  };

  const copyWebhookUrl = () => {
    const url = asaasSettings.webhook_url;
    if (url) navigator.clipboard.writeText(url).catch(() => {});
  };

  // ── Handlers — Planos ──────────────────────────────────────────────────────

  const handleOpenPlanDialog = (plan = null) => {
    setEditingPlan(plan ? { ...plan, rules: Array.isArray(plan.rules) ? plan.rules : [] } : defaultPlan);
    setRuleDraft(defaultRuleDraft);
    setOpenPlanDialog(true);
  };

  const handleSavePlan = async () => {
    await dispatch(saveFinancialPlan(editingPlan));
    setOpenPlanDialog(false);
    dispatch(fetchFinancialPlans());
  };

  const handleDeletePlan = async () => {
    const { plan } = deleteDialog;
    if (!plan?.id) return;
    const result = await dispatch(deleteFinancialPlan(plan.id));
    if (deleteFinancialPlan.fulfilled.match(result)) {
      setUiSuccess(`Plano "${plan.name}" excluído com sucesso.`);
      dispatch(fetchFinancialPlans());
      dispatch(fetchClientFinancialProfiles());
    } else {
      setUiWarning(result.payload || 'Não foi possível excluir o plano.');
    }
    setDeleteDialog({ open: false, plan: null });
  };

  const handleAddRule = () => {
    if (!ruleDraft.equipment_signature.trim()) return;
    setEditingPlan((prev) => ({ ...prev, rules: [...(prev.rules || []), { ...ruleDraft }] }));
    setRuleDraft(defaultRuleDraft);
  };

  // ── Handlers — Perfil / Sync ───────────────────────────────────────────────

  const openProfileDialog = (client) => {
    const profile = client.profile || {};
    setProfileDialog({
      open: true,
      client,
      planId: profile.plan_id || '',
      dueDay: profile.custom_due_day || 5,
      graceDays: profile.grace_days_to_block || 7,
      billingType: 'BOLETO',
    });
  };

  const handleSaveProfile = async () => {
    const { client, planId, dueDay, graceDays } = profileDialog;
    if (!client) return;
    const hasManualOverride = client.profile?.auto_block_enabled === false;
    if (hasManualOverride) {
      setUiWarning(`Atenção: ${client.name} tem liberação manual ativa. O plano foi atualizado mas o status de bloqueio automático permanece desativado.`);
    }
    await dispatch(saveClientFinancialProfile({
      clientId: client.id,
      plan_id: planId || null,
      custom_due_day: Number(dueDay || 5),
      grace_days_to_block: Number(graceDays || 7),
      auto_block_enabled: client.profile?.auto_block_enabled !== false,
    }));
    dispatch(fetchClientFinancialProfiles());
    setProfileDialog((prev) => ({ ...prev, open: false }));
  };

  const handleSyncClient = async () => {
    const { client, billingType } = profileDialog;
    if (!client?.profile?.plan_id && !profileDialog.planId) {
      setUiWarning('Selecione um plano para o cliente antes de sincronizar.');
      return;
    }
    const result = await dispatch(syncClientSubscriptionWithOptions({ clientId: client.id, billingType }));
    if (syncClientSubscriptionWithOptions.fulfilled.match(result)) {
      setUiSuccess(`Assinatura de ${client.name} sincronizada com sucesso.`);
      dispatch(fetchFinancialOverview());
    } else {
      setUiWarning(result.payload || 'Não foi possível sincronizar a assinatura no Asaas.');
    }
    setProfileDialog((prev) => ({ ...prev, open: false }));
  };

  // ── Handlers — Bulk sync ───────────────────────────────────────────────────

  const handleBulkSync = async () => {
    setUiWarning(''); setUiSuccess('');
    const result = await dispatch(bulkSyncAllClients());
    if (bulkSyncAllClients.fulfilled.match(result)) {
      const { synced = 0, skipped = 0, errors = [] } = result.payload || {};
      setBulkResult({ synced, skipped, errors });
      dispatch(fetchFinancialOverview());
    } else {
      setUiWarning(result.payload || 'Falha na sincronização em lote.');
    }
  };

  // ── Handlers — Export CSV ──────────────────────────────────────────────────

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (overdueMonthFilter) params.set('month', overdueMonthFilter);
    window.open(`${endpoint('/api/financial/export/charges.csv')}?${params}`, '_blank');
  };

  const handleExportAllCSV = () => {
    window.open(endpoint('/api/financial/export/charges.csv'), '_blank');
  };

  // ── Handlers — Access override ─────────────────────────────────────────────

  const openOverrideDialog = (client) => {
    const nextAllowAccess = client.profile?.auto_block_enabled !== false;
    setOverrideReason('');
    setOverrideDialog({ open: true, client, allowAccess: nextAllowAccess });
  };

  const confirmOverrideDialog = async () => {
    if (!overrideDialog.client) return;
    if (overrideDialog.allowAccess && !overrideReason.trim()) {
      setUiWarning('Informe o motivo da liberação manual de acesso.');
      return;
    }
    setUiWarning('');
    const result = await dispatch(setClientAccessOverride({
      clientId: overrideDialog.client.id, allowAccess: overrideDialog.allowAccess, reason: overrideReason.trim(),
    }));
    if (setClientAccessOverride.fulfilled.match(result)) {
      setUiSuccess(overrideDialog.allowAccess
        ? `Acesso manual liberado para ${overrideDialog.client.name}.`
        : `Bloqueio automático reativado para ${overrideDialog.client.name}.`);
      dispatch(fetchClients());
      dispatch(fetchClientFinancialProfiles());
      dispatch(fetchFinancialOverview());
    } else {
      setUiWarning(result.payload || 'Não foi possível atualizar o acesso manual do cliente.');
    }
    setOverrideDialog({ open: false, client: null, allowAccess: true });
    setOverrideReason('');
  };

  // ── Handlers — Manual settlement ──────────────────────────────────────────

  const handleSettlementSubmit = async ({ paidAmount, paidAt, note }) => {
    if (!settlementDialog.charge?.id) return { ok: false, message: 'Cobrança inválida.' };
    const result = await dispatch(settleBillingCycleManually({ cycleId: settlementDialog.charge.id, paidAmount, paidAt, note }));
    if (settleBillingCycleManually.fulfilled.match(result)) {
      setUiSuccess('Baixa manual registrada com sucesso.');
      dispatch(fetchFinancialOverview());
      dispatch(fetchClientFinancialProfiles());
      dispatch(fetchClients());
      return { ok: true };
    }
    return { ok: false, message: result.payload || 'Não foi possível registrar a baixa manual.' };
  };

  // ── Handlers — History ─────────────────────────────────────────────────────

  const openHistory = (client) => {
    setHistoryDialog({ open: true, client });
    dispatch(fetchClientBillingHistory({ clientId: client.id, limit: 50, offset: 0 }));
  };

  // ── Render — Dashboard ─────────────────────────────────────────────────────

  const renderDashboardTab = () => (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {[
          { label: 'Recebido no Mês', value: Number(metrics.received_total || 0) },
          { label: 'Faturamento Previsto', value: Number(metrics.forecast_total || 0) },
          { label: 'Inadimplência', value: Number(metrics.overdue_total || 0) },
          { label: 'Taxa de Adimplência', value: Number(metrics.adimplencia_rate || 0), suffix: '%' },
        ].map((card) => (
          <Paper key={card.label} sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">{card.label}</Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              {card.suffix ? `${card.value.toFixed(2)}${card.suffix}` : currency(card.value)}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Faturamento mensal</Typography>
          <Stack spacing={1.5}>
            {monthlySeries.length === 0 && (
              <Typography variant="body2" color="text.secondary">Sem dados de faturamento ainda.</Typography>
            )}
            {monthlySeries.map((item) => (
              <Box key={item.month}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption">{item.month}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Typography variant="caption" color="success.main">↑ {currency(item.received)}</Typography>
                    {Number(item.overdue) > 0 && (
                      <Typography variant="caption" color="error.main">↓ {currency(item.overdue)}</Typography>
                    )}
                  </Stack>
                </Stack>
                <Box sx={{ position: 'relative', height: 10, borderRadius: 10, bgcolor: 'action.hover', overflow: 'hidden' }}>
                  <Box sx={{
                    position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 10,
                    bgcolor: 'primary.main', width: `${(Number(item.total) / maxMonthlyValue) * 100}%`,
                  }} />
                  <Box sx={{
                    position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 10,
                    bgcolor: 'success.main', width: `${(Number(item.received) / maxMonthlyValue) * 100}%`,
                  }} />
                </Box>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Clientes Inadimplentes</Typography>
          <Stack spacing={1.5}>
            {(overview.overdue_clients || []).length === 0 && (
              <Typography variant="body2" color="text.secondary">Nenhum cliente inadimplente.</Typography>
            )}
            {(overview.overdue_clients || []).slice(0, 8).map((item) => (
              <Box key={item.id} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                <Typography variant="body2">{item.name}</Typography>
                <Chip
                  size="small" sx={{ mt: 0.5 }}
                  color={item.billing_blocked ? 'error' : 'warning'}
                  label={item.billing_blocked ? 'Bloqueado' : 'Inadimplente'}
                />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Faturas do mês atual por cliente</Typography>
          <Button size="small" startIcon={<DownloadIcon />} onClick={handleExportAllCSV}>Exportar CSV</Button>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Competência</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentMonthCharges.map((charge) => (
                <TableRow key={charge.id}>
                  <TableCell>{charge.client_name}</TableCell>
                  <TableCell>{charge.cycle_reference}</TableCell>
                  <TableCell>{charge.due_date?.slice?.(0, 10) || '-'}</TableCell>
                  <TableCell>{currency(charge.amount)}</TableCell>
                  <TableCell>
                    <Chip size="small" color={billingStatusColor(charge.status)} label={billingStatusLabel(charge.status)} />
                  </TableCell>
                  <TableCell>
                    {charge.status !== 'paid' ? (
                      <Tooltip title="Dar baixa manual">
                        <IconButton size="small" color="success" onClick={() => setSettlementDialog({ open: true, charge })}>
                          <SettleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {currentMonthCharges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>Nenhuma cobrança do mês atual encontrada.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );

  // ── Render — Vencidas ──────────────────────────────────────────────────────

  const renderOverdueTab = () => (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Typography variant="h6">Faturas vencidas ({(overview.overdue_charges || []).length})</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Competência</InputLabel>
            <Select
              label="Competência"
              value={overdueMonthFilter}
              onChange={(e) => setOverdueMonthFilter(e.target.value)}
            >
              <MuiMenuItem value="">Todos</MuiMenuItem>
              {overdueMonths.map((m) => <MuiMenuItem key={m} value={m}>{m}</MuiMenuItem>)}
            </Select>
          </FormControl>
          <Button size="small" startIcon={<DownloadIcon />} onClick={handleExportCSV}>Exportar CSV</Button>
        </Stack>
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Competência</TableCell>
              <TableCell>Vencimento</TableCell>
              <TableCell>Dias em atraso</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {overdueCharges.map((charge) => {
              const daysLate = charge.due_date
                ? Math.max(0, Math.floor((Date.now() - new Date(String(charge.due_date).slice(0, 10)).getTime()) / 86400000))
                : 0;
              return (
                <TableRow key={charge.id}>
                  <TableCell>{charge.client_name}</TableCell>
                  <TableCell>{charge.cycle_reference}</TableCell>
                  <TableCell>{charge.due_date?.slice?.(0, 10) || '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" color={daysLate > 30 ? 'error' : 'warning'} label={`${daysLate}d`} />
                  </TableCell>
                  <TableCell>{currency(charge.amount)}</TableCell>
                  <TableCell>
                    <Chip size="small" color={billingStatusColor(charge.status)} label={billingStatusLabel(charge.status)} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Dar baixa manual">
                      <IconButton size="small" color="success" onClick={() => setSettlementDialog({ open: true, charge })}>
                        <SettleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {overdueCharges.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>Nenhuma fatura vencida{overdueMonthFilter ? ` em ${overdueMonthFilter}` : ''}.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  // ── Render — Planos ────────────────────────────────────────────────────────

  const renderPlansTab = () => (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Planos</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => handleOpenPlanDialog()}>Novo Plano</Button>
      </Stack>
      <TableContainer>
        <Table className={classes.table} size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Base</TableCell>
              <TableCell>Intervalo</TableCell>
              <TableCell>Regras</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>{plan.name}</TableCell>
                <TableCell>{currency(plan.base_price)}</TableCell>
                <TableCell>{intervalLabel(plan.recurring_interval)}</TableCell>
                <TableCell>{(plan.rules || []).length}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Editar plano">
                      <IconButton size="small" onClick={() => handleOpenPlanDialog(plan)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir plano">
                      <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, plan })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {plans.length === 0 && (
              <TableRow><TableCell colSpan={5}>Nenhum plano cadastrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  // ── Render — Clientes ──────────────────────────────────────────────────────

  const renderClientsTab = () => (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Typography variant="h6">Clientes e Status Financeiro</Typography>
        <Tooltip title={isActing ? 'Sincronizando…' : 'Sincronizar todos os clientes com plano no Asaas'}>
          <span>
            <Button
              startIcon={isActing ? <CircularProgress size={16} /> : <BulkSyncIcon />}
              variant="outlined"
              disabled={isActing}
              onClick={handleBulkSync}
            >
              Sincronizar todos
            </Button>
          </span>
        </Tooltip>
      </Stack>
      <TextField
        fullWidth size="small" placeholder="Buscar cliente…" value={keyword}
        onChange={(e) => setKeyword(e.target.value)} sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Plano</TableCell>
              <TableCell>Vencimento</TableCell>
              <TableCell>Acesso Manual</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clientRows.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.name}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={client.billing_blocked ? 'error' : (client.billing_status === 'inadimplente' ? 'warning' : 'success')}
                    label={client.billing_blocked ? 'Bloqueado' : (client.billing_status === 'inadimplente' ? 'Inadimplente' : 'Ativo')}
                  />
                </TableCell>
                <TableCell>{client.profile?.plan_name || <Typography variant="caption" color="text.secondary">Sem plano</Typography>}</TableCell>
                <TableCell>
                  {client.profile?.custom_due_day ? `Dia ${client.profile.custom_due_day}` : '-'}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      color={client.profile?.auto_block_enabled === false ? 'info' : 'default'}
                      label={client.profile?.auto_block_enabled === false ? 'Manual' : 'Auto'}
                    />
                    <Button size="small" variant="outlined" onClick={() => openOverrideDialog(client)}>
                      {client.profile?.auto_block_enabled === false ? 'Retomar' : 'Liberar'}
                    </Button>
                  </Stack>
                  {client.profile?.last_override_at && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {client.profile?.last_override_mode === 'manual_release' ? 'Liberado' : 'Auto retomado'}
                      {client.profile?.last_override_actor_email ? ` por ${client.profile.last_override_actor_email}` : ''}
                      {client.profile?.last_override_reason ? ` — ${client.profile.last_override_reason}` : ''}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Configurar plano e sincronizar">
                      <IconButton size="small" onClick={() => openProfileDialog(client)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Histórico de cobranças">
                      <IconButton size="small" onClick={() => openHistory(client)}>
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  // ── Render — Configuração ──────────────────────────────────────────────────

  const renderConfigTab = () => (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Configuração Asaas</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.6fr 1fr 1.4fr' }, gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth label="API Key" value={apiKey} type="password"
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={asaasSettings.asaas_api_key_masked || '********'}
          />
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">Ambiente</Typography>
            <ToggleButtonGroup size="small" fullWidth exclusive value={environment}
              onChange={(_, v) => { if (v) setEnvironment(v); }}>
              <ToggleButton value="sandbox">Sandbox</ToggleButton>
              <ToggleButton value="production">Produção</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveAsaasConfig}>Salvar</Button>
            <Button variant="outlined" onClick={handleTestConnection}>Testar</Button>
            <Button variant="outlined" onClick={handleImportAsaasData} disabled={isActing}>
              {isActing ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
              Importar
            </Button>
            <Chip
              label={asaasSettings.asaas_connected ? 'Conectado' : 'Desconectado'}
              color={asaasSettings.asaas_connected ? 'success' : 'default'}
            />
          </Stack>
        </Box>
        {asaasSettings.asaas_last_error && <Alert sx={{ mt: 2 }} severity="warning">{asaasSettings.asaas_last_error}</Alert>}
      </Paper>

      {asaasSettings.webhook_url && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>URL do Webhook</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Configure esta URL no painel do Asaas para receber notificações automáticas de pagamento.
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth size="small" value={asaasSettings.webhook_url} InputProps={{ readOnly: true }}
              sx={{ fontFamily: 'monospace' }}
            />
            <Tooltip title="Copiar URL">
              <IconButton onClick={copyWebhookUrl}><CopyIcon /></IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      )}
    </Stack>
  );

  // ── Render principal ───────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2}>
        {isLoading && <LinearProgress />}
        {error && <Alert severity="error" onClose={() => dispatch(clearFinancialError())}>{error}</Alert>}
        {uiWarning && <Alert severity="warning" onClose={() => setUiWarning('')}>{uiWarning}</Alert>}
        {uiSuccess && <Alert severity="success" onClose={() => setUiSuccess('')}>{uiSuccess}</Alert>}

        <Paper sx={{ p: 1, borderRadius: 2 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 1 }}>
            <Tab label="Dashboard" value="dashboard" />
            <Tab label={`Vencidas ${(overview.overdue_charges || []).length > 0 ? `(${(overview.overdue_charges || []).length})` : ''}`} value="vencidas" />
            <Tab label="Planos" value="planos" />
            <Tab label="Clientes" value="clientes" />
            <Tab label="Configuração" value="configuracao" />
          </Tabs>
        </Paper>

        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'vencidas' && renderOverdueTab()}
        {activeTab === 'planos' && renderPlansTab()}
        {activeTab === 'clientes' && renderClientsTab()}
        {activeTab === 'configuracao' && renderConfigTab()}
      </Stack>

      {/* Dialog — Criar/Editar Plano */}
      <Dialog open={openPlanDialog} onClose={() => setOpenPlanDialog(false)} maxWidth="md" fullWidth
        disablePortal sx={{ zIndex: 10010 }} PaperProps={{ sx: { pointerEvents: 'auto', zIndex: 10011 } }}>
        <DialogTitle>{editingPlan?.id ? 'Editar plano' : 'Novo plano'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nome" value={editingPlan.name} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} />
            <TextField label="Descrição" value={editingPlan.description || ''} onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField type="number" label="Valor base (R$)" fullWidth value={editingPlan.base_price}
                onChange={(e) => setEditingPlan({ ...editingPlan, base_price: Number(e.target.value || 0) })} />
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Intervalo de cobrança</Typography>
                <ToggleButtonGroup size="small" exclusive value={editingPlan.recurring_interval || 'MONTHLY'}
                  onChange={(_, v) => { if (v) setEditingPlan({ ...editingPlan, recurring_interval: v }); }}>
                  <ToggleButton value="ONCE">Única</ToggleButton>
                  <ToggleButton value="MONTHLY">Mensal</ToggleButton>
                  <ToggleButton value="SEMIANNUAL">Semestral</ToggleButton>
                  <ToggleButton value="YEARLY">Anual</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Box>
            <Divider />
            <Typography variant="subtitle1">Regras por equipamento</Typography>
            <Typography variant="caption" color="text.secondary">
              Assinatura: combine tipos separados por + (ex: <code>gsm</code>, <code>gsm+satelital</code>, <code>gsm+tag</code>). Tipos reconhecidos: gsm, satelital, tag.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '2fr 1fr 1fr 1fr 1fr' }, gap: 1 }}>
              <TextField fullWidth label="Assinatura (ex: gsm+tag)" value={ruleDraft.equipment_signature}
                onChange={(e) => setRuleDraft({ ...ruleDraft, equipment_signature: e.target.value })} />
              <TextField type="number" fullWidth label="Qtd mín" value={ruleDraft.equipment_count}
                onChange={(e) => setRuleDraft({ ...ruleDraft, equipment_count: Number(e.target.value || 1) })} />
              <TextField type="number" fullWidth label="Valor (R$)" value={ruleDraft.monthly_price}
                onChange={(e) => setRuleDraft({ ...ruleDraft, monthly_price: Number(e.target.value || 0) })} />
              <TextField type="number" fullWidth label="Desconto %" value={ruleDraft.discount_percent}
                onChange={(e) => setRuleDraft({ ...ruleDraft, discount_percent: Number(e.target.value || 0) })} />
              <Button fullWidth variant="outlined" onClick={handleAddRule} startIcon={<AddIcon />}>Add</Button>
            </Box>
            <Stack spacing={1}>
              {(editingPlan.rules || []).map((rule, index) => (
                <Paper key={`${rule.equipment_signature}-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">
                      <strong>{rule.equipment_signature}</strong> | qtd ≥{rule.equipment_count} | {currency(rule.monthly_price)} | desc {Number(rule.discount_percent || 0).toFixed(1)}%
                    </Typography>
                    <IconButton size="small" color="error" onClick={() => setEditingPlan((prev) => ({ ...prev, rules: prev.rules.filter((_, i) => i !== index) }))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPlanDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSavePlan}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Confirmar exclusão de plano */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, plan: null })} maxWidth="xs" fullWidth disablePortal>
        <DialogTitle>Excluir plano</DialogTitle>
        <DialogContent>
          <Typography>Deseja excluir o plano <strong>"{deleteDialog.plan?.name}"</strong>? Clientes vinculados perderão a associação.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, plan: null })}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeletePlan}>Excluir</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Perfil financeiro + Sincronizar */}
      <Dialog open={profileDialog.open} onClose={() => setProfileDialog((prev) => ({ ...prev, open: false }))} maxWidth="sm" fullWidth disablePortal>
        <DialogTitle>Configurar cliente: {profileDialog.client?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {profileDialog.client?.profile?.auto_block_enabled === false && (
              <Alert severity="info">Este cliente está com bloqueio automático desativado (liberação manual ativa).</Alert>
            )}
            <Autocomplete
              disablePortal size="small"
              options={[{ id: '', name: 'Sem plano' }, ...plans.map((p) => ({ id: p.id, name: p.name }))]}
              value={[{ id: '', name: 'Sem plano' }, ...plans.map((p) => ({ id: p.id, name: p.name }))].find((o) => o.id === profileDialog.planId) || { id: '', name: 'Sem plano' }}
              getOptionLabel={(o) => o?.name || ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(_, o) => setProfileDialog((prev) => ({ ...prev, planId: o?.id || '' }))}
              renderInput={(params) => <TextField {...params} label="Plano" />}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField type="number" label="Dia de vencimento" value={profileDialog.dueDay}
                inputProps={{ min: 1, max: 28 }}
                onChange={(e) => setProfileDialog((prev) => ({ ...prev, dueDay: Number(e.target.value) }))} />
              <TextField type="number" label="Carência para bloqueio (dias)" value={profileDialog.graceDays}
                inputProps={{ min: 0, max: 60 }}
                onChange={(e) => setProfileDialog((prev) => ({ ...prev, graceDays: Number(e.target.value) }))} />
            </Box>
            <Divider />
            <Typography variant="subtitle2">Sincronizar no Asaas</Typography>
            <FormControl size="small" fullWidth>
              <InputLabel>Forma de pagamento</InputLabel>
              <Select label="Forma de pagamento" value={profileDialog.billingType}
                onChange={(e) => setProfileDialog((prev) => ({ ...prev, billingType: e.target.value }))}>
                <MuiMenuItem value="BOLETO">Boleto</MuiMenuItem>
                <MuiMenuItem value="PIX">Pix</MuiMenuItem>
                <MuiMenuItem value="CREDIT_CARD">Cartão de crédito</MuiMenuItem>
                <MuiMenuItem value="UNDEFINED">Indefinido (cliente escolhe)</MuiMenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialog((prev) => ({ ...prev, open: false }))}>Cancelar</Button>
          <Button variant="outlined" onClick={handleSaveProfile}>Salvar perfil</Button>
          <Button variant="contained" startIcon={isActing ? <CircularProgress size={14} /> : <SyncIcon />}
            disabled={isActing || !profileDialog.planId} onClick={handleSyncClient}>
            Salvar e sincronizar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Override de acesso */}
      <Dialog open={overrideDialog.open} onClose={() => setOverrideDialog({ open: false, client: null, allowAccess: true })} fullWidth maxWidth="sm" disablePortal>
        <DialogTitle>{overrideDialog.allowAccess ? 'Liberar acesso manualmente' : 'Retomar bloqueio automático'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">Cliente: <strong>{overrideDialog.client?.name || '-'}</strong></Typography>
            {overrideDialog.allowAccess ? (
              <TextField label="Motivo da liberação *" value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)} required multiline minRows={2}
                placeholder="Ex.: acordo comercial até dia 30" />
            ) : (
              <Alert severity="warning">
                Isso reativa o bloqueio automático. Na próxima execução do scheduler, o cliente poderá ser marcado como inadimplente/bloqueado se houver faturas vencidas.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideDialog({ open: false, client: null, allowAccess: true })}>Cancelar</Button>
          <Button variant="contained" onClick={confirmOverrideDialog}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Histórico de cobranças */}
      <Dialog open={historyDialog.open} onClose={() => setHistoryDialog({ open: false, client: null })} maxWidth="md" fullWidth disablePortal>
        <DialogTitle>Histórico — {historyDialog.client?.name}</DialogTitle>
        <DialogContent>
          {isActing ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Competência</TableCell>
                    <TableCell>Vencimento</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Pagamento</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(clientHistory?.cycles || []).map((cycle) => (
                    <TableRow key={cycle.id}>
                      <TableCell>{cycle.cycle_reference}</TableCell>
                      <TableCell>{cycle.due_date?.slice?.(0, 10) || '-'}</TableCell>
                      <TableCell>{currency(cycle.amount)}</TableCell>
                      <TableCell>
                        <Chip size="small" color={billingStatusColor(cycle.status)} label={billingStatusLabel(cycle.status)} />
                      </TableCell>
                      <TableCell>{cycle.payment_date?.slice?.(0, 10) || '-'}</TableCell>
                      <TableCell>
                        {cycle.status !== 'paid' && (
                          <Tooltip title="Dar baixa manual">
                            <IconButton size="small" color="success" onClick={() => {
                              setHistoryDialog({ open: false, client: null });
                              setSettlementDialog({ open: true, charge: { ...cycle, client_name: historyDialog.client?.name } });
                            }}>
                              <SettleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(clientHistory?.cycles || []).length === 0 && !isActing && (
                    <TableRow><TableCell colSpan={6}>Nenhum ciclo encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {clientHistory?.total > 50 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Exibindo 50 de {clientHistory.total} registros.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog({ open: false, client: null })}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Resultado bulk sync */}
      <Dialog open={Boolean(bulkResult)} onClose={() => setBulkResult(null)} maxWidth="sm" fullWidth disablePortal>
        <DialogTitle>Sincronização em lote concluída</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography>✅ Sincronizados: <strong>{bulkResult?.synced}</strong></Typography>
            <Typography>⏭ Ignorados (sem plano ou valor zero): <strong>{bulkResult?.skipped}</strong></Typography>
            {(bulkResult?.errors || []).length > 0 && (
              <>
                <Typography color="error">❌ Erros: {bulkResult.errors.length}</Typography>
                {bulkResult.errors.slice(0, 5).map((e) => (
                  <Alert key={e.client_id} severity="error" sx={{ py: 0 }}>
                    Cliente {e.client_id}: {e.message}
                  </Alert>
                ))}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkResult(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <ManualSettlementDialog
        open={settlementDialog.open}
        charge={settlementDialog.charge}
        onClose={() => setSettlementDialog({ open: false, charge: null })}
        onSubmit={handleSettlementSubmit}
      />
    </Box>
  );
};

export default FinancialPage;
