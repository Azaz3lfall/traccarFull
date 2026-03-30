import { useId, useMemo, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import { map } from './core/MapView';
import { identifyStops, formatStopDuration } from '../common/util/stopDetection';

// Cria SVG do ícone de parada - círculo amarelo com borda vermelha (sem extensão)
const createStopPinSvg = (durationText, isDarkMode = false) => {
  const size = 64;
  const centerX = size / 2;
  const centerY = size / 2;
  const circleRadius = 22;

  // Cores do ícone (amarelo e vermelho)
  const yellowCircle = '#FFD700'; // Amarelo brilhante
  const redBorder = '#DC143C'; // Vermelho escuro
  const textColor = '#000000'; // Texto preto para contraste no amarelo

  // Calcula o tamanho do texto baseado no comprimento
  let textSize = 10;
  if (durationText.length > 6) {
    textSize = 8;
  } else if (durationText.length > 4) {
    textSize = 9;
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
        <feOffset dx="0" dy="2" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3"/>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Círculo amarelo com borda vermelha (ícone redondo) -->
    <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" 
            fill="${yellowCircle}" 
            stroke="${redBorder}" 
            stroke-width="3"
            filter="url(#shadow)" />
    <!-- Texto do tempo parado -->
    <text x="${centerX}" y="${centerY + 4}" 
          font-family="Arial, Helvetica, sans-serif" 
          font-size="${textSize}" 
          font-weight="bold" 
          fill="${textColor}" 
          text-anchor="middle" 
          dominant-baseline="middle">${durationText}</text>
  </svg>`;
};

const MapStopMarkers = ({ positions }) => {
  const id = useId();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Identifica paradas
  const stops = useMemo(() => identifyStops(positions), [positions]);

  // Carrega SVG do pin no mapa
  const loadStopPinImage = useCallback(async (durationText) => {
    const imageId = `stop-pin-${durationText.replace(/[^a-zA-Z0-9]/g, '-')}-${isDarkMode ? 'dark' : 'light'}`;

    if (map.hasImage(imageId)) {
      return imageId;
    }

    const svgString = createStopPinSvg(durationText, isDarkMode);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          if (!map.hasImage(imageId)) {
            map.addImage(imageId, img, {
              pixelRatio: window.devicePixelRatio || 1,
            });
          }
          URL.revokeObjectURL(svgUrl);
          resolve(imageId);
        } catch (error) {
          console.warn('Error adding stop pin image:', error);
          URL.revokeObjectURL(svgUrl);
          reject(error);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('Failed to load stop pin image'));
      };
      img.src = svgUrl;
    });
  }, [isDarkMode]);

  // Configura a camada do mapa
  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    map.addLayer({
      id,
      type: 'symbol',
      source: id,
      layout: {
        'icon-image': '{imageId}',
        'icon-size': 1.0,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-anchor': 'center',
      },
    });

    return () => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, []);

  // Atualiza os dados quando as paradas mudam
  useEffect(() => {
    const updateStops = async () => {
      if (stops.length === 0) {
        map.getSource(id)?.setData({
          type: 'FeatureCollection',
          features: [],
        });
        return;
      }

      // Carrega todas as imagens necessárias
      const durationTexts = stops.map((stop) => {
        const durationMs = (stop.duration ?? (stop.endTime - stop.startTime));
        return formatStopDuration(durationMs);
      });

      const uniqueTexts = [...new Set(durationTexts)];
      await Promise.all(uniqueTexts.map(text => loadStopPinImage(text)));

      // Cria features para cada parada
      const features = await Promise.all(stops.map(async (stop, index) => {
        const durationMs = stop.duration ?? (stop.endTime - stop.startTime);
        const durationText = formatStopDuration(durationMs);

        const imageId = `stop-pin-${durationText.replace(/[^a-zA-Z0-9]/g, '-')}-${isDarkMode ? 'dark' : 'light'}`;

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [stop.longitude, stop.latitude],
          },
          properties: {
            imageId,
            durationText,
            durationMs,
            startTime: stop.startTime,
            endTime: stop.endTime,
          },
        };
      }));

      map.getSource(id)?.setData({
        type: 'FeatureCollection',
        features,
      });
    };

    updateStops().catch((error) => {
      console.error('Error updating stop markers:', error);
    });
  }, [stops, id, loadStopPinImage, isDarkMode]);

  return null;
};

export default MapStopMarkers;

