import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import fetchOrThrow from '../../common/util/fetchOrThrow';

const TELECOM_BASE = '/gestao/telecom';

const SmsSendModal = ({ open, onClose, deviceId, phone: initialPhone }) => {
  const [numero, setNumero] = useState(initialPhone || '');
  const [operadora, setOperadora] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState({ data: [], total: 0 });
  const [historyMonth, setHistoryMonth] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [historySearch, setHistorySearch] = useState('');
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ titulo: '', mensagem: '' });
  const [batchConfigOpen, setBatchConfigOpen] = useState(false);
  const [batchTemplates, setBatchTemplates] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchSending, setBatchSending] = useState(false);

  const fetchPhone = useCallback(async () => {
    if (!deviceId || numero) return;
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/chips/by-device/${deviceId}`, { credentials: 'include' });
      const chip = await res.json();
      if (chip?.numero) setNumero(chip.numero);
      if (chip?.operadora) setOperadora(chip.operadora);
    } catch {
      // ignore
    }
  }, [deviceId, numero]);

  useEffect(() => {
    setNumero(initialPhone || '');
    if (!open) setOperadora(null);
  }, [initialPhone, open]);

  useEffect(() => {
    if (open && deviceId && !numero) fetchPhone();
  }, [open, deviceId, numero, fetchPhone]);

  useEffect(() => {
    if (open && deviceId && numero && !operadora) {
      fetchOrThrow(`${TELECOM_BASE}/chips/by-device/${deviceId}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((chip) => chip?.operadora && setOperadora(chip.operadora))
        .catch(() => {});
    }
  }, [open, deviceId, numero, operadora]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/templates`, { credentials: 'include' });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data?.data || []);
      setTemplates(arr);
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open, fetchTemplates]);

  const fetchBatchTemplates = useCallback(async () => {
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/batch-templates`, { credentials: 'include' });
      const data = await res.json();
      setBatchTemplates(Array.isArray(data) ? data : []);
    } catch {
      setBatchTemplates([]);
    }
  }, []);

  useEffect(() => {
    if (open && batchConfigOpen) fetchBatchTemplates();
  }, [open, batchConfigOpen, fetchBatchTemplates]);

  useEffect(() => {
    if (selectedTemplateId) {
      const t = templates.find((x) => String(x.id) === String(selectedTemplateId));
      if (t) setMensagem(t.mensagem || '');
    }
  }, [selectedTemplateId, templates]);

  const fetchHistory = useCallback(async () => {
    try {
      const parts = historyMonth.split('/');
      const m = parts[0] ? parseInt(parts[0], 10) : new Date().getMonth() + 1;
      const y = parts[1] ? parseInt(parts[1], 10) : new Date().getFullYear();
      const params = new URLSearchParams({ month: m, year: y, search: historySearch, page: 1, limit: 20 });
      const res = await fetchOrThrow(`${TELECOM_BASE}/sms/history?${params}`, { credentials: 'include' });
      const data = await res.json();
      setHistory({ data: data.data || [], total: data.total || 0 });
    } catch {
      setHistory({ data: [], total: 0 });
    }
  }, [historyMonth, historySearch]);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open, fetchHistory]);

  const handleSend = async () => {
    const num = numero?.trim().replace(/\D/g, '') || '';
    if (num.length < 10) {
      setError('Informe um número válido.');
      return;
    }
    if (!mensagem?.trim()) {
      setError('Digite a mensagem.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      await fetchOrThrow(`${TELECOM_BASE}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ numero: num, mensagem: mensagem.trim(), deviceId }),
      });
      setMensagem('');
      fetchHistory();
    } catch (e) {
      let errMsg = e.message || 'Erro ao enviar SMS';
      let hint = '';
      try {
        const parsed = typeof errMsg === 'string' ? JSON.parse(errMsg) : errMsg;
        if (parsed?.error) errMsg = parsed.error;
        if (parsed?.hint) hint = parsed.hint;
      } catch { /* resposta não é JSON, usa mensagem original */ }
      if (errMsg.includes('Cannot POST') || errMsg.includes('404')) {
        errMsg = 'Rota não encontrada. Verifique se o backend de Gestão (porta 3666) está rodando e se o proxy nginx inclui nginx-gestao-proxy.conf.';
      }
      if (errMsg.includes('500') && !errMsg.includes('API') && !errMsg.includes('configurada') && !hint) {
        errMsg += ' Consulte os logs do servidor (backend Gestão) para detalhes.';
      }
      setError(hint ? `${errMsg} ${hint}` : errMsg);
    } finally {
      setSending(false);
    }
  };

  const handleSendBatch = async () => {
    const num = numero?.trim().replace(/\D/g, '') || '';
    if (num.length < 10) {
      setError('Informe um número válido.');
      return;
    }
    if (!selectedBatchId) {
      setError('Selecione uma configuração em lote.');
      return;
    }
    setError(null);
    setBatchSending(true);
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/sms/send-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          numero: num.length >= 12 ? num : `55${num}`,
          deviceId: deviceId || undefined,
          batchTemplateId: parseInt(selectedBatchId, 10),
        }),
      });
      const data = await res.json();
      if (data.errorCount === 0) {
        setError(null);
        setBatchConfigOpen(false);
        setSelectedBatchId('');
        fetchHistory();
      } else {
        const errDetails = data.results?.filter((r) => !r.success).map((r) => `${r.titulo}: ${r.message}`).join('; ') || '';
        setError(`Enviados: ${data.successCount}/${data.total}. Erros: ${data.errorCount}. ${errDetails}`);
      }
    } catch (e) {
      let errMsg = e.message || 'Erro ao enviar configuração';
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error) errMsg = parsed.error;
      } catch { /* ignore */ }
      setError(errMsg);
    } finally {
      setBatchSending(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.titulo?.trim() || !newTemplate.mensagem?.trim()) return;
    try {
      await fetchOrThrow(`${TELECOM_BASE}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newTemplate),
      });
      setCreateTemplateOpen(false);
      setNewTemplate({ titulo: '', mensagem: '' });
      fetchTemplates();
    } catch (e) {
      setError(e.message);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleString('pt-BR');
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        root: {
          sx: { zIndex: 99999 },
        },
      }}
    >
      <DialogTitle component="div">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <span>
            ENVIO DE SMS PARA:{' '}
            <span style={{ color: 'var(--mui-palette-primary-main)', fontWeight: 'bold' }}>
              {numero || '(selecione o dispositivo)'}
            </span>
          </span>
          {operadora && (
            <Typography variant="caption" color="text.secondary">
              Envio automático via {operadora.toLowerCase().includes('emnify') ? 'Voxter' : 'Comtele'}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="Número"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            fullWidth
            disabled={!!deviceId}
          />
          <TextField
            label="Mensagem"
            placeholder="Digite uma Mensagem..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            fullWidth
            multiline
            rows={4}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Template da mensagem</InputLabel>
              <Select
                value={selectedTemplateId || ''}
                label="Template da mensagem"
                onChange={(e) => setSelectedTemplateId(e.target.value || '')}
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
            <IconButton onClick={() => setCreateTemplateOpen(true)} title="Criar template">
              <AddIcon />
            </IconButton>
          </Box>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
            HISTÓRICO DE SMS
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              label="Selecione o mês"
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
          </Box>
          <Table size="small">
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
              {history.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Sem dados disponíveis na tabela.
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<ArrowBackIcon />} onClick={onClose}>
          Voltar
        </Button>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => { setBatchConfigOpen(true); setError(null); }}
          disabled={sending || batchSending}
        >
          Configuração
        </Button>
        <Button variant="contained" startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />} onClick={handleSend} disabled={sending || batchSending}>
          Enviar
        </Button>
      </DialogActions>

      <Dialog
        open={createTemplateOpen}
        onClose={() => setCreateTemplateOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          root: {
            sx: { zIndex: 100000 },
          },
        }}
      >
        <DialogTitle component="div">Criar template de SMS</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Nome"
              placeholder="Nome do template"
              value={newTemplate.titulo}
              onChange={(e) => setNewTemplate({ ...newTemplate, titulo: e.target.value })}
              fullWidth
            />
            <TextField
              label="Template de mensagem"
              placeholder="Digite uma Mensagem..."
              value={newTemplate.mensagem}
              onChange={(e) => setNewTemplate({ ...newTemplate, mensagem: e.target.value })}
              fullWidth
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTemplateOpen(false)}>Fechar</Button>
          <Button variant="contained" onClick={handleCreateTemplate}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={batchConfigOpen}
        onClose={() => !batchSending && setBatchConfigOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ root: { sx: { zIndex: 100000 } } }}
      >
        <DialogTitle>Enviar configuração em lote</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Configuração</InputLabel>
              <Select
                value={selectedBatchId || ''}
                label="Configuração"
                onChange={(e) => setSelectedBatchId(e.target.value || '')}
                displayEmpty
                disabled={batchSending}
                MenuProps={{ style: { zIndex: 100001 } }}
              >
                <MenuItem value="">
                  <em>Selecione...</em>
                </MenuItem>
                {batchTemplates.map((bt) => (
                  <MenuItem key={bt.id} value={String(bt.id)}>
                    {bt.nome} ({(bt.template_ids || []).length} SMS)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {batchTemplates.length === 0 && !batchSending && (
              <Typography variant="body2" color="text.secondary">
                Nenhuma configuração cadastrada. Crie em Painel SMS → Templates.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !batchSending && setBatchConfigOpen(false)} disabled={batchSending}>
            Fechar
          </Button>
          <Button
            variant="contained"
            onClick={handleSendBatch}
            disabled={batchSending || !selectedBatchId}
            startIcon={batchSending ? <CircularProgress size={16} /> : <SendIcon />}
          >
            {batchSending ? 'Enviando...' : 'Enviar configuração'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default SmsSendModal;
