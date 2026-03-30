import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  Table, TableRow, TableCell, TableHead, TableBody, Button, TableFooter, FormControlLabel, Switch,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Alert,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import SendIcon from '@mui/icons-material/Send';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FilterListIcon from '@mui/icons-material/FilterList';
import MapIcon from '@mui/icons-material/Map';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HistoryIcon from '@mui/icons-material/History';
import { useTheme } from '@mui/material/styles';
import { useEffectAsync } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import SearchHeader, { filterByKeyword } from './components/SearchHeader';
import DeviceStatusIcons from './components/DeviceStatusIcons';
import DeviceVehicleHistoryDialog from './components/DeviceVehicleHistoryDialog';
import SmsSendModal from './components/SmsSendModal';
import { formatTime } from '../common/util/formatter';
import { useAdministrator, useDeviceReadonly, useManager } from '../common/util/permissions';
import useSettingsStyles from './common/useSettingsStyles';
import usePersistedState from '../common/util/usePersistedState';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { fetchVehicles, devicesActions } from '../store';

const TELECOM_BASE = '/gestao/telecom';

const DevicesPage = () => {
  const { classes } = useSettingsStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const admin = useAdministrator();
  const manager = useManager();
  const deviceReadonly = useDeviceReadonly();
  const positions = useSelector((state) => state.session.positions);
  const vehicles = useSelector((state) => state.fleet.vehicles) || [];

  const [timestamp, setTimestamp] = useState(Date.now());
  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAll, setShowAll] = usePersistedState('showAllDevices', false);
  const [filterUnlinkedOnly, setFilterUnlinkedOnly] = usePersistedState('filterUnlinkedDevices', false);
  const [loading, setLoading] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDialogDeviceId, setHistoryDialogDeviceId] = useState(null);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsModalDeviceId, setSmsModalDeviceId] = useState(null);
  const [smsModalPhone, setSmsModalPhone] = useState('');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetDeviceId, setResetDeviceId] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState(null);

  useEffect(() => {
    if (!admin) {
      navigate('/settings/preferences', { replace: true });
    }
  }, [admin, navigate]);

  useEffect(() => {
    dispatch(fetchVehicles());
  }, [dispatch]);

  useEffectAsync(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ all: showAll });
      const response = await fetchOrThrow(`/api/devices?${query.toString()}`);
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  }, [timestamp, showAll]);

  const deviceToVehicle = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {
      const ids = v.deviceIds || (v.devices?.map((d) => d.id)) || (v.device_id != null ? [v.device_id] : []);
      ids.forEach((id) => {
        if (!map[id]) map[id] = [];
        map[id].push(v);
      });
    });
    return map;
  }, [vehicles]);

  const getVehicleDisplay = (deviceId) => {
    const list = deviceToVehicle[deviceId];
    if (!list || list.length === 0) return '-';
    return list.map((v) => v.nickname || v.plate).join(', ');
  };

  const getClientDisplay = (deviceId) => {
    const list = deviceToVehicle[deviceId];
    if (!list || list.length === 0) return '-';
    const names = [...new Set(list.map((v) => v.client_name).filter(Boolean))];
    return names.join(', ') || '-';
  };

  const filteredItems = useMemo(() => {
    const matchesSearch = (item) => {
      if (!searchKeyword) return true;
      const kw = searchKeyword.toLowerCase();
      const baseMatch = filterByKeyword(searchKeyword)(item);
      const vehicleMatch = getVehicleDisplay(item.id).toLowerCase().includes(kw);
      const clientMatch = getClientDisplay(item.id).toLowerCase().includes(kw);
      return baseMatch || vehicleMatch || clientMatch;
    };
    let result = items.filter(matchesSearch);
    if (filterUnlinkedOnly) {
      result = result.filter((item) => {
        const list = deviceToVehicle[item.id];
        return !list || list.length === 0;
      });
    }
    return result;
  }, [items, searchKeyword, filterUnlinkedOnly, deviceToVehicle]);

  const handleExport = async () => {
    const filtered = filteredItems;
    const data = filtered.map((item) => ({
      [t('deviceIdentifier')]: item.uniqueId,
      [t('sharedName')]: item.name,
      [t('deviceModel')]: item.model,
      [t('sharedPhone')]: item.phone,
      [t('deviceVehicle')]: getVehicleDisplay(item.id),
      [t('deviceClient')]: getClientDisplay(item.id),
      [t('deviceLastUpdate')]: formatTime(item.lastUpdate, 'minutes'),
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t('deviceTitle'));
    const headers = data.length > 0 ? Object.keys(data[0]) : [
      t('deviceIdentifier'), t('sharedName'), t('deviceModel'), t('sharedPhone'),
      t('deviceVehicle'), t('deviceClient'), t('deviceLastUpdate'),
    ];

    const titleRow = worksheet.addRow([t('deviceTitle')]);
    worksheet.mergeCells(1, 1, 1, headers.length);
    titleRow.font = { bold: true };

    const border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.border = border;
      cell.font = {};
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${theme.palette.primary.main.replace('#', '').toUpperCase()}` },
      };
    });
    data.forEach((item) => {
      const row = worksheet.addRow(headers.map((h) => item[h]));
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = border;
        cell.font = {};
      });
    });

    const blob = new Blob(
      [await workbook.xlsx.writeBuffer()],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );
    saveAs(blob, 'devices.xlsx');
  };

  const actionConnections = {
    key: 'connections',
    title: t('sharedConnections'),
    icon: <LinkIcon fontSize="small" />,
    handler: (deviceId) => navigate(`/settings/device/${deviceId}/connections`),
  };

  const actionSendSms = {
    key: 'sendSms',
    title: t('deviceSendSms'),
    icon: <SendIcon fontSize="small" />,
    handler: (deviceId) => {
      const device = items.find((d) => d.id === deviceId);
      setSmsModalDeviceId(deviceId);
      setSmsModalPhone(device?.phone || '');
      setSmsModalOpen(true);
    },
  };

  const actionResetSimcard = {
    key: 'resetSimcard',
    title: t('deviceResetSimcard'),
    icon: <RestartAltIcon fontSize="small" />,
    handler: (deviceId) => {
      setResetDeviceId(deviceId);
      setResetError(null);
      setResetModalOpen(true);
    },
  };

  const actionGoogleMaps = {
    key: 'googleMaps',
    title: t('deviceOpenGoogleMaps'),
    icon: <MapIcon fontSize="small" />,
    handler: (deviceId) => {
      const pos = positions[deviceId];
      if (pos?.latitude != null && pos?.longitude != null) {
        window.open(`https://www.google.com/maps?q=${pos.latitude},${pos.longitude}`, '_blank');
      }
    },
  };

  const actionMonitor = {
    key: 'monitor',
    title: t('deviceMonitor'),
    icon: <LocationOnIcon fontSize="small" />,
    handler: (deviceId) => {
      dispatch(devicesActions.selectId(deviceId));
      navigate('/');
    },
  };

  const actionVehicleHistory = {
    key: 'vehicleHistory',
    title: t('deviceVehicleHistory'),
    icon: <HistoryIcon fontSize="small" />,
    handler: (deviceId) => {
      setHistoryDialogDeviceId(deviceId);
      setHistoryDialogOpen(true);
    },
  };

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

  const customActions = [
    actionConnections,
    actionSendSms,
    actionResetSimcard,
    actionGoogleMaps,
    actionMonitor,
    actionVehicleHistory,
  ];

  const columnCount = 9;

  if (!admin) return null;

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'deviceTitle']}>
      <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />
      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell>{t('deviceIdentifier')}</TableCell>
            <TableCell>{t('sharedName')}</TableCell>
            <TableCell>{t('deviceModel')}</TableCell>
            <TableCell>{t('sharedPhone')}</TableCell>
            <TableCell>{t('deviceVehicle')}</TableCell>
            <TableCell>{t('deviceClient')}</TableCell>
            <TableCell>{t('deviceLastUpdate')}</TableCell>
            <TableCell>{t('deviceStatus')}</TableCell>
            <TableCell className={classes.columnAction} />
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading ? filteredItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.uniqueId}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.model}</TableCell>
              <TableCell>{item.phone || '-'}</TableCell>
              <TableCell>{getVehicleDisplay(item.id)}</TableCell>
              <TableCell>{getClientDisplay(item.id)}</TableCell>
              <TableCell>{formatTime(item.lastUpdate, 'minutes')}</TableCell>
              <TableCell>
                <DeviceStatusIcons position={positions[item.id]} />
              </TableCell>
              <TableCell className={classes.columnAction} padding="none">
                <CollectionActions
                  itemId={item.id}
                  editPath="/settings/device"
                  endpoint="devices"
                  setTimestamp={setTimestamp}
                  customActions={customActions}
                  readonly={deviceReadonly}
                />
              </TableCell>
            </TableRow>
          )) : (<TableShimmer columns={columnCount} endAction />)}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>
              <Button onClick={handleExport} variant="text">{t('reportExport')}</Button>
              <Button
                variant={filterUnlinkedOnly ? 'contained' : 'outlined'}
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => setFilterUnlinkedOnly(!filterUnlinkedOnly)}
                sx={{ ml: 1 }}
              >
                {t('deviceFilterUnlinked')}
              </Button>
            </TableCell>
            <TableCell colSpan={columnCount - 1} align="right">
              <FormControlLabel
                control={(
                  <Switch
                    checked={showAll}
                    onChange={(e) => setShowAll(e.target.checked)}
                    size="small"
                  />
                )}
                label={t('notificationAlways')}
                labelPlacement="start"
                disabled={!manager}
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <CollectionFab editPath="/settings/device" />
      <DeviceVehicleHistoryDialog
        open={historyDialogOpen}
        onClose={() => { setHistoryDialogOpen(false); setHistoryDialogDeviceId(null); }}
        deviceId={historyDialogDeviceId}
      />
      <SmsSendModal
        open={smsModalOpen}
        onClose={() => { setSmsModalOpen(false); setSmsModalDeviceId(null); setSmsModalPhone(''); }}
        deviceId={smsModalDeviceId}
        phone={smsModalPhone}
      />
      <Dialog
        open={resetModalOpen}
        onClose={() => !resetLoading && setResetModalOpen(false)}
        slotProps={{ root: { sx: { zIndex: 99999 } } }}
      >
        <DialogTitle>{t('deviceResetSimcard')}</DialogTitle>
        <DialogContent>
          {resetError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setResetError(null)}>
              {resetError}
            </Alert>
          )}
          Deseja resetar o simcard deste dispositivo?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !resetLoading && setResetModalOpen(false)} disabled={resetLoading}>
            Cancelar
          </Button>
          <Button variant="contained" color="secondary" onClick={handleResetConfirm} disabled={resetLoading}>
            {resetLoading ? <CircularProgress size={20} /> : t('deviceResetSimcard')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default DevicesPage;
