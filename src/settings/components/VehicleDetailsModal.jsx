import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Devices as DevicesIcon,
  Notifications as NotificationsIcon,
  InfoOutlined as InfoOutlinedIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  RestartAlt as RestartAltIcon,
  Map as MapIcon,
  LocationOn as LocationOnIcon,
  History as HistoryIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useAdministrator, useDeviceReadonly, useManager } from '../../common/util/permissions';
import { useThemeColors } from '../../common/components/ThemeProvider';
import RemoveDialog from '../../common/components/RemoveDialog';
import DeviceStatusIcons from './DeviceStatusIcons';
import SmsSendModal from './SmsSendModal';
import DeviceVehicleHistoryDialog from './DeviceVehicleHistoryDialog';
import { devicesActions, fetchAllDevices, fetchVehicles } from '../../store';
import fetchOrThrow from '../../common/util/fetchOrThrow';

const TELECOM_BASE = '/gestao/telecom';

/** Empilhamento alinhado ao FloatingDevicesPopover: base do detalhe, menu 100002, modais filhos 110000+. */
const Z_VEHICLE_DETAILS = 100000;
const Z_VEHICLE_DETAILS_MENU = 100002;
const Z_ACTION_OVER_DETAILS = 110000;

const ALERT_TYPES = [
  { key: 'ignitionOn', label: 'Ignição Ligada' },
  { key: 'ignitionOff', label: 'Ignição Desligada' },
  { key: 'deviceOffline', label: 'Desconexão' },
  { key: 'geofenceEnter', label: 'Entrada na Cerca Virtual' },
  { key: 'geofenceExit', label: 'Saída da Cerca Virtual' },
  { key: 'deviceOverspeed', label: 'Excesso de Velocidade', hasSpeedConfig: true },
  { key: 'alarm_sos', label: 'Pânico / SOS' },
  { key: 'alarm_lock', label: 'Bloqueio' },
  { key: 'alarm_unlock', label: 'Desbloqueio' },
];

const VehicleDetailsModal = ({ open, onClose, vehicle }) => {
  const t = useTranslation();
  const admin = useAdministrator();
  const manager = useManager();
  const deviceReadonly = useDeviceReadonly();
  const colors = useThemeColors() || {};
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const allDevices = useSelector((state) => state.devices.allDevices) || [];
  const positions = useSelector((state) => state.session.positions || {});

  const [activeSection, setActiveSection] = useState('devices');
  const [alerts, setAlerts] = useState({});
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [removeDeviceId, setRemoveDeviceId] = useState(null);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsModalDeviceId, setSmsModalDeviceId] = useState(null);
  const [smsModalPhone, setSmsModalPhone] = useState('');
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDialogDeviceId, setHistoryDialogDeviceId] = useState(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetDeviceId, setResetDeviceId] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState(null);

  const associatedDevices = useMemo(() => {
    const rawIds = (vehicle?.deviceIds && Array.isArray(vehicle.deviceIds) && vehicle.deviceIds.length > 0)
      ? vehicle.deviceIds
      : (vehicle?.devices && Array.isArray(vehicle.devices))
        ? vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
        : (vehicle?.device_id != null ? [vehicle.device_id] : []);
    return rawIds.map((id) => allDevices.find((d) => d && d.id === id)).filter(Boolean);
  }, [vehicle, allDevices]);

  const loadAlerts = useCallback(async () => {
    if (!vehicle?.id) return;
    setAlertsLoading(true);
    try {
      const response = await fetchOrThrow(`/api/vehicles/${vehicle.id}/alerts`);
      setAlerts(await response.json());
    } catch {
      setAlerts({});
    } finally {
      setAlertsLoading(false);
    }
  }, [vehicle?.id]);

  useEffect(() => {
    if (open && activeSection === 'alerts') loadAlerts();
  }, [open, activeSection, loadAlerts]);

  useEffect(() => {
    if (open) {
      setActiveSection('devices');
    }
  }, [open]);

  useEffect(() => {
    if (!manager && activeSection === 'data') {
      setActiveSection('devices');
    }
  }, [manager, activeSection]);

  useEffect(() => {
    if (!open) {
      setSmsModalOpen(false);
      setSmsModalDeviceId(null);
      setSmsModalPhone('');
      setHistoryDialogOpen(false);
      setHistoryDialogDeviceId(null);
      setResetModalOpen(false);
      setResetDeviceId(null);
      setResetError(null);
      setRemoveDeviceId(null);
      setAnchorEl(null);
    }
  }, [open]);

  const refreshAfterDeviceChange = useCallback(() => {
    dispatch(fetchAllDevices());
    dispatch(fetchVehicles());
  }, [dispatch]);

  const handleRemoveDeviceResult = useCallback((removed) => {
    setRemoveDeviceId(null);
    if (removed) refreshAfterDeviceChange();
  }, [refreshAfterDeviceChange]);

  const handleResetConfirm = async () => {
    if (!resetDeviceId) return;
    setResetLoading(true);
    setResetError(null);
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/sms/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deviceId: resetDeviceId }),
      });
      const data = await res.json();
      if (data.success) {
        setResetModalOpen(false);
        setResetDeviceId(null);
      } else {
        setResetError(data.error || data.message || 'Erro ao resetar.');
      }
    } catch (e) {
      setResetError(e.message || 'Erro ao resetar simcard.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSaveAlerts = async () => {
    if (!vehicle?.id) return;
    setAlertsSaving(true);
    try {
      await fetchOrThrow(`/api/vehicles/${vehicle.id}/alerts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alerts),
      });
    } finally {
      setAlertsSaving(false);
    }
  };

  const actions = useMemo(() => [
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      show: admin && !deviceReadonly,
      handler: (device) => {
        if (!device?.id) return;
        onClose();
        navigate(`/settings/device/${device.id}`);
      },
    },
    {
      key: 'connections',
      title: t('sharedConnections'),
      icon: <LinkIcon fontSize="small" />,
      show: admin && !deviceReadonly,
      handler: (device) => {
        if (!device?.id) return;
        onClose();
        navigate(`/settings/device/${device.id}/connections`);
      },
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      show: admin && !deviceReadonly,
      handler: (device) => {
        if (!device?.id) return;
        setRemoveDeviceId(device.id);
      },
    },
    {
      key: 'sendSms',
      title: t('deviceSendSms'),
      icon: <SendIcon fontSize="small" />,
      show: true,
      handler: (device) => {
        if (!device?.id) return;
        setSmsModalDeviceId(device.id);
        setSmsModalPhone(device.phone || '');
        setSmsModalOpen(true);
      },
    },
    {
      key: 'resetSimcard',
      title: t('deviceResetSimcard'),
      icon: <RestartAltIcon fontSize="small" />,
      show: true,
      handler: (device) => {
        if (!device?.id) return;
        setResetDeviceId(device.id);
        setResetError(null);
        setResetModalOpen(true);
      },
    },
    {
      key: 'googleMaps',
      title: t('deviceOpenGoogleMaps'),
      icon: <MapIcon fontSize="small" />,
      show: true,
      handler: (device) => {
        const pos = positions[device?.id];
        if (pos?.latitude != null && pos?.longitude != null) {
          window.open(`https://www.google.com/maps?q=${pos.latitude},${pos.longitude}`, '_blank');
        }
      },
    },
    {
      key: 'monitor',
      title: t('deviceMonitor'),
      icon: <LocationOnIcon fontSize="small" />,
      show: true,
      handler: (device) => {
        if (device?.id) {
          dispatch(devicesActions.selectId(device.id));
          onClose();
          navigate('/');
        }
      },
    },
    {
      key: 'vehicleHistory',
      title: t('deviceVehicleHistory'),
      icon: <HistoryIcon fontSize="small" />,
      show: true,
      handler: (device) => {
        if (!device?.id) return;
        setHistoryDialogDeviceId(device.id);
        setHistoryDialogOpen(true);
      },
    },
  ], [t, admin, deviceReadonly, onClose, navigate, dispatch, positions]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{ root: { sx: { zIndex: Z_VEHICLE_DETAILS } } }}
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          backgroundColor: colors.surface || '#fff',
          border: `1px solid ${colors.border || '#E5E7EB'}`,
          borderRadius: '16px',
        },
      }}
    >
      <Box sx={{ p: 2, borderBottom: `1px solid ${colors.border || '#E5E7EB'}`, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onClose} sx={{ color: colors.textSecondary || '#9CA3AF' }}>
          Voltar
        </Button>
        <Typography variant="h6" sx={{ color: colors.text || '#111827' }}>
          DETALHES DO VEÍCULO - {vehicle?.plate || '...'}
        </Typography>
      </Box>

      <DialogContent sx={{ p: 2, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Paper sx={{ flex: '1 1 200px', minWidth: 200, p: 2, border: `1px solid ${colors.border || '#E5E7EB'}` }}>
            <List dense disablePadding>
              <ListItemButton selected={activeSection === 'devices'} onClick={() => setActiveSection('devices')}>
                <ListItemIcon sx={{ minWidth: 36 }}><DevicesIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Dispositivos" />
              </ListItemButton>
              <ListItemButton selected={activeSection === 'alerts'} onClick={() => setActiveSection('alerts')}>
                <ListItemIcon sx={{ minWidth: 36 }}><NotificationsIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Alertas" />
              </ListItemButton>
              {manager && (
                <ListItemButton selected={activeSection === 'data'} onClick={() => setActiveSection('data')}>
                  <ListItemIcon sx={{ minWidth: 36 }}><InfoOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Dados" />
                </ListItemButton>
              )}
            </List>
            <Button fullWidth startIcon={<ArrowBackIcon />} onClick={onClose} sx={{ mt: 2, color: colors.textSecondary || '#9CA3AF' }}>
              Voltar
            </Button>
          </Paper>

          <Box sx={{ flex: '2 1 400px', minWidth: 0 }}>
            {activeSection === 'devices' && (
              <Paper sx={{ p: 2, border: `1px solid ${colors.border || '#E5E7EB'}` }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>IMEI</TableCell>
                        <TableCell>Nome</TableCell>
                        <TableCell>Modelo</TableCell>
                        {admin && <TableCell>Telefone</TableCell>}
                        <TableCell>Última Atualização</TableCell>
                        <TableCell>Estado</TableCell>
                        {admin && <TableCell align="right">Ações</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {associatedDevices.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell>{device.uniqueId || '-'}</TableCell>
                          <TableCell>{device.name || '-'}</TableCell>
                          <TableCell>{device.model || '-'}</TableCell>
                          {admin && <TableCell>{device.phone || '-'}</TableCell>}
                          <TableCell>{positions[device.id]?.fixTime ? new Date(positions[device.id].fixTime).toLocaleString('pt-BR') : '-'}</TableCell>
                          <TableCell><DeviceStatusIcons position={positions[device.id]} /></TableCell>
                          {admin && (
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setSelectedDevice(device);
                                  setAnchorEl(e.currentTarget);
                                }}
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
              </Paper>
            )}

            {activeSection === 'alerts' && (
              <Paper sx={{ p: 2, border: `1px solid ${colors.border || '#E5E7EB'}` }}>
                {alertsLoading ? <CircularProgress size={20} /> : ALERT_TYPES.map((item) => (
                  <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
                    <Typography>{item.label}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {item.hasSpeedConfig && (
                        <TextField
                          size="small"
                          type="number"
                          label="Limite (km/h)"
                          value={alerts[item.key]?.config?.speedLimit || ''}
                          onChange={(e) => setAlerts((prev) => ({
                            ...prev,
                            [item.key]: {
                              enabled: prev[item.key]?.enabled || false,
                              config: { ...(prev[item.key]?.config || {}), speedLimit: Number(e.target.value || 0) },
                            },
                          }))}
                          sx={{ width: 140 }}
                        />
                      )}
                      <Switch
                        checked={!!alerts[item.key]?.enabled}
                        onChange={(e) => setAlerts((prev) => ({
                          ...prev,
                          [item.key]: {
                            enabled: e.target.checked,
                            config: prev[item.key]?.config || {},
                          },
                        }))}
                      />
                    </Box>
                  </Box>
                ))}
                <Button variant="contained" onClick={handleSaveAlerts} disabled={alertsSaving} sx={{ mt: 2 }}>
                  {alertsSaving ? 'Salvando...' : 'Salvar Alertas'}
                </Button>
              </Paper>
            )}

            {manager && activeSection === 'data' && (
              <Paper sx={{ p: 2, border: `1px solid ${colors.border || '#E5E7EB'}` }}>
                <Typography variant="subtitle2" sx={{ color: colors.textSecondary || '#9CA3AF', mb: 0.5 }}>
                  Detalhes da instalação
                </Typography>
                <Typography sx={{ color: colors.text || '#111827', mb: 2, whiteSpace: 'pre-wrap' }}>
                  {(vehicle?.installation_details && String(vehicle.installation_details).trim()) || '—'}
                </Typography>
                <Typography variant="subtitle2" sx={{ color: colors.textSecondary || '#9CA3AF', mb: 0.5 }}>
                  Data de cadastro
                </Typography>
                <Typography sx={{ color: colors.text || '#111827', mb: 2 }}>
                  {vehicle?.created_at
                    ? new Date(vehicle.created_at).toLocaleString('pt-BR')
                    : '—'}
                </Typography>
                <Typography variant="subtitle2" sx={{ color: colors.textSecondary || '#9CA3AF', mb: 0.5 }}>
                  Cliente
                </Typography>
                <Typography sx={{ color: colors.text || '#111827' }}>
                  {(vehicle?.client_name && String(vehicle.client_name).trim()) || '—'}
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </DialogContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        style={{ zIndex: Z_VEHICLE_DETAILS_MENU }}
        PaperProps={{
          style: {
            zIndex: Z_VEHICLE_DETAILS_MENU,
            backgroundColor: colors.surface || '#fff',
            border: `1px solid ${colors.border || '#E5E7EB'}`,
          },
        }}
      >
        {actions.filter((action) => action.show !== false).map((action) => (
          <MenuItem
            key={action.key}
            onClick={() => {
              action.handler(selectedDevice);
              setAnchorEl(null);
            }}
          >
            {action.icon}
            <Typography sx={{ ml: 1 }}>{action.title}</Typography>
          </MenuItem>
        ))}
      </Menu>

      <RemoveDialog
        open={!!removeDeviceId}
        endpoint="devices"
        itemId={removeDeviceId}
        onResult={handleRemoveDeviceResult}
        snackbarZIndex={Z_ACTION_OVER_DETAILS}
      />
      <SmsSendModal
        open={smsModalOpen}
        onClose={() => {
          setSmsModalOpen(false);
          setSmsModalDeviceId(null);
          setSmsModalPhone('');
        }}
        deviceId={smsModalDeviceId}
        phone={smsModalPhone}
        rootZIndex={Z_ACTION_OVER_DETAILS}
      />
      <DeviceVehicleHistoryDialog
        open={historyDialogOpen}
        onClose={() => {
          setHistoryDialogOpen(false);
          setHistoryDialogDeviceId(null);
        }}
        deviceId={historyDialogDeviceId}
        dialogZIndex={Z_ACTION_OVER_DETAILS}
      />
      <Dialog
        open={resetModalOpen}
        onClose={() => !resetLoading && setResetModalOpen(false)}
        slotProps={{ root: { sx: { zIndex: Z_ACTION_OVER_DETAILS } } }}
        PaperProps={{
          sx: {
            backgroundColor: colors.surface || '#fff',
            border: `1px solid ${colors.border || '#E5E7EB'}`,
          },
        }}
      >
        <DialogTitle sx={{ color: colors.text || '#111827' }}>{t('deviceResetSimcard')}</DialogTitle>
        <DialogContent>
          {resetError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setResetError(null)}>
              {resetError}
            </Alert>
          )}
          <Typography sx={{ color: colors.text || '#111827' }}>
            Deseja resetar o simcard deste dispositivo?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !resetLoading && setResetModalOpen(false)} disabled={resetLoading} sx={{ color: colors.textSecondary || '#9CA3AF' }}>
            Cancelar
          </Button>
          <Button variant="contained" color="secondary" onClick={handleResetConfirm} disabled={resetLoading}>
            {resetLoading ? <CircularProgress size={20} /> : t('deviceResetSimcard')}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default VehicleDetailsModal;
