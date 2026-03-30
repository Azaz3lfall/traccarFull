import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Box,
  Tabs,
  Tab,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useThemeColors } from '../../common/components/ThemeProvider';

const getCoreApiUrl = () => (import.meta.env.VITE_CORE_API_URL || '');

const UserVehiclesAssociationModal = ({ open, onClose, clientId, clientName, user }) => {
  const colorsRaw = useThemeColors();
  const CORE_API_URL = getCoreApiUrl();
  const baseUrl = CORE_API_URL || '';

  const colors = colorsRaw || {
    primary: '#3B82F6',
    text: '#111827',
    textSecondary: '#9CA3AF',
    border: '#E5E7EB',
    surface: '#FFFFFF',
  };

  const safeColor = (c, fallback) => {
    if (!c) return fallback;
    if (typeof c === 'string') return c;
    return c.main || c.primary || fallback;
  };

  const [vehicles, setVehicles] = useState([]);
  const [userVehicles, setUserVehicles] = useState([]);
  const [selected, setSelected] = useState({});
  const [notify, setNotify] = useState({});
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const traccarUserId = user?.traccar_user_id;

  useEffect(() => {
    if (!open || !clientId || !traccarUserId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [vehRes, uvRes] = await Promise.all([
          fetch(baseUrl ? `${baseUrl}/api/vehicles` : '/api/vehicles'),
          fetch(`${baseUrl}/api/clients/${clientId}/users/${traccarUserId}/vehicles`),
        ]);
        if (vehRes.ok) {
          const vehData = await vehRes.json();
          setVehicles(Array.isArray(vehData) ? vehData.filter((v) => v.client_id === clientId) : []);
        }
        if (uvRes.ok) {
          const uvData = await uvRes.json();
          const uvList = Array.isArray(uvData) ? uvData : [];
          const sel = {};
          const not = {};
          uvList.forEach((uv) => {
            sel[uv.vehicle_id] = true;
            not[uv.vehicle_id] = !!uv.notify;
          });
          setUserVehicles(uvList);
          setSelected(sel);
          setNotify(not);
        }
      } catch (e) {
        console.error('Erro ao carregar veículos:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, clientId, traccarUserId]);

  const filteredVehicles = vehicles.filter((v) => {
    const s = (search || '').toLowerCase();
    if (!s) return true;
    const plate = (v.plate || '').toLowerCase();
    const nick = (v.nickname || '').toLowerCase();
    const make = (v.make || '').toLowerCase();
    const model = (v.model || '').toLowerCase();
    return plate.includes(s) || nick.includes(s) || make.includes(s) || model.includes(s);
  });

  const handleToggle = (vehicleId) => {
    setSelected((prev) => ({ ...prev, [vehicleId]: !prev[vehicleId] }));
  };

  const handleNotifyChange = (vehicleId) => {
    setNotify((prev) => ({ ...prev, [vehicleId]: !prev[vehicleId] }));
  };

  const handleSave = async () => {
    if (!clientId || !traccarUserId) return;
    setSaving(true);
    try {
      const associations = Object.entries(selected)
        .filter(([, checked]) => checked)
        .map(([vehicleId]) => ({
          vehicle_id: vehicleId,
          notify: !!notify[vehicleId],
        }));

      const res = await fetch(`${baseUrl}/api/clients/${clientId}/users/${traccarUserId}/vehicles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ associations }),
      });

      if (res.ok) {
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Erro ao salvar associações');
      }
    } catch (e) {
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const userName = user?.name || user?.email || `ID: ${traccarUserId}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ root: { sx: { zIndex: 100001 } } }}
      PaperProps={{
        sx: {
          backgroundColor: safeColor(colorsRaw?.surface, '#fff'),
          border: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}`,
        },
      }}
    >
      <DialogTitle sx={{ color: safeColor(colorsRaw?.text, '#111827') }}>
        Associar veículos ao usuário: {userName}
      </DialogTitle>
      <DialogContent>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Veículos próprios" />
          <Tab label="Demais veículos" disabled />
        </Tabs>

        {activeTab === 0 && (
          <>
            <TextField
              size="small"
              placeholder="Procurar:"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2, width: '100%' }}
            />

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Veículo</TableCell>
                    <TableCell>Grupo</TableCell>
                    <TableCell padding="checkbox">Notificar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVehicles.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={!!selected[v.id]}
                            onChange={() => handleToggle(v.id)}
                          />
                        </TableCell>
                        <TableCell>{v.nickname || v.plate || v.model || `ID: ${v.id}`}</TableCell>
                        <TableCell>{v.vehicle_type || '-'}</TableCell>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={!!notify[v.id]}
                            onChange={() => handleNotifyChange(v.id)}
                            disabled={!selected[v.id]}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {!loading && filteredVehicles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        Nenhum veículo encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}` }}>
        <Button onClick={onClose} sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF') }}>
          Fechar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{ backgroundColor: safeColor(colorsRaw?.primary, '#3B82F6') }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserVehiclesAssociationModal;
