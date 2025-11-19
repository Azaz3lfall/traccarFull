import { useId, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { map } from './core/MapView';

const MapDeviceRouteCircle = ({ deviceId }) => {
  const id = useId();
  const circleRef = useRef(null);
  const positions = useSelector((state) => state.session.positions);

  useEffect(() => {
    // Remove existing circle
    if (circleRef.current) {
      if (map.getLayer(circleRef.current)) {
        map.removeLayer(circleRef.current);
      }
      if (map.getSource(circleRef.current)) {
        map.removeSource(circleRef.current);
      }
      circleRef.current = null;
    }

    if (!deviceId) {
      return;
    }

    const position = positions[deviceId];
    if (!position || !position.latitude || !position.longitude) {
      return;
    }

    const sourceId = `${id}-circle`;
    const layerId = `${id}-circle-layer`;

    // Add source for circle
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [position.longitude, position.latitude],
        },
        properties: {},
      },
    });

    // Add circle layer (red circle around device)
    map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': 25,
        'circle-color': '#F44336', // Red
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.3,
        'circle-stroke-opacity': 1,
      },
    });

    circleRef.current = layerId;

    return () => {
      if (circleRef.current) {
        if (map.getLayer(circleRef.current)) {
          map.removeLayer(circleRef.current);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
        circleRef.current = null;
      }
    };
  }, [deviceId, positions, id]);

  // Update circle position when device moves
  useEffect(() => {
    if (!deviceId || !circleRef.current) {
      return;
    }

    const position = positions[deviceId];
    if (!position || !position.latitude || !position.longitude) {
      return;
    }

    const sourceId = `${id}-circle`;
    const source = map.getSource(sourceId);
    if (source) {
      source.setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [position.longitude, position.latitude],
        },
        properties: {},
      });
    }
  }, [deviceId, positions, id]);

  return null;
};

export default MapDeviceRouteCircle;

