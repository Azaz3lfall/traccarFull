import { useEffect, useRef } from 'react';
import { map } from './core/MapView';

const MapReplayCamera = ({ position }) => {
  const initialZoomSet = useRef(false);

  useEffect(() => {
    if (position && position.longitude && position.latitude) {
      if (!initialZoomSet.current) {
        // First time entering replay mode - set initial zoom and center
        map.easeTo({
          center: [position.longitude, position.latitude],
          zoom: Math.max(map.getZoom(), 10), // Ensure minimum zoom level
          duration: 500,
        });
        initialZoomSet.current = true;
      } else {
        // Subsequent position updates - only center without changing zoom
        map.easeTo({
          center: [position.longitude, position.latitude],
          duration: 500,
        });
      }
    }
  }, [position]);

  // Reset when component unmounts (exiting replay mode)
  useEffect(() => {
    return () => {
      initialZoomSet.current = false;
    };
  }, []);

  return null;
};

export default MapReplayCamera;
