import { useId, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { map } from './core/MapView';
import { formatTime, getStatusColor } from '../common/util/formatter';
import { mapIconKey } from './core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { useCatchCallback } from '../reactHelper';
import { findFonts } from './core/mapUtil';

const MapPositions = ({ positions, onMapClick, onMarkerClick, showStatus, selectedPosition, titleField }) => {
  const id = useId();
  const clusters = `${id}-clusters`;
  const selected = `${id}-selected`;

  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  // const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);
  const iconScale = useAttributePreference("iconScale", desktop ? 0.45 : 0.50);


  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const mapCluster = useAttributePreference('mapCluster', true);
  const directionType = useAttributePreference('mapDirection', 'selected');


  const createFeature = (devices, position, selectedPositionId) => {
    const device = devices[position.deviceId];
    let showDirection;
    switch (directionType) {
      case 'none':
        showDirection = false;
        break;
      case 'all':
        showDirection = position.course > 0;
        break;
      default:
        showDirection = selectedPositionId === position.id && position.course > 0;
        break;
    }
    
    const displayName = device.name.length > 15 ? device.name.substring(0, 15) + '...' : device.name;
    const nameLength = displayName.length;
    
    // Calculate width based on character types: 7px for lowercase, 8px for uppercase, 5px for symbols, 6px for spaces
    const calculateWidth = (text) => {
      let totalWidth = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char >= 'A' && char <= 'Z') {
          totalWidth += 8; // Uppercase
        } else if (char >= 'a' && char <= 'z') {
          totalWidth += 7; // Lowercase
        } else if (char === ' ') {
          totalWidth += 6; // Space
        } else if (char === '.' || char === ',') {
          totalWidth += 5; // Period and comma
        } else {
          totalWidth += 7; // Other characters (numbers, symbols, etc.)
        }
      }
      return totalWidth;
    };
    
    const svgWidth = Math.max(50, calculateWidth(displayName)); // Minimum 50px
    
    return {
      id: position.id,
      deviceId: position.deviceId,
      name: displayName,
      nameLength: nameLength,
      svgWidth: svgWidth,
      fixTime: formatTime(position.fixTime, 'seconds'),
      category: mapIconKey(device.category),
      color: showStatus ? position.attributes.color || getStatusColor(device.status) : 'neutral',
      rotation: position.course,
      direction: showDirection,
    };
  };

  const onMouseEnter = () => map.getCanvas().style.cursor = 'pointer';
  const onMouseLeave = () => map.getCanvas().style.cursor = '';

  const onMapClickCallback = useCallback((event) => {
    if (!event.defaultPrevented && onMapClick) {
      onMapClick(event.lngLat.lat, event.lngLat.lng);
    }
  }, [onMapClick]);


  const onMarkerClickCallback = useCallback((event) => {
    event.preventDefault();
    const feature = event.features[0];
    if (onMarkerClick) {
      onMarkerClick(feature.properties.id, feature.properties.deviceId);
    }
  }, [onMarkerClick]);

  const onClusterClick = useCatchCallback(async (event) => {
    event.preventDefault();
    const features = map.queryRenderedFeatures(event.point, {
      layers: [clusters],
    });
    const clusterId = features[0].properties.cluster_id;
    const zoom = await map.getSource(id).getClusterExpansionZoom(clusterId);
    map.easeTo({
      center: features[0].geometry.coordinates,
      zoom,
    });
  }, [clusters]);

  const createDynamicSvg = (width, height = 21, isDarkMode = false) => {
    const backgroundColor = isDarkMode ? '#2d2d2d' : 'white';
    const borderColor = isDarkMode ? '#404040' : 'black';
    
    const svgString = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="6" ry="6" 
            fill="${backgroundColor}" 
            stroke="${borderColor}" 
            stroke-width="0.5"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
    </svg>`;
    
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    return svgUrl;
  };

  const loadDynamicSvg = async (width) => {
    const isDarkMode = theme.palette.mode === 'dark';
    const imageId = `device-name-bg-${width}-${isDarkMode ? 'dark' : 'light'}`;
    if (!map.hasImage(imageId)) {
      const svgUrl = createDynamicSvg(width, 21, isDarkMode);
      const img = new Image();
      img.onload = () => {
        map.addImage(imageId, img);
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    }
    return imageId;
  };

  const addLayers = useCallback(() => {
    [id, selected].forEach((source) => {
      // Remove existing layers if they exist
      if (map.getLayer(`${source}-text-bg`)) {
        map.removeLayer(`${source}-text-bg`);
      }
      if (map.getLayer(source)) {
        map.removeLayer(source);
      }
      
      // Add white rectangle background for text using dynamic SVG
      map.addLayer({
        id: `${source}-text-bg`,
        type: 'symbol',
        source,
        filter: ['!has', 'point_count'],
        layout: {
          'icon-image': ['concat', 'device-name-bg-', ['get', 'svgWidth'], '-', theme.palette.mode === 'dark' ? 'dark' : 'light'],
          'icon-size': 1.0,
          'icon-allow-overlap': true,
          'icon-offset': [0, -35], // Position behind text (offset -35)
        },
        paint: {
          'icon-opacity': 1.0,
        },
      });
      
      // Add text layer
      map.addLayer({
        id: source,
        type: 'symbol',
        source,
        filter: ['!has', 'point_count'],
        layout: {
          'icon-image': '{category}-{color}',
          'icon-size': iconScale,
          'icon-allow-overlap': true,
          'text-field': `{${titleField || 'name'}}`,
          'text-allow-overlap': true,
          'text-anchor': 'bottom',
          'text-offset': [0, -2.3],
          'text-font': findFonts(map),
          'text-size': 12,
          "icon-rotate": ["get", "rotation"],
        },
        paint: {
          'text-color': theme.palette.mode === 'dark' ? 'white' : 'black',
          'text-halo-color': theme.palette.mode === 'dark' ? '#2d2d2d' : 'white',
          'text-halo-width': 1,
        },
      });
    });
  }, [theme.palette.mode, iconScale, titleField]);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      cluster: mapCluster,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
    map.addSource(selected, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    
    addLayers();
    
    [id, selected].forEach((source) => {
      map.addLayer({
        id: `direction-${source}`,
        type: 'symbol',
        source,
        filter: [
          'all',
          ['!has', 'point_count'],
          ['==', 'direction', true],
        ],
        layout: {
          'icon-image': 'direction',
          'icon-size': iconScale,
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'rotation'],
          'icon-rotation-alignment': 'map',
        },
      });

      map.on('mouseenter', source, onMouseEnter);
      map.on('mouseleave', source, onMouseLeave);
      map.on('click', source, onMarkerClickCallback);
    });
    map.addLayer({
      id: clusters,
      type: 'symbol',
      source: id,
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': 'background',
        'icon-size': iconScale,
        'text-field': '{point_count_abbreviated}',
        'text-font': findFonts(map),
        'text-size': 14,
      },
    });

    map.on('mouseenter', clusters, onMouseEnter);
    map.on('mouseleave', clusters, onMouseLeave);
    map.on('click', clusters, onClusterClick);
    map.on('click', onMapClickCallback);

    return () => {
      map.off('mouseenter', clusters, onMouseEnter);
      map.off('mouseleave', clusters, onMouseLeave);
      map.off('click', clusters, onClusterClick);
      map.off('click', onMapClickCallback);

      if (map.getLayer(clusters)) {
        map.removeLayer(clusters);
      }

      [id, selected].forEach((source) => {
        map.off('mouseenter', source, onMouseEnter);
        map.off('mouseleave', source, onMouseLeave);
        map.off('click', source, onMarkerClickCallback);

        if (map.getLayer(source)) {
          map.removeLayer(source);
        }
        if (map.getLayer(`${source}-text-bg`)) {
          map.removeLayer(`${source}-text-bg`);
        }
        if (map.getLayer(`direction-${source}`)) {
          map.removeLayer(`direction-${source}`);
        }
        if (map.getSource(source)) {
          map.removeSource(source);
        }
      });
    };
  }, [mapCluster, clusters, onMarkerClickCallback, onClusterClick, addLayers]);

  useEffect(() => {
    const updateData = async () => {
      const features = positions.filter((it) => devices.hasOwnProperty(it.deviceId))
        .filter((it) => (it.deviceId !== selectedDeviceId))
        .map((position) => {
          const feature = createFeature(devices, position, selectedPosition && selectedPosition.id);
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [position.longitude, position.latitude],
            },
            properties: feature,
          };
        });

      const selectedFeatures = positions.filter((it) => devices.hasOwnProperty(it.deviceId))
        .filter((it) => (it.deviceId === selectedDeviceId))
        .map((position) => {
          const feature = createFeature(devices, position, selectedPosition && selectedPosition.id);
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [position.longitude, position.latitude],
            },
            properties: feature,
          };
        });

      // Load dynamic SVGs for all unique widths
      const uniqueWidths = [...new Set(features.concat(selectedFeatures).map(f => f.properties.svgWidth))];
      await Promise.all(uniqueWidths.map(width => loadDynamicSvg(width)));

      map.getSource(id)?.setData({
        type: 'FeatureCollection',
        features: features,
      });

      map.getSource(selected)?.setData({
        type: 'FeatureCollection',
        features: selectedFeatures,
      });
    };

    updateData();
  }, [mapCluster, clusters, onMarkerClick, onClusterClick, devices, positions, selectedPosition, theme.palette.mode]);

  return null;
};

export default MapPositions;
