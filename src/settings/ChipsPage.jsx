import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
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
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import TableShimmer from '../common/components/TableShimmer';
import { useAdministrator } from '../common/util/permissions';
import CollectionFab from './components/CollectionFab';
import { VoxterSimcardsContent } from './VoxterSimcardsPage';
import useSettingsStyles from './common/useSettingsStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';

const TELECOM_BASE = '/gestao/telecom';

const OPERADORAS = ['Algar', 'Emnify', 'Tim', 'Claro', 'Vivo'];
const BROKERS = ['Voxter', 'Allcom', 'Datatem'];

// Componente reutilizável para popover e página (exportado)
export const ChipsContent = () => {
  const { classes } = useSettingsStyles();
  const [activeTab, setActiveTab] = useState(0);
  const [chips, setChips] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sort, setSort] = useState('id');
  const [order, setOrder] = useState('asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ numero: '', operadora: '', iccid: '', broker: '', valor_custo: '', mbytes_plano: 20, status: 'ATIVO' });
  const [batchRemoveOpen, setBatchRemoveOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState(null);

  const fetchChips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        sort,
        order,
        search: keyword,
      });
      const res = await fetchOrThrow(`${TELECOM_BASE}/chips?${params}`, { credentials: 'include' });
      const data = await res.json();
      setChips(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message || 'Erro ao carregar chips');
      setChips([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, sort, order, keyword]);

  useEffect(() => {
    fetchChips();
  }, [fetchChips]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ numero: '', operadora: '', iccid: '', broker: '', valor_custo: '', mbytes_plano: 20, status: 'ATIVO' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (chip) => {
    setEditingId(chip.id);
    setFormData({
      numero: chip.numero || '',
      operadora: chip.operadora || '',
      iccid: chip.iccid || '',
      broker: chip.broker || '',
      valor_custo: chip.valor_custo ?? '',
      mbytes_plano: chip.mbytes_plano ?? 20,
      status: chip.status || 'ATIVO',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.numero?.trim()) {
      setError('O número da linha é obrigatório.');
      return;
    }
    setError(null);
    try {
      if (editingId) {
        await fetchOrThrow(`${TELECOM_BASE}/chips/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchOrThrow(`${TELECOM_BASE}/chips`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
      }
      setDialogOpen(false);
      fetchChips();
    } catch (e) {
      const err = await e.response?.json?.().catch(() => ({}));
      setError(err?.error || e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este chip?')) return;
    try {
      await fetchOrThrow(`${TELECOM_BASE}/chips/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchChips();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleBatchSync = async () => {
    try {
      await fetchOrThrow(`${TELECOM_BASE}/sync/devices-to-chips`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchChips();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleBatchRemove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Remover ${selectedIds.length} chip(s)?`)) return;
    try {
      await fetchOrThrow(`${TELECOM_BASE}/chips/batch-remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedIds }),
      });
      setBatchRemoveOpen(false);
      setSelectedIds([]);
      fetchChips();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const formatCurrency = (v) => (v != null && !Number.isNaN(Number(v)) ? `R$ ${Number(v).toFixed(2).replace('.', ',')}` : 'R$ 0,00');

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Simcards</Typography>
          </Box>

          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tab label="Lista de Chips" />
            <Tab label="Voxter" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Aba Lista de Chips */}
          {activeTab === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <TextField
                  size="small"
                  placeholder="Procurar por número, operadora, ICCID..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  sx={{ maxWidth: 400 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="text" startIcon={<SyncIcon />} onClick={handleBatchSync}>
                    Sincronizar Devices
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    startIcon={<DeleteSweepIcon />}
                    onClick={() => setBatchRemoveOpen(true)}
                    disabled={selectedIds.length === 0}
                  >
                    Remoção em Lote
                  </Button>
                  <IconButton onClick={fetchChips} title="Atualizar" size="small">
                    <RefreshIcon />
                  </IconButton>
                </Box>
              </Box>

              <TableContainer>
        <Table className={classes.table}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedIds.length > 0 && selectedIds.length < chips.length}
                      checked={chips.length > 0 && selectedIds.length === chips.length}
                      onChange={(e) => setSelectedIds(e.target.checked ? chips.map((c) => c.id) : [])}
                    />
                  </TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Broker</TableCell>
                  <TableCell>Operadora</TableCell>
                  <TableCell>Número</TableCell>
                  <TableCell>ICCID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>MBytes</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableShimmer columns={10} />
                ) : chips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {keyword ? 'Nenhum chip encontrado' : 'Nenhum chip cadastrado'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  chips.map((chip) => (
                    <TableRow key={chip.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(chip.id)}
                          onChange={() => toggleSelect(chip.id)}
                        />
                      </TableCell>
                      <TableCell>{chip.id}</TableCell>
                      <TableCell>{chip.broker || '-'}</TableCell>
                      <TableCell>{chip.operadora || '-'}</TableCell>
                      <TableCell>
                        <Typography component="span" color="primary" sx={{ cursor: 'pointer' }}>
                          {chip.numero}
                        </Typography>
                      </TableCell>
                      <TableCell>{chip.iccid || '-'}</TableCell>
                      <TableCell>
                        <Typography
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: chip.status === 'ATIVO' ? 'primary.light' : 'grey.300',
                            color: chip.status === 'ATIVO' ? 'primary.contrastText' : 'text.secondary',
                            fontSize: '0.75rem',
                          }}
                        >
                          {chip.status || 'ATIVO'}
                        </Typography>
                      </TableCell>
                      <TableCell>{chip.mbytes_plano != null ? `${chip.mbytes_plano} MBytes` : '-'}</TableCell>
                      <TableCell>{formatCurrency(chip.valor_custo)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => handleOpenEdit(chip)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remover">
                          <IconButton size="small" color="error" onClick={() => handleDelete(chip.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={10} align="right">
                  <TablePagination
                    component="span"
                    count={total}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Mostrar"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                  />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
            </>
          )}

          {/* Aba Voxter */}
          {activeTab === 1 && <VoxterSimcardsContent embedded />}
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
        <DialogTitle>{editingId ? 'Editar Chip' : 'Adicionar Chip'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Número (obrigatório)"
              value={formData.numero}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
              required
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Operadora</InputLabel>
              <Select
                value={formData.operadora || ''}
                label="Operadora"
                onChange={(e) => setFormData({ ...formData, operadora: e.target.value })}
                MenuProps={{
                  style: { zIndex: 100001 },
                  PaperProps: { sx: { zIndex: 100001 } }
                }}
              >
                <MenuItem value="">
                  <em>Nenhuma</em>
                </MenuItem>
                {OPERADORAS.map((op) => (
                  <MenuItem key={op} value={op}>{op}</MenuItem>
                ))}
                {formData.operadora && !OPERADORAS.includes(formData.operadora) && (
                  <MenuItem value={formData.operadora}>{formData.operadora}</MenuItem>
                )}
              </Select>
            </FormControl>
            <TextField label="ICCID" value={formData.iccid} onChange={(e) => setFormData({ ...formData, iccid: e.target.value })} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Broker</InputLabel>
              <Select
                value={formData.broker || ''}
                label="Broker"
                onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                MenuProps={{
                  style: { zIndex: 100001 },
                  PaperProps: { sx: { zIndex: 100001 } }
                }}
              >
                <MenuItem value="">
                  <em>Nenhum</em>
                </MenuItem>
                {BROKERS.map((br) => (
                  <MenuItem key={br} value={br}>{br}</MenuItem>
                ))}
                {formData.broker && !BROKERS.includes(formData.broker) && (
                  <MenuItem value={formData.broker}>{formData.broker}</MenuItem>
                )}
              </Select>
            </FormControl>
            <TextField
              label="MBytes"
              type="number"
              value={formData.mbytes_plano}
              onChange={(e) => setFormData({ ...formData, mbytes_plano: parseInt(e.target.value, 10) || 20 })}
              fullWidth
            />
            <TextField
              label="Valor (R$)"
              type="number"
              value={formData.valor_custo}
              onChange={(e) => setFormData({ ...formData, valor_custo: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                MenuProps={{
                  style: { zIndex: 100001 },
                  PaperProps: { sx: { zIndex: 100001 } }
                }}
              >
                <MenuItem value="ATIVO">ATIVO</MenuItem>
                <MenuItem value="INATIVO">INATIVO</MenuItem>
                <MenuItem value="TESTE">TESTE</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={batchRemoveOpen}
        onClose={() => setBatchRemoveOpen(false)}
        slotProps={{ root: { sx: { zIndex: 99999 } } }}
      >
        <DialogTitle>Remoção em Lote</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedIds.length} chip(s) selecionado(s). Deseja remover?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchRemoveOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleBatchRemove}>
            Remover
          </Button>
        </DialogActions>
      </Dialog>
  </>
  );
};

const ChipsPage = () => {
  const admin = useAdministrator();
  const navigate = useNavigate();
  useEffect(() => {
    if (!admin) {
      navigate('/settings/preferences', { replace: true });
    }
  }, [admin, navigate]);
  if (!admin) return null;
  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Simcards']}>
      <ChipsContent />
    </PageLayout>
  );
};

export default ChipsPage;
