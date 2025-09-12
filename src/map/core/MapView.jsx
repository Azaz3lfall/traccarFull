import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { googleProtocol } from 'maplibre-google-maps';
import React, {
  useRef, useLayoutEffect, useEffect, useState,
  useMemo,
} from 'react';
import { useTheme } from '@mui/material';
import { SwitcherControl } from '../switcher/switcher';
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
      map.addImage(key, value, {
        pixelRatio: window.devicePixelRatio,
      });
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

  const switcher = useMemo(() => new SwitcherControl(
    () => updateReadyValue(false),
    (styleId) => savePersistedState('selectedMapStyle', styleId),
    () => {
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
    },
  ), []);

  useEffectAsync(async () => {
    if (theme.direction === 'rtl') {
      maplibregl.setRTLTextPlugin('/mapbox-gl-rtl-text.js');
    }
  }, [theme.direction]);

  useEffect(() => {
    const attribution = new maplibregl.AttributionControl({ compact: true });
    const navigation = new maplibregl.NavigationControl();
    map.addControl(attribution, theme.direction === 'rtl' ? 'bottom-left' : 'bottom-right');
    map.addControl(navigation, theme.direction === 'rtl' ? 'top-left' : 'top-right');
    map.addControl(switcher, theme.direction === 'rtl' ? 'top-left' : 'top-right');
    
    // Add CSS to give only the first navigation control more margin-top to avoid overlap with custom control bar
    // and re-style all map controls to match the control bar buttons
    const style = document.createElement('style');
    style.textContent = `
      .maplibregl-ctrl-top-right .maplibregl-ctrl-group:first-child {
        margin-top: 70px !important;
      }
      
      /* Re-style map control buttons - keep original shape, change colors only */
      .maplibregl-ctrl-group button {
        background-color: #1F2937 !important;
        border-color: #374151 !important;
        transition: all 0.2s !important;
      }
      
      .maplibregl-ctrl-group button:hover {
        background-color: #374151 !important;
        border-color: #4B5563 !important;
      }
      
      .maplibregl-ctrl-group button:active {
        background-color: #4B5563 !important;
      }
      
      /* Style control icons - make them white/visible - target only icon elements */
      .maplibregl-ctrl-group button .maplibregl-ctrl-icon {
        filter: brightness(0) invert(1) !important;
      }
      
      /* Target search button icon specifically */
      .maplibregl-ctrl-geocoder .maplibregl-ctrl-geocoder--pin-right button .maplibregl-ctrl-icon {
        filter: brightness(0) invert(1) !important;
      }
      
      /* Target all possible icon elements in buttons */
      .maplibregl-ctrl button .maplibregl-ctrl-icon,
      .maplibregl-ctrl button svg,
      .maplibregl-ctrl button img {
        filter: brightness(0) invert(1) !important;
      }
      
      /* Style the control group container */
      .maplibregl-ctrl-group {
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
      
      /* Fix search button specifically */
      .maplibregl-ctrl-geocoder {
        background-color: #1F2937 !important;
        border: 1px solid #374151 !important;
        color: white !important;
      }
      
      .maplibregl-ctrl-geocoder .maplibregl-ctrl-geocoder--input {
        color: white !important;
        background-color: transparent !important;
      }
      
      .maplibregl-ctrl-geocoder .maplibregl-ctrl-geocoder--input::placeholder {
        color: #9CA3AF !important;
      }
      
      .maplibregl-ctrl-geocoder .maplibregl-ctrl-geocoder--pin-right button {
        background-color: transparent !important;
        color: white !important;
      }
      
      /* Fix map switcher/selector text */
      .maplibregl-style-list button {
        background-color: #1F2937 !important;
        color: white !important;
        border: 1px solid #374151 !important;
      }
      
      .maplibregl-style-list button:hover {
        background-color: #374151 !important;
      }
      
      .maplibregl-style-list button.active {
        background-color: #4B5563 !important;
        color: white !important;
      }
      
      .maplibregl-style-list button + button {
        border-top: 1px solid #374151 !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      map.removeControl(switcher);
      map.removeControl(navigation);
      map.removeControl(attribution);
      document.head.removeChild(style);
    };
  }, [theme.direction, switcher]);

  useEffect(() => {
    if (maxZoom) {
      map.setMaxZoom(maxZoom);
    }
  }, [maxZoom]);

  useEffect(() => {
    maplibregl.accessToken = mapboxAccessToken;
  }, [mapboxAccessToken]);

  useEffect(() => {
    const filteredStyles = mapStyles.filter((s) => s.available && activeMapStyles.includes(s.id));
    const styles = filteredStyles.length ? filteredStyles : mapStyles.filter((s) => s.id === 'osm');
    switcher.updateStyles(styles, defaultMapStyle);
  }, [mapStyles, defaultMapStyle, activeMapStyles, switcher]);

  // Handle external map style changes from props
  useEffect(() => {
    if (selectedMapStyle && selectedMapStyle !== defaultMapStyle) {
      switcher.switchToStyle(selectedMapStyle);
    }
  }, [selectedMapStyle, defaultMapStyle, switcher]);

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
