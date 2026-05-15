import { useCallback, memo, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import MapView from '../map/core/MapView';
import MapSelectedDevice from '../map/main/MapSelectedDevice';
import MapAccuracy from '../map/main/MapAccuracy';
import MapGeofence from '../map/MapGeofence';
import PoiMap from '../map/main/PoiMap';
import MapPadding from '../map/MapPadding';
import { devicesActions, sessionActions, fleetActions } from '../store';
import { processPositions } from '../common/util/positionUtils';
import MapDefaultCamera from '../map/main/MapDefaultCamera';
import MapLiveRoutes from '../map/main/MapLiveRoutes';
import MapPositions from '../map/MapPositions';
import MapOverlay from '../map/overlay/MapOverlay';
import MapScale from '../map/MapScale';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapStopMarkers from '../map/MapStopMarkers';
import MapRoutePlanner from '../map/MapRoutePlanner.jsx';
import MapOcorrenciaDestination from '../map/MapOcorrenciaDestination.js';
import MapDeviceRouteCircle from '../map/MapDeviceRouteCircle.js';
import MapCamera from '../map/MapCamera';
import MapReplayCamera from '../map/MapReplayCamera';
import MapHeatmap from '../map/MapHeatmap';
import MapStatusLegend from '../map/legend/MapStatusLegend';

const MainMap = memo(({ filteredPositions, selectedPosition, onMapClick, selectedMapStyle, currentReplayIndex = 0, routePlannerData, selectedRouteIndex = 0, onRouteChange, ocorrenciaDestination, deviceIdWithRoute }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const replayPositions = useSelector((state) => state.session.replayPositions);
  const historyPositions = useSelector((state) => state.session.historyPositions);
  const fleetItems = useSelector((state) => state.fleet.items);

  const vehicleByDeviceId = useMemo(() => {
    const map = {};
    (fleetItems || []).forEach((v) => {
      const ids = v.deviceIds || (v.devices?.map((d) => d.id)) || (v.device_id != null ? [v.device_id] : []);
      ids.forEach((id) => { if (id != null) map[id] = v; });
    });
    return map;
  }, [fleetItems]);

  const onMarkerClick = useCallback((_, deviceId) => {
    dispatch(devicesActions.selectId(deviceId));
    const vehicle = vehicleByDeviceId[deviceId];
    if (vehicle?.plate) {
      dispatch(fleetActions.setSelectedPlate(vehicle.plate));
    }
  }, [dispatch, vehicleByDeviceId]);

  const handleMapClick = useCallback(() => {
    // Deselect device when clicking on map
    if (onMapClick) {
      onMapClick();
    } else {
      dispatch(devicesActions.selectId(null));
    }
  }, [dispatch, onMapClick]);

  const processedHistoryPositions = useMemo(() => processPositions(historyPositions), [historyPositions]);

  const lastHistoryPosition = useMemo(() => {
    if (processedHistoryPositions.length === 0) return [];
    return [processedHistoryPositions[processedHistoryPositions.length - 1]];
  }, [processedHistoryPositions]);

  const onHistoryPointClick = useCallback((_, pointIndex) => {
    dispatch(sessionActions.updateSelectedHistoryPointIndex(pointIndex));
  }, [dispatch]);

  // Determine which positions to show on the map
  const mapPositions = useMemo(() => {
    if (historyPositions.length > 0) {
      return [];
    }
    if (replayPositions.length > 0 && currentReplayIndex < replayPositions.length) {
      return [replayPositions[currentReplayIndex]];
    }
    return filteredPositions;
  }, [historyPositions, replayPositions, currentReplayIndex, filteredPositions]);

  // Determine which positions to use for heatmap (use all replay positions or filtered positions)
  const heatmapPositions = useMemo(() => {
    if (historyPositions.length > 0) {
      return processedHistoryPositions;
    }
    if (replayPositions.length > 0) {
      return replayPositions;
    }
    return filteredPositions;
  }, [historyPositions, processedHistoryPositions, replayPositions, filteredPositions]);

  return (
    <>
      <MapView onClick={handleMapClick} selectedMapStyle={selectedMapStyle}>
        <MapOverlay />
        <MapGeofence />
        <MapAccuracy positions={filteredPositions} />
        <MapLiveRoutes />
        <MapHeatmap positions={heatmapPositions} />
        {/* Replay components - only show when we have replay positions */}
        {replayPositions.length > 0 && (
          <>
            <MapRoutePath positions={replayPositions} />
            <MapRoutePoints positions={replayPositions} />
          </>
        )}
        {/* History components - only show when we have history positions */}
        {processedHistoryPositions.length > 0 && (
          <>
            <MapRoutePath positions={processedHistoryPositions} />
            <MapRoutePoints positions={processedHistoryPositions} onClick={onHistoryPointClick} showSpeedControl={false} />
            <MapStopMarkers positions={processedHistoryPositions} />
            <MapPositions
              positions={lastHistoryPosition}
              onMarkerClick={(_, __) => onHistoryPointClick(null, processedHistoryPositions.length - 1)}
              titleField="fixTime"
            />
            <MapCamera positions={processedHistoryPositions} />
          </>
        )}
        {historyPositions.length === 0 && <MapDefaultCamera />}
        {historyPositions.length === 0 && <MapSelectedDevice />}
        <MapRoutePlanner 
          routeData={routePlannerData} 
          selectedRouteIndex={selectedRouteIndex}
          onRouteChange={onRouteChange}
        />
        {ocorrenciaDestination && (
          <MapOcorrenciaDestination destination={ocorrenciaDestination} />
        )}
        {deviceIdWithRoute && (
          <MapDeviceRouteCircle deviceId={deviceIdWithRoute} />
        )}
        <PoiMap />
        {/* MapPositions always last to ensure vehicle markers appear on top */}
        <MapPositions
          key={`positions-${replayPositions.length > 0 ? 'replay' : 'normal'}`}
          positions={mapPositions}
          onMarkerClick={onMarkerClick}
          selectedPosition={selectedPosition}
          showStatus
        />
        {/* Replay camera - always last to ensure proper positioning */}
        {replayPositions.length > 0 && (
          <MapReplayCamera position={mapPositions[0]} />
        )}
      </MapView>
      <MapScale />
      {replayPositions.length === 0 && historyPositions.length === 0 && <MapStatusLegend />}
      {desktop && (
        <MapPadding start={parseInt(theme.dimensions.drawerWidthDesktop, 10) + parseInt(theme.spacing(1.5), 10)} />
      )}
    </>
  );
});

export default MainMap;
