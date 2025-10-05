import { useTheme } from '@mui/material/styles';
import { useId, useEffect } from 'react';
import { map } from './core/MapView';

const MapRoutePlanner = ({ routeData }) => {
  const id = useId();
  const theme = useTheme();

  useEffect(() => {
    if (!routeData || !routeData.routes || routeData.routes.length === 0) {
      // Remove existing route if no route data
      if (map.getLayer(`${id}-line`)) {
        map.removeLayer(`${id}-line`);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
      return;
    }

    const route = routeData.routes[0];
    if (!route.geometry || !route.geometry.coordinates) {
      return;
    }

    // Add source for route polyline
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: route.geometry.coordinates,
        },
        properties: {},
      },
    });

    // Add layer for route polyline
    map.addLayer({
      source: id,
      id: `${id}-line`,
      type: 'line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': theme.palette.primary.main,
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    // Adjust camera to fit the route
    if (route.geometry.coordinates.length > 0) {
      const coordinates = route.geometry.coordinates;
      const bounds = coordinates.reduce((bounds, coord) => {
        return [
          [Math.min(bounds[0][0], coord[0]), Math.min(bounds[0][1], coord[1])],
          [Math.max(bounds[1][0], coord[0]), Math.max(bounds[1][1], coord[1])]
        ];
      }, [
        [coordinates[0][0], coordinates[0][1]],
        [coordinates[0][0], coordinates[0][1]]
      ]);

      // Add some padding to the bounds
      const padding = 0.01; // Adjust this value for more/less padding
      const paddedBounds = [
        [bounds[0][0] - padding, bounds[0][1] - padding],
        [bounds[1][0] + padding, bounds[1][1] + padding]
      ];

      map.fitBounds(paddedBounds, {
        padding: 50, // Add padding around the bounds
        maxZoom: 15 // Limit maximum zoom level
      });
    }

    return () => {
      if (map.getLayer(`${id}-line`)) {
        map.removeLayer(`${id}-line`);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [routeData, theme.palette.primary.main]);

  return null;
};

export default MapRoutePlanner;
