import { useId, useEffect, useRef } from 'react';
import { map } from './core/MapView';
import maplibregl from 'maplibre-gl';

const MapOcorrenciaDestination = ({ destination }) => {
  const id = useId();
  const markerRef = useRef(null);

  useEffect(() => {
    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (!destination || !destination.lat || !destination.lon) {
      return;
    }

    // Create destination marker (red pin with "D" for Destination)
    const markerElement = document.createElement('div');
    markerElement.style.width = '32px';
    markerElement.style.height = '32px';
    markerElement.style.borderRadius = '50%';
    markerElement.style.backgroundColor = '#F44336'; // Red
    markerElement.style.border = '3px solid white';
    markerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
    markerElement.style.display = 'flex';
    markerElement.style.alignItems = 'center';
    markerElement.style.justifyContent = 'center';
    markerElement.style.fontSize = '14px';
    markerElement.style.fontWeight = 'bold';
    markerElement.style.color = 'white';
    markerElement.textContent = 'D';
    
    const markerInstance = new maplibregl.Marker(markerElement)
      .setLngLat([destination.lon, destination.lat])
      .addTo(map);
    
    markerRef.current = markerInstance;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [destination]);

  return null;
};

export default MapOcorrenciaDestination;

