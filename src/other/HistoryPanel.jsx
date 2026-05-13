import {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import {
  IconButton, Paper, Typography, Chip, Dialog, DialogTitle, DialogContent,
  Box, List, ListItem, ListItemButton, ListItemText, Collapse,
  useMediaQuery, useTheme as useMuiTheme,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import SummarizeIcon from '@mui/icons-material/Summarize';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import LayersIcon from '@mui/icons-material/Layers';
import PlaceIcon from '@mui/icons-material/Place';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import RouteIcon from '@mui/icons-material/Route';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSelector, useDispatch } from 'react-redux';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { map } from '../map/core/MapView';
import {
  formatTime, formatSpeed, formatDistance, formatCourse, formatCoordinate,
  formatBoolean, formatAltitude, formatVoltage, formatVolume, formatNumericHours,
  formatAlarm, formatPercentage,
  reverseGeocode,
} from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import { ChevronLeft, Gauge } from 'lucide-react';
import fetchOrThrow from '../common/util/fetchOrThrow';
import maplibregl from 'maplibre-gl';
import { speedFromKnots, speedUnitString } from '../common/util/converter';
import { identifyStops } from '../common/util/stopDetection';
import { processPositions } from '../common/util/positionUtils';
import { sessionActions } from '../store';

const PERIOD = { last1h: 'last1h', today: 'today', yesterday: 'yesterday', custom: 'custom' };
const KNOTS_TO_KMH = 1.852;

const useStyles = makeStyles()((theme) => ({
  statsBar: {
    position: 'fixed',
    top: 8,
    zIndex: 9999,
  },
  mapControls: {
    position: 'fixed',
    top: 120,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  stopPanel: {
    position: 'fixed',
    bottom: 0,
    zIndex: 9999,
    borderRadius: '12px 12px 0 0',
  },
}));

const getPeriodRange = (period, customFrom, customTo) => {
  const now = dayjs();
  switch (period) {
    case PERIOD.last1h:
      return { from: now.subtract(1, 'hour').toDate(), to: now.toDate() };
    case PERIOD.today:
      // Use current moment as 'to' to avoid timezone edge cases and ensure we never fetch future data
      return { from: now.startOf('day').toDate(), to: now.toDate() };
    case PERIOD.yesterday: {
      const yesterday = now.subtract(1, 'day');
      return { from: yesterday.startOf('day').toDate(), to: yesterday.endOf('day').toDate() };
    }
    case PERIOD.custom:
      return {
        from: customFrom ? dayjs(customFrom).toDate() : now.startOf('day').toDate(),
        to: customTo ? dayjs(customTo).endOf('day').toDate() : now.toDate(),
      };
    default:
      return { from: now.startOf('day').toDate(), to: now.toDate() };
  }
};

const formatDuration = (ms) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getStatusColor = (status) => {
  switch (status) {
    case 'online': return '#10B981';
    case 'offline': return '#EF4444';
    case 'unknown': return '#F59E0B';
    default: return '#6B7280';
  }
};

const HistoryPanel = ({ deviceId, onClose, desktop, isMenuExpanded }) => {
  const t = useTranslation();
  const dispatch = useDispatch();
  const { classes } = useStyles();
  const muiTheme = useMuiTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  const colors = useThemeColors();
  const { theme: themeMode } = useTheme();

  const historyPositions = useSelector((state) => state.session.historyPositions);
  const selectedHistoryPointIndex = useSelector((state) => state.session.selectedHistoryPointIndex);

  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
  const altitudeUnit = useAttributePreference('altitudeUnit');
  const volumeUnit = useAttributePreference('volumeUnit');
  const coordinateFormat = usePreference('coordinateFormat');
  const positionItems = useAttributePreference('positionItems', 'serverTime,address,speed,totalDistance');
  const positionAttributes = usePositionAttributes(t);

  const [period, setPeriod] = useState(PERIOD.today);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedStopIndex, setSelectedStopIndex] = useState(null);
  const [selectedPointAddress, setSelectedPointAddress] = useState(null);
  const [lastPositionAddress, setLastPositionAddress] = useState(null);
  const [stopAddresses, setStopAddresses] = useState({});
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [stopPanelExpanded, setStopPanelExpanded] = useState(true);

  const device = useSelector((state) => (deviceId ? state.devices.items[deviceId] : null));
  const deviceName = device?.name || '';

  const { from, to } = useMemo(
    () => getPeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const processedPositions = useMemo(() => processPositions(historyPositions), [historyPositions]);

  const stops = useMemo(() => {
    const raw = identifyStops(processedPositions);
    return raw.map((s) => ({
      lat: s.latitude,
      lng: s.longitude,
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      duration: s.duration,
      positionData: s.positions[Math.floor(s.positions.length / 2)] || s.positions[0],
    }));
  }, [processedPositions]);

  const totalDistanceKm = useMemo(() => {
    if (processedPositions.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < processedPositions.length; i++) {
      const a = processedPositions[i - 1];
      const b = processedPositions[i];
      total += haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
    }
    return total;
  }, [processedPositions]);

  const fetchHistory = useCallback(async (signal) => {
    if (!deviceId) return;
    setLoading(true);
    dispatch(sessionActions.updateHistoryPositions([]));
    setSelectedPoint(null);
    setSelectedStopIndex(null);
    try {
      const toDate = to > new Date() ? new Date() : to;
      const query = new URLSearchParams({
        deviceId,
        from: from.toISOString(),
        to: toDate.toISOString(),
      });
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`, { signal });
      const rawData = await response.json();
      if (!signal?.aborted) {
        dispatch(sessionActions.updateHistoryPositions(processPositions(rawData)));
        dispatch(sessionActions.updateHistoryDeviceId(deviceId));
      }
    } catch (err) {
      if (err?.name !== 'AbortError' && !signal?.aborted) {
        console.error('Failed to load history:', err);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [deviceId, from, to, dispatch]);

  const loadAddress = useCallback(async (lat, lon, setter) => {
    try {
      const addr = await reverseGeocode(lat, lon);
      setter(addr || t('sharedLoading') || 'Carregando...');
    } catch {
      setter(t('sharedUnknown') || 'Desconhecido');
    }
  }, [t]);

  useEffect(() => {
    if (!deviceId || !from || !to) return;
    const controller = new AbortController();
    fetchHistory(controller.signal);
    return () => controller.abort();
  }, [deviceId, from, to, fetchHistory]);

  useEffect(() => {
    return () => {
      dispatch(sessionActions.updateHistoryPositions([]));
      dispatch(sessionActions.updateHistoryDeviceId(null));
    };
  }, [dispatch]);

  useEffect(() => {
    if (!selectedPoint && processedPositions.length > 0) {
      const last = processedPositions[processedPositions.length - 1];
      loadAddress(last.latitude, last.longitude, setLastPositionAddress);
    } else {
      setLastPositionAddress(null);
    }
  }, [selectedPoint, processedPositions, loadAddress]);

  useEffect(() => {
    stops.forEach((stop, idx) => {
      if (!stopAddresses[idx]) {
        loadAddress(stop.lat, stop.lng, (addr) => {
          setStopAddresses((prev) => ({ ...prev, [idx]: addr }));
        });
      }
    });
  }, [stops, loadAddress]);

  const handleSelectPoint = useCallback((point) => {
    setSelectedPoint(point);
    setSelectedStopIndex(null);
    setSelectedPointAddress(null);
    if (point) {
      loadAddress(point.latitude, point.longitude, setSelectedPointAddress);
      if (map) {
        map.flyTo({
          center: [point.longitude, point.latitude],
          zoom: 16,
          duration: 500,
        });
      }
    }
  }, [loadAddress]);

  useEffect(() => {
    if (selectedHistoryPointIndex != null && processedPositions[selectedHistoryPointIndex]) {
      handleSelectPoint(processedPositions[selectedHistoryPointIndex]);
    }
  }, [selectedHistoryPointIndex, processedPositions, handleSelectPoint]);

  const handleSelectStop = useCallback((index) => {
    const stop = stops[index];
    setSelectedStopIndex(index);
    setSelectedPoint(stop?.positionData || null);
    setSelectedPointAddress(stopAddresses[index] ?? null);
    if (stop) {
      if (!stopAddresses[index]) {
        loadAddress(stop.lat, stop.lng, (addr) => {
          setStopAddresses((prev) => ({ ...prev, [index]: addr }));
          setSelectedPointAddress(addr);
        });
      }
      if (map) {
        map.flyTo({
          center: [stop.lng, stop.lat],
          zoom: 16,
          duration: 500,
        });
      }
    }
  }, [stops, stopAddresses, loadAddress]);

  const onPointClick = useCallback((_, pointIndex) => {
    if (processedPositions[pointIndex]) {
      handleSelectPoint(processedPositions[pointIndex]);
    }
  }, [processedPositions, handleSelectPoint]);

  const handleFitBounds = useCallback(() => {
    if (!map || processedPositions.length === 0) return;
    const coords = processedPositions.map((p) => [p.longitude, p.latitude]);
    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new maplibregl.LngLatBounds(coords[0], coords[0]),
    );
    map.fitBounds(bounds, { padding: 60, duration: 500 });
  }, [processedPositions]);

  const maxSpeedKmh = useMemo(() => {
    if (processedPositions.length === 0) return 0;
    return Math.max(...processedPositions.map((p) => (p.speed ?? 0) * KNOTS_TO_KMH));
  }, [processedPositions]);

  const totalStopTimeMs = useMemo(
    () => stops.reduce((acc, s) => acc + s.duration, 0),
    [stops],
  );

  const speedChartData = useMemo(() => {
    if (processedPositions.length <= 1) return [];
    return processedPositions.map((position, index) => {
      const time = position.fixTime || position.deviceTime || position.serverTime;
      const speedValue = position.speed || 0;
      const convertedSpeed = speedFromKnots(speedValue, speedUnit);
      return {
        time: dayjs(time).valueOf(),
        speed: parseFloat(convertedSpeed.toFixed(2)),
        index,
      };
    });
  }, [processedPositions, speedUnit]);

  const chartMinSpeed = useMemo(() => {
    if (speedChartData.length === 0) return 0;
    const speeds = speedChartData.map((d) => d.speed).filter((s) => s != null);
    return speeds.length > 0 ? Math.min(...speeds) : 0;
  }, [speedChartData]);

  const chartMaxSpeed = useMemo(() => {
    if (speedChartData.length === 0) return 100;
    const speeds = speedChartData.map((d) => d.speed).filter((s) => s != null);
    return speeds.length > 0 ? Math.max(...speeds) : 100;
  }, [speedChartData]);

  const chartSpeedRange = chartMaxSpeed - chartMinSpeed;

  const displayPosition = selectedPoint || processedPositions[processedPositions.length - 1];
  const lastPosition = processedPositions[processedPositions.length - 1];

  const formatPositionValue = useCallback((key, value) => {
    if (value == null) return '-';
    if (key === 'fixTime' || key === 'deviceTime' || key === 'serverTime') return formatTime(value, 'seconds');
    if (key === 'speed') return formatSpeed(value, speedUnit, t);
    if (key === 'course') return formatCourse(value);
    if (key === 'altitude') return formatAltitude(value, altitudeUnit, t);
    if (['accuracy', 'odometer', 'distance', 'totalDistance'].includes(key)) return formatDistance(value, distanceUnit, t);
    if (key === 'batteryLevel') return formatPercentage(value);
    if (key === 'battery') return formatVoltage(value, t);
    if (key === 'fuel') return formatVolume(value, volumeUnit, t);
    if (key === 'hours') return formatNumericHours(value, t);
    if (['ignition', 'motion', 'armed'].includes(key)) return formatBoolean(value, t);
    if (key === 'alarm') return formatAlarm(value, t);
    if (key === 'latitude' || key === 'longitude') return formatCoordinate(key, value, coordinateFormat);
    if (key === 'address') return value || '-';
    return String(value);
  }, [speedUnit, distanceUnit, altitudeUnit, volumeUnit, coordinateFormat, t]);

  // "Colado" ao menu lateral - z-index 9998 (behind the menu at 10000) like FloatingStatusCard
  const sidebarLeft = isDesktop
    ? (isMenuExpanded ? 200 : 63)
    : 0;

  const overlayLeft = isDesktop ? sidebarLeft + 310 + 8 : 8;

  if (!deviceId) return null;

  const sidebarContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        zIndex: 9998,
        top: 8,
        left: sidebarLeft,
        height: isDesktop ? 'calc(100vh - 16px)' : 'auto',
        maxHeight: isDesktop ? undefined : '45vh',
        width: isDesktop ? 310 : '100%',
        transition: 'left 0.3s ease',
      }}
    >
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '0px 16px 16px 0px',
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        position: 'relative',
      }}
      >
        <div style={{ padding: '20px', backgroundColor: colors.surface }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 10,
              width: '32px',
              height: '32px',
              borderRadius: '0px',
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={20} color={colors.textSecondary} />
          </button>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '20px' }} />
              <div style={{ flex: 1 }} />
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: colors.text,
              margin: 0,
              lineHeight: 1.2,
              textAlign: 'center',
            }}
            >
              {deviceName}
            </h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', position: 'relative' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: colors.secondary || colors.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: `3px solid ${getStatusColor(device?.status || 'unknown')}`,
                position: 'relative',
              }}
            >
              {device?.attributes?.deviceImage ? (
                <img
                  style={{
                    width: '120px',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '50%',
                  }}
                  src={`/api/media/${device.uniqueId}/${device.attributes.deviceImage}`}
                  alt=""
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div style={{
                width: '120px',
                height: '120px',
                display: device?.attributes?.deviceImage ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#E5E7EB',
                borderRadius: '50%',
              }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'left', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(device?.status || 'unknown'),
                }}
                />
                <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                  {t(`deviceStatus${(device?.status || 'unknown').charAt(0).toUpperCase() + (device?.status || 'unknown').slice(1)}`)}
                </span>
              </div>
              {displayPosition && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Gauge size={14} color={colors.textSecondary} />
                  <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                    {formatSpeed(displayPosition.speed, speedUnit, t)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'left', marginBottom: '4px' }}>
            <p style={{
              fontSize: '12px',
              color: colors.textSecondary,
              margin: 0,
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
            >
              {selectedPointAddress || lastPositionAddress || displayPosition?.address || '-'}
            </p>
          </div>
        </div>
      <Box sx={{ p: 2, borderBottom: `1px solid ${colors.border}` }}>
        <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', mb: 1 }}>{t('sharedPeriod') || 'Período'}</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip label="1h" size="small" onClick={() => setPeriod(PERIOD.last1h)} sx={{ bgcolor: period === PERIOD.last1h ? 'rgba(255,255,255,0.2)' : 'transparent', color: period === PERIOD.last1h ? colors.text : colors.textSecondary, border: `1px solid ${colors.border}` }} />
          <Chip label={t('sharedToday')} size="small" onClick={() => setPeriod(PERIOD.today)} sx={{ bgcolor: period === PERIOD.today ? 'rgba(255,255,255,0.2)' : 'transparent', color: period === PERIOD.today ? colors.text : colors.textSecondary, border: `1px solid ${colors.border}` }} />
          <Chip label={t('sharedYesterday')} size="small" onClick={() => setPeriod(PERIOD.yesterday)} sx={{ bgcolor: period === PERIOD.yesterday ? 'rgba(255,255,255,0.2)' : 'transparent', color: period === PERIOD.yesterday ? colors.text : colors.textSecondary, border: `1px solid ${colors.border}` }} />
          <Chip label={t('sharedCustom')} size="small" onClick={() => { setPeriod(PERIOD.custom); if (!customFrom) setCustomFrom(dayjs().startOf('day').format('YYYY-MM-DDTHH:mm')); if (!customTo) setCustomTo(dayjs().format('YYYY-MM-DDTHH:mm')); }} sx={{ bgcolor: period === PERIOD.custom ? 'rgba(255,255,255,0.2)' : 'transparent', color: period === PERIOD.custom ? colors.text : colors.textSecondary, border: `1px solid ${colors.border}` }} />
        </Box>
        {period === PERIOD.custom && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ padding: 6, borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.text, fontSize: 12 }} />
            <input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ padding: 6, borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.text, fontSize: 12 }} />
          </Box>
        )}
      </Box>
      {speedChartData.length > 1 && (
        <Box sx={{ p: 2, borderBottom: `1px solid ${colors.border}` }}>
          <Box sx={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={speedChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis dataKey="time" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(v) => formatTime(v, 'time')} stroke={colors.textSecondary} tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                <YAxis type="number" domain={[Math.max(0, chartMinSpeed - chartSpeedRange * 0.1), chartMaxSpeed + chartSpeedRange * 0.1]} tickFormatter={(v) => v.toFixed(0)} stroke={colors.textSecondary} tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4 }} formatter={(value) => [`${value?.toFixed(2)} ${speedUnitString(speedUnit, t)}`, t('positionSpeed')]} labelFormatter={(v) => formatTime(v, 'seconds')} />
                <Line type="monotone" dataKey="speed" stroke={themeMode === 'dark' ? '#60A5FA' : '#2563EB'} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}
      {displayPosition && (
        <Box sx={{ p: 2, borderBottom: `1px solid ${colors.border}` }}>
          <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', mb: 1 }}>{t('sharedDetails') || 'Detalhes'}</Typography>
          {positionItems.split(',').filter((key) => key && key !== 'address' && (displayPosition[key] != null || displayPosition.attributes?.[key] != null)).map((key) => {
            const value = displayPosition[key] ?? displayPosition.attributes?.[key];
            const attrName = positionAttributes[key]?.name || key;
            return (
              <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: `1px solid ${colors.border}` }}>
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>{attrName}</Typography>
                <Typography variant="caption" sx={{ color: colors.text }}>{formatPositionValue(key, value)}</Typography>
              </Box>
            );
          })}
        </Box>
      )}
      {stops.length > 0 && (
        <Box sx={{ p: 2, flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <StopCircleIcon sx={{ color: '#ef4444', fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>{stops.length} {t('reportStops')}</Typography>
          </Box>
          <List dense sx={{ py: 0 }}>
            {[...stops].reverse().map((stop, revIdx) => {
              const idx = stops.length - 1 - revIdx;
              const isSelected = selectedStopIndex === idx;
              const address = stopAddresses[idx];
              return (
                <ListItem key={idx} disablePadding>
                  <ListItemButton selected={isSelected} onClick={() => handleSelectStop(idx)} sx={{ borderRadius: 1, mb: 0.5, '&.Mui-selected': { bgcolor: colors.hover }, '&:hover': { bgcolor: colors.hover } }}>
                    <Box sx={{ mr: 1.5, width: 24, height: 24, borderRadius: '50%', bgcolor: isSelected ? '#3b82f6' : '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 11 }}>{idx + 1}</Box>
                    <ListItemText primary={address || (t('sharedLoading') || 'Carregando...')} secondary={`${formatTime(stop.startTime, 'time')} → ${formatTime(stop.endTime, 'time')} (${formatDuration(stop.duration)})`} primaryTypographyProps={{ noWrap: true, sx: { color: colors.text, fontSize: 12 } }} secondaryTypographyProps={{ sx: { color: colors.textSecondary, fontSize: 11 } }} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}
      </div>
    </div>
  );

  const overlayContent = (
    <>
      {loading && (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
          <Typography color="white">{t('sharedLoading') || 'Carregando histórico...'}</Typography>
        </Box>
      )}
      {!loading && processedPositions.length > 0 && (
        <>
          <Paper elevation={2} className={classes.statsBar} sx={{ left: overlayLeft, right: 68, p: 1.5, borderRadius: 2, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-around', flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PlaceIcon sx={{ color: '#00E5FF', fontSize: 18 }} />
                <Typography variant="body2" fontWeight={600} sx={{ color: colors.text }}>{processedPositions.length} {t('sharedPoints')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StopCircleIcon sx={{ color: '#ef4444', fontSize: 18 }} />
                <Typography variant="body2" fontWeight={600} sx={{ color: colors.text }}>{stops.length} {t('reportStops')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <RouteIcon sx={{ color: '#00E5FF', fontSize: 18 }} />
                <Typography variant="body2" fontWeight={600} sx={{ color: colors.text }}>{formatDistance(totalDistanceKm * 1000, distanceUnit, t)}</Typography>
              </Box>
            </Box>
          </Paper>
          <div className={classes.mapControls} style={{ left: 'auto', right: 68 }}>
            <IconButton onClick={() => setShowSummaryDialog(true)} title={t('reportSummary') || 'Resumo'} sx={{ bgcolor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, boxShadow: 1, '&:hover': { bgcolor: colors.hover } }}>
              <SummarizeIcon />
            </IconButton>
            <IconButton onClick={handleFitBounds} title={t('sharedFitMap') || 'Ver percurso completo'} sx={{ bgcolor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, boxShadow: 1, '&:hover': { bgcolor: colors.hover } }}>
              <FitScreenIcon />
            </IconButton>
            <IconButton title={t('sharedMapType') || 'Tipo de mapa'} sx={{ bgcolor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, boxShadow: 1, '&:hover': { bgcolor: colors.hover } }}>
              <LayersIcon />
            </IconButton>
          </div>
        </>
      )}
      {!loading && stops.length > 0 && (
        <Paper
          className={classes.stopPanel}
          elevation={4}
          sx={{ left: overlayLeft, right: 68, backgroundColor: colors.surface, borderTop: `1px solid ${colors.border}` }}
        >
          <Box
            onClick={() => setStopPanelExpanded(!stopPanelExpanded)}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 2, py: 1.5, cursor: 'pointer', bgcolor: colors.surface,
              borderRadius: stopPanelExpanded ? '12px 12px 0 0' : '12px',
              '&:hover': { bgcolor: colors.hover },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StopCircleIcon sx={{ color: '#ef4444', fontSize: 18 }} />
              <Typography fontWeight="bold" sx={{ color: colors.text }}>
                {stops.length} {t('reportStops')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                {processedPositions.length} {t('sharedPositions')}
              </Typography>
              {stopPanelExpanded ? <ExpandMoreIcon sx={{ color: colors.textSecondary }} /> : <ExpandLessIcon sx={{ color: colors.textSecondary }} />}
            </Box>
          </Box>
          <Collapse in={stopPanelExpanded}>
            <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: colors.surface, px: 1 }}>
              {[...stops].reverse().map((stop, revIdx) => {
                const idx = stops.length - 1 - revIdx;
                const isSelected = selectedStopIndex === idx;
                const address = stopAddresses[idx];
                return (
                  <ListItem key={idx} disablePadding>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => handleSelectStop(idx)}
                      sx={{
                        borderRadius: 1, mb: 0.5,
                        '&.Mui-selected': { bgcolor: colors.hover },
                        '&:hover': { bgcolor: colors.hover },
                      }}
                    >
                      <Box sx={{ mr: 1.5, width: 28, height: 28, borderRadius: '50%', bgcolor: isSelected ? '#3b82f6' : '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>
                        {idx + 1}
                      </Box>
                      <ListItemText
                        primary={address || (t('sharedLoading') || 'Carregando...')}
                        secondary={`${formatTime(stop.startTime, 'time')} → ${formatTime(stop.endTime, 'time')}`}
                        primaryTypographyProps={{ noWrap: true, sx: { color: colors.text } }}
                        secondaryTypographyProps={{ sx: { color: colors.textSecondary } }}
                      />
                      <Chip
                        size="small"
                        label={formatDuration(stop.duration)}
                        sx={{ ml: 1, bgcolor: 'rgba(251,191,36,0.2)', color: '#f59e0b' }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>
        </Paper>
      )}
    </>
  );

  return (
    <>
      {sidebarContent}
      {createPortal(overlayContent, document.body)}
      <Dialog open={showSummaryDialog} onClose={() => setShowSummaryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><SummarizeIcon color="primary" />{t('reportSummary') || 'Resumo do Percurso'}</Box></DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">{t('sharedStart') || 'Início'}</Typography><Typography fontWeight={600}>{processedPositions.length ? formatTime(processedPositions[0].fixTime || processedPositions[0].deviceTime, 'seconds') : '--'}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">{t('sharedEnd') || 'Fim'}</Typography><Typography fontWeight={600}>{processedPositions.length ? formatTime(processedPositions[processedPositions.length - 1].fixTime || processedPositions[processedPositions.length - 1].deviceTime, 'seconds') : '--'}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">{t('reportTotalDistance') || 'Distância total'}</Typography><Typography fontWeight={600}>{formatDistance(totalDistanceKm * 1000, distanceUnit, t)}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">{t('reportMaximumSpeed') || 'Vel. máxima'}</Typography><Typography fontWeight={600}>{maxSpeedKmh.toFixed(0)} km/h</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">{t('reportStops') || 'Paradas'}</Typography><Typography fontWeight={600}>{stops.length} {t('reportStops') || 'parada'}{stops.length !== 1 ? 's' : ''}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">{t('reportIdleTime') || 'Tempo parado'}</Typography><Typography fontWeight={600}>{formatDuration(totalStopTimeMs)}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">{t('sharedPositions') || 'Posições'}</Typography><Typography fontWeight={600}>{processedPositions.length} {t('sharedPoints') || 'pontos'}</Typography></Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HistoryPanel;
