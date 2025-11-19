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
import { devicesActions } from '../store';
import MapDefaultCamera from '../map/main/MapDefaultCamera';
import MapLiveRoutes from '../map/main/MapLiveRoutes';
import MapPositions from '../map/MapPositions';
import MapOverlay from '../map/overlay/MapOverlay';
import MapScale from '../map/MapScale';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapRoutePlanner from '../map/MapRoutePlanner.jsx';
import MapOcorrenciaDestination from '../map/MapOcorrenciaDestination.js';
import MapDeviceRouteCircle from '../map/MapDeviceRouteCircle.js';
import MapCamera from '../map/MapCamera';
import MapReplayCamera from '../map/MapReplayCamera';

const MainMap = memo(({ filteredPositions, selectedPosition, onMapClick, selectedMapStyle, currentReplayIndex = 0, routePlannerData, selectedRouteIndex = 0, onRouteChange, ocorrenciaDestination, deviceIdWithRoute }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const replayPositions = useSelector((state) => state.session.replayPositions);

  const onMarkerClick = useCallback((_, deviceId) => {
    dispatch(devicesActions.selectId(deviceId));
  }, [dispatch]);

  const handleMapClick = useCallback(() => {
    // Deselect device when clicking on map
    if (onMapClick) {
      onMapClick();
    } else {
      dispatch(devicesActions.selectId(null));
    }
  }, [dispatch, onMapClick]);

  // Determine which positions to show on the map
  const mapPositions = useMemo(() => {
    if (replayPositions.length > 0 && currentReplayIndex < replayPositions.length) {
      // When we have replay positions, show only the current replay position
      return [replayPositions[currentReplayIndex]];
    }
    // In normal mode, show all filtered positions
    return filteredPositions;
  }, [replayPositions, currentReplayIndex, filteredPositions]);

  return (
    <>
      <MapView onClick={handleMapClick} selectedMapStyle={selectedMapStyle}>
        <MapOverlay />
        <MapGeofence />
        <MapAccuracy positions={filteredPositions} />
        <MapLiveRoutes />
        {/* Replay components - only show when we have replay positions */}
        {replayPositions.length > 0 && (
          <>
            <MapRoutePath positions={replayPositions} />
            <MapRoutePoints positions={replayPositions} />
          </>
        )}
        <MapDefaultCamera />
        <MapSelectedDevice />
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
      {desktop && (
        <MapPadding start={parseInt(theme.dimensions.drawerWidthDesktop, 10) + parseInt(theme.spacing(1.5), 10)} />
      )}
    </>
  );
});

export default MainMap;
