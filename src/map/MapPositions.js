import { useId, useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import maplibregl from 'maplibre-gl';
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
  const iconScale = useAttributePreference("iconScale", desktop ? 0.47 : 0.53);


  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const mapCluster = useAttributePreference('mapCluster', true);
  const directionType = useAttributePreference('mapDirection', 'selected');
  
  // Popup ref for cluster hover
  const popupRef = useRef(null);


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

  const createClusterPopupHTML = (devices) => {
    const isDark = theme.palette.mode === 'dark';
    const bgColor = isDark ? '#1F2937' : '#FFFFFF';
    const textColor = isDark ? '#F9FAFB' : '#1F2937';
    const borderColor = isDark ? '#374151' : '#E5E7EB';
    const hoverColor = isDark ? '#374151' : '#F3F4F6';
    
    return `
      <div style="
        background: ${bgColor};
        border: 1px solid ${borderColor};
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        min-width: 280px;
        max-width: 400px;
        max-height: 400px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      ">
        <div style="
          padding: 16px 20px;
          border-bottom: 1px solid ${borderColor};
          background: linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(76, 175, 80, 0.1));
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 20px;
              height: 20px;
              background: #1976d2;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              font-weight: bold;
            ">🚛</div>
            <div style="
              color: ${textColor};
              font-weight: 600;
              font-size: 16px;
              margin: 0;
            ">Cluster (${devices.length} devices)</div>
          </div>
        </div>
        <div style="max-height: 320px; overflow-y: auto;">
          ${devices.map((device, index) => `
            <div style="
              padding: 4px 12px;
              border-bottom: ${index < devices.length - 1 ? `1px solid ${borderColor}` : 'none'};
              transition: background-color 0.2s;
            " onmouseover="this.style.backgroundColor='${hoverColor}'" onmouseout="this.style.backgroundColor='transparent'">
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="
                  color: ${textColor};
                  font-weight: 500;
                  font-size: 14px;
                  line-height: 1.4;
                ">${device.name}</div>
                ${device.lastUpdate ? `
                  <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                  ">
                    <span style="
                      color: ${isDark ? '#9CA3AF' : '#6B7280'};
                      font-size: 12px;
                      font-weight: 400;
                    ">${formatTime(device.lastUpdate)}</span>
                    <span style="
                      background: ${device.status === 'online' ? '#4CAF50' : device.status === 'offline' ? '#F44336' : '#9E9E9E'};
                      color: white;
                      padding: 1px 6px;
                      border-radius: 8px;
                      font-size: 10px;
                      font-weight: 500;
                    ">${device.status}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const onMouseEnter = useCallback(async (event) => {
    map.getCanvas().style.cursor = 'pointer';
    
    try {
      // Get cluster information
      const features = map.queryRenderedFeatures(event.point, {
        layers: [clusters],
      });
      
      if (features.length > 0) {
        const clusterId = features[0].properties.cluster_id;
        const pointCount = features[0].properties.point_count;
        
        // Get all features in the cluster
        const source = map.getSource(id);
        if (source && source.getClusterLeaves) {
          const clusterLeaves = await source.getClusterLeaves(clusterId, pointCount);
          
          // Extract device information from cluster leaves
          const clusterDevices = clusterLeaves
            .filter(leaf => leaf.properties && leaf.properties.deviceId)
            .map(leaf => {
              const device = devices[leaf.properties.deviceId];
              const position = positions.find(p => p.deviceId === leaf.properties.deviceId);
              return {
                id: leaf.properties.deviceId,
                name: device?.name || `Device ${leaf.properties.deviceId}`,
                status: device?.status || 'unknown',
                latitude: position?.latitude,
                longitude: position?.longitude,
                lastUpdate: position?.fixTime
              };
            })
            .filter(device => device.id);
        
          // Show popup if we have devices to display
          if (clusterDevices.length > 0) {
            // Remove existing popup
            if (popupRef.current) {
              popupRef.current.remove();
            }
            
            // Create new popup
            const popup = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              closeOnMove: false,
              focusAfterOpen: false,
              offset: [-20, 10],
              className: 'custom-cluster-popup'
            });
            
            popup.setLngLat(features[0].geometry.coordinates)
              .setHTML(createClusterPopupHTML(clusterDevices))
              .addTo(map);
            
            // Add event listeners to the popup for proper mouse interaction
            const popupElement = popup.getElement();
            if (popupElement) {
              popupElement.addEventListener('mouseenter', () => {
                // Keep popup alive when mouse is over it
                if (popupRef.current) {
                  clearTimeout(popupRef.current.hideTimeout);
                }
              });
              
              popupElement.addEventListener('mouseleave', () => {
                // Hide popup when mouse leaves it
                if (popupRef.current) {
                  popupRef.current.hideTimeout = setTimeout(() => {
                    if (popupRef.current) {
                      popupRef.current.remove();
                      popupRef.current = null;
                    }
                  }, 200);
                }
              });
            }
            
            popupRef.current = popup;
          }
        }
      }
    } catch (error) {
      console.warn('Error showing cluster popup:', error);
    }
  }, [clusters, id, devices, positions, theme.palette.mode]);

  const onMouseLeave = useCallback(() => {
    map.getCanvas().style.cursor = '';
    
    // Set a timeout to hide popup if mouse doesn't move to it
    if (popupRef.current) {
      popupRef.current.hideTimeout = setTimeout(() => {
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      }, 200);
    }
  }, []);

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

  const createClusterSvg = (isDarkMode = false, digitCount = 1) => {
    const backgroundColor = isDarkMode ? '#2d2d2d' : 'white';
    const borderColor = isDarkMode ? '#404040' : '#999999'; // Light gray border for light theme
    const ringColor = isDarkMode ? '#404040' : '#cccccc'; // Light gray for light theme
    
    // Base size is 80px, custom sizing per digit count
    let size;
    switch (digitCount) {
      case 1: size = 80 + 10; break;  // 90px
      case 2: size = 80 + 20; break;  // 100px
      case 3: size = 80 + 30; break;  // 110px
      case 4: size = 80 + 40; break;  // 120px
      case 5: size = 80 + 50; break;  // 130px
      default: size = 80 + 50; break; // 130px for 5+ digits
    }
    const center = size / 2;
    const radius = center - 3; // 3px padding from edge
    
    const svgString = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background circle -->
      <circle cx="${center}" cy="${center}" r="${radius}" 
              fill="${backgroundColor}" 
              stroke="none"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
      
      <!-- Outer ring (theme-aware) -->
      <circle cx="${center}" cy="${center}" r="${radius}" 
              fill="none" 
              stroke="${ringColor}" 
              stroke-width="6"/>
      
      <!-- Inner ring (theme-aware) -->
      <circle cx="${center}" cy="${center}" r="${radius - 8}" 
              fill="none" 
              stroke="${ringColor}" 
              stroke-width="4"/>
      
      <!-- Center circle (theme background color) -->
      <circle cx="${center}" cy="${center}" r="${radius - 12}" 
              fill="${backgroundColor}" 
              stroke="${borderColor}" 
              stroke-width="3"/>
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

  const loadClusterSvg = async (digitCount = 1) => {
    const isDarkMode = theme.palette.mode === 'dark';
    const imageId = `cluster-bg-${digitCount}-${isDarkMode ? 'dark' : 'light'}`;
    if (!map.hasImage(imageId)) {
      const svgUrl = createClusterSvg(isDarkMode, digitCount);
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
          'text-color': theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary,
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
        'icon-image': [
          'concat',
          'cluster-bg-',
          [
            'case',
            ['<', ['get', 'point_count'], 10], '1',
            ['<', ['get', 'point_count'], 100], '2',
            ['<', ['get', 'point_count'], 1000], '3',
            ['<', ['get', 'point_count'], 10000], '4',
            '5'
          ],
          '-',
          theme.palette.mode === 'dark' ? 'dark' : 'light'
        ],
        'icon-size': iconScale,
        'text-field': '{point_count_abbreviated}',
        'text-font': findFonts(map),
        'text-size': 14,
      },
      paint: {
        'text-color': theme.palette.mode === 'dark' ? 'white' : theme.palette.text.primary,
        'text-halo-color': theme.palette.mode === 'dark' ? '#2d2d2d' : 'white',
        'text-halo-width': 1,
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
      
      // Load cluster SVGs for all digit counts (1-5)
      await Promise.all([1, 2, 3, 4, 5].map(digitCount => loadClusterSvg(digitCount)));

      map.getSource(id)?.setData({
        type: 'FeatureCollection',
        features: features,
      });

      map.getSource(selected)?.setData({
        type: 'FeatureCollection',
        features: selectedFeatures,
      });

      // Re-add layers to ensure they're on top after data update
      addLayers();
    };

    updateData();
  }, [mapCluster, clusters, onMarkerClick, onClusterClick, devices, positions, selectedPosition, theme.palette.mode, addLayers]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (popupRef.current) {
        if (popupRef.current.hideTimeout) {
          clearTimeout(popupRef.current.hideTimeout);
        }
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, []);

  return null;
};

export default MapPositions;
