import {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import {
  IconButton, Paper, Typography, Chip, Dialog, DialogTitle, DialogContent,
  Collapse, Box, List, ListItem, ListItemButton, ListItemText,
  useMediaQuery, useTheme as useMuiTheme,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import SummarizeIcon from '@mui/icons-material/Summarize';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import LayersIcon from '@mui/icons-material/Layers';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import PlaceIcon from '@mui/icons-material/Place';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import KeyIcon from '@mui/icons-material/Key';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import RouteIcon from '@mui/icons-material/Route';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import MapView, { map } from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapStopMarkers from '../map/MapStopMarkers';
import MapPositions from '../map/MapPositions';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import MapScale from '../map/MapScale';
import MapPadding from '../map/MapPadding';
import {
  formatTime, formatSpeed, formatDistance, formatCourse, formatCoordinate,
  formatBoolean, formatAltitude, formatVoltage, formatVolume, formatNumericHours,
  formatAlarm, formatPercentage,
  reverseGeocode,
} from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference, usePreference } from '../common/util/preferences';
import usePersistedState from '../common/util/usePersistedState';
import useMapStyles from '../map/core/useMapStyles';
import {
  DEFAULT_ACTIVE_MAP_STYLES,
  DEFAULT_MAP_ID,
  activeMapStylesContains,
  resolveAppliedMapStyle,
} from '../map/core/mapStyleDefaults';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import maplibregl from 'maplibre-gl';
import { speedFromKnots, speedUnitString } from '../common/util/converter';

const PERIOD = { last1h: 'last1h', today: 'today', yesterday: 'yesterday', custom: 'custom' };

const STOP_SPEED_KMH = 2.0;
const MIN_STOP_DURATION_MS = 2 * 60 * 1000;
const KNOTS_TO_KMH = 1.852;

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'row',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 3,
    left: 0,
    top: 0,
    bottom: 0,
    width: theme.dimensions.drawerWidthDesktop,
    overflowY: 'auto',
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
    marginLeft: 0,
    [theme.breakpoints.up('md')]: {
      marginLeft: theme.dimensions.drawerWidthDesktop,
    },
  },
  statsBar: {
    position: 'absolute',
    top: theme.spacing(1),
    left: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: theme.spacing(1),
    top: 120,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  infoCard: {
    position: 'absolute',
    left: theme.spacing(1),
    right: theme.spacing(1),
    bottom: 220,
    zIndex: 1,
    maxWidth: 400,
  },
  stopPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '40%',
    zIndex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  stopPanelHeader: {
    cursor: 'pointer',
    padding: theme.spacing(1.5, 2),
  },
}));

const getPeriodRange = (period, customFrom, customTo) => {
  const now = dayjs();
  switch (period) {
    case PERIOD.last1h:
      return { from: now.subtract(1, 'hour').toDate(), to: now.toDate() };
    case PERIOD.today:
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

const computeStops = (positions) => {
  if (!positions || positions.length === 0) return [];
  const stops = [];
  let startIdx = -1;
  let startTime = null;

  const parseTime = (p) => {
    const t = p.deviceTime || p.fixTime || p.serverTime;
    return t ? new Date(t).getTime() : null;
  };

  const kmhOf = (p) => ((p.speed ?? 0) * KNOTS_TO_KMH);

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const kmh = kmhOf(p);
    const t = parseTime(p);

    if (kmh <= STOP_SPEED_KMH) {
      if (startIdx === -1) {
        startIdx = i;
        startTime = t;
      }
    } else {
      if (startIdx !== -1 && startTime != null && t != null) {
        const duration = t - startTime;
        if (duration >= MIN_STOP_DURATION_MS) {
          const midIdx = Math.floor((startIdx + i - 1) / 2);
          const mp = positions[midIdx];
          stops.push({
            lat: mp.latitude,
            lng: mp.longitude,
            startTime: new Date(startTime),
            endTime: new Date(t),
            duration,
            startIndex: startIdx,
            endIndex: i,
            positionData: mp,
          });
        }
      }
      startIdx = -1;
      startTime = null;
    }
  }
  return stops;
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

const WebHistoryPage = () => {
  const t = useTranslation();
  const { classes } = useStyles();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const muiTheme = useMuiTheme();
  const desktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  const colors = useThemeColors();
  const { theme: themeMode } = useTheme();
  const deviceId = searchParams.get('deviceId');

  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
  const altitudeUnit = useAttributePreference('altitudeUnit');
  const volumeUnit = useAttributePreference('volumeUnit');
  const coordinateFormat = usePreference('coordinateFormat');
  const positionItems = useAttributePreference('positionItems', 'serverTime,address,speed,totalDistance');
  const positionAttributes = usePositionAttributes(t);
  const mapStyles = useMapStyles();
  const activeMapStylesAttr = useAttributePreference('activeMapStyles', DEFAULT_ACTIVE_MAP_STYLES);
  const [selectedMapStyle, setSelectedMapStyle] = usePersistedState('selectedMapStyle', usePreference('map', DEFAULT_MAP_ID));

  const appliedMapStyleForView = useMemo(() => {
    let filtered = mapStyles.filter((s) => s.available && activeMapStylesContains(activeMapStylesAttr, s.id));
    if (!filtered.length) {
      filtered = mapStyles.filter((s) => s.available);
    }
    const resolved = resolveAppliedMapStyle(selectedMapStyle, filtered);
    return resolved?.id ?? selectedMapStyle;
  }, [mapStyles, activeMapStylesAttr, selectedMapStyle]);

  useEffect(() => {
    if (appliedMapStyleForView !== selectedMapStyle) {
      setSelectedMapStyle(appliedMapStyleForView);
    }
  }, [appliedMapStyleForView, selectedMapStyle, setSelectedMapStyle]);

  const [period, setPeriod] = useState(PERIOD.today);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedStopIndex, setSelectedStopIndex] = useState(null);
  const [selectedPointAddress, setSelectedPointAddress] = useState(null);
  const [lastPositionAddress, setLastPositionAddress] = useState(null);
  const [stopAddresses, setStopAddresses] = useState({});
  const [stopPanelExpanded, setStopPanelExpanded] = useState(true);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  const device = useSelector((state) => (deviceId ? state.devices.items[deviceId] : null));
  const deviceName = device?.name || '';

  const { from, to } = useMemo(
    () => getPeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const processedPositions = useMemo(() => {
    if (!positions.length) return [];
    return positions
      .filter((p) => p.latitude && p.longitude && !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude))
      .sort((a, b) => new Date(a.fixTime || a.deviceTime) - new Date(b.fixTime || b.deviceTime));
  }, [positions]);

  const stops = useMemo(() => computeStops(processedPositions), [processedPositions]);

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

  const fetchHistory = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setPositions([]);
    setSelectedPoint(null);
    setSelectedStopIndex(null);
    try {
      const toDate = to > new Date() ? new Date() : to;
      const query = new URLSearchParams({
        deviceId,
        from: from.toISOString(),
        to: toDate.toISOString(),
      });
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`);
      const data = await response.json();
      setPositions(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, from, to]);

  const loadAddress = useCallback(async (lat, lon, setter) => {
    try {
      const addr = await reverseGeocode(lat, lon);
      setter(addr || t('sharedLoading') || 'Carregando...');
    } catch {
      setter(t('sharedUnknown') || 'Desconhecido');
    }
  }, [t]);

  useEffect(() => {
    if (deviceId && from && to) {
      fetchHistory();
    }
  }, [deviceId, from, to, fetchHistory]);

  useEffect(() => {
    if (!selectedPoint && processedPositions.length > 0) {
      const last = processedPositions[processedPositions.length - 1];
      loadAddress(last.latitude, last.longitude, setLastPositionAddress);
    } else {
      setLastPositionAddress(null);
    }
  }, [selectedPoint, processedPositions, loadAddress]);

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
  const hasSelection = selectedPoint != null || selectedStopIndex != null;

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

  if (!deviceId) {
    return (
      <Box p={2}>
        <Typography>{t('sharedNoData')}</Typography>
        <IconButton onClick={() => navigate(-1)}><BackIcon /></IconButton>
      </Box>
    );
  }

  return (
    <div className={classes.root}>
      {/* Left Sidebar - Replay-style panel (desktop only) */}
      {desktop && (
        <Box
          className={classes.sidebar}
          sx={{
            backgroundColor: colors.surface,
            borderRight: `1px solid ${colors.border}`,
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          }}
        >
          <Box sx={{ p: 2, borderBottom: `1px solid ${colors.border}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: colors.textSecondary }}>
                <BackIcon />
              </IconButton>
              <Typography variant="h6" sx={{ flex: 1, color: colors.text, fontSize: 16 }}>{deviceName}</Typography>
              <IconButton size="small" sx={{ color: colors.textSecondary }}><InfoOutlinedIcon fontSize="small" /></IconButton>
            </Box>
            {/* Vehicle image placeholder */}
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RouteIcon sx={{ fontSize: 40, color: colors.textSecondary }} />
              </Box>
            </Box>
            {/* Status, speed, address */}
            {displayPosition && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
                  <Typography variant="body2" sx={{ color: colors.text }}>{t('deviceStatusOnline') || 'Conectado'}</Typography>
                  <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                    {formatSpeed(displayPosition.speed, speedUnit, t)}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', wordBreak: 'break-word' }}>
                  {selectedPointAddress || lastPositionAddress || displayPosition.address || '-'}
                </Typography>
              </Box>
            )}
          </Box>
          {/* Period selector */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${colors.border}` }}>
            <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', mb: 1 }}>{t('sharedPeriod') || 'Período'}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Chip
                label="1h"
                size="small"
                onClick={() => setPeriod(PERIOD.last1h)}
                sx={{
                  bgcolor: period === PERIOD.last1h ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: period === PERIOD.last1h ? colors.text : colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  '&:hover': { bgcolor: period === PERIOD.last1h ? 'rgba(255,255,255,0.2)' : colors.hover },
                }}
              />
              <Chip
                label={t('sharedToday')}
                size="small"
                onClick={() => setPeriod(PERIOD.today)}
                sx={{
                  bgcolor: period === PERIOD.today ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: period === PERIOD.today ? colors.text : colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                }}
              />
              <Chip
                label={t('sharedYesterday')}
                size="small"
                onClick={() => setPeriod(PERIOD.yesterday)}
                sx={{
                  bgcolor: period === PERIOD.yesterday ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: period === PERIOD.yesterday ? colors.text : colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                }}
              />
              <Chip
                label={t('sharedCustom')}
                size="small"
                onClick={() => {
                  setPeriod(PERIOD.custom);
                  if (!customFrom) setCustomFrom(dayjs().startOf('day').format('YYYY-MM-DDTHH:mm'));
                  if (!customTo) setCustomTo(dayjs().format('YYYY-MM-DDTHH:mm'));
                }}
                sx={{
                  bgcolor: period === PERIOD.custom ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: period === PERIOD.custom ? colors.text : colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                }}
              />
            </Box>
            {period === PERIOD.custom && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <input
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{ padding: 6, borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.text, fontSize: 12 }}
                />
                <input
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{ padding: 6, borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.text, fontSize: 12 }}
                />
              </Box>
            )}
          </Box>
          {/* Speed graph */}
          {speedChartData.length > 1 && (
            <Box sx={{ p: 2, borderBottom: `1px solid ${colors.border}` }}>
              <Box sx={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={speedChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(v) => formatTime(v, 'time')}
                      stroke={colors.textSecondary}
                      tick={{ fill: colors.textSecondary, fontSize: 10 }}
                    />
                    <YAxis
                      type="number"
                      domain={[Math.max(0, chartMinSpeed - chartSpeedRange * 0.1), chartMaxSpeed + chartSpeedRange * 0.1]}
                      tickFormatter={(v) => v.toFixed(0)}
                      stroke={colors.textSecondary}
                      tick={{ fill: colors.textSecondary, fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4 }}
                      formatter={(value) => [`${value?.toFixed(2)} ${speedUnitString(speedUnit, t)}`, t('positionSpeed')]}
                      labelFormatter={(v) => formatTime(v, 'seconds')}
                    />
                    <Line
                      type="monotone"
                      dataKey="speed"
                      stroke={themeMode === 'dark' ? '#60A5FA' : '#2563EB'}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}
          {/* Detailed metrics */}
          {displayPosition && (
            <Box sx={{ p: 2 }}>
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
        </Box>
      )}

      {/* Mobile: toolbar with back + period */}
      {!desktop && (
        <Paper square elevation={2} sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, gap: 1 }}>
            <IconButton onClick={() => navigate(-1)}><BackIcon /></IconButton>
            <Typography variant="h6" sx={{ flex: 1 }}>{deviceName}</Typography>
          </Box>
          <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip label="1h" size="small" onClick={() => setPeriod(PERIOD.last1h)} color={period === PERIOD.last1h ? 'primary' : 'default'} variant={period === PERIOD.last1h ? 'filled' : 'outlined'} />
            <Chip label={t('sharedToday')} size="small" onClick={() => setPeriod(PERIOD.today)} color={period === PERIOD.today ? 'primary' : 'default'} variant={period === PERIOD.today ? 'filled' : 'outlined'} />
            <Chip label={t('sharedYesterday')} size="small" onClick={() => setPeriod(PERIOD.yesterday)} color={period === PERIOD.yesterday ? 'primary' : 'default'} variant={period === PERIOD.yesterday ? 'filled' : 'outlined'} />
            <Chip label={t('sharedCustom')} size="small" onClick={() => { setPeriod(PERIOD.custom); if (!customFrom) setCustomFrom(dayjs().startOf('day').format('YYYY-MM-DDTHH:mm')); if (!customTo) setCustomTo(dayjs().format('YYYY-MM-DDTHH:mm')); }} color={period === PERIOD.custom ? 'primary' : 'default'} variant={period === PERIOD.custom ? 'filled' : 'outlined'} />
          </Box>
        </Paper>
      )}

      <div className={classes.mapContainer} style={!desktop ? { paddingTop: 120 } : {}}>
        <MapView selectedMapStyle={appliedMapStyleForView}>
          <MapGeofence />
          <MapRoutePath positions={processedPositions} />
          <MapRoutePoints positions={processedPositions} onClick={onPointClick} showSpeedControl={false} />
          <MapStopMarkers positions={processedPositions} />
          {lastPosition && (
            <MapPositions
              positions={[lastPosition]}
              onMarkerClick={() => handleSelectPoint(lastPosition)}
              titleField="fixTime"
            />
          )}
        </MapView>
        <MapScale />
        {desktop && muiTheme.dimensions && <MapPadding start={parseInt(String(muiTheme.dimensions.drawerWidthDesktop || 360), 10) + parseInt(muiTheme.spacing(1.5), 10)} />}
        <MapCamera positions={processedPositions} />

        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Typography color="white">{t('sharedLoading') || 'Carregando histórico...'}</Typography>
          </Box>
        )}

        {!loading && processedPositions.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <RouteIcon sx={{ fontSize: 64, color: 'grey.400' }} />
              <Typography variant="h6">{t('sharedNoData') || 'Nenhuma posição encontrada'}</Typography>
              <Typography color="text.secondary">{t('sharedTryDifferentPeriod') || 'Tente outro período de busca'}</Typography>
            </Paper>
          </Box>
        )}

        {!loading && processedPositions.length > 0 && (
          <Paper
            className={classes.statsBar}
            elevation={2}
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
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
                <Typography variant="body2" fontWeight={600} sx={{ color: colors.text }}>
                  {formatDistance(totalDistanceKm * 1000, distanceUnit, t)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        {!loading && processedPositions.length > 0 && (
          <div className={classes.mapControls}>
            <IconButton
              onClick={() => setShowSummaryDialog(true)}
              title={t('reportSummary') || 'Resumo'}
              sx={{ bgcolor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, boxShadow: 1, '&:hover': { bgcolor: colors.hover } }}
            >
              <SummarizeIcon />
            </IconButton>
            <IconButton
              onClick={handleFitBounds}
              title={t('sharedFitMap') || 'Ver percurso completo'}
              sx={{ bgcolor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, boxShadow: 1, '&:hover': { bgcolor: colors.hover } }}
            >
              <FitScreenIcon />
            </IconButton>
            <IconButton
              title={t('sharedMapType') || 'Tipo de mapa'}
              sx={{ bgcolor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, boxShadow: 1, '&:hover': { bgcolor: colors.hover } }}
            >
              <LayersIcon />
            </IconButton>
          </div>
        )}

        {hasSelection && (
          <Paper className={classes.infoCard} elevation={3} sx={{ p: 2, borderRadius: 2, bgcolor: colors.surface, border: `1px solid ${colors.border}` }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              {selectedStopIndex != null ? (
                <StopCircleIcon color="error" fontSize="small" />
              ) : (
                <PlaceIcon color="primary" fontSize="small" />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                  {selectedPointAddress || (t('sharedLoading') || 'Carregando...')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {selectedStopIndex != null && stops[selectedStopIndex] && (
                    <Chip
                      size="small"
                      icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                      label={`${formatTime(stops[selectedStopIndex].startTime, 'time')} → ${formatTime(stops[selectedStopIndex].endTime, 'time')} (${formatDuration(stops[selectedStopIndex].duration)})`}
                    />
                  )}
                  {selectedPoint && selectedStopIndex == null && (
                    <Chip
                      size="small"
                      icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                      label={formatTime(selectedPoint.deviceTime || selectedPoint.fixTime, 'seconds')}
                    />
                  )}
                  {selectedPoint && (
                    <>
                      <Chip
                        size="small"
                        icon={<SpeedIcon sx={{ fontSize: 14 }} />}
                        label={formatSpeed(selectedPoint.speed, speedUnit, t)}
                      />
                      <Chip
                        size="small"
                        icon={<KeyIcon sx={{ fontSize: 14 }} />}
                        label={selectedPoint.attributes?.ignition ? (t('sharedYes') || 'Ligada') : (t('sharedNo') || 'Desligada')}
                      />
                      <Chip
                        size="small"
                        icon={<LockOpenIcon sx={{ fontSize: 14 }} />}
                        label={selectedPoint.attributes?.blocked ? (t('sharedBlocked') || 'Bloqueado') : (t('sharedUnblocked') || 'Desbloqueado')}
                      />
                    </>
                  )}
                </Box>
              </Box>
              <IconButton size="small" onClick={() => { setSelectedPoint(null); setSelectedStopIndex(null); }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        )}

        {!loading && stops.length > 0 && (
          <Paper
            className={classes.stopPanel}
            elevation={4}
            sx={{ backgroundColor: colors.surface, borderTop: `1px solid ${colors.border}` }}
          >
            <Box
              className={classes.stopPanelHeader}
              onClick={() => setStopPanelExpanded(!stopPanelExpanded)}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: colors.surface }}
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
                {stopPanelExpanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </Box>
            </Box>
            <Collapse in={stopPanelExpanded}>
              <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: colors.surface }}>
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
      </div>

      <Dialog open={showSummaryDialog} onClose={() => setShowSummaryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SummarizeIcon color="primary" />
            {t('reportSummary') || 'Resumo do Percurso'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('sharedStart') || 'Início'}</Typography>
              <Typography fontWeight={600}>
                {processedPositions.length ? formatTime(processedPositions[0].fixTime || processedPositions[0].deviceTime, 'seconds') : '--'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('sharedEnd') || 'Fim'}</Typography>
              <Typography fontWeight={600}>
                {processedPositions.length ? formatTime(processedPositions[processedPositions.length - 1].fixTime || processedPositions[processedPositions.length - 1].deviceTime, 'seconds') : '--'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('reportTotalDistance') || 'Distância total'}</Typography>
              <Typography fontWeight={600}>{formatDistance(totalDistanceKm * 1000, distanceUnit, t)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('reportMaximumSpeed') || 'Vel. máxima'}</Typography>
              <Typography fontWeight={600}>{maxSpeedKmh.toFixed(0)} km/h</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('reportStops') || 'Paradas'}</Typography>
              <Typography fontWeight={600}>{stops.length} {t('reportStops') || 'parada'}{stops.length !== 1 ? 's' : ''}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('reportIdleTime') || 'Tempo parado'}</Typography>
              <Typography fontWeight={600}>{formatDuration(totalStopTimeMs)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('sharedPositions') || 'Posições'}</Typography>
              <Typography fontWeight={600}>{processedPositions.length} {t('sharedPoints') || 'pontos'}</Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebHistoryPage;
