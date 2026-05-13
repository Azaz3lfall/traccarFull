import { useTheme } from '@mui/material/styles';
import { useId, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { map } from './core/MapView';
import getSpeedColor from '../common/util/colors';
import { useAttributePreference } from '../common/util/preferences';

const MapRoutePath = ({ positions }) => {
  const id = useId();

  const theme = useTheme();

  const reportColor = useSelector((state) => {
    const position = positions?.find(() => true);
    if (position) {
      const attributes = state.devices.items[position.deviceId]?.attributes;
      if (attributes) {
        const color = attributes['web.reportColor'];
        if (color) {
          return color;
        }
      }
    }
    return null;
  });

  const mapLineWidth = useAttributePreference('mapLineWidth', 2);
  const mapLineOpacity = useAttributePreference('mapLineOpacity', 1);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      },
    });
    map.addLayer({
      source: id,
      id: `${id}-line`,
      type: 'line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'width'],
        'line-opacity': ['get', 'opacity'],
      },
    });

    return () => {
      if (map.getLayer(`${id}-line`)) {
        map.removeLayer(`${id}-line`);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, []);

  useEffect(() => {
    const minSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.min(a, b), Infinity);
    const maxSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.max(a, b), -Infinity);
    const features = [];

    if (positions.length > 1) {
      let currentCoordinates = [];
      let currentColor = null;

      for (let i = 0; i < positions.length - 1; i += 1) {
        const p1 = positions[i];
        const p2 = positions[i + 1];

        let color = reportColor;
        if (!color) {
          const speed = p2.speed;
          const range = maxSpeed - minSpeed;
          const buckets = 20;
          const step = range / buckets;
          const quantizedSpeed = range > 0 ? Math.floor((speed - minSpeed) / step) * step + minSpeed : speed;
          color = getSpeedColor(quantizedSpeed, minSpeed, maxSpeed);
        }

        if (currentColor === null) {
          currentColor = color;
          currentCoordinates = [[p1.longitude, p1.latitude], [p2.longitude, p2.latitude]];
        } else if (currentColor !== color) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: currentCoordinates,
            },
            properties: {
              color: currentColor,
              width: mapLineWidth,
              opacity: mapLineOpacity,
            },
          });
          currentColor = color;
          currentCoordinates = [[p1.longitude, p1.latitude], [p2.longitude, p2.latitude]];
        } else {
          currentCoordinates.push([p2.longitude, p2.latitude]);
        }
      }

      if (currentCoordinates.length > 0) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: currentCoordinates,
          },
          properties: {
            color: currentColor,
            width: mapLineWidth,
            opacity: mapLineOpacity,
          },
        });
      }
    }

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [theme, positions, reportColor, mapLineWidth, mapLineOpacity]);

  return null;
};

export default MapRoutePath;
