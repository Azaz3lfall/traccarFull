import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { googleProtocol } from 'maplibre-google-maps';
import React, {
  useRef, useLayoutEffect, useEffect, useState,
  useMemo,
} from 'react';
import { useTheme } from '@mui/material';
import { useAttributePreference, usePreference } from '../../common/util/preferences';
import usePersistedState, { savePersistedState } from '../../common/util/usePersistedState';
import { mapImages } from './preloadImages';
import useMapStyles from './useMapStyles';
import { useEffectAsync } from '../../reactHelper';

const element = document.createElement('div');
element.style.width = '100%';
element.style.height = '100%';
element.style.boxSizing = 'initial';

maplibregl.addProtocol('google', googleProtocol);

export const map = new maplibregl.Map({
  container: element,
  attributionControl: false,
});

let ready = false;
const readyListeners = new Set();

const addReadyListener = (listener) => {
  readyListeners.add(listener);
  listener(ready);
};

const removeReadyListener = (listener) => {
  readyListeners.delete(listener);
};

const updateReadyValue = (value) => {
  ready = value;
  readyListeners.forEach((listener) => listener(value));
};

const initMap = async () => {
  if (ready) return;
  if (!map.hasImage('background')) {
    Object.entries(mapImages).forEach(([key, value]) => {
      try {
        map.addImage(key, value, {
          pixelRatio: window.devicePixelRatio,
        });
      } catch (error) {
        console.error(`Failed to add image ${key}:`, error);
      }
    });
  }
};

const MapView = ({ children, selectedMapStyle }) => {
  const theme = useTheme();

  const containerEl = useRef(null);

  const [mapReady, setMapReady] = useState(false);

  const mapStyles = useMapStyles();
  const activeMapStyles = useAttributePreference('activeMapStyles', 'locationIqStreets,locationIqDark,openFreeMap');
  const [defaultMapStyle] = usePersistedState('selectedMapStyle', usePreference('map', 'locationIqStreets'));
  const mapboxAccessToken = useAttributePreference('mapboxAccessToken');
  const maxZoom = useAttributePreference('web.maxZoom');


  useEffectAsync(async () => {
    if (theme.direction === 'rtl') {
      maplibregl.setRTLTextPlugin('/mapbox-gl-rtl-text.js');
    }
  }, [theme.direction]);

  useEffect(() => {
    const attribution = new maplibregl.AttributionControl({ compact: true });
    map.addControl(attribution, theme.direction === 'rtl' ? 'bottom-left' : 'bottom-right');
    
    // Style attribution control to match our theme
    const style = document.createElement('style');
    const isDark = theme.palette.mode === 'dark';
    const backgroundColor = isDark ? '#1F2937' : '#FFFFFF';
    const textColor = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';
    const linkColor = isDark ? '#3B82F6' : '#2563EB';
    const linkHoverColor = isDark ? '#60A5FA' : '#1D4ED8';
    
    style.textContent = `
      /* Attribution control styling */
      .maplibregl-ctrl-attrib {
        background-color: ${backgroundColor} !important;
        color: ${textColor} !important;
        border: 1px solid ${borderColor} !important;
        border-radius: 4px !important;
        font-size: 11px !important;
        padding: 4px 8px !important;
      }
      
      .maplibregl-ctrl-attrib a {
        color: ${linkColor} !important;
        text-decoration: none !important;
      }
      
      .maplibregl-ctrl-attrib a:hover {
        color: ${linkHoverColor} !important;
        text-decoration: underline !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      map.removeControl(attribution);
      document.head.removeChild(style);
    };
  }, [theme.direction, theme.palette.mode]);

  useEffect(() => {
    if (maxZoom) {
      map.setMaxZoom(maxZoom);
    }
  }, [maxZoom]);

  useEffect(() => {
    maplibregl.accessToken = mapboxAccessToken;
  }, [mapboxAccessToken]);

  // Handle external map style changes from props
  useEffect(() => {
    if (selectedMapStyle && map) {
      const filteredStyles = mapStyles.filter((s) => s.available && activeMapStyles.includes(s.id));
      const selectedStyle = filteredStyles.find((s) => s.id === selectedMapStyle);
      
      if (selectedStyle && selectedStyle.style) {
        updateReadyValue(false);
        map.setStyle(selectedStyle.style, { diff: false });
        if (selectedStyle.transformRequest) {
          map.setTransformRequest(selectedStyle.transformRequest);
        }
        
        map.once('styledata', () => {
          const waiting = () => {
            if (!map.loaded()) {
              setTimeout(waiting, 33);
            } else {
              initMap();
              updateReadyValue(true);
            }
          };
          waiting();
        });
      }
    }
  }, [selectedMapStyle, map, mapStyles, activeMapStyles]);

  useEffect(() => {
    const listener = (ready) => setMapReady(ready);
    addReadyListener(listener);
    return () => {
      removeReadyListener(listener);
    };
  }, []);

  useLayoutEffect(() => {
    const currentEl = containerEl.current;
    currentEl.appendChild(element);
    map.resize();
    return () => {
      currentEl.removeChild(element);
    };
  }, [containerEl]);

  return (
    <div style={{ width: '100%', height: '100%' }} ref={containerEl}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type.handlesMapReady) {
          return React.cloneElement(child, { mapReady });
        }
        return mapReady ? child : null;
      })}
    </div>
  );
};

export default MapView;
