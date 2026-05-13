import { useState, useRef, useCallback } from 'react';
import { map } from '../../map/core/MapView';

export const useMapSearch = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchRef, setSearchRef] = useState(null);
  const searchTimeoutRef = useRef(null);

  const searchAddresses = useCallback(async (query) => {
    if (!query.trim() || query.trim().length < 5) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const request = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=geojson&polygon_geojson=1&addressdetails=1&limit=5`;
      const response = await fetch(request);
      const geojson = await response.json();

      const results = geojson.features.map((feature) => {
        const center = [
          feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
          feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2,
        ];
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: center },
          place_name: feature.properties.display_name,
          properties: feature.properties,
          text: feature.properties.display_name,
          place_type: ['place'],
          center,
        };
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);

    clearTimeout(searchTimeoutRef.current);

    if (query.trim().length >= 5) {
      searchTimeoutRef.current = setTimeout(() => {
        searchAddresses(query);
      }, 500);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchAddresses]);

  const handleSearchResultClick = useCallback((result) => {
    if (map && result.center) {
      map.easeTo({
        center: result.center,
        zoom: Math.max(map.getZoom(), 15),
        duration: 1000,
      });
    }
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    showSearch,
    setShowSearch,
    searchQuery,
    searchResults,
    isSearching,
    searchRef,
    setSearchRef,
    handleSearchChange,
    handleSearchResultClick,
  };
};

export default useMapSearch;
