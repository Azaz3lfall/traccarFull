import { useTheme } from '@mui/material/styles';
import { useId, useEffect, useRef } from 'react';
import { map } from './core/MapView';
import mapboxgl from 'mapbox-gl';

const MapRoutePlanner = ({ routeData }) => {
  const id = useId();
  const theme = useTheme();
  const markersRef = useRef([]);

  useEffect(() => {
    if (!routeData || !routeData.routes || routeData.routes.length === 0) {
      // Remove existing route if no route data
      if (map.getLayer(`${id}-line`)) {
        map.removeLayer(`${id}-line`);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
      // Remove all markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      return;
    }

    const route = routeData.routes[0];
    if (!route.geometry || !route.geometry.coordinates) {
      return;
    }

    const coordinates = route.geometry.coordinates;

    // Add source for route polyline
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coordinates,
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
        'line-color': '#2196F3', // Blue color
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for start, waypoints, and end
    const startCoord = coordinates[0];
    const endCoord = coordinates[coordinates.length - 1];
    
    // Add start marker (green)
    const startMarker = document.createElement('div');
    startMarker.style.width = '20px';
    startMarker.style.height = '20px';
    startMarker.style.borderRadius = '50%';
    startMarker.style.backgroundColor = '#4CAF50'; // Green for start
    startMarker.style.border = '3px solid white';
    startMarker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    
    const startMarkerInstance = new mapboxgl.Marker(startMarker)
      .setLngLat(startCoord)
      .addTo(map);
    markersRef.current.push(startMarkerInstance);

    // Add end marker (red)
    const endMarker = document.createElement('div');
    endMarker.style.width = '20px';
    endMarker.style.height = '20px';
    endMarker.style.borderRadius = '50%';
    endMarker.style.backgroundColor = '#F44336'; // Red for end
    endMarker.style.border = '3px solid white';
    endMarker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    
    const endMarkerInstance = new mapboxgl.Marker(endMarker)
      .setLngLat(endCoord)
      .addTo(map);
    markersRef.current.push(endMarkerInstance);

    // Add waypoint markers (orange) - if there are waypoints in the route
    if (routeData.waypoints && routeData.waypoints.length > 2) {
      // Skip first and last waypoints (start and end)
      const waypoints = routeData.waypoints.slice(1, -1);
      waypoints.forEach((waypoint, index) => {
        if (waypoint && waypoint.coordinates) {
          const waypointMarker = document.createElement('div');
          waypointMarker.style.width = '16px';
          waypointMarker.style.height = '16px';
          waypointMarker.style.borderRadius = '50%';
          waypointMarker.style.backgroundColor = '#FF9800'; // Orange for waypoints
          waypointMarker.style.border = '2px solid white';
          waypointMarker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          
          const waypointMarkerInstance = new mapboxgl.Marker(waypointMarker)
            .setLngLat(waypoint.coordinates)
            .addTo(map);
          markersRef.current.push(waypointMarkerInstance);
        }
      });
    }

    // Adjust camera to fit the route
    if (coordinates.length > 0) {
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
      // Remove all markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [routeData, theme.palette.primary.main]);

  return null;
};

export default MapRoutePlanner;
