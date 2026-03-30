import { useId, useEffect, useRef, useCallback } from 'react';
import { map } from './core/MapView';
import { useAttributePreference } from '../common/util/preferences';

// Set to true to re-enable heatmap feature
export const HEATMAP_FEATURE_ENABLED = false;

const MapHeatmap = ({ positions, enabled = true }) => {
  const id = useId();
  const dataRef = useRef(null);

  const mapHeatmapEnabled = useAttributePreference('mapHeatmap', true);

  // Determine if heatmap should be visible (HEATMAP_FEATURE_ENABLED disables entire feature)
  const isVisible = HEATMAP_FEATURE_ENABLED && enabled && mapHeatmapEnabled && positions && positions.length > 0;

  const addHeatmapLayer = useCallback(() => {
    if (!map.loaded()) {
      return false;
    }

    if (!isVisible) {
      return false;
    }

    try {
      // Check if source already exists
      if (!map.getSource(id)) {
        map.addSource(id, {
          type: 'geojson',
          data: dataRef.current || {
            type: 'FeatureCollection',
            features: [],
          },
        });
      }

      // Check if layer already exists
      if (!map.getLayer(id)) {
        map.addLayer({
          id,
          type: 'heatmap',
          source: id,
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 0.8,
              9, 1.2,
              12, 1.5,
              15, 2,
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(128,0,128,0)',      // Transparent purple
              0.1,
              'rgba(138,43,226,0.3)',    // Blue violet (low intensity)
              0.2,
              'rgba(100,149,237,0.5)',   // Cornflower blue
              0.3,
              'rgba(135,206,250,0.7)',   // Light sky blue
              0.4,
              'rgba(144,238,144,0.8)',   // Light green
              0.5,
              'rgba(154,205,50,0.9)',    // Yellow green
              0.6,
              'rgba(255,255,0,0.95)',    // Yellow
              0.7,
              'rgba(255,165,0,1)',       // Orange
              0.8,
              'rgba(255,140,0,1)',       // Dark orange
              0.9,
              'rgba(255,69,0,1)',        // Red orange
              1,
              'rgba(255,0,0,1)',         // Red (high intensity)
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 25,
              9, 35,
              12, 45,
              15, 60,
            ],
            'heatmap-opacity': 0.85,
          },
        });
        return true;
      }
      return true;
    } catch (error) {
      console.error('Error adding heatmap layer:', error);
      return false;
    }
  }, [id, isVisible]);

  useEffect(() => {
    const handleStyleData = () => {
      // When style changes, layers are removed, so we need to re-add them
      if (isVisible) {
        // Wait for map to be ready after style change
        const waitForLoad = () => {
          if (map.loaded()) {
            addHeatmapLayer();
          } else {
            setTimeout(waitForLoad, 100);
          }
        };
        waitForLoad();
      }
    };

    // Wait for map to be loaded initially
    if (!map.loaded()) {
      const onLoad = () => {
        if (isVisible) {
          addHeatmapLayer();
        }
      };
      map.once('load', onLoad);
      
      // Also listen for style changes
      map.on('styledata', handleStyleData);
      
      return () => {
        map.off('load', onLoad);
        map.off('styledata', handleStyleData);
      };
    }

    // Add layer if map is already loaded
    if (isVisible) {
      addHeatmapLayer();
    }

    // Listen for style changes
    map.on('styledata', handleStyleData);

    return () => {
      map.off('styledata', handleStyleData);
      if (map.getLayer(id)) {
        try {
          map.removeLayer(id);
        } catch (error) {
          // Layer might already be removed
        }
      }
      if (map.getSource(id)) {
        try {
          map.removeSource(id);
        } catch (error) {
          // Source might already be removed
        }
      }
    };
  }, [id, isVisible, addHeatmapLayer]);

  useEffect(() => {
    if (!map.loaded()) {
      return;
    }

    // Update data if visible
    if (isVisible && positions && positions.length > 0) {
      const features = positions
        .filter((position) => position.latitude && position.longitude)
        .map((position) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [position.longitude, position.latitude],
          },
          properties: {},
        }));

      const geoJsonData = {
        type: 'FeatureCollection',
        features,
      };

      // Store data for re-adding after style changes
      dataRef.current = geoJsonData;

      // Ensure source and layer exist before updating data
      if (!map.getSource(id)) {
        addHeatmapLayer();
      }

      if (map.getSource(id)) {
        try {
          map.getSource(id).setData(geoJsonData);
        } catch (error) {
          console.error('Error setting heatmap data:', error);
        }
      }

      // Update visibility
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'visible');
      } else {
        // Layer might have been removed, re-add it
        addHeatmapLayer();
      }
    } else {
      // Clear data when not visible
      if (map.getSource(id)) {
        try {
          map.getSource(id).setData({
            type: 'FeatureCollection',
            features: [],
          });
        } catch (error) {
          console.error('Error clearing heatmap data:', error);
        }
      }

      // Hide layer if it exists
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    }
  }, [id, positions, isVisible, addHeatmapLayer]);

  return null;
};

export default MapHeatmap;
