import { useTheme } from '@mui/material/styles';
import { useId, useEffect, useRef } from 'react';
import { map } from './core/MapView';
import maplibregl from 'maplibre-gl';

const MapRoutePlanner = ({ routeData, selectedRouteIndex = 0, onRouteChange }) => {
  
  const id = useId();
  const theme = useTheme();
  const markersRef = useRef([]);
  const routeSourcesRef = useRef([]);

  useEffect(() => {
    // Always clear existing routes and markers first
    routeSourcesRef.current.forEach(sourceId => {
      if (map.getLayer(`${sourceId}-line`)) {
        map.removeLayer(`${sourceId}-line`);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });
    routeSourcesRef.current = [];
    
    // Remove all markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (!routeData || !routeData.routes || routeData.routes.length === 0) {
      return;
    }

    const selectedRoute = routeData.routes[selectedRouteIndex] || routeData.routes[0];
    if (!selectedRoute.geometry || !selectedRoute.geometry.coordinates) {
      return;
    }

    const coordinates = selectedRoute.geometry.coordinates;

    // Add source for route polyline (check if it already exists)
    if (!map.getSource(id)) {
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
    } else {
      // Update existing source data
      map.getSource(id).setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coordinates,
        },
        properties: {},
      });
    }

    // Add layer for route polyline (check if it already exists)
    if (!map.getLayer(`${id}-line`)) {
      map.addLayer({
        source: id,
        id: `${id}-line`,
        type: 'line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#1565C0', // Darker blue color
          'line-width': 4,
          'line-opacity': 0.9,
        },
      });
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for start, waypoints, and end
    const startCoord = coordinates[0];
    const endCoord = coordinates[coordinates.length - 1];
    
    // Add start marker (green circle with arrow)
    const startMarker = document.createElement('div');
    startMarker.style.width = '24px';
    startMarker.style.height = '24px';
    startMarker.style.borderRadius = '50%';
    startMarker.style.backgroundColor = '#4CAF50'; // Green for start
    startMarker.style.border = '3px solid white';
    startMarker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    startMarker.style.display = 'flex';
    startMarker.style.alignItems = 'center';
    startMarker.style.justifyContent = 'center';
    startMarker.style.fontSize = '12px';
    startMarker.style.fontWeight = 'bold';
    startMarker.style.color = 'white';
    startMarker.textContent = 'S';
    
    const startMarkerInstance = new maplibregl.Marker(startMarker)
      .setLngLat(startCoord)
      .addTo(map);
    markersRef.current.push(startMarkerInstance);

    // Add end marker (red circle with arrow)
    const endMarker = document.createElement('div');
    endMarker.style.width = '24px';
    endMarker.style.height = '24px';
    endMarker.style.borderRadius = '50%';
    endMarker.style.backgroundColor = '#F44336'; // Red for end
    endMarker.style.border = '3px solid white';
    endMarker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    endMarker.style.display = 'flex';
    endMarker.style.alignItems = 'center';
    endMarker.style.justifyContent = 'center';
    endMarker.style.fontSize = '12px';
    endMarker.style.fontWeight = 'bold';
    endMarker.style.color = 'white';
    endMarker.textContent = 'E';
    
    const endMarkerInstance = new maplibregl.Marker(endMarker)
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
          waypointMarker.style.width = '20px';
          waypointMarker.style.height = '20px';
          waypointMarker.style.borderRadius = '50%';
          waypointMarker.style.backgroundColor = '#FF9800'; // Orange for waypoints
          waypointMarker.style.border = '2px solid white';
          waypointMarker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          waypointMarker.style.display = 'flex';
          waypointMarker.style.alignItems = 'center';
          waypointMarker.style.justifyContent = 'center';
          waypointMarker.style.fontSize = '10px';
          waypointMarker.style.fontWeight = 'bold';
          waypointMarker.style.color = 'white';
          waypointMarker.textContent = (index + 1).toString();
          
          const waypointMarkerInstance = new maplibregl.Marker(waypointMarker)
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

  }, [routeData, selectedRouteIndex, theme.palette.primary.main]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Remove all route sources and layers
      routeSourcesRef.current.forEach(sourceId => {
        if (map.getLayer(`${sourceId}-line`)) {
          map.removeLayer(`${sourceId}-line`);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      });
      routeSourcesRef.current = [];
      
      // Remove all markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, []);

  // Debug logging
    routeData: routeData,
    routesLength: routeData?.routes?.length,
    selectedRouteIndex: selectedRouteIndex
  });

  return null;
};

export default MapRoutePlanner;
