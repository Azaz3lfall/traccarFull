import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  IconButton, Paper, Slider, Toolbar, Typography,
  Select, MenuItem, FormControl, InputLabel,
  LinearProgress, Switch, FormControlLabel, Divider,
  useMediaQuery, useTheme as useMuiTheme,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import TuneIcon from '@mui/icons-material/Tune';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MapView, { map } from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapPositions from '../map/MapPositions';
import MapStopMarkers from '../map/MapStopMarkers';
import MapHeatmap from '../map/MapHeatmap';
import { formatTime } from '../common/util/formatter';
import ReportFilter, { updateReportParams } from '../reports/components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatch } from '../reactHelper';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import StatusCard from '../common/components/StatusCard';
import MapScale from '../map/MapScale';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';

const BASE_INTERVAL = 1000; // 1 segundo na velocidade 1x

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 3,
    left: 0,
    top: 0,
    margin: theme.spacing(1.5),
    width: theme.dimensions.drawerWidthDesktop,
    [theme.breakpoints.down('md')]: {
      width: '100%',
      margin: 0,
    },
  },
  title: {
    flexGrow: 1,
  },
  slider: {
    width: '100%',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      margin: theme.spacing(1),
    },
    [theme.breakpoints.up('md')]: {
      marginTop: theme.spacing(1),
    },
  },
  progressBar: {
    width: '100%',
    marginBottom: theme.spacing(2),
    height: 6,
    borderRadius: 3,
  },
  speedControl: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  controlsSection: {
    marginTop: theme.spacing(2),
  },
  controlsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  controlsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
}));

const ReplayPage = () => {
  const t = useTranslation();
  const { classes } = useStyles();
  const navigate = useNavigate();
  const timerRef = useRef();
  const theme = useMuiTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const [searchParams, setSearchParams] = useSearchParams();

  const defaultDeviceId = useSelector((state) => state.devices.selectedId);

  const [positions, setPositions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId);
  const [showCard, setShowCard] = useState(false);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [smoothAnimation, setSmoothAnimation] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [controlsExpanded, setControlsExpanded] = useState(desktop);
  const [followCamera, setFollowCamera] = useState(false);

  const loaded = Boolean(from && to && !loading && positions.length);

  const deviceName = useSelector((state) => {
    if (selectedDeviceId) {
      const device = state.devices.items[selectedDeviceId];
      if (device) {
        return device.name;
      }
    }
    return null;
  });

  // Memoizar posições processadas para melhor performance
  const processedPositions = useMemo(() => {
    if (!positions.length) return [];
    
    // Filtrar posições válidas e ordenar por tempo
    return positions
      .filter(pos => pos.latitude && pos.longitude && !isNaN(pos.latitude) && !isNaN(pos.longitude))
      .sort((a, b) => new Date(a.fixTime) - new Date(b.fixTime));
  }, [positions]);

  // Posições para mostrar no mapa (rota completa ou apenas até o índice atual)
  const visiblePositions = useMemo(() => {
    if (!showTrail) return [];
    return smoothAnimation ? processedPositions.slice(0, index + 1) : processedPositions;
  }, [processedPositions, index, showTrail, smoothAnimation]);

  // Posição atual para o marcador
  const currentPosition = useMemo(() => {
    return processedPositions[index] || null;
  }, [processedPositions, index]);

  // Progresso da reprodução
  const progress = useMemo(() => {
    if (processedPositions.length === 0) return 0;
    if (processedPositions.length === 1) return 100;
    return (index / (processedPositions.length - 1)) * 100;
  }, [index, processedPositions.length]);

  useEffect(() => {
    if (!from && !to) {
      setPositions([]);
    }
  }, [from, to]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Efeito para câmera que acompanha o veículo
  useEffect(() => {
    if (followCamera && currentPosition && map) {
      map.flyTo({
        center: [currentPosition.longitude, currentPosition.latitude],
        zoom: 16,
        duration: 500,
        essential: true
      });
    }
  }, [followCamera, currentPosition]);

  // Manage playback timer
  useEffect(() => {
    if (playing && processedPositions.length > 0) {
      const interval = Math.max(50, BASE_INTERVAL / speed); // Mínimo de 50ms para performance
      
      timerRef.current = setInterval(() => {
        setIndex((prevIndex) => {
          if (prevIndex < processedPositions.length - 1) {
            return prevIndex + 1;
          } else {
            // Para a reprodução ao chegar no final
            clearInterval(timerRef.current);
            setPlaying(false);
            return prevIndex;
          }
        });
      }, interval);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [playing, processedPositions.length, speed]);

  useEffect(() => {
    if (index >= processedPositions.length - 1 && processedPositions.length > 0) {
      clearInterval(timerRef.current);
      setPlaying(false);
    }
  }, [index, processedPositions.length]);

  const onPointClick = useCallback((_, pointIndex) => {
    setIndex(pointIndex);
  }, []);

  const onMarkerClick = useCallback(() => {
    setShowCard(true);
  }, []);

  const handleSliderChange = useCallback((_, newIndex) => {
    setIndex(newIndex);
  }, []);

  const onShow = useCatch(async ({ deviceIds, from, to }) => {
    const deviceId = deviceIds.find(() => true);
    setLoading(true);
    setSelectedDeviceId(deviceId);
    setPlaying(false); // Stop playback when loading new data
    const query = new URLSearchParams({ deviceId, from, to });
    try {
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`);
      const positions = await response.json();
      if (!positions.length) {
        throw new Error(t('sharedNoData'));
      }
      setIndex(0);
      setPositions(positions);
    } catch (error) {
      console.error('Failed to load positions:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  });

  const handleDownload = useCallback(() => {
    if (!selectedDeviceId || !from || !to) return;
    const query = new URLSearchParams({ deviceId: selectedDeviceId, from, to });
    const link = document.createElement('a');
    link.href = `/api/positions/kml?${query.toString()}`;
    link.download = `replay-${selectedDeviceId}-${from}-${to}.kml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [selectedDeviceId, from, to]);

  return (
    <div className={classes.root}>
      <MapView>
        <MapGeofence />
        <MapRoutePath positions={visiblePositions} />
        <MapHeatmap positions={processedPositions} />
        <MapRoutePoints positions={processedPositions} onClick={onPointClick} showSpeedControl />
        {showStops && <MapStopMarkers positions={processedPositions} />}
        {currentPosition && (
          <MapPositions positions={[currentPosition]} onMarkerClick={onMarkerClick} titleField="fixTime" />
        )}
      </MapView>
      <MapScale />
      <MapCamera positions={processedPositions} />
      <div className={classes.sidebar}>
        <Paper elevation={3} square>
          <Toolbar>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
              <BackIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>{t('reportReplay')}</Typography>
            {loaded && (
              <>
                <IconButton onClick={handleDownload} aria-label={t('download')}>
                  <DownloadIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => updateReportParams(searchParams, setSearchParams, 'ignore', [])} aria-label={t('sharedFilterMap')}>
                  <TuneIcon />
                </IconButton>
              </>
            )}
          </Toolbar>
        </Paper>
        <Paper className={classes.content} square>
          {loaded ? (
            <>
              <Typography variant="subtitle1" align="center">{deviceName}</Typography>
              
              {/* Barra de progresso */}
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                className={classes.progressBar}
              />
              
              <Slider
                className={classes.slider}
                max={processedPositions.length - 1}
                step={null}
                marks={processedPositions.length > 100 
                  ? [0, Math.floor(processedPositions.length / 2), processedPositions.length - 1].map(v => ({ value: v }))
                  : processedPositions.map((_, idx) => ({ value: idx }))}
                value={index}
                onChange={handleSliderChange}
                aria-label={t('reportReplay')}
              />
              
              <div className={classes.controls}>
                {`${index + 1}/${processedPositions.length}`}
                <IconButton onClick={() => setIndex(Math.max(0, index - 1))} disabled={playing || index <= 0} aria-label="Rewind">
                  <FastRewindIcon />
                </IconButton>
                <IconButton onClick={() => setPlaying(!playing)} disabled={index >= processedPositions.length - 1} aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <PauseIcon /> : <PlayArrowIcon /> }
                </IconButton>
                <IconButton onClick={() => setIndex(Math.min(processedPositions.length - 1, index + 1))} disabled={playing || index >= processedPositions.length - 1} aria-label="Fast forward">
                  <FastForwardIcon />
                </IconButton>
                {currentPosition && (
                  formatTime(currentPosition.fixTime, 'seconds')
                )}
              </div>
              
              {/* Controles de velocidade */}
              <FormControl size="small" fullWidth className={classes.speedControl}>
                <InputLabel>{t('sharedSpeed') || 'Velocidade'}</InputLabel>
                <Select
                  value={speed}
                  label={t('sharedSpeed') || 'Velocidade'}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  <MenuItem value={0.5}>0.5x</MenuItem>
                  <MenuItem value={1}>1x</MenuItem>
                  <MenuItem value={2}>2x</MenuItem>
                  <MenuItem value={5}>5x</MenuItem>
                  <MenuItem value={10}>10x</MenuItem>
                  <MenuItem value={15}>15x</MenuItem>
                </Select>
              </FormControl>

              <Divider className={classes.controlsSection} />

              {/* Controles de visualização */}
              <div className={classes.controlsHeader}>
                <Typography variant="subtitle2">
                  {t('sharedSettings') || '🎛️ Controles de Visualização'}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setControlsExpanded(!controlsExpanded)}
                >
                  {controlsExpanded ? '−' : '+'}
                </IconButton>
              </div>
              
              {controlsExpanded && (
                <div className={classes.controlsList}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={smoothAnimation}
                        onChange={(e) => setSmoothAnimation(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{t('animationSmooth') || 'Animação Suave'}</Typography>}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showTrail}
                        onChange={(e) => setShowTrail(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{t('sharedShowTrail') || 'Mostrar Rastro'}</Typography>}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showStops}
                        onChange={(e) => setShowStops(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{t('sharedShowStops') || 'Indicadores de Parada'}</Typography>}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={followCamera}
                        onChange={(e) => setFollowCamera(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{t('sharedFollowCamera') || 'Câmera Seguir Veículo'}</Typography>}
                  />
                </div>
              )}
            </>
          ) : (
            <ReportFilter onShow={onShow} deviceType="single" loading={loading} />
          )}
        </Paper>
      </div>
      {showCard && currentPosition && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={currentPosition}
          onClose={() => setShowCard(false)}
          disableActions
        />
      )}
    </div>
  );
};

export default ReplayPage;
