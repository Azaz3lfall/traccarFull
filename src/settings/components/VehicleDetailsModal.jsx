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
  Divider,
  Checkbox,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
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
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
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
import { OS_STATUS_LABELS } from '../../other/os/constants';
import {
  mergeGroupsToSchedules,
  clusterSchedulesToGroups,
  createDefaultScheduleGroup,
  expandRecurrence,
  parseTimeInputWithMode,
  formatTimeForDisplay,
} from '../utils/scheduledCommandGroups';

const TELECOM_BASE = '/gestao/telecom';

/** Empilhamento alinhado ao FloatingDevicesPopover: base do detalhe, menu 100002, modais filhos 110000+. */
const Z_VEHICLE_DETAILS = 100000;
const Z_VEHICLE_DETAILS_MENU = 100002;
const Z_ACTION_OVER_DETAILS = 110000;
/** Menus do Select são portados no body com z-index baixo (~1300); o Dialog usa 100000, então o dropdown ficava invisível / sem clique. */
const Z_VEHICLE_DETAILS_SELECT_MENU = Z_VEHICLE_DETAILS + 100;

const COMMAND_SELECT_MENU_PROPS = {
  disableScrollLock: true,
  style: { zIndex: Z_VEHICLE_DETAILS_SELECT_MENU },
  PaperProps: {
    sx: { zIndex: Z_VEHICLE_DETAILS_SELECT_MENU },
  },
};

const COMMAND_DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const COMMAND_DAY_LABELS = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

const SCHEDULE_DAY_SHORT = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

const SCHEDULE_RECURRENCE_OPTIONS = [
  { value: 'weekdays', label: 'Segunda a sexta' },
  { value: 'mon_sat', label: 'Segunda a sábado' },
  { value: 'all_week', label: 'Segunda a domingo' },
  { value: 'custom', label: 'Dias específicos' },
];

const SCHEDULE_TIME_FORMAT_STORAGE_KEY = 'vehicleScheduledCommandsTimeFormat';

function readStoredScheduleTimeFormat() {
  if (typeof window === 'undefined') return '24h';
  try {
    return window.localStorage.getItem(SCHEDULE_TIME_FORMAT_STORAGE_KEY) === '12h' ? '12h' : '24h';
  } catch {
    return '24h';
  }
}

const COMMAND_TYPE_LABELS = {
  engineStop: 'Bloqueio',
  engineResume: 'Desbloqueio',
};

const COMMAND_STATUS_LABELS = {
  sent: 'Enviado',
  queued_offline: 'Aguardando online',
  failed: 'Falhou',
  retried: 'Reenviado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

const COMMAND_STATUS_COLORS = {
  sent: 'success',
  queued_offline: 'warning',
  failed: 'error',
  retried: 'info',
  expired: 'default',
  cancelled: 'default',
};

function formatCommandDate(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '—';
}

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

/** Campos de horário com digitação livre; estado local até o blur para não perder caracteres ao digitar. */
const ScheduledCommandTimeInputs = ({
  groupId,
  lockTime,
  unlockTime,
  disabled,
  timeDisplayMode,
  onPatch,
}) => {
  const [lockDraft, setLockDraft] = useState(() => (
    timeDisplayMode === '12h' ? formatTimeForDisplay(lockTime, '12h') : (lockTime ?? '')
  ));
  const [unlockDraft, setUnlockDraft] = useState(() => (
    timeDisplayMode === '12h' ? formatTimeForDisplay(unlockTime, '12h') : (unlockTime ?? '')
  ));

  useEffect(() => {
    if (timeDisplayMode === '12h') {
      setLockDraft(formatTimeForDisplay(lockTime, '12h'));
      setUnlockDraft(formatTimeForDisplay(unlockTime, '12h'));
    } else {
      setLockDraft(lockTime ?? '');
      setUnlockDraft(unlockTime ?? '');
    }
  }, [groupId, lockTime, unlockTime, timeDisplayMode]);

  const placeholder = timeDisplayMode === '12h' ? 'ex: 9:30 PM' : 'HH:mm';
  const inputMode = timeDisplayMode === '12h' ? 'text' : 'numeric';
  const maxLen = timeDisplayMode === '12h' ? 12 : 5;

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      flexWrap: 'wrap',
      gap: 2,
      mt: 1.5,
      alignItems: { xs: 'stretch', sm: 'center' },
    }}
    >
      <TextField
        type="text"
        size="small"
        label="Bloqueio"
        placeholder={placeholder}
        disabled={disabled}
        value={lockDraft}
        onChange={(e) => setLockDraft(e.target.value)}
        onBlur={() => onPatch({ lock_time: parseTimeInputWithMode(lockDraft, timeDisplayMode) })}
        inputProps={{
          inputMode,
          maxLength: maxLen,
          'aria-label': timeDisplayMode === '12h'
            ? 'Horário de bloqueio (12 horas com AM/PM)'
            : 'Horário de bloqueio (24 horas)',
        }}
        InputLabelProps={{ shrink: true }}
        sx={{
          flex: { sm: '0 1 auto' },
          width: { xs: '100%', sm: 'auto' },
          minWidth: { sm: timeDisplayMode === '12h' ? 160 : 130 },
        }}
      />
      <TextField
        type="text"
        size="small"
        label="Desbloqueio"
        placeholder={placeholder}
        disabled={disabled}
        value={unlockDraft}
        onChange={(e) => setUnlockDraft(e.target.value)}
        onBlur={() => onPatch({ unlock_time: parseTimeInputWithMode(unlockDraft, timeDisplayMode) })}
        inputProps={{
          inputMode,
          maxLength: maxLen,
          'aria-label': timeDisplayMode === '12h'
            ? 'Horário de desbloqueio (12 horas com AM/PM)'
            : 'Horário de desbloqueio (24 horas)',
        }}
        InputLabelProps={{ shrink: true }}
        sx={{
          flex: { sm: '0 1 auto' },
          width: { xs: '100%', sm: 'auto' },
          minWidth: { sm: timeDisplayMode === '12h' ? 160 : 130 },
        }}
      />
    </Box>
  );
};

const VehicleDetailsModal = ({ open, onClose, vehicle }) => {
  const t = useTranslation();
  const theme = useTheme();
  const isCompactNav = useMediaQuery(theme.breakpoints.down('md'));
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
  const [smsModalDeviceIds, setSmsModalDeviceIds] = useState([]);
  const [smsModalPhone, setSmsModalPhone] = useState('');
  const [selectedSmsDeviceIds, setSelectedSmsDeviceIds] = useState([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDialogDeviceId, setHistoryDialogDeviceId] = useState(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetDeviceId, setResetDeviceId] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [osOrders, setOsOrders] = useState([]);
  const [osLoading, setOsLoading] = useState(false);
  const [osFetchError, setOsFetchError] = useState(null);
  const [scheduleGroups, setScheduleGroups] = useState(() => [createDefaultScheduleGroup()]);
  const [weeklyPreviewExpanded, setWeeklyPreviewExpanded] = useState(false);
  const [scheduleTimeDisplayMode, setScheduleTimeDisplayMode] = useState(readStoredScheduleTimeFormat);
  const commandSchedules = useMemo(() => mergeGroupsToSchedules(scheduleGroups), [scheduleGroups]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SCHEDULE_TIME_FORMAT_STORAGE_KEY, scheduleTimeDisplayMode);
    } catch {
      /* ignore */
    }
  }, [scheduleTimeDisplayMode]);

  const [commandSchedulesLoading, setCommandSchedulesLoading] = useState(false);
  const [commandSchedulesSaving, setCommandSchedulesSaving] = useState(false);
  const [commandSchedulesError, setCommandSchedulesError] = useState(null);
  const [pendingCommands, setPendingCommands] = useState([]);
  const [pendingCommandsLoading, setPendingCommandsLoading] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [commandHistoryLoading, setCommandHistoryLoading] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyVehiclesLoading, setCopyVehiclesLoading] = useState(false);
  const [copySubmitLoading, setCopySubmitLoading] = useState(false);
  const [copyVehiclesError, setCopyVehiclesError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [copyVehicleSearch, setCopyVehicleSearch] = useState('');
  const [copyTargetVehicles, setCopyTargetVehicles] = useState([]);
  const [copySelectedVehicleIds, setCopySelectedVehicleIds] = useState([]);

  const associatedDevices = useMemo(() => {
    const rawIds = (vehicle?.deviceIds && Array.isArray(vehicle.deviceIds) && vehicle.deviceIds.length > 0)
      ? vehicle.deviceIds
      : (vehicle?.devices && Array.isArray(vehicle.devices))
        ? vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
        : (vehicle?.device_id != null ? [vehicle.device_id] : []);
    return rawIds.map((id) => allDevices.find((d) => d && d.id === id)).filter(Boolean);
  }, [vehicle, allDevices]);

  const getDeviceLabel = useCallback((deviceId) => {
    const device = allDevices.find((item) => item && item.id === deviceId);
    return device?.name || device?.uniqueId || `Device ${deviceId}`;
  }, [allDevices]);

  const sourceVehicleId = vehicle?.id || null;
  const sourceClientId = vehicle?.client_id || null;

  const filteredCopyVehicles = useMemo(() => {
    const term = copyVehicleSearch.trim().toLowerCase();
    if (!term) return copyTargetVehicles;
    return copyTargetVehicles.filter((item) => {
      const plate = String(item?.plate || '').toLowerCase();
      const nickname = String(item?.nickname || '').toLowerCase();
      const make = String(item?.make || '').toLowerCase();
      const model = String(item?.model || '').toLowerCase();
      return plate.includes(term) || nickname.includes(term) || make.includes(term) || model.includes(term);
    });
  }, [copyTargetVehicles, copyVehicleSearch]);

  const filteredCopyVehicleIds = useMemo(
    () => filteredCopyVehicles.map((item) => item.id),
    [filteredCopyVehicles],
  );

  const allFilteredSelected = useMemo(
    () => filteredCopyVehicleIds.length > 0
      && filteredCopyVehicleIds.every((id) => copySelectedVehicleIds.includes(id)),
    [filteredCopyVehicleIds, copySelectedVehicleIds],
  );

  const selectedInFilterCount = useMemo(
    () => filteredCopyVehicleIds.filter((id) => copySelectedVehicleIds.includes(id)).length,
    [filteredCopyVehicleIds, copySelectedVehicleIds],
  );

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

  const loadCommandSchedules = useCallback(async () => {
    if (!vehicle?.id) return;
    setCommandSchedulesLoading(true);
    setCommandSchedulesError(null);
    try {
      const response = await fetchOrThrow(`/api/vehicles/${vehicle.id}/scheduled-commands`, {
        credentials: 'include',
      });
      const data = await response.json();
      const list = Array.isArray(data?.schedules) ? data.schedules : [];
      if (list.length === 7) {
        setScheduleGroups(clusterSchedulesToGroups(list));
      } else {
        setScheduleGroups([createDefaultScheduleGroup()]);
      }
    } catch (e) {
      setScheduleGroups([createDefaultScheduleGroup()]);
      setCommandSchedulesError(e?.message || 'Erro ao carregar agendamento.');
    } finally {
      setCommandSchedulesLoading(false);
    }
  }, [vehicle?.id]);

  const loadPendingCommands = useCallback(async () => {
    if (!vehicle?.id) return;
    setPendingCommandsLoading(true);
    try {
      const response = await fetchOrThrow(`/api/vehicles/${vehicle.id}/scheduled-commands/pending`, {
        credentials: 'include',
      });
      const data = await response.json();
      setPendingCommands(Array.isArray(data?.pending) ? data.pending : []);
    } catch {
      setPendingCommands([]);
    } finally {
      setPendingCommandsLoading(false);
    }
  }, [vehicle?.id]);

  const loadCommandHistory = useCallback(async () => {
    if (!vehicle?.id) return;
    setCommandHistoryLoading(true);
    try {
      const response = await fetchOrThrow(`/api/vehicles/${vehicle.id}/scheduled-commands/history?limit=50`, {
        credentials: 'include',
      });
      const data = await response.json();
      setCommandHistory(Array.isArray(data?.history) ? data.history : []);
    } catch {
      setCommandHistory([]);
    } finally {
      setCommandHistoryLoading(false);
    }
  }, [vehicle?.id]);

  useEffect(() => {
    if (open && activeSection === 'commands') {
      loadCommandSchedules();
      loadPendingCommands();
      loadCommandHistory();
    }
  }, [open, activeSection, loadCommandHistory, loadCommandSchedules, loadPendingCommands]);

  const handleScheduleRecurrenceChange = useCallback((groupId, nextRecurrence) => {
    setScheduleGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      if (nextRecurrence === 'custom') {
        const seed = expandRecurrence(g.recurrence, g.customDays);
        return {
          ...g,
          recurrence: 'custom',
          customDays: seed.length ? seed : [],
        };
      }
      return { ...g, recurrence: nextRecurrence, customDays: [] };
    }));
  }, []);

  const toggleScheduleCustomDay = useCallback((groupId, dow) => {
    setScheduleGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      const base = g.recurrence === 'custom'
        ? [...(Array.isArray(g.customDays) ? g.customDays : [])]
        : expandRecurrence(g.recurrence, g.customDays);
      const next = new Set(base);
      if (next.has(dow)) next.delete(dow);
      else next.add(dow);
      const sorted = [...next].sort((a, b) => a - b);
      return { ...g, recurrence: 'custom', customDays: sorted };
    }));
  }, []);

  const addScheduleGroup = useCallback(() => {
    setScheduleGroups((prev) => [...prev, createDefaultScheduleGroup()]);
  }, []);

  const removeScheduleGroup = useCallback((groupId) => {
    setScheduleGroups((prev) => (
      prev.length <= 1 ? [createDefaultScheduleGroup()] : prev.filter((g) => g.id !== groupId)
    ));
  }, []);

  const updateScheduleGroup = useCallback((groupId, patch) => {
    setScheduleGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));
  }, []);

  const handleSaveCommandSchedules = async () => {
    if (!vehicle?.id) return;
    setCommandSchedulesSaving(true);
    setCommandSchedulesError(null);
    try {
      const schedules = mergeGroupsToSchedules(scheduleGroups).map((row) => ({
        day_of_week: row.day_of_week,
        lock_time: row.lock_time && String(row.lock_time).trim() ? String(row.lock_time).trim().slice(0, 5) : null,
        unlock_time: row.unlock_time && String(row.unlock_time).trim() ? String(row.unlock_time).trim().slice(0, 5) : null,
        enabled: row.enabled !== false,
      }));
      if (schedules.length !== 7) {
        setCommandSchedulesError('Dados incompletos (7 dias).');
        return;
      }
      await fetchOrThrow(`/api/vehicles/${vehicle.id}/scheduled-commands`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ schedules }),
      });
      await loadCommandSchedules();
      await loadPendingCommands();
      await loadCommandHistory();
    } catch (e) {
      setCommandSchedulesError(e?.message || 'Erro ao salvar.');
    } finally {
      setCommandSchedulesSaving(false);
    }
  };

  const handleCancelPendingCommand = useCallback(async (pendingId) => {
    if (!vehicle?.id || !pendingId) return;
    const confirmed = window.confirm('Cancelar este comando pendente?');
    if (!confirmed) return;
    try {
      await fetchOrThrow(`/api/vehicles/${vehicle.id}/scheduled-commands/pending/${pendingId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      await loadPendingCommands();
      await loadCommandHistory();
    } catch (e) {
      setCommandSchedulesError(e?.message || 'Erro ao cancelar comando pendente.');
    }
  }, [loadCommandHistory, loadPendingCommands, vehicle?.id]);

  const loadCopyTargetVehicles = useCallback(async () => {
    if (!sourceVehicleId || !sourceClientId) {
      setCopyTargetVehicles([]);
      return;
    }
    setCopyVehiclesLoading(true);
    setCopyVehiclesError(null);
    try {
      const response = await fetchOrThrow('/api/vehicles', { credentials: 'include' });
      const data = await response.json();
      const allVehicles = Array.isArray(data) ? data : [];
      const eligibleVehicles = allVehicles.filter(
        (item) => item?.id && item.id !== sourceVehicleId && item.client_id === sourceClientId,
      );
      setCopyTargetVehicles(eligibleVehicles);
    } catch (e) {
      setCopyVehiclesError(e?.message || 'Erro ao carregar veículos para cópia.');
      setCopyTargetVehicles([]);
    } finally {
      setCopyVehiclesLoading(false);
    }
  }, [sourceVehicleId, sourceClientId]);

  const handleToggleCopyTarget = useCallback((targetId) => {
    setCopySelectedVehicleIds((prev) => (
      prev.includes(targetId)
        ? prev.filter((id) => id !== targetId)
        : [...prev, targetId]
    ));
  }, []);

  const handleToggleSelectAllFiltered = useCallback(() => {
    if (!filteredCopyVehicleIds.length) return;
    setCopySelectedVehicleIds((prev) => {
      if (allFilteredSelected) {
        return prev.filter((id) => !filteredCopyVehicleIds.includes(id));
      }
      const merged = new Set([...prev, ...filteredCopyVehicleIds]);
      return [...merged];
    });
  }, [filteredCopyVehicleIds, allFilteredSelected]);

  const handleOpenCopyModal = useCallback(async () => {
    setCopyFeedback(null);
    setCopyVehicleSearch('');
    setCopySelectedVehicleIds([]);
    setCopyModalOpen(true);
    await loadCopyTargetVehicles();
  }, [loadCopyTargetVehicles]);

  const handleCopySchedulesToVehicles = useCallback(async () => {
    if (!sourceVehicleId || copySelectedVehicleIds.length === 0) return;
    const confirmed = window.confirm(
      `Copiar programação para ${copySelectedVehicleIds.length} veículo(s)?`,
    );
    if (!confirmed) return;

    setCopySubmitLoading(true);
    setCopyVehiclesError(null);
    try {
      const response = await fetchOrThrow('/api/vehicles/scheduled-commands/batch-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source_vehicle_id: sourceVehicleId,
          target_vehicle_ids: copySelectedVehicleIds,
        }),
      });
      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      const updatedCount = results.filter((item) => item?.status === 'updated').length;
      const deniedCount = results.filter((item) => item?.status === 'denied').length;
      const notFoundCount = results.filter((item) => item?.status === 'not_found').length;
      setCopyFeedback({
        severity: deniedCount > 0 || notFoundCount > 0 ? 'warning' : 'success',
        message: `Programação copiada para ${updatedCount} veículo(s).`
          + (deniedCount > 0 ? ` Negados: ${deniedCount}.` : '')
          + (notFoundCount > 0 ? ` Não encontrados: ${notFoundCount}.` : ''),
      });
      setCopyModalOpen(false);
      setCopySelectedVehicleIds([]);
      setCopyVehicleSearch('');
    } catch (e) {
      setCopyVehiclesError(e?.message || 'Erro ao copiar programação.');
    } finally {
      setCopySubmitLoading(false);
    }
  }, [copySelectedVehicleIds, sourceVehicleId]);

  useEffect(() => {
    if (!open) {
      setSmsModalOpen(false);
      setSmsModalDeviceId(null);
      setSmsModalDeviceIds([]);
      setSmsModalPhone('');
      setSelectedSmsDeviceIds([]);
      setHistoryDialogOpen(false);
      setHistoryDialogDeviceId(null);
      setResetModalOpen(false);
      setResetDeviceId(null);
      setResetError(null);
      setRemoveDeviceId(null);
      setAnchorEl(null);
      setOsOrders([]);
      setOsFetchError(null);
      setOsLoading(false);
      setScheduleGroups([createDefaultScheduleGroup()]);
      setCommandSchedulesError(null);
      setCommandSchedulesLoading(false);
      setCopyModalOpen(false);
      setCopyVehiclesLoading(false);
      setCopySubmitLoading(false);
      setCopyVehiclesError(null);
      setCopyVehicleSearch('');
      setCopyTargetVehicles([]);
      setCopySelectedVehicleIds([]);
      setCopyFeedback(null);
      setWeeklyPreviewExpanded(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !manager || activeSection !== 'data' || !vehicle?.plate) {
      return;
    }
    let cancelled = false;
    const plate = String(vehicle.plate).trim();
    if (!plate) return;

    const loadOsByPlate = async () => {
      setOsLoading(true);
      setOsFetchError(null);
      try {
        const res = await fetchOrThrow(
          `/os-api/work-orders/by-plate/${encodeURIComponent(plate)}`,
          { credentials: 'include' },
        );
        const data = await res.json();
        if (!cancelled) {
          setOsOrders(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setOsOrders([]);
          setOsFetchError(e?.message || 'Não foi possível carregar as OS.');
        }
      } finally {
        if (!cancelled) setOsLoading(false);
      }
    };

    loadOsByPlate();
    return () => { cancelled = true; };
  }, [open, manager, activeSection, vehicle?.plate]);

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
        setSmsModalDeviceIds([]);
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

  const allAssociatedSelected = associatedDevices.length > 0
    && associatedDevices.every((d) => selectedSmsDeviceIds.includes(d.id));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isCompactNav}
      slotProps={{ root: { sx: { zIndex: Z_VEHICLE_DETAILS } } }}
      PaperProps={{
        sx: {
          maxHeight: { xs: '100%', md: '90vh' },
          height: { xs: '100%', md: 'auto' },
          display: 'flex',
          flexDirection: 'column',
          m: { xs: 0, md: 2 },
          backgroundColor: colors.surface || '#fff',
          border: `1px solid ${colors.border || '#E5E7EB'}`,
          borderRadius: { xs: 0, md: '16px' },
        },
      }}
    >
      <Box sx={{
        p: { xs: 1.5, sm: 2 },
        borderBottom: `1px solid ${colors.border || '#E5E7EB'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onClose}
          sx={{
            color: colors.textSecondary || '#9CA3AF',
            minHeight: 44,
            px: { xs: 1, sm: 2 },
          }}
        >
          Voltar
        </Button>
        <Typography
          variant="h6"
          sx={{
            color: colors.text || '#111827',
            flex: 1,
            minWidth: 0,
            fontSize: { xs: '1rem', sm: '1.25rem' },
          }}
          noWrap
          title={vehicle?.plate ? `DETALHES DO VEÍCULO - ${vehicle.plate}` : undefined}
        >
          DETALHES DO VEÍCULO - {vehicle?.plate || '...'}
        </Typography>
      </Box>

      <DialogContent sx={{
        p: { xs: 1.5, sm: 2 },
        overflow: 'auto',
        flex: '1 1 auto',
        minHeight: 0,
      }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 1.5, md: 2 },
          alignItems: { xs: 'stretch', md: 'flex-start' },
        }}
        >
          {isCompactNav && (
            <Paper
              sx={{
                width: '100%',
                flexShrink: 0,
                border: `1px solid ${colors.border || '#E5E7EB'}`,
                overflow: 'hidden',
              }}
            >
              <Tabs
                value={activeSection}
                onChange={(e, v) => setActiveSection(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  minHeight: 48,
                  '& .MuiTab-root': {
                    minHeight: 44,
                    py: 1,
                    px: 1.25,
                    fontSize: '0.8rem',
                  },
                }}
              >
                <Tab label="Disp." value="devices" />
                <Tab label="Alertas" value="alerts" />
                <Tab label="Comandos" value="commands" />
                {manager && <Tab label="Dados" value="data" />}
              </Tabs>
            </Paper>
          )}
          {!isCompactNav && (
          <Paper sx={{ flex: '1 1 200px', minWidth: 200, maxWidth: 260, p: 2, border: `1px solid ${colors.border || '#E5E7EB'}` }}>
            <List dense disablePadding>
              <ListItemButton selected={activeSection === 'devices'} onClick={() => setActiveSection('devices')}>
                <ListItemIcon sx={{ minWidth: 36 }}><DevicesIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Dispositivos" />
              </ListItemButton>
              <ListItemButton selected={activeSection === 'alerts'} onClick={() => setActiveSection('alerts')}>
                <ListItemIcon sx={{ minWidth: 36 }}><NotificationsIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Alertas" />
              </ListItemButton>
              <ListItemButton selected={activeSection === 'commands'} onClick={() => setActiveSection('commands')}>
                <ListItemIcon sx={{ minWidth: 36 }}><ScheduleIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Comandos" />
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
          )}

          <Box sx={{ flex: '2 1 0', minWidth: 0, width: '100%' }}>
            {activeSection === 'devices' && (
              <Paper sx={{ p: { xs: 1.5, sm: 2 }, border: `1px solid ${colors.border || '#E5E7EB'}` }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: { xs: 'stretch', sm: 'flex-end' },
                  mb: 1,
                }}
                >
                  <Button
                    size="small"
                    variant="contained"
                    fullWidth={isCompactNav}
                    startIcon={<SendIcon />}
                    disabled={selectedSmsDeviceIds.length === 0}
                    sx={{ minHeight: isCompactNav ? 44 : undefined }}
                    onClick={() => {
                      setSmsModalDeviceId(null);
                      setSmsModalDeviceIds(selectedSmsDeviceIds);
                      setSmsModalPhone('');
                      setSmsModalOpen(true);
                    }}
                  >
                    Enviar SMS selecionados ({selectedSmsDeviceIds.length})
                  </Button>
                </Box>
                <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={allAssociatedSelected}
                            indeterminate={!allAssociatedSelected && selectedSmsDeviceIds.length > 0}
                            onChange={() => {
                              if (allAssociatedSelected) {
                                setSelectedSmsDeviceIds([]);
                              } else {
                                setSelectedSmsDeviceIds(associatedDevices.map((d) => d.id));
                              }
                            }}
                          />
                        </TableCell>
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
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedSmsDeviceIds.includes(device.id)}
                              onChange={() => {
                                setSelectedSmsDeviceIds((prev) => (
                                  prev.includes(device.id)
                                    ? prev.filter((id) => id !== device.id)
                                    : [...prev, device.id]
                                ));
                              }}
                            />
                          </TableCell>
                          <TableCell>{device.uniqueId || '-'}</TableCell>
                          <TableCell>{device.name || '-'}</TableCell>
                          <TableCell>{device.model || '-'}</TableCell>
                          {admin && <TableCell>{device.phone || '-'}</TableCell>}
                          <TableCell>{positions[device.id]?.fixTime ? new Date(positions[device.id].fixTime).toLocaleString('pt-BR') : '-'}</TableCell>
                          <TableCell><DeviceStatusIcons position={positions[device.id]} /></TableCell>
                          {admin && (
                            <TableCell align="right">
                              <IconButton
                                size="medium"
                                sx={{ minWidth: 44, minHeight: 44 }}
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
              <Paper sx={{ p: { xs: 1.5, sm: 2 }, border: `1px solid ${colors.border || '#E5E7EB'}` }}>
                {alertsLoading ? <CircularProgress size={20} /> : ALERT_TYPES.map((item) => (
                  <Box key={item.key} sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: { xs: 1, sm: 0 },
                    py: 1,
                  }}
                  >
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
                          sx={{ width: { xs: '100%', sm: 140 }, maxWidth: '100%' }}
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
                <Button variant="contained" fullWidth={isCompactNav} onClick={handleSaveAlerts} disabled={alertsSaving} sx={{ mt: 2, minHeight: isCompactNav ? 44 : undefined }}>
                  {alertsSaving ? 'Salvando...' : 'Salvar Alertas'}
                </Button>
              </Paper>
            )}

            {activeSection === 'commands' && (
              <Paper sx={{ p: { xs: 1.5, sm: 2 }, border: `1px solid ${colors.border || '#E5E7EB'}` }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: colors.text || '#111827', mb: 1 }}>
                  Comandos programados
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textSecondary || '#9CA3AF', mb: 1 }}>
                  Bloqueio e desbloqueio automáticos do motor (Traccar: engineStop / engineResume), por dia da semana.
                  O horário segue o relógio do servidor (defina TZ no ambiente do backend se necessário).
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: colors.textSecondary || '#9CA3AF', mb: 2 }}>
                  Adicione um ou mais horários (estilo despertador). Se dois horários cobrirem o mesmo dia,
                  prevalece o que está mais abaixo na lista.
                </Typography>
                {commandSchedulesError && (
                  <Alert severity="warning" sx={{ mb: 2 }}>{commandSchedulesError}</Alert>
                )}
                {copyFeedback && (
                  <Alert
                    severity={copyFeedback.severity}
                    sx={{ mb: 2 }}
                    onClose={() => setCopyFeedback(null)}
                  >
                    {copyFeedback.message}
                  </Alert>
                )}
                {commandSchedulesLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <>
                    <Box sx={{
                      display: 'flex',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1,
                      flexWrap: 'wrap',
                      mb: 2,
                      flexDirection: { xs: 'column', sm: 'row' },
                    }}
                    >
                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                        Formato da hora:
                      </Typography>
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={scheduleTimeDisplayMode}
                        onChange={(_, v) => {
                          if (v != null) setScheduleTimeDisplayMode(v);
                        }}
                        sx={{
                          width: { xs: '100%', sm: 'auto' },
                          '& .MuiToggleButton-root': {
                            flex: { xs: 1, sm: 'unset' },
                            py: 1,
                          },
                        }}
                        aria-label="Formato do relógio (24 horas ou AM/PM)"
                      >
                        <ToggleButton value="24h">24 h</ToggleButton>
                        <ToggleButton value="12h">AM/PM</ToggleButton>
                      </ToggleButtonGroup>
                      <Typography variant="caption" sx={{ color: colors.textSecondary, width: { xs: '100%', sm: 'auto' } }}>
                        (salvo neste navegador; o servidor usa 24 h)
                      </Typography>
                    </Box>
                    {scheduleGroups.map((group) => (
                      <Box
                        key={group.id}
                        sx={{
                          mb: 2,
                          p: { xs: 1.25, sm: 1.5 },
                          borderRadius: 1,
                          border: `1px solid ${colors.border || '#E5E7EB'}`,
                        }}
                      >
                        <Box sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 1,
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                        >
                          <FormControl size="small" sx={{
                            width: { xs: '100%', sm: 'auto' },
                            minWidth: { xs: 0, sm: 220 },
                            flex: { xs: '1 1 100%', sm: '1 1 200px' },
                          }}
                          >
                            <InputLabel id={`schedule-rec-${group.id}`}>Repetição</InputLabel>
                            <Select
                              labelId={`schedule-rec-${group.id}`}
                              label="Repetição"
                              value={group.recurrence}
                              onChange={(e) => handleScheduleRecurrenceChange(group.id, e.target.value)}
                              MenuProps={COMMAND_SELECT_MENU_PROPS}
                            >
                              {SCHEDULE_RECURRENCE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            alignSelf: { xs: 'flex-end', sm: 'auto' },
                          }}
                          >
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>Ativo</Typography>
                            <Switch
                              checked={group.enabled !== false}
                              onChange={(e) => updateScheduleGroup(group.id, { enabled: e.target.checked })}
                            />
                            <IconButton
                              size="medium"
                              sx={{ minWidth: 44, minHeight: 44 }}
                              aria-label="Remover horário"
                              onClick={() => removeScheduleGroup(group.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>
                        {group.recurrence === 'custom' && (
                          <Box sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: { xs: 0.5, sm: 0.25 },
                            mt: 1.5,
                            columnGap: 1,
                          }}
                          >
                            {COMMAND_DAY_DISPLAY_ORDER.map((dow) => (
                              <FormControlLabel
                                key={`${group.id}-day-${dow}`}
                                sx={{ mr: 0.75 }}
                                control={(
                                  <Checkbox
                                    size="small"
                                    checked={(group.customDays || []).includes(dow)}
                                    onChange={() => toggleScheduleCustomDay(group.id, dow)}
                                  />
                                )}
                                label={SCHEDULE_DAY_SHORT[dow]}
                              />
                            ))}
                          </Box>
                        )}
                        <ScheduledCommandTimeInputs
                          groupId={group.id}
                          lockTime={group.lock_time}
                          unlockTime={group.unlock_time}
                          disabled={group.enabled === false}
                          timeDisplayMode={scheduleTimeDisplayMode}
                          onPatch={(patch) => updateScheduleGroup(group.id, patch)}
                        />
                      </Box>
                    ))}
                    <Button variant="outlined" size="medium" fullWidth={isCompactNav} onClick={addScheduleGroup} sx={{ mb: 2, minHeight: isCompactNav ? 44 : undefined }}>
                      Adicionar horário
                    </Button>

                    <Accordion expanded={weeklyPreviewExpanded} onChange={(_, expanded) => setWeeklyPreviewExpanded(expanded)}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 52, '& .MuiAccordionSummary-content': { my: 1 } }}>
                        <Typography variant="subtitle2">Grade semanal (resultado)</Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: { xs: 0.5, sm: 2 } }}>
                        <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Dia</TableCell>
                                <TableCell>Bloqueio</TableCell>
                                <TableCell>Desbloqueio</TableCell>
                                <TableCell align="center">Ativo</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {COMMAND_DAY_DISPLAY_ORDER.map((dow) => {
                                const row = commandSchedules.find((r) => r.day_of_week === dow) || {
                                  day_of_week: dow,
                                  lock_time: null,
                                  unlock_time: null,
                                  enabled: false,
                                };
                                return (
                                  <TableRow key={dow}>
                                    <TableCell>{COMMAND_DAY_LABELS[dow]}</TableCell>
                                    <TableCell>
                                      {row.lock_time
                                        ? formatTimeForDisplay(row.lock_time, scheduleTimeDisplayMode)
                                        : '—'}
                                    </TableCell>
                                    <TableCell>
                                      {row.unlock_time
                                        ? formatTimeForDisplay(row.unlock_time, scheduleTimeDisplayMode)
                                        : '—'}
                                    </TableCell>
                                    <TableCell align="center">{row.enabled !== false ? 'Sim' : 'Não'}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
                      <Button
                        variant="contained"
                        fullWidth={isCompactNav}
                        onClick={handleSaveCommandSchedules}
                        disabled={commandSchedulesSaving}
                        sx={{ minHeight: isCompactNav ? 44 : undefined }}
                      >
                        {commandSchedulesSaving ? 'Salvando...' : 'Salvar comandos'}
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth={isCompactNav}
                        onClick={handleOpenCopyModal}
                        disabled={commandSchedulesSaving}
                        sx={{ minHeight: isCompactNav ? 44 : undefined }}
                      >
                        Copiar programação
                      </Button>
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: colors.text || '#111827', mb: 1 }}>
                      Pendentes (aguardando device online)
                    </Typography>
                    {pendingCommandsLoading ? (
                      <CircularProgress size={20} />
                    ) : pendingCommands.length === 0 ? (
                      <Typography variant="body2" sx={{ color: colors.textSecondary || '#9CA3AF' }}>
                        Nenhum comando aguardando.
                      </Typography>
                    ) : (
                      <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Agendado para</TableCell>
                              <TableCell>Comando</TableCell>
                              <TableCell>Device</TableCell>
                              <TableCell>Expira em</TableCell>
                              <TableCell align="center">Tentativas</TableCell>
                              <TableCell align="right">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {pendingCommands.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{formatCommandDate(item.scheduled_for)}</TableCell>
                                <TableCell>{COMMAND_TYPE_LABELS[item.command_type] || item.command_type}</TableCell>
                                <TableCell>{getDeviceLabel(item.device_id)}</TableCell>
                                <TableCell>{formatCommandDate(item.expires_at)}</TableCell>
                                <TableCell align="center">{item.attempts || 0}</TableCell>
                                <TableCell align="right">
                                  <Button size="small" color="warning" onClick={() => handleCancelPendingCommand(item.id)}>
                                    Cancelar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: colors.text || '#111827', mb: 1 }}>
                      Histórico recente
                    </Typography>
                    {commandHistoryLoading ? (
                      <CircularProgress size={20} />
                    ) : commandHistory.length === 0 ? (
                      <Typography variant="body2" sx={{ color: colors.textSecondary || '#9CA3AF' }}>
                        Nenhum envio registrado.
                      </Typography>
                    ) : (
                      <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Tentativa</TableCell>
                              <TableCell>Comando</TableCell>
                              <TableCell>Device</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Mensagem</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {commandHistory.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{formatCommandDate(item.attempted_at)}</TableCell>
                                <TableCell>{COMMAND_TYPE_LABELS[item.command_type] || item.command_type}</TableCell>
                                <TableCell>{item.device_id ? getDeviceLabel(item.device_id) : '—'}</TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={COMMAND_STATUS_LABELS[item.status] || item.status}
                                    color={COMMAND_STATUS_COLORS[item.status] || 'default'}
                                  />
                                </TableCell>
                                <TableCell>
                                  {item.error_message || (item.http_code ? `HTTP ${item.http_code}` : '—')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                )}
              </Paper>
            )}

            {manager && activeSection === 'data' && (
              <Paper sx={{ p: { xs: 1.5, sm: 2 }, border: `1px solid ${colors.border || '#E5E7EB'}` }}>
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
                <Typography sx={{ color: colors.text || '#111827', mb: 2 }}>
                  {(vehicle?.client_name && String(vehicle.client_name).trim()) || '—'}
                </Typography>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: colors.text || '#111827', mb: 1 }}>
                  Fotos da OS
                </Typography>
                {osFetchError && (
                  <Alert severity="warning" sx={{ mb: 2 }}>{osFetchError}</Alert>
                )}
                {osLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={28} />
                  </Box>
                )}
                {!osLoading && !osFetchError && osOrders.length === 0 && (
                  <Typography variant="body2" sx={{ color: colors.textSecondary || '#9CA3AF' }}>
                    Nenhuma OS encontrada para este veículo.
                  </Typography>
                )}
                {!osLoading && osOrders.length > 0 && osOrders.map((order) => {
                  const statusLabel = OS_STATUS_LABELS[order.status] || order.status || '—';
                  const created = order.created_at
                    ? new Date(order.created_at).toLocaleString('pt-BR')
                    : '—';
                  const attachments = Array.isArray(order.attachments) ? order.attachments : [];
                  return (
                    <Box key={order.id} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary || '#9CA3AF', mb: 1 }}>
                        OS #{order.id} — {order.type || '—'} — {statusLabel} — {created}
                      </Typography>
                      {attachments.length === 0 ? (
                        <Typography variant="body2" sx={{ color: colors.textSecondary || '#9CA3AF', mb: 1 }}>
                          Nenhuma foto anexada.
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {attachments.map((attachment, index) => {
                            const raw = attachment.file_path || '';
                            const imgUrl = raw.replace('/var/www/os_system/uploads/', '/os-uploads/');
                            return (
                              <Box
                                key={attachment.id != null ? attachment.id : `${order.id}-${index}`}
                                component="img"
                                src={imgUrl}
                                alt=""
                                sx={{
                                  width: 96,
                                  height: 96,
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: colors.border || 'divider',
                                  cursor: 'pointer',
                                }}
                                onClick={() => window.open(imgUrl, '_blank')}
                              />
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  );
                })}
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
          setSmsModalDeviceIds([]);
          setSmsModalPhone('');
        }}
        deviceId={smsModalDeviceId}
        deviceIds={smsModalDeviceIds}
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
        open={copyModalOpen}
        onClose={() => !copySubmitLoading && setCopyModalOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isCompactNav}
        slotProps={{ root: { sx: { zIndex: Z_ACTION_OVER_DETAILS } } }}
        PaperProps={{
          sx: {
            backgroundColor: colors.surface || '#fff',
            border: `1px solid ${colors.border || '#E5E7EB'}`,
            borderRadius: { xs: 0, sm: 1 },
          },
        }}
      >
        <DialogTitle sx={{ color: colors.text || '#111827' }}>
          Copiar programação
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: colors.textSecondary || '#9CA3AF', mb: 2 }}>
            Selecione os veículos do mesmo cliente que receberão a programação deste veículo.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Filtrar veículos"
            placeholder="Placa, apelido, marca ou modelo"
            value={copyVehicleSearch}
            onChange={(e) => setCopyVehicleSearch(e.target.value)}
            sx={{ mb: 1.5 }}
          />
          {copyVehiclesError && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>{copyVehiclesError}</Alert>
          )}
          {copyVehiclesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: 1,
                mb: 1,
              }}
              >
                <Button
                  size="small"
                  fullWidth={isCompactNav}
                  sx={{ minHeight: isCompactNav ? 40 : undefined }}
                  onClick={handleToggleSelectAllFiltered}
                  disabled={filteredCopyVehicleIds.length === 0}
                >
                  {allFilteredSelected ? 'Desmarcar todos (filtro)' : 'Selecionar todos (filtro)'}
                </Button>
                <Typography variant="caption" sx={{ color: colors.textSecondary || '#9CA3AF' }}>
                  Selecionados: {copySelectedVehicleIds.length} (no filtro: {selectedInFilterCount})
                </Typography>
              </Box>
              <Paper variant="outlined" sx={{ maxHeight: 280, overflow: 'auto' }}>
                <List dense disablePadding>
                  {filteredCopyVehicles.map((item) => (
                    <ListItemButton key={item.id} onClick={() => handleToggleCopyTarget(item.id)}>
                      <ListItemIcon sx={{ minWidth: 34 }}>
                        <Checkbox
                          edge="start"
                          checked={copySelectedVehicleIds.includes(item.id)}
                          tabIndex={-1}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.plate || 'Sem placa'}
                        secondary={[item.nickname, item.make, item.model].filter(Boolean).join(' • ') || '—'}
                      />
                    </ListItemButton>
                  ))}
                  {!filteredCopyVehicles.length && (
                    <Box sx={{ px: 2, py: 2 }}>
                      <Typography variant="body2" sx={{ color: colors.textSecondary || '#9CA3AF' }}>
                        Nenhum veículo encontrado para este filtro.
                      </Typography>
                    </Box>
                  )}
                </List>
              </Paper>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 1 },
          gap: 1,
        }}
        >
          <Button
            fullWidth={isCompactNav}
            onClick={() => !copySubmitLoading && setCopyModalOpen(false)}
            disabled={copySubmitLoading}
            sx={{ color: colors.textSecondary || '#9CA3AF', minHeight: isCompactNav ? 44 : undefined }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            fullWidth={isCompactNav}
            onClick={handleCopySchedulesToVehicles}
            disabled={copySubmitLoading || copySelectedVehicleIds.length === 0 || copyVehiclesLoading}
            sx={{ minHeight: isCompactNav ? 44 : undefined }}
          >
            {copySubmitLoading ? 'Copiando...' : 'Copiar'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={resetModalOpen}
        onClose={() => !resetLoading && setResetModalOpen(false)}
        fullScreen={isCompactNav}
        slotProps={{ root: { sx: { zIndex: Z_ACTION_OVER_DETAILS } } }}
        PaperProps={{
          sx: {
            backgroundColor: colors.surface || '#fff',
            border: `1px solid ${colors.border || '#E5E7EB'}`,
            borderRadius: { xs: 0, sm: 1 },
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
        <DialogActions sx={{
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 1 },
          gap: 1,
        }}
        >
          <Button fullWidth={isCompactNav} onClick={() => !resetLoading && setResetModalOpen(false)} disabled={resetLoading} sx={{ color: colors.textSecondary || '#9CA3AF', minHeight: isCompactNav ? 44 : undefined }}>
            Cancelar
          </Button>
          <Button fullWidth={isCompactNav} variant="contained" color="secondary" onClick={handleResetConfirm} disabled={resetLoading} sx={{ minHeight: isCompactNav ? 44 : undefined }}>
            {resetLoading ? <CircularProgress size={20} /> : t('deviceResetSimcard')}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default VehicleDetailsModal;
