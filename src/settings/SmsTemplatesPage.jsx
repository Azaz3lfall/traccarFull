import { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Send as SendIcon, Add as AddIcon, Settings as SettingsIcon, VpnKey as VpnKeyIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import TableShimmer from '../common/components/TableShimmer';
import { useAdministrator } from '../common/util/permissions';
import CollectionFab from './components/CollectionFab';
import useSettingsStyles from './common/useSettingsStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';

const TELECOM_BASE = '/gestao/telecom';

// Componente reutilizável para popover e página (exportado)
export const SmsTemplatesContent = () => {
  const { classes } = useSettingsStyles();
  const [activeTab, setActiveTab] = useState(0);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ titulo: '', mensagem: '' });
  const [error, setError] = useState(null);

  // Batch templates (configurações em lote) state
  const [batchTemplates, setBatchTemplates] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchEditingId, setBatchEditingId] = useState(null);
  const [batchFormData, setBatchFormData] = useState({ nome: '', template_ids: [], delay_entre_sms: 0 });

  // SMS Avulso state
  const [smsAvulsoNumero, setSmsAvulsoNumero] = useState('');
  const [smsAvulsoMensagem, setSmsAvulsoMensagem] = useState('');
  const [smsAvulsoSelectedTemplateId, setSmsAvulsoSelectedTemplateId] = useState('');
  const [smsAvulsoSending, setSmsAvulsoSending] = useState(false);
  const [smsAvulsoError, setSmsAvulsoError] = useState(null);
  const [smsAvulsoSuccess, setSmsAvulsoSuccess] = useState(false);

  // Histórico state
  const [history, setHistory] = useState({ data: [], total: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [historySearch, setHistorySearch] = useState('');

  // Gateway config state (admin only)
  const admin = useAdministrator();
  const [gatewayConfig, setGatewayConfig] = useState(null);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [gatewaySaving, setGatewaySaving] = useState(false);
  const [gatewayError, setGatewayError] = useState(null);
  const [gatewaySuccess, setGatewaySuccess] = useState(false);
  const [gatewayForm, setGatewayForm] = useState({
    comteleApiKey: '',
    voxterEmail: '',
    voxterPassword: '',
    voxterAccessToken: '',
    voxterBaseUrl: '',
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/templates`, { credentials: 'include' });
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Erro ao carregar templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const fetchBatchTemplates = useCallback(async () => {
    setBatchLoading(true);
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/batch-templates`, { credentials: 'include' });
      const data = await res.json();
      setBatchTemplates(Array.isArray(data) ? data : []);
    } catch {
      setBatchTemplates([]);
    } finally {
      setBatchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 0) fetchBatchTemplates();
  }, [activeTab, fetchBatchTemplates]);

  useEffect(() => {
    if (smsAvulsoSelectedTemplateId) {
      const t = templates.find((x) => String(x.id) === String(smsAvulsoSelectedTemplateId));
      if (t) setSmsAvulsoMensagem(t.mensagem || '');
    }
  }, [smsAvulsoSelectedTemplateId, templates]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ titulo: '', mensagem: '' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (tpl) => {
    setEditingId(tpl.id);
    setFormData({ titulo: tpl.titulo || '', mensagem: tpl.mensagem || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.titulo?.trim()) {
      setError('O nome do template é obrigatório.');
      return;
    }
    if (!formData.mensagem?.trim()) {
      setError('A mensagem é obrigatória.');
      return;
    }
    setError(null);
    try {
      if (editingId) {
        await fetchOrThrow(`${TELECOM_BASE}/templates/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchOrThrow(`${TELECOM_BASE}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
      }
      setDialogOpen(false);
      fetchTemplates();
    } catch (e) {
      const err = await e.response?.json?.().catch(() => ({}));
      setError(err?.error || e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este template?')) return;
    try {
      await fetchOrThrow(`${TELECOM_BASE}/templates/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchTemplates();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleOpenBatchAdd = () => {
    setBatchEditingId(null);
    setBatchFormData({ nome: '', template_ids: [], delay_entre_sms: 0 });
    setBatchDialogOpen(true);
  };

  const handleOpenBatchEdit = (bt) => {
    setBatchEditingId(bt.id);
    setBatchFormData({
      nome: bt.nome || '',
      template_ids: Array.isArray(bt.template_ids) ? [...bt.template_ids] : [],
      delay_entre_sms: bt.delay_entre_sms || 0,
    });
    setBatchDialogOpen(true);
  };

  const handleBatchSave = async () => {
    if (!batchFormData.nome?.trim()) {
      setError('O nome da configuração é obrigatório.');
      return;
    }
    if (batchFormData.template_ids.length === 0) {
      setError('Selecione pelo menos um template.');
      return;
    }
    setError(null);
    try {
      if (batchEditingId) {
        await fetchOrThrow(`${TELECOM_BASE}/batch-templates/${batchEditingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(batchFormData),
        });
      } else {
        await fetchOrThrow(`${TELECOM_BASE}/batch-templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(batchFormData),
        });
      }
      setBatchDialogOpen(false);
      fetchBatchTemplates();
    } catch (e) {
      setError(e.message);
      try {
        const err = await e.response?.json?.().catch(() => ({}));
        if (err?.error) setError(err.error);
      } catch { /* ignore */ }
    }
  };

  const handleBatchDelete = async (id) => {
    if (!window.confirm('Remover esta configuração em lote?')) return;
    try {
      await fetchOrThrow(`${TELECOM_BASE}/batch-templates/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchBatchTemplates();
    } catch (e) {
      setError(e.message);
    }
  };

  const addTemplateToBatch = (tpl) => {
    if (!batchFormData.template_ids.includes(tpl.id)) {
      setBatchFormData({ ...batchFormData, template_ids: [...batchFormData.template_ids, tpl.id] });
    }
  };

  const removeTemplateFromBatch = (idx) => {
    const ids = [...batchFormData.template_ids];
    ids.splice(idx, 1);
    setBatchFormData({ ...batchFormData, template_ids: ids });
  };

  const moveTemplateInBatch = (idx, dir) => {
    const ids = [...batchFormData.template_ids];
    const newIdx = dir === 1 ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= ids.length) return;
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    setBatchFormData({ ...batchFormData, template_ids: ids });
  };

  const preview = (msg) => (msg && msg.length > 80 ? `${msg.substring(0, 80)}...` : msg || '-');

  const handleSmsAvulsoSend = async () => {
    const num = smsAvulsoNumero?.trim().replace(/\D/g, '') || '';
    if (num.length < 10) {
      setSmsAvulsoError('Informe um número de chip válido (mínimo 10 dígitos).');
      return;
    }
    if (!smsAvulsoMensagem?.trim()) {
      setSmsAvulsoError('Digite o corpo da mensagem.');
      return;
    }
    setSmsAvulsoError(null);
    setSmsAvulsoSuccess(false);
    setSmsAvulsoSending(true);
    try {
      await fetchOrThrow(`${TELECOM_BASE}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ numero: num, mensagem: smsAvulsoMensagem.trim() }),
      });
      setSmsAvulsoMensagem('');
      setSmsAvulsoSelectedTemplateId('');
      setSmsAvulsoSuccess(true);
    } catch (e) {
      let errMsg = e.message || 'Erro ao enviar SMS.';
      try {
        const parsed = typeof errMsg === 'string' ? JSON.parse(errMsg) : errMsg;
        if (parsed?.error) errMsg = parsed.error;
        if (parsed?.hint) errMsg += ` ${parsed.hint}`;
      } catch { /* resposta não é JSON */ }
      setSmsAvulsoError(errMsg);
    } finally {
      setSmsAvulsoSending(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const parts = historyMonth.split('/');
      const m = parts[0] ? parseInt(parts[0], 10) : new Date().getMonth() + 1;
      const y = parts[1] ? parseInt(parts[1], 10) : new Date().getFullYear();
      const params = new URLSearchParams({ month: m, year: y, search: historySearch, page: 1, limit: 50 });
      const res = await fetchOrThrow(`${TELECOM_BASE}/sms/history?${params}`, { credentials: 'include' });
      const data = await res.json();
      setHistory({ data: data.data || [], total: data.total || 0 });
    } catch {
      setHistory({ data: [], total: 0 });
    } finally {
      setHistoryLoading(false);
    }
  }, [historyMonth, historySearch]);

  useEffect(() => {
    if (activeTab === 2) fetchHistory();
  }, [activeTab, fetchHistory]);

  const fetchGatewayConfig = useCallback(async () => {
    if (!admin) return;
    setGatewayLoading(true);
    setGatewayError(null);
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/sms/gateway-config`, { credentials: 'include' });
      const data = await res.json();
      setGatewayConfig(data);
    } catch (e) {
      let msg = e.message || 'Erro ao carregar configuração';
      try {
        const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
        if (parsed?.error) msg = parsed.error;
      } catch { /* ignore */ }
      setGatewayError(msg);
      setGatewayConfig(null);
    } finally {
      setGatewayLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    if (admin && activeTab === 3) fetchGatewayConfig();
  }, [admin, activeTab, fetchGatewayConfig]);

  const saveGatewayConfig = async () => {
    setGatewaySaving(true);
    setGatewayError(null);
    setGatewaySuccess(false);
    try {
      await fetchOrThrow(`${TELECOM_BASE}/sms/gateway-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          comteleApiKey: gatewayForm.comteleApiKey || undefined,
          voxterEmail: gatewayForm.voxterEmail || undefined,
          voxterPassword: gatewayForm.voxterPassword || undefined,
          voxterAccessToken: gatewayForm.voxterAccessToken || undefined,
          voxterBaseUrl: gatewayForm.voxterBaseUrl || undefined,
        }),
      });
      setGatewaySuccess(true);
      setGatewayForm({ comteleApiKey: '', voxterEmail: '', voxterPassword: '', voxterAccessToken: '', voxterBaseUrl: '' });
      fetchGatewayConfig();
    } catch (e) {
      let msg = e.message || 'Erro ao salvar';
      try {
        const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
        if (parsed?.error) msg = parsed.error;
      } catch { /* ignore */ }
      setGatewayError(msg);
    } finally {
      setGatewaySaving(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleString('pt-BR');
  };

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Painel SMS</Typography>
          </Box>

          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tab label="Templates" />
            <Tab label="SMS Avulsos" />
            <Tab label="Histórico" />
            {admin && <Tab label="Credenciais dos Gateways" />}
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Aba Templates */}
          {activeTab === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="text" onClick={fetchTemplates} startIcon={<RefreshIcon />}>
                  Atualizar
                </Button>
              </Box>
              <TableContainer>
                <Table className={classes.table}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Mensagem</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableShimmer columns={3} />
                    ) : templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">Nenhum template cadastrado</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map((tpl) => (
                        <TableRow key={tpl.id}>
                          <TableCell>{tpl.titulo}</TableCell>
                          <TableCell>{preview(tpl.mensagem)}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => handleOpenEdit(tpl)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remover">
                              <IconButton size="small" color="error" onClick={() => handleDelete(tpl.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 4, mb: 2 }}>
                Configurações em lote
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button variant="outlined" startIcon={<SettingsIcon />} onClick={handleOpenBatchAdd}>
                  Nova configuração em lote
                </Button>
              </Box>
              <TableContainer>
                <Table className={classes.table} size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Templates (ordem)</TableCell>
                      <TableCell>Delay (s)</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batchLoading ? (
                      <TableShimmer columns={4} />
                    ) : batchTemplates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                          <Typography color="text.secondary">Nenhuma configuração em lote</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      batchTemplates.map((bt) => {
                        const seq = (bt.template_ids || []).map((tid) => templates.find((t) => t.id === tid)?.titulo || `#${tid}`).join(' → ');
                        return (
                          <TableRow key={bt.id}>
                            <TableCell>{bt.nome}</TableCell>
                            <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{seq || '-'}</TableCell>
                            <TableCell>{bt.delay_entre_sms || 0}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => handleOpenBatchEdit(bt)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remover">
                                <IconButton size="small" color="error" onClick={() => handleBatchDelete(bt.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Aba SMS Avulsos */}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 500 }}>
              {smsAvulsoSuccess && (
                <Alert severity="success" onClose={() => setSmsAvulsoSuccess(false)}>
                  SMS enviado com sucesso.
                </Alert>
              )}
              {smsAvulsoError && (
                <Alert severity="error" onClose={() => setSmsAvulsoError(null)}>
                  {smsAvulsoError}
                </Alert>
              )}
              <TextField
                label="Número do chip"
                placeholder="Ex: 5511999999999"
                value={smsAvulsoNumero}
                onChange={(e) => setSmsAvulsoNumero(e.target.value)}
                fullWidth
                inputProps={{ maxLength: 20 }}
              />
              <FormControl fullWidth size="small">
                <InputLabel>Usar template</InputLabel>
                <Select
                  value={smsAvulsoSelectedTemplateId || ''}
                  label="Usar template"
                  onChange={(e) => setSmsAvulsoSelectedTemplateId(e.target.value || '')}
                  displayEmpty
                  MenuProps={{
                    style: { zIndex: 100001 },
                    PaperProps: { sx: { zIndex: 100001 } },
                  }}
                >
                  <MenuItem value="">
                    <em>Nenhum</em>
                  </MenuItem>
                  {templates.map((t) => (
                    <MenuItem key={t.id} value={String(t.id)}>
                      {t.titulo || `Template ${t.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Corpo da mensagem"
                placeholder="Digite a mensagem ou selecione um template acima..."
                value={smsAvulsoMensagem}
                onChange={(e) => setSmsAvulsoMensagem(e.target.value)}
                fullWidth
                multiline
                rows={4}
              />
              <Button
                variant="contained"
                onClick={handleSmsAvulsoSend}
                disabled={smsAvulsoSending}
                startIcon={smsAvulsoSending ? null : <SendIcon />}
                sx={{ alignSelf: 'flex-start' }}
              >
                {smsAvulsoSending ? 'Enviando...' : 'Enviar'}
              </Button>
            </Box>
          )}

          {/* Aba Credenciais dos Gateways (admin) */}
          {admin && activeTab === 3 && (
            <Box sx={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Configure aqui as credenciais dos gateways de SMS. As credenciais definidas aqui têm prioridade sobre o .env do servidor.
                Deixe em branco para manter o valor atual. Útil quando a API falha e você precisa atualizar a chave sem reiniciar o backend.
              </Typography>
              {gatewayError && (
                <Alert severity="error" onClose={() => setGatewayError(null)}>{gatewayError}</Alert>
              )}
              {gatewaySuccess && (
                <Alert severity="success" onClose={() => setGatewaySuccess(false)}>Credenciais salvas com sucesso.</Alert>
              )}
              {gatewayLoading ? (
                <TableShimmer columns={1} />
              ) : (
                <>
                  <Typography variant="subtitle2" fontWeight="bold">Comtele</Typography>
                  <TextField
                    label="API Key"
                    type="password"
                    placeholder={gatewayConfig?.comtele?.configured ? '••••••••' : 'Cole a chave da Comtele'}
                    value={gatewayForm.comteleApiKey}
                    onChange={(e) => setGatewayForm((f) => ({ ...f, comteleApiKey: e.target.value }))}
                    fullWidth
                    size="small"
                    helperText={gatewayConfig?.comtele?.configured ? 'Configurado (mascarado). Preencha para alterar.' : 'Obrigatório para chips Vivo, Algar, etc.'}
                  />
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2 }}>Voxter (Lara M2M)</Typography>
                  <TextField
                    label="Email"
                    type="email"
                    placeholder={gatewayConfig?.voxter?.configured ? '••••••••' : 'email@exemplo.com'}
                    value={gatewayForm.voxterEmail}
                    onChange={(e) => setGatewayForm((f) => ({ ...f, voxterEmail: e.target.value }))}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Senha"
                    type="password"
                    placeholder={gatewayConfig?.voxter?.configured ? '••••••••' : 'Sua senha Voxter'}
                    value={gatewayForm.voxterPassword}
                    onChange={(e) => setGatewayForm((f) => ({ ...f, voxterPassword: e.target.value }))}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Access Token"
                    type="password"
                    placeholder={gatewayConfig?.voxter?.configured ? '••••••••' : 'Token do painel Lara'}
                    value={gatewayForm.voxterAccessToken}
                    onChange={(e) => setGatewayForm((f) => ({ ...f, voxterAccessToken: e.target.value }))}
                    fullWidth
                    size="small"
                    helperText="Obrigatório para chips Emnify e Claro"
                  />
                  <TextField
                    label="URL base (opcional)"
                    placeholder="https://lara.voxter.com.br:8080/api"
                    value={gatewayForm.voxterBaseUrl}
                    onChange={(e) => setGatewayForm((f) => ({ ...f, voxterBaseUrl: e.target.value }))}
                    fullWidth
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={saveGatewayConfig}
                    disabled={gatewaySaving}
                    startIcon={gatewaySaving ? null : <VpnKeyIcon />}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {gatewaySaving ? 'Salvando...' : 'Salvar credenciais'}
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Aba Histórico */}
          {activeTab === 2 && (
            <>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                <TextField
                  size="small"
                  label="Mês"
                  type="month"
                  value={(() => {
                    const p = historyMonth.split('/');
                    if (p.length === 2) return `${p[1]}-${p[0].padStart(2, '0')}`;
                    return '';
                  })()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) {
                      const [y, m] = v.split('-');
                      setHistoryMonth(`${parseInt(m, 10)}/${y}`);
                    }
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 160 }}
                />
                <TextField
                  size="small"
                  label="Buscar"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 200 }}
                />
                <Button variant="text" size="small" onClick={fetchHistory} startIcon={<RefreshIcon />}>
                  Atualizar
                </Button>
              </Box>
              <TableContainer>
                <Table className={classes.table} size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Enviado às</TableCell>
                      <TableCell>Número</TableCell>
                      <TableCell>Mensagem</TableCell>
                      <TableCell>Enviado por</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyLoading ? (
                      <TableShimmer columns={6} />
                    ) : history.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">Nenhum SMS encontrado</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.data.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>{formatDate(row.data_envio)}</TableCell>
                          <TableCell>{row.numero_destino}</TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.mensagem_corpo}</TableCell>
                          <TableCell>{row.gateway || '—'}</TableCell>
                          <TableCell>{row.status_entrega}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      </Box>

      {activeTab === 0 && <CollectionFab onClick={handleOpenAdd} />}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ root: { sx: { zIndex: 99999 } } }}
      >
        <DialogTitle>{editingId ? 'Editar Template' : 'Criar template de SMS'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nome do template"
              placeholder="Nome do template"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Template de mensagem"
              placeholder="Digite uma Mensagem..."
              value={formData.mensagem}
              onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
              required
              fullWidth
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
          <Button variant="contained" onClick={handleSave}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ root: { sx: { zIndex: 99999 } } }}
      >
        <DialogTitle>{batchEditingId ? 'Editar configuração em lote' : 'Nova configuração em lote'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nome da configuração"
              placeholder="Ex: Nova configuração"
              value={batchFormData.nome}
              onChange={(e) => setBatchFormData({ ...batchFormData, nome: e.target.value })}
              fullWidth
            />
            <TextField
              label="Delay entre SMS (segundos)"
              type="number"
              inputProps={{ min: 0, max: 60 }}
              value={batchFormData.delay_entre_sms}
              onChange={(e) => setBatchFormData({ ...batchFormData, delay_entre_sms: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              fullWidth
              helperText="Tempo de espera entre cada SMS (0 = sem delay)"
            />
            <Typography variant="subtitle2" color="text.secondary">
              Sequência de templates (ordem de envio)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {templates.filter((t) => !batchFormData.template_ids.includes(t.id)).map((t) => (
                <Button key={t.id} size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => addTemplateToBatch(t)}>
                  {t.titulo}
                </Button>
              ))}
              {templates.filter((t) => !batchFormData.template_ids.includes(t.id)).length === 0 && (
                <Typography variant="body2" color="text.secondary">Todos os templates já foram adicionados</Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
              {batchFormData.template_ids.map((tid, idx) => {
                const t = templates.find((x) => x.id === tid);
                return (
                  <Box key={`${tid}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                    <Typography variant="body2" sx={{ minWidth: 24 }}>{idx + 1}.</Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>{t?.titulo || `#${tid}`}</Typography>
                    <IconButton size="small" onClick={() => moveTemplateInBatch(idx, -1)} disabled={idx === 0}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => moveTemplateInBatch(idx, 1)} disabled={idx === batchFormData.template_ids.length - 1}>
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => removeTemplateFromBatch(idx)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
              {batchFormData.template_ids.length === 0 && (
                <Typography variant="body2" color="text.secondary">Clique nos templates acima para adicionar à sequência</Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)}>Fechar</Button>
          <Button variant="contained" onClick={handleBatchSave} disabled={batchFormData.template_ids.length === 0}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const SmsTemplatesPage = () => {
  const admin = useAdministrator();
  const navigate = useNavigate();
  useEffect(() => {
    if (!admin) {
      navigate('/settings/preferences', { replace: true });
    }
  }, [admin, navigate]);
  if (!admin) return null;
  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Painel SMS']}>
      <SmsTemplatesContent />
    </PageLayout>
  );
};

export default SmsTemplatesPage;
