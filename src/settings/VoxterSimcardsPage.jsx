import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Alert,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import SmsIcon from '@mui/icons-material/Sms';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import TableShimmer from '../common/components/TableShimmer';
import fetchOrThrow from '../common/util/fetchOrThrow';

const TELECOM_BASE = '/gestao/telecom';

/** Operadora nativa (quem fornece o chip) */
function getNativeOperator(row) {
  return (row?.company || '').trim() || '-';
}

/** Operadora conectada (rede atual) - pode ser "EMNIFY/CLARO/VIVO/TIM" ou "CLARO" */
function getConnectedOperator(row) {
  const op = (row?.company_connected || '').trim();
  if (!op) return null;
  return op.split('/')[0] || op;
}

function isEmnifyChip(row) {
  const op = (row?.company || '').toLowerCase();
  return op.includes('emnify');
}

export const OPERATOR_LOGOS = {
  claro: { bg: '#E30613', color: '#fff', label: 'Claro', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Claro.svg/48px-Claro.svg.png' },
  vivo: { bg: '#0066B3', color: '#fff', label: 'Vivo', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Vivo_logo.svg/48px-Vivo_logo.svg.png' },
  tim: { bg: '#0066B3', color: '#fff', label: 'TIM', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/TIM_logo_%282016%29.svg/48px-TIM_logo_%282016%29.svg.png' },
  emnify: { bg: '#6B4EFF', color: '#fff', label: 'Emnify' },
  algar: { bg: '#6B2D5C', color: '#fff', label: 'Algar', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Algar_Telecom_logo.svg/48px-Algar_Telecom_logo.svg.png' },
};

function getOperatorLogoKey(name) {
  if (!name) return null;
  const n = String(name).toLowerCase();
  if (n.includes('claro')) return 'claro';
  if (n.includes('vivo')) return 'vivo';
  if (n.includes('tim')) return 'tim';
  if (n.includes('emnify')) return 'emnify';
  if (n.includes('algar')) return 'algar';
  return null;
}

function OperatorLogo({ operatorName, size = 24 }) {
  const [imgError, setImgError] = useState(false);
  const key = getOperatorLogoKey(operatorName);
  const config = key ? OPERATOR_LOGOS[key] : null;
  const label = config?.label || (operatorName ? String(operatorName).trim().slice(0, 2).toUpperCase() : '');
  const bg = config?.bg || 'grey.500';
  const color = config?.color || '#fff';
  if (!operatorName) return null;
  const useImg = config?.img && !imgError;
  if (useImg) {
    return (
      <Box
        component="img"
        src={config.img}
        alt={config.label}
        title={config.label}
        onError={() => setImgError(true)}
        sx={{
          width: size,
          height: size,
          objectFit: 'contain',
          borderRadius: '50%',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: bg,
        color,
        fontSize: size * 0.4,
        fontWeight: 700,
        flexShrink: 0,
      }}
      title={config?.label || operatorName}
    >
      {label.charAt(0)}
    </Box>
  );
}

export const VoxterSimcardsContent = ({ embedded }) => {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [records, setRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsRow, setSmsRow] = useState(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const parseApiError = (e, fallback) => {
    const raw = e.message || '';
    try { const p = JSON.parse(raw); return p.error || p.message || fallback; } catch (_) { /* not JSON */ }
    return raw || fallback;
  };

  const fetchSimcards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), search: searchDebounced || ' ' });
      const res = await fetchOrThrow(`${TELECOM_BASE}/voxter/simcards?${params}`, { credentials: 'include' });
      const result = await res.json();
      setData(Array.isArray(result.data) ? result.data : []);
      setPages(result.pages ?? 1);
      setRecords(result.records ?? 0);
    } catch (e) {
      setError(parseApiError(e, 'Erro ao carregar chips Voxter'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced]);

  useEffect(() => {
    fetchSimcards();
  }, [fetchSimcards]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced]);

  const handleOpenSms = (row) => {
    setSmsRow(row);
    setSmsMessage('');
    setSmsOpen(true);
  };

  const handleCloseSms = () => {
    setSmsOpen(false);
    setSmsRow(null);
    setSmsMessage('');
  };

  const handleSendSms = async () => {
    if (!smsRow?.line || !smsMessage.trim()) return;
    setSmsLoading(true);
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/voxter/simcards/sms`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: smsRow.line, payload: smsMessage.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        handleCloseSms();
      } else {
        setError(result.message || result.error || 'Erro ao enviar SMS');
      }
    } catch (e) {
      setError(parseApiError(e, 'Erro ao enviar SMS'));
    } finally {
      setSmsLoading(false);
    }
  };

  const handleResetClick = (row) => {
    setResetConfirm(row);
  };

  const handleResetConfirm = async () => {
    if (!resetConfirm?.id) return;
    setResetLoading(true);
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/voxter/simcards/${resetConfirm.id}/reset`, {
        method: 'POST',
        credentials: 'include',
      });
      const result = await res.json();
      if (result.success) {
        setResetConfirm(null);
        fetchSimcards();
      } else {
        setError(result.message || result.error || 'Erro ao resetar linha');
      }
    } catch (e) {
      setError(parseApiError(e, 'Erro ao resetar linha'));
    } finally {
      setResetLoading(false);
    }
  };

  const getStatus = (row) => {
    if (row.canceled) return 'Cancelado';
    if (row.disabled) return 'Inativo';
    return 'Ativo';
  };

  const getStatusColor = (row) => {
    if (row.canceled) return 'grey.300';
    if (row.disabled) return 'warning.light';
    return 'primary.light';
  };

  const content = (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6">Chips Voxter (Lara M2M)</Typography>
          <Button size="small" startIcon={<RefreshIcon />} onClick={fetchSimcards} disabled={loading}>
            Atualizar
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          size="small"
          placeholder="Buscar por linha, ICCID ou IMEI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Iccid</TableCell>
                <TableCell>Linha</TableCell>
                <TableCell>Op</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Info.</TableCell>
                <TableCell>Imei</TableCell>
                <TableCell>Dados</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableShimmer columns={9} />
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    Nenhum chip encontrado
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.iccid || '-'}</TableCell>
                    <TableCell>{row.line || '-'}</TableCell>
                    <TableCell>{getNativeOperator(row)}</TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: getStatusColor(row),
                          color: 'primary.contrastText',
                          fontSize: '0.75rem',
                        }}
                      >
                        {getStatus(row)}
                      </Box>
                    </TableCell>
                    <TableCell>{row.last_comunication || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <OperatorLogo operatorName={getConnectedOperator(row)} size={24} />
                        {row.connection && (
                          <Box
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              bgcolor: 'info.light',
                              color: 'info.contrastText',
                              fontSize: '0.75rem',
                            }}
                          >
                            {row.connection}
                          </Box>
                        )}
                        {!getConnectedOperator(row) && !row.connection && '-'}
                      </Box>
                    </TableCell>
                    <TableCell>{row.imei || '-'}</TableCell>
                    <TableCell>
                      {row.plan != null && row.plan_consumed != null
                        ? `${Number(row.plan_consumed).toFixed(2)} de ${row.plan} MB`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        {isEmnifyChip(row) && (
                          <Tooltip title="Enviar SMS">
                            <IconButton size="small" color="primary" onClick={() => handleOpenSms(row)}>
                              <SmsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Reset de linha">
                          <IconButton size="small" color="secondary" onClick={() => handleResetClick(row)}>
                            <RestartAltIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

      <TablePagination
        component="div"
        count={records}
        page={Math.max(0, page - 1)}
        onPageChange={(_, p) => setPage(p + 1)}
        rowsPerPage={10}
        rowsPerPageOptions={[10]}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />

      <Dialog open={smsOpen} onClose={handleCloseSms} maxWidth="sm" fullWidth slotProps={{ root: { sx: { zIndex: 99999 } } }}>
        <DialogTitle>Enviar SMS - {smsRow?.line || ''}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="Mensagem"
            value={smsMessage}
            onChange={(e) => setSmsMessage(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSms}>Cancelar</Button>
          <Button variant="contained" onClick={handleSendSms} disabled={!smsMessage.trim() || smsLoading}>
            {smsLoading ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!resetConfirm} onClose={() => setResetConfirm(null)} slotProps={{ root: { sx: { zIndex: 99999 } } }}>
        <DialogTitle>Reset de linha</DialogTitle>
        <DialogContent>
          Deseja resetar a linha {resetConfirm?.line || ''}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetConfirm(null)}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={handleResetConfirm} disabled={resetLoading}>
            {resetLoading ? 'Resetando...' : 'Resetar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  if (embedded) {
    return content;
  }
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        {content}
      </Paper>
    </Box>
  );
};

const VoxterSimcardsPage = () => (
  <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Simcards', 'Chips Voxter']}>
    <VoxterSimcardsContent />
  </PageLayout>
);

export default VoxterSimcardsPage;
