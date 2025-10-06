import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useLocalization } from '../common/components/LocalizationProvider';
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  FormControlLabel,
  Pagination,
  CircularProgress,
  Alert,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  UploadFile as UploadFileIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  RadioButtonUnchecked as CircleIcon,
  Timeline as LineIcon,
  ChangeHistory as PolygonIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Close as CloseIcon2,
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { geofencesActions, devicesActions, errorsActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';
import useGeofenceAttributes from '../common/attributes/useGeofenceAttributes';
import SelectField from '../common/components/SelectField';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';
import { map } from '../map/core/MapView';
import { circle } from '@turf/turf';
import { parse } from 'wellknown';

const FloatingGeofencesPopover = ({ 
  desktop, 
  isMenuExpanded, 
  isDeviceListVisible,
  isVisible, 
  onClose,
  onRouteDataChange 
}) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const { language } = useLocalization();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const geofenceAttributes = useGeofenceAttributes(t);

  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [routePlannerTab, setRoutePlannerTab] = useState(0);
  const [routeData, setRouteData] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  
  // Cost calculation state
  const [costSettings, setCostSettings] = useState({
    fuelPrice: 6.70,
    consumption: 9,
    tollCost: 15.00,
    pricePerKm: 3.90,
    handlingFee: 500.00,
    roundTrip: false
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [geofenceToDelete, setGeofenceToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [saving, setSaving] = useState(false);
  const [isAddMode, setIsAddMode] = useState(true); // true = Add mode (drawing disabled), false = Save mode (drawing enabled)
  
  // Circle drawing state
  const [circleDrawingMode, setCircleDrawingMode] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(null);
  const [geofenceName, setGeofenceName] = useState('');
  
  // Polyline drawing state
  const [polylineDrawingMode, setPolylineDrawingMode] = useState(false);
  const [polylinePoints, setPolylinePoints] = useState([]);
  
  // Polygon drawing state
  const [polygonDrawingMode, setPolygonDrawingMode] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState([]);

  // Route planner state
  // Unified field management system
  const [fields, setFields] = useState([
    { id: 'start', type: 'start', value: '', searchResults: [], isSearching: false },
    { id: 'end', type: 'end', value: '', searchResults: [], isSearching: false }
  ]);
  const [routeWaypoints, setRouteWaypoints] = useState([]);
  
  // Get Mapbox access token from user session
  const mapboxToken = useSelector(state => state.session.user?.attributes?.mapboxAccessToken);

  // Fetch geofences with TanStack Query
  const { data: geofences = [], isLoading, error } = useQuery({
    queryKey: ['geofences'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/geofences');
      return response.json();
    },
    enabled: isVisible,
  });

  // Filter geofences based on search
  const filteredGeofences = geofences.filter(geofence =>
    geofence.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    geofence.description?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredGeofences.length / pageSize);
  const paginatedGeofences = filteredGeofences.slice((page - 1) * pageSize, page * pageSize);

  // Create geofence mutation
  const createGeofenceMutation = useMutation({
    mutationFn: async (geofenceData) => {
      const response = await fetchOrThrow('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geofenceData),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['geofences']);
      dispatch(geofencesActions.update([data]));
      setEditDialog(false);
      setEditingGeofence(null);
    },
    onError: (error) => {
      console.error('Create geofence error:', error);
    },
  });

  // Update geofence mutation
  const updateGeofenceMutation = useMutation({
    mutationFn: async ({ id, ...geofenceData }) => {
      const response = await fetchOrThrow(`/api/geofences/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geofenceData),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['geofences']);
      dispatch(geofencesActions.update([data]));
      setEditDialog(false);
      setEditingGeofence(null);
    },
    onError: (error) => {
      console.error('Update geofence error:', error);
    },
  });

  // Delete geofence mutation
  const deleteGeofenceMutation = useMutation({
    mutationFn: async (geofenceId) => {
      await fetchOrThrow(`/api/geofences/${geofenceId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: async (_, geofenceId) => {
      // Refresh geofences from server to ensure map updates
      try {
        const response = await fetchOrThrow('/api/geofences');
        const updatedGeofences = await response.json();
        dispatch(geofencesActions.refresh(updatedGeofences));
      } catch (error) {
        console.error('Failed to refresh geofences after deletion:', error);
      }
      
      // Invalidate query to refresh popover list
      queryClient.invalidateQueries(['geofences']);
      
      cancelDelete();
    },
    onError: (error) => {
      console.error('Delete geofence error:', error);
    },
  });

  // Handle add geofence - enables drawing tools
  const handleAdd = () => {
    setIsAddMode(false); // Switch to Save mode (drawing tools enabled)
  };

  // Handle save geofence - validates name and creates geofence
  const handleSave = () => {
    
    // Only proceed if we're in Save mode (not Add mode)
    if (isAddMode) {
      return; // Do nothing if in Add mode
    }

    if (!geofenceName.trim()) {
      // Show error if name is empty
      dispatch(errorsActions.push(t('sharedRequired')));
      return;
    }

    // Check if we have a completed circle, polyline, or polygon to save
    const hasCircle = center && radius;
    const hasPolyline = polylinePoints && polylinePoints.length > 0;
    const hasPolygon = polygonPoints && polygonPoints.length >= 3;
    
    if (!hasCircle && !hasPolyline && !hasPolygon) {
      dispatch(errorsActions.push(t('sharedRequired')));
      return;
    }

    let newGeofence;
    
    if (hasCircle) {
      // Create circle geofence
      newGeofence = {
        name: geofenceName.trim(),
        area: `CIRCLE (${center[1]} ${center[0]}, ${Math.round(radius)})`, // lat lng, radius in meters (rounded)
        attributes: {
          color: '#1976d2',
          mapLineWidth: 2,
          mapLineOpacity: 1
        }
      };
    } else if (hasPolyline) {
      // Create polyline geofence
      const coordinates = polylinePoints.map(point => `${point[1]} ${point[0]}`).join(', ');
      newGeofence = {
        name: geofenceName.trim(),
        area: `LINESTRING (${coordinates})`,
        attributes: {
          color: '#1976d2',
          mapLineWidth: 2,
          mapLineOpacity: 1
        }
      };
    } else if (hasPolygon) {
      // Create polygon geofence - close the polygon by repeating the first point
      const coordinates = [...polygonPoints, polygonPoints[0]].map(point => `${point[1]} ${point[0]}`).join(', ');
      newGeofence = {
        name: geofenceName.trim(),
        area: `POLYGON ((${coordinates}))`,
        attributes: {
          color: '#1976d2',
          mapLineWidth: 2,
          mapLineOpacity: 1
        }
      };
    }
    
    
    // Use the existing mutation to create the geofence
    createGeofenceMutation.mutate(newGeofence);

    // Reset everything
    setIsAddMode(true); // Switch back to Add mode (drawing tools disabled)
    resetDrawingTools(); // Reset any active drawing
    setGeofenceName(''); // Clear name only when saving
  };

  // Handle edit geofence
  const handleEdit = (geofence) => {
    setEditingGeofence({
      ...geofence,
      attributes: geofence.attributes || {
        color: '#3f51b5',
        mapLineWidth: 2,
        mapLineOpacity: 1,
        speedLimit: null,
        polylineDistance: null,
        hide: false,
      },
    });
    setEditDialog(true);
  };

  // Handle delete geofence
  const handleDelete = (geofence) => {
    setGeofenceToDelete(geofence);
    setDeleteDialog(true);
    setAnchorEl(null);
  };

  // Handle confirm delete
  const confirmDelete = () => {
    if (geofenceToDelete) {
      deleteGeofenceMutation.mutate(geofenceToDelete.id);
    }
  };

  // Handle cancel delete
  const cancelDelete = () => {
    setDeleteDialog(false);
    setGeofenceToDelete(null);
  };


  // Handle file upload (GPX)
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const [file] = files;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const xml = new DOMParser().parseFromString(reader.result, 'text/xml');
        const segment = xml.getElementsByTagName('trkseg')[0];
        if (segment) {
          const coordinates = Array.from(segment.getElementsByTagName('trkpt'))
            .map((point) => `${point.getAttribute('lat')} ${point.getAttribute('lon')}`)
            .join(', ');
          const area = `LINESTRING (${coordinates})`;
          
          const newGeofence = {
            name: t('sharedGeofence'),
            description: '',
            area,
            calendarId: null,
            attributes: {
              color: '#3f51b5',
              mapLineWidth: 2,
              mapLineOpacity: 1,
              speedLimit: null,
              polylineDistance: null,
              hide: false,
            },
          };

          setEditingGeofence(newGeofence);
          setEditDialog(true);
        }
      } catch (error) {
        console.error('Failed to parse GPX file:', error);
      }
    };
    reader.readAsText(file);
  };

  // Handle close dialog
  const handleCloseDialog = () => {
    setEditDialog(false);
    setEditingGeofence(null);
  };

  // Handle drawing tool selection
  const handleDrawingTool = (tool) => {
    if (tool === 'circle') {
      if (circleDrawingMode) {
        // If already in circle drawing mode, reset it
        resetDrawingTools();
      } else {
        // Reset ALL other tools first
        resetDrawingTools();
        // Enable circle drawing mode
        setCircleDrawingMode(true);
        setClickCount(0);
        setCenter(null);
      }
      
      // Keep popover open for circle drawing
      // Don't call onClose() here
    } else if (tool === 'line') {
      if (polylineDrawingMode) {
        // If already in polyline drawing mode, reset it
        resetDrawingTools();
      } else {
        // Reset ALL other tools first
        resetDrawingTools();
        // Enable polyline drawing mode
        setPolylineDrawingMode(true);
        setPolylinePoints([]);
      }
      
      // Keep popover open for polyline drawing
      // Don't call onClose() here
    } else if (tool === 'polygon') {
      if (polygonDrawingMode) {
        // If already in polygon drawing mode, reset it
        resetDrawingTools();
      } else {
        // Reset ALL other tools first
        resetDrawingTools();
        // Enable polygon drawing mode
        setPolygonDrawingMode(true);
        setPolygonPoints([]);
      }
      
      // Keep popover open for polygon drawing
      // Don't call onClose() here
    } else {
      // For other tools, navigate to geofences page
      onClose();
      window.location.href = `/geofences?tool=${tool}`;
    }
  };

  // Handle map clicks for circle drawing
  useEffect(() => {
    if (!circleDrawingMode || !map) return;

    const handleMapClick = (e) => {
      const { lng, lat } = e.lngLat;
      
      if (clickCount === 0) {
        // First click - set center
        setCenter([lng, lat]);
        setClickCount(1);
        
        // Add center marker to map
        if (map.getSource('circle-center')) {
          map.removeSource('circle-center');
        }
        if (map.getLayer('circle-center')) {
          map.removeLayer('circle-center');
        }
        
        map.addSource('circle-center', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            }
          }
        });
        
        map.addLayer({
          id: 'circle-center',
          type: 'circle',
          source: 'circle-center',
          paint: {
            'circle-radius': 8,
            'circle-color': '#1976d2',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        });
        
      } else if (clickCount === 1) {
        // Second click - set radius and complete circle
        const calculatedRadius = Math.sqrt(
          Math.pow(lng - center[0], 2) + Math.pow(lat - center[1], 2)
        ) * 111000; // Convert to meters (approximate)
        
        // Store the radius for saving later
        setRadius(calculatedRadius);
        
        // Create circle geofence
        const circleGeofence = circle(center, calculatedRadius / 1000, { steps: 32, units: 'kilometers' });
        
        // Add circle to map
        if (map.getSource('circle-preview')) {
          map.removeSource('circle-preview');
        }
        if (map.getLayer('circle-preview')) {
          map.removeLayer('circle-preview');
        }
        
        map.addSource('circle-preview', {
          type: 'geojson',
          data: circleGeofence
        });
        
        map.addLayer({
          id: 'circle-preview',
          type: 'fill',
          source: 'circle-preview',
          paint: {
            'fill-color': '#1976d2',
            'fill-opacity': 0.2
          }
        });
        
        map.addLayer({
          id: 'circle-preview-stroke',
          type: 'line',
          source: 'circle-preview',
          paint: {
            'line-color': '#1976d2',
            'line-width': 2
          }
        });
        
        // Don't create geofence yet - just complete the circle visualization
        // The geofence will be created when user clicks Save button
        
        // Disable circle tool after second click
        setCircleDrawingMode(false);
        setClickCount(0);
        // Keep center and radius for saving later
        // setCenter(null); // Don't clear center yet
        // setRadius(null); // Don't clear radius yet
        
        // Clean up only the center marker, keep the circle visible
        if (map.getSource('circle-center')) {
          map.removeSource('circle-center');
        }
        if (map.getLayer('circle-center')) {
          map.removeLayer('circle-center');
        }
      }
      // Third and subsequent clicks are ignored - no else clause
    };

    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [circleDrawingMode, clickCount, center, map]);

  // Handle map clicks for polyline drawing
  useEffect(() => {
    if (!polylineDrawingMode || !map) return;

    const handleMapClick = (e) => {
      const { lng, lat } = e.lngLat;
      const newPoint = [lng, lat];
      
      // Add point to polyline
      const updatedPoints = [...polylinePoints, newPoint];
      setPolylinePoints(updatedPoints);
      
      // Update polyline preview on map
      if (updatedPoints.length > 0) {
        // Create or update polyline source
        if (!map.getSource('polyline-preview')) {
          map.addSource('polyline-preview', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: updatedPoints
              }
            }
          });
          
          map.addLayer({
            id: 'polyline-preview',
            type: 'line',
            source: 'polyline-preview',
            paint: {
              'line-color': '#1976d2',
              'line-width': 2,
              'line-opacity': 1
            }
          });
        } else {
          // Just update the data
          map.getSource('polyline-preview').setData({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: updatedPoints
            }
          });
        }
        
        // Create or update points source
        if (!map.getSource('polyline-points')) {
          map.addSource('polyline-points', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: updatedPoints.map((point, index) => ({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: point
                },
                properties: {
                  index: index
                }
              }))
            }
          });
          
          map.addLayer({
            id: 'polyline-points',
            type: 'circle',
            source: 'polyline-points',
            paint: {
              'circle-radius': 4,
              'circle-color': '#1976d2',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2
            }
          });
        } else {
          // Just update the data
          map.getSource('polyline-points').setData({
            type: 'FeatureCollection',
            features: updatedPoints.map((point, index) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: point
              },
              properties: {
                index: index
              }
            }))
          });
        }
      }
    };

    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [polylineDrawingMode, polylinePoints, map]);

  // Handle map clicks for polygon drawing
  useEffect(() => {
    if (!polygonDrawingMode || !map) return;

    const handleMapClick = (e) => {
      const { lng, lat } = e.lngLat;
      const newPoint = [lng, lat];
      
      // Add point to polygon
      const updatedPoints = [...polygonPoints, newPoint];
      setPolygonPoints(updatedPoints);
      
      // Always show points from first click
      // Create or update points source
      if (!map.getSource('polygon-points')) {
        map.addSource('polygon-points', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: updatedPoints.map((point, index) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: point
              },
              properties: {
                index: index
              }
            }))
          }
        });
        
        map.addLayer({
          id: 'polygon-points',
          type: 'circle',
          source: 'polygon-points',
          paint: {
            'circle-radius': 4,
            'circle-color': '#1976d2',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        });
      } else {
        // Just update the data
        map.getSource('polygon-points').setData({
          type: 'FeatureCollection',
          features: updatedPoints.map((point, index) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: point
            },
            properties: {
              index: index
            }
          }))
        });
      }
      
      // Show polygon shape from 3rd point onwards
      if (updatedPoints.length >= 3) {
        // Create closed polygon by repeating the first point
        const closedPolygon = [...updatedPoints, updatedPoints[0]];
        
        // Create or update polygon source
        if (!map.getSource('polygon-preview')) {
          map.addSource('polygon-preview', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [closedPolygon]
              }
            }
          });
          
          map.addLayer({
            id: 'polygon-preview',
            type: 'fill',
            source: 'polygon-preview',
            paint: {
              'fill-color': '#1976d2',
              'fill-opacity': 0.2
            }
          });
          
          map.addLayer({
            id: 'polygon-preview-stroke',
            type: 'line',
            source: 'polygon-preview',
            paint: {
              'line-color': '#1976d2',
              'line-width': 2,
              'line-opacity': 1
            }
          });
        } else {
          // Just update the data
          map.getSource('polygon-preview').setData({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [closedPolygon]
            }
          });
        }
      }
    };

    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [polygonDrawingMode, polygonPoints, map]);

  // Reset drawing tools
  const resetDrawingTools = () => {
    setCircleDrawingMode(false);
    setClickCount(0);
    setCenter(null);
    setRadius(null);
    setPolylineDrawingMode(false);
    setPolylinePoints([]);
    setPolygonDrawingMode(false);
    setPolygonPoints([]);
    
    // Clean up map layers first, then sources
    if (map) {
      // Remove circle layers first
      if (map.getLayer('circle-center')) {
        map.removeLayer('circle-center');
      }
      if (map.getLayer('circle-preview')) {
        map.removeLayer('circle-preview');
      }
      if (map.getLayer('circle-preview-stroke')) {
        map.removeLayer('circle-preview-stroke');
      }
      
      // Remove polyline layers
      if (map.getLayer('polyline-preview')) {
        map.removeLayer('polyline-preview');
      }
      if (map.getLayer('polyline-points')) {
        map.removeLayer('polyline-points');
      }
      
      // Remove polygon layers
      if (map.getLayer('polygon-preview')) {
        map.removeLayer('polygon-preview');
      }
      if (map.getLayer('polygon-preview-stroke')) {
        map.removeLayer('polygon-preview-stroke');
      }
      if (map.getLayer('polygon-points')) {
        map.removeLayer('polygon-points');
      }
      
      // Then remove sources
      if (map.getSource('circle-center')) {
        map.removeSource('circle-center');
      }
      if (map.getSource('circle-preview')) {
        map.removeSource('circle-preview');
      }
      if (map.getSource('polyline-preview')) {
        map.removeSource('polyline-preview');
      }
      if (map.getSource('polyline-points')) {
        map.removeSource('polyline-points');
      }
      if (map.getSource('polygon-preview')) {
        map.removeSource('polygon-preview');
      }
      if (map.getSource('polygon-points')) {
        map.removeSource('polygon-points');
      }
    }
  };


  // Handle geofence click - center map and clear selected device
  const handleGeofenceClick = (geofence) => {
    // Clear selected device
    dispatch(devicesActions.selectId(null));
    
    // Center map on geofence if it has area data
    if (geofence.area && map && map.loaded()) {
      try {
        let centerLng, centerLat;
        
        // Handle different geofence area types
        if (geofence.area.indexOf('CIRCLE') > -1) {
          // CIRCLE (lat lng, radius) format - convert to [lng, lat] for map
          const coordinates = geofence.area.replace(/CIRCLE|\(|\)|,/g, ' ').trim().split(/ +/);
          if (coordinates.length >= 3) {
            centerLat = Number(coordinates[0]); // First is latitude
            centerLng = Number(coordinates[1]); // Second is longitude
          }
        } else if (geofence.area.indexOf('LINESTRING') > -1) {
          // LINESTRING (lat1 lng1, lat2 lng2, ...) format - convert to [lng, lat] for map
          const areaMatch = geofence.area.match(/LINESTRING\s*\(([^)]+)\)/);
          if (areaMatch) {
            const coordinates = areaMatch[1].split(',').map(coord => {
              const [lat, lng] = coord.trim().split(' ').map(Number);
              return [lng, lat]; // Convert to [lng, lat] format for map
            });
            
            if (coordinates.length > 0) {
              centerLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
              centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
            }
          }
        } else if (geofence.area.indexOf('POLYGON') > -1) {
          // POLYGON ((lat1 lng1, lat2 lng2, ...)) format - convert to [lng, lat] for map
          const areaMatch = geofence.area.match(/POLYGON\s*\(\s*\(([^)]+)\)\s*\)/);
          if (areaMatch) {
            const coordinates = areaMatch[1].split(',').map(coord => {
              const [lat, lng] = coord.trim().split(' ').map(Number);
              return [lng, lat]; // Convert to [lng, lat] format for map
            });
            
            if (coordinates.length > 0) {
              centerLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
              centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
            }
          }
        } else {
          // Try to parse using wellknown library for other geometry types
          try {
            const geometry = parse(geofence.area);
            if (geometry && geometry.coordinates) {
              let coordinates = [];
              
              if (geometry.type === 'Point') {
                coordinates = [geometry.coordinates];
              } else if (geometry.type === 'LineString') {
                coordinates = geometry.coordinates;
              } else if (geometry.type === 'Polygon') {
                coordinates = geometry.coordinates[0]; // Use outer ring
              } else if (geometry.type === 'MultiPolygon') {
                coordinates = geometry.coordinates[0][0]; // Use first polygon's outer ring
              }
              
              if (coordinates.length > 0) {
                centerLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
                centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse geofence area with wellknown:', parseError);
          }
        }
        
        // Center map if we have valid coordinates
        if (centerLng !== undefined && centerLat !== undefined) {
          map.easeTo({
            center: [centerLng, centerLat],
            zoom: Math.max(map.getZoom(), 15),
            duration: 1000
          });
        }
      } catch (error) {
        console.error('Error centering map on geofence:', error);
      }
    }
  };

  // Handle menu actions

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRoutePlannerTabChange = (event, newValue) => {
    setRoutePlannerTab(newValue);
    
    // If switching to Route Plan tab, fetch route data
    if (newValue === 1) {
      // Small delay to ensure waypoints are updated
      setTimeout(() => {
        fetchRoutePlan();
      }, 100);
    }
  };

  // Fetch route plan from Mapbox
  const fetchRoutePlan = async () => {
    // Get valid waypoints from fields instead of routeWaypoints state
    const validWaypoints = fields
      .filter(field => field.value && field.value.trim() !== '')
      .map(field => {
        // Find the corresponding waypoint from routeWaypoints
        const waypoint = routeWaypoints.find(wp => wp && wp.address === field.value);
        return waypoint || null;
      })
      .filter(wp => wp && wp.coordinates);
    
    if (validWaypoints.length < 2) {
      console.log('Not enough waypoints for route planning');
      return;
    }

    setIsLoadingRoute(true);
    
    try {
      if (!mapboxToken) {
        console.error('Mapbox access token not found');
        setIsLoadingRoute(false);
        return;
      }

      // Build coordinates string for Mapbox Directions API
      const coordinates = validWaypoints.map(wp => wp.coordinates).join(';');
      
      console.log('Waypoints for routing:', validWaypoints.map(wp => ({
        address: wp.address,
        coordinates: wp.coordinates
      })));
      
      // Mapbox Directions API request with more precise parameters
      const approaches = validWaypoints.map(() => 'curb').join(';');
      const radiuses = validWaypoints.map(() => 'unlimited').join(';');
      
      // Convert language code to Mapbox format (e.g., 'pt_BR' -> 'pt', 'en_US' -> 'en')
      const mapboxLanguage = language.split('_')[0];
      
      const request = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${mapboxToken}&geometries=geojson&overview=full&steps=true&annotations=duration,distance,speed,congestion&approaches=${approaches}&radiuses=${radiuses}&continue_straight=true&roundabout_exits=true&voice_instructions=true&banner_instructions=true&language=${mapboxLanguage}&alternatives=true`;
      
      console.log('Fetching route from Mapbox...', request);
      
      const response = await fetch(request);
      const data = await response.json();
      
      console.log('Mapbox Route Response:', data);
      console.log('Number of routes returned:', data.routes ? data.routes.length : 0);
      setRouteData(data);
             
             // Switch to Route Plan tab after successful route generation
             setRoutePlannerTab(1);
      
    } catch (error) {
      console.error('Error fetching route:', error);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Address search functionality for route planner using Mapbox
  const searchAddresses = async (query, fieldId) => {
    if (!query.trim() || query.trim().length < 5) {
      setFields(prev => prev.map(field => 
        field.id === fieldId 
          ? { ...field, searchResults: [], isSearching: false }
          : field
      ));
      return;
    }

    setFields(prev => prev.map(field => 
      field.id === fieldId 
        ? { ...field, isSearching: true }
        : field
    ));

    try {
      if (!mapboxToken) {
        throw new Error('Mapbox access token not found');
      }

      const request = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=15&types=address,poi&country=BR&language=pt`;
      const response = await fetch(request);
      
      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const results = data.features.map((feature) => {
        return {
          type: 'Feature',
          geometry: feature.geometry,
          place_name: feature.place_name,
          properties: {
            display_name: feature.place_name,
            ...feature.properties
          },
          text: feature.place_name,
          place_type: feature.place_type,
          center: feature.center,
        };
      });
      
      setFields(prev => prev.map(field => 
        field.id === fieldId 
          ? { ...field, searchResults: results, isSearching: false }
          : field
      ));
    } catch (error) {
      console.error('Search error:', error);
      setFields(prev => prev.map(field => 
        field.id === fieldId 
          ? { ...field, searchResults: [], isSearching: false }
          : field
      ));
    }
  };

  // Handle field value change
  const handleFieldChange = (fieldId, value) => {
    setFields(prev => prev.map(field => 
      field.id === fieldId 
        ? { ...field, value }
        : field
    ));
    
    // Clear previous timeout for this field
    clearTimeout(window[`searchTimeout_${fieldId}`]);
    
    if (value.trim().length >= 5) {
      // Debounce search with 800ms delay
      window[`searchTimeout_${fieldId}`] = setTimeout(() => {
        searchAddresses(value, fieldId);
      }, 800);
    } else {
      // Clear results if less than 5 characters
      setFields(prev => prev.map(field => 
        field.id === fieldId 
          ? { ...field, searchResults: [], isSearching: false }
          : field
      ));
    }
  };

  // Handle field selection
  const handleFieldSelect = (fieldId, result) => {
    const address = result.properties?.display_name || result.text;
    
    setFields(prev => {
      const updatedFields = prev.map(field => 
        field.id === fieldId 
          ? { ...field, value: address, searchResults: [] }
          : field
      );
      
      // Update route waypoints based on field position
      const fieldIndex = updatedFields.findIndex(f => f.id === fieldId);
      
      setRouteWaypoints(prevWaypoints => {
        // Ensure waypoints array matches fields array length
        const newWaypoints = [...prevWaypoints];
        while (newWaypoints.length < updatedFields.length) {
          newWaypoints.push(null);
        }
        if (newWaypoints.length > updatedFields.length) {
          newWaypoints.splice(updatedFields.length);
        }
        
        // Determine type based on position
        let type;
        if (fieldIndex === 0) {
          type = 'start';
        } else if (fieldIndex === updatedFields.length - 1) {
          type = 'end';
        } else {
          type = `waypoint_${fieldIndex}`;
        }
        
        newWaypoints[fieldIndex] = {
          address,
          coordinates: result.center,
          type
        };
        
        return newWaypoints;
      });
      
      return updatedFields;
    });
  };

  // Handle field reordering
  const handleReorderField = (fieldId, direction) => {
    setFields(prev => {
      const newFields = [...prev];
      const currentIndex = newFields.findIndex(f => f.id === fieldId);
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (newIndex >= 0 && newIndex < newFields.length) {
        // Swap fields
        [newFields[currentIndex], newFields[newIndex]] = [newFields[newIndex], newFields[currentIndex]];
        
        // Update route waypoints to match new field order
        setRouteWaypoints(prevWaypoints => {
          // Ensure waypoints array matches fields array length
          const newWaypoints = [...prevWaypoints];
          while (newWaypoints.length < newFields.length) {
            newWaypoints.push(null);
          }
          if (newWaypoints.length > newFields.length) {
            newWaypoints.splice(newFields.length);
          }
          
          // Swap waypoints if both exist
          if (newWaypoints[currentIndex] && newWaypoints[newIndex]) {
            [newWaypoints[currentIndex], newWaypoints[newIndex]] = [newWaypoints[newIndex], newWaypoints[currentIndex]];
          }
          
          // Update types based on new positions
          newWaypoints.forEach((waypoint, index) => {
            if (waypoint) {
              if (index === 0) {
                waypoint.type = 'start';
              } else if (index === newWaypoints.length - 1) {
                waypoint.type = 'end';
              } else {
                waypoint.type = `waypoint_${index}`;
              }
            }
          });
          
          return newWaypoints;
        });
      }
      
      return newFields;
    });
  };

  // Handle field deletion
  const handleDeleteField = (fieldId) => {
    setFields(prev => {
      const fieldIndex = prev.findIndex(f => f.id === fieldId);
      
      // Prevent deletion of first or last field (mandatory start/end)
      if (fieldIndex === 0 || fieldIndex === prev.length - 1) {
        return prev; // Don't delete mandatory fields
      }
      
      // Prevent deletion if it would leave less than 2 fields
      if (prev.length <= 2) {
        return prev; // Always keep at least 2 fields
      }
      
      const newFields = prev.filter(field => field.id !== fieldId);
      
      // Update route waypoints to match new field order
      setRouteWaypoints(prevWaypoints => {
        const newWaypoints = [...prevWaypoints];
        newWaypoints.splice(fieldIndex, 1);
        
        // Ensure waypoints array matches fields array length
        while (newWaypoints.length < newFields.length) {
          newWaypoints.push(null);
        }
        if (newWaypoints.length > newFields.length) {
          newWaypoints.splice(newFields.length);
        }
        
        // Update types based on new positions
        newWaypoints.forEach((waypoint, index) => {
          if (waypoint) {
            if (index === 0) {
              waypoint.type = 'start';
            } else if (index === newWaypoints.length - 1) {
              waypoint.type = 'end';
            } else {
              waypoint.type = `waypoint_${index}`;
            }
          }
        });
        
        return newWaypoints;
      });
      
      return newFields;
    });
  };

  // Add new field
  const handleAddField = () => {
    const newFieldId = `dynamic_${Date.now()}`;
    setFields(prev => [...prev, {
      id: newFieldId,
      type: 'waypoint',
      value: '',
      searchResults: [],
      isSearching: false
    }]);
    
    // Add null entry to routeWaypoints to maintain synchronization
    setRouteWaypoints(prev => [...prev, null]);
  };

  // Helper function to check if a field has a corresponding waypoint
  const hasWaypointForField = (fieldId, fieldValue) => {
    const fieldIndex = fields.findIndex(f => f.id === fieldId);
    return routeWaypoints[fieldIndex] && routeWaypoints[fieldIndex].address === fieldValue;
  };

  // Notify parent component when route data changes
  useEffect(() => {
    if (onRouteDataChange) {
      // Include waypoints in the route data for markers
      const routeDataWithWaypoints = routeData ? {
        ...routeData,
        waypoints: routeWaypoints
      } : null;
      onRouteDataChange(routeDataWithWaypoints);
    }
  }, [routeData, routeWaypoints, onRouteDataChange]);

  // BULLETPROOF synchronization - Rebuild waypoints from fields
  useEffect(() => {
    console.log('=== SYNC CHECK ===');
    console.log('Fields:', fields.map(f => ({ id: f.id, value: f.value })));
    console.log('Current waypoints:', routeWaypoints.map((w, i) => ({ index: i, address: w?.address })));
    
    // Rebuild waypoints array from scratch based on fields
    const newWaypoints = fields.map((field, index) => {
      // Find existing waypoint for this field
      const existingWaypoint = routeWaypoints[index];
      
      // If field has a value and we have a matching waypoint, keep it
      if (field.value && existingWaypoint && existingWaypoint.address === field.value) {
        return existingWaypoint;
      }
      
      // If field has a value but no matching waypoint, create new one
      if (field.value && (!existingWaypoint || existingWaypoint.address !== field.value)) {
        return {
          address: field.value,
          coordinates: [0, 0], // Will be updated when user selects from search
          type: index === 0 ? 'start' : index === fields.length - 1 ? 'end' : `waypoint_${index}`
        };
      }
      
      // Field is empty, return null
      return null;
    });
    
    console.log('Rebuilt waypoints:', newWaypoints.map((w, i) => ({ index: i, address: w?.address })));
    
    // Check if waypoints actually changed BEFORE updating state
    const waypointsChanged = JSON.stringify(newWaypoints) !== JSON.stringify(routeWaypoints);
    
    // Only clear route data and switch to Waypoints tab when waypoints actually change
    if (waypointsChanged && routeData) {
      console.log('Waypoints actually changed - clearing route data and switching to Waypoints tab');
      setRouteData(null);
      setRoutePlannerTab(0); // Switch to Waypoints tab (index 0)
    }
    
    setRouteWaypoints(newWaypoints);
  }, [fields]);




  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="geofences-popover"
          initial={{ x: !desktop ? 0 : -400, y: !desktop ? 100 : 0, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={{ x: !desktop ? 0 : -400, y: !desktop ? 100 : 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: 'fixed',
          top: !desktop ? 'auto' : '8px',
          bottom: !desktop ? '0px' : 'auto',
          left: !desktop ? '0px' : (isDeviceListVisible ? (isMenuExpanded ? '510px' : '370px') : (isMenuExpanded ? '200px' : '63px')),
          width: !desktop ? '100vw' : '320px',
          height: !desktop ? '50vh' : 'calc(100vh - 16px)',
          zIndex: 9999,
          pointerEvents: 'auto',
          transition: 'left 0.3s ease'
        }}
      >
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: !desktop ? '16px 16px 0px 0px' : (isDeviceListVisible ? '0px 16px 16px 0px' : '0px 16px 16px 0px'),
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: !desktop ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderRadius: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <ChevronLeftIcon style={{ fontSize: 20, color: colors.textSecondary }} />
              </button>
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600' }}>
                {t('sharedGeofences')}
              </Typography>
            </div>
            <input
              accept=".gpx"
              id="upload-gpx"
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <label htmlFor="upload-gpx">
              <IconButton
                component="span"
                size="small"
                style={{
                  color: colors.textSecondary,
                  backgroundColor: colors.secondary,
                  '&:hover': {
                    backgroundColor: colors.hover
                  }
                }}
              >
                <UploadFileIcon />
              </IconButton>
            </label>
          </div>

          {/* Tabs */}
          <div style={{ 
            borderBottom: `1px solid ${colors.border}`,
            marginBottom: '16px',
          }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  color: '#666666',
                  fontSize: '12px',
                  fontWeight: '500',
                  textTransform: 'none',
                  minHeight: '40px',
                  padding: '8px 16px',
                  '&.Mui-selected': {
                    color: '#1976d2',
                    fontWeight: '600',
                    backgroundColor: 'transparent',
                  },
                  '&:hover': {
                    color: '#1976d2',
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                  },
                  '&.Mui-selected:hover': {
                    color: '#1976d2',
                    backgroundColor: 'rgba(25, 118, 210, 0.15)',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#1976d2',
                  height: '2px',
                },
              }}
            >
                <Tab label={t('routePlannerBasic')} />
                <Tab label={t('routePlanner')} />
            </Tabs>
          </div>

          {/* Tab Content */}
          {activeTab === 0 && (
            <>
          {/* Search and Add */}
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <TextField
                fullWidth
                placeholder={t('sharedSearch')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: <SearchIcon style={{ color: colors.textSecondary, marginRight: '8px' }} />
                }}
                    sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px'
                  }
                }}
              />
            </div>
          <Button
            variant="contained"
            startIcon={isAddMode ? <AddIcon /> : null}
            onClick={isAddMode ? handleAdd : handleSave}
            fullWidth
            size="small"
            disabled={!isAddMode && saving}
            style={{
              backgroundColor: colors.primary,
              color: colors.text,
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              marginBottom: '12px'
            }}
          >
            {isAddMode ? `${t('sharedAdd')} ${t('sharedGeofence')}` : `${t('sharedSave')} ${t('sharedGeofence')}`}
          </Button>
          
          {/* Geofence Name Input */}
          <TextField
            fullWidth
            size="small"
            label={t('sharedName')}
            value={geofenceName}
            onChange={(e) => setGeofenceName(e.target.value)}
            disabled={isAddMode}
            style={{
              marginBottom: '12px'
            }}
            InputLabelProps={{
              style: { color: colors.text }
            }}
            InputProps={{
              style: { color: colors.text }
            }}
          />
          
          {/* Drawing Tools Row */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant={circleDrawingMode ? "contained" : "outlined"}
              size="small"
              onClick={() => handleDrawingTool('circle')}
              disabled={isAddMode}
              style={{
                color: circleDrawingMode ? '#ffffff' : colors.text,
                backgroundColor: circleDrawingMode ? '#1976d2' : 'transparent',
                borderColor: circleDrawingMode ? '#1976d2' : colors.border,
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '48px',
                height: '48px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CircleIcon fontSize="small" />
            </Button>
            <Button
              variant={polylineDrawingMode ? "contained" : "outlined"}
              size="small"
              onClick={() => handleDrawingTool('line')}
              disabled={isAddMode}
              style={{
                color: polylineDrawingMode ? '#ffffff' : colors.text,
                backgroundColor: polylineDrawingMode ? '#1976d2' : 'transparent',
                borderColor: polylineDrawingMode ? '#1976d2' : colors.border,
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '48px',
                height: '48px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LineIcon fontSize="small" />
            </Button>
            <Button
              variant={polygonDrawingMode ? "contained" : "outlined"}
              size="small"
              onClick={() => handleDrawingTool('polygon')}
              disabled={isAddMode}
              style={{
                color: polygonDrawingMode ? '#ffffff' : colors.text,
                backgroundColor: polygonDrawingMode ? '#1976d2' : 'transparent',
                borderColor: polygonDrawingMode ? '#1976d2' : colors.border,
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                minWidth: '48px',
                height: '48px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PolygonIcon fontSize="small" />
            </Button>
          </div>
          </div>
            </>
          )}

          {activeTab === 1 && (
            <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
              {/* Unified Field System */}
              {fields.map((field, index) => (
                <div key={field.id} style={{ marginBottom: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={index === 0 ? t('routePlannerEnterStartAddress') : index === fields.length - 1 ? t('routePlannerEnterEndAddress') : t('routePlannerEnterAddress')}
                      value={field.value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 50px 10px 12px', // Space for controls
                        backgroundColor: colors.secondary,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    
                    {/* Reorder buttons */}
                    <div style={{ 
                      position: 'absolute', 
                      right: '8px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '1px' 
                    }}>
                      <button
                        onClick={() => handleReorderField(field.id, 'up')}
                        disabled={index === 0 || !field.value || field.value.trim() === ''}
                        style={{
                          width: '20px',
                          height: '12px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: (index === 0 || !field.value || field.value.trim() === '') ? colors.textSecondary : colors.text,
                          cursor: (index === 0 || !field.value || field.value.trim() === '') ? 'not-allowed' : 'pointer',
                          borderRadius: '2px 2px 0 0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          opacity: (index === 0 || !field.value || field.value.trim() === '') ? 0.5 : 1,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <ArrowUpIcon style={{ fontSize: '10px' }} />
                      </button>
                      <button
                        onClick={() => handleReorderField(field.id, 'down')}
                        disabled={index === fields.length - 1 || !field.value || field.value.trim() === ''}
                        style={{
                          width: '20px',
                          height: '12px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: (index === fields.length - 1 || !field.value || field.value.trim() === '') ? colors.textSecondary : colors.text,
                          cursor: (index === fields.length - 1 || !field.value || field.value.trim() === '') ? 'not-allowed' : 'pointer',
                          borderRadius: '0 0 2px 2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          opacity: (index === fields.length - 1 || !field.value || field.value.trim() === '') ? 0.5 : 1,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <ArrowDownIcon style={{ fontSize: '10px' }} />
                      </button>
                    </div>
                    
                    {/* Delete button for non-essential fields (not first or last) */}
                    {index !== 0 && index !== fields.length - 1 && (
                      <button
                        onClick={() => handleDeleteField(field.id)}
                      style={{
                        position: 'absolute',
                        right: '22px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '20px',
                        height: '20px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: colors.textSecondary,
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px'
                      }}
                    >
                      <CloseIcon2 style={{ fontSize: '12px' }} />
                    </button>
                    )}
                    
                    {/* Loading spinner */}
                    {field.isSearching && (
                      <div style={{
                        position: 'absolute',
                        right: '50px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}>
                        <CircularProgress 
                          size={16} 
                          style={{ 
                            color: colors.text,
                            filter: 'brightness(1.2)'
                          }} 
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Search Results */}
                  {field.searchResults && field.searchResults.length > 0 && (
                    <div style={{
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '8px',
                      width: '100%'
                    }}>
                      {field.searchResults.map((result, resultIndex) => (
                        <div
                          key={`${field.id}-result-${resultIndex}-${result.properties?.display_name || result.text}`}
                          onClick={() => handleFieldSelect(field.id, result)}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderBottom: resultIndex < field.searchResults.length - 1 ? `1px solid ${colors.border}` : 'none',
                            backgroundColor: 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = colors.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Typography variant="body2" style={{ color: colors.text, fontSize: '12px' }}>
                            {result.properties?.display_name || result.text}
                          </Typography>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Character count message */}
                  {field.value && field.value.trim().length > 0 && field.value.trim().length < 5 && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      color: colors.textSecondary,
                      fontSize: '12px',
                      textAlign: 'center'
                    }}>
                      Type at least 5 characters to search
                    </div>
                  )}
                  
                </div>
              ))}

              {/* Add Field Button */}
              <button
                onClick={handleAddField}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px dashed ${colors.border}`,
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  marginBottom: '16px'
                }}
              >
                <span style={{ fontSize: '16px' }}>+</span>
                {t('routePlannerAddAddress')}
              </button>

              {/* Waypoints Section with Tabs */}
              <div style={{ marginTop: '12px' }}>
                {/* Waypoints Sub-tabs */}
                <Tabs
                  value={routePlannerTab}
                  onChange={handleRoutePlannerTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': {
                      color: '#666666',
                      fontSize: '12px',
                      fontWeight: '500',
                      textTransform: 'none',
                      minHeight: '40px',
                      padding: '8px 16px',
                      '&.Mui-selected': {
                        color: '#1976d2',
                        fontWeight: '600',
                        backgroundColor: 'transparent',
                      },
                      '&:hover': {
                        color: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      },
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#1976d2',
                      height: '2px'
                    }
                  }}
                >
                  <Tab label={t('routePlannerWaypoints')} />
                  <Tab label={t('routePlannerRoutePlan')} />
                  <Tab 
                    label={t('routePlannerCosts')} 
                    disabled={!routeData}
                  />
                </Tabs>

                {/* Waypoints Tab Content */}
                {routePlannerTab === 0 && (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {routeWaypoints.filter(wp => wp && wp.address).length > 0 && (
                      <div style={{
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        backgroundColor: colors.secondary,
                        padding: '8px',
                        marginTop: '8px'
                      }}>
                    <div style={{ position: 'relative' }}>
                      {routeWaypoints.filter(waypoint => waypoint && waypoint.address).map((waypoint, index) => {
                        const filteredWaypoints = routeWaypoints.filter(wp => wp && wp.address);
                        const isFirst = index === 0;
                        const isLast = index === filteredWaypoints.length - 1;
                        const isMiddle = !isFirst && !isLast;
                        
                        return (
                          <div key={`waypoint-${waypoint.address}-${index}`} style={{
                            display: 'flex',
                            alignItems: 'center',
                            position: 'relative',
                            padding: '8px 0',
                            paddingLeft: '20px'
                          }}>
                            {/* Timeline line */}
                            {!isLast && (
                              <div style={{
                                position: 'absolute',
                                left: '6px',
                                top: '14px',
                                bottom: '-14px',
                                width: '2px',
                                backgroundColor: isFirst ? '#4caf50' : isLast ? '#f44336' : '#2196f3',
                                zIndex: 0
                              }} />
                            )}
                            
                            {/* Timeline dot */}
                            <div style={{
                              position: 'absolute',
                              left: '0',
                              top: '8px',
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: isFirst ? '#4caf50' : isLast ? '#f44336' : '#2196f3',
                              border: isFirst ? 'none' : isLast ? 'none' : `2px solid #2196f3`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 1
                            }}>
                              {(isFirst || isLast) && (
                                <div style={{
                                  width: '6px',
                                  height: '6px',
                                  backgroundColor: 'white',
                                  borderRadius: '50%'
                                }} />
                              )}
                            </div>
                            
                            {/* Address text */}
                            <div style={{ flex: 1, marginRight: '8px' }}>
                              <Typography variant="body2" style={{ 
                                color: (isFirst || isLast) ? colors.text : colors.textSecondary, 
                                fontSize: '12px',
                                fontWeight: '400'
                              }}>
                                {waypoint.address}
                              </Typography>
                            </div>
                            
                            {/* Delete button for middle waypoints */}
                            {isMiddle && (
                              <button
                                onClick={() => handleDeleteField(fields[index].id)}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: colors.textSecondary,
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = colors.hover;
                                  e.target.style.color = colors.error;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.color = colors.textSecondary;
                                }}
                              >
                                <CloseIcon2 style={{ fontSize: '14px' }} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Route Plan Tab Content */}
                {routePlannerTab === 1 && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0px' }}>
                    {(() => {
                      const validWaypoints = routeWaypoints.filter(wp => wp && wp.address && wp.coordinates);
                      
                      if (validWaypoints.length < 2) {
                        return (
                          <Typography variant="body2" style={{ 
                            color: colors.textSecondary, 
                            textAlign: 'center',
                            padding: '40px 20px'
                          }}>
                            {t('routePlannerSelectAddresses')}
                          </Typography>
                        );
                      }
                      
                      if (isLoadingRoute) {
                        return (
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            padding: '40px 20px' 
                          }}>
                            <CircularProgress size={24} style={{ marginBottom: '16px' }} />
                            <Typography variant="body2" style={{ color: colors.textSecondary }}>
                              {t('routePlannerPlanningRoute')}
                            </Typography>
                          </div>
                        );
                      }
                      
                      if (routeData) {
                        return (
                          <div>
                            
                            {routeData.routes && routeData.routes.length > 0 && (
                              <div>
                                {/* Alternative Route Buttons */}
                                {routeData.routes.length > 1 && (
                                  <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    marginBottom: '12px',
                                    justifyContent: 'center'
                                  }}>
                                    {routeData.routes.map((route, index) => (
                                      <button
                                        key={index}
                                        onClick={() => {
                                          console.log('Route button clicked:', index);
                                          // Handle route change here
                                        }}
                                        style={{
                                          width: '40px',
                                          height: '40px',
                                          borderRadius: '50%',
                                          border: '2px solid white',
                                          backgroundColor: index === 0 ? '#1565C0' : '#2196F3',
                                          color: 'white',
                                          fontSize: '16px',
                                          fontWeight: 'bold',
                                          cursor: 'pointer',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.transform = 'scale(1.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.transform = 'scale(1)';
                                        }}
                                      >
                                        {index + 1}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Main Route Info */}
                                <div style={{ 
                                  backgroundColor: colors.secondary,
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '8px',
                                  padding: '4px',
                                  marginBottom: '12px'
                                }}>
                                  
                                  
                                  {routeData.routes[0].legs && routeData.routes[0].legs.length > 0 && (
                                    <div style={{ marginTop: '0px' }}>
                                      {routeData.routes[0].legs.map((leg, legIndex) => (
                                        <div key={legIndex} style={{ 
                                          marginBottom: '0px',
                                          padding: '10px 8px',
                                          backgroundColor: colors.background,
                                          borderRadius: '4px',
                                          border: `1px solid ${colors.border}`
                                        }}>
                                          <Typography variant="body2" style={{ color: colors.text, fontSize: '12px', fontWeight: '500' }}>
                                            <strong>Leg {legIndex + 1}:</strong>
                                          </Typography>
                                          
                                          <div style={{ 
                                            marginTop: '2px', 
                                            marginBottom: '2px',
                                            display: 'flex',
                                            justifyContent: 'space-between'
                                          }}>
                                            {leg.distance && (
                                              <Typography variant="body2" style={{ 
                                                color: colors.text, 
                                                fontSize: '11px'
                                              }}>
                                                {t('routePlannerDistance')}: {(leg.distance / 1000).toFixed(2)} km
                                              </Typography>
                                            )}
                                            {leg.duration && (
                                              <Typography variant="body2" style={{ 
                                                color: colors.text, 
                                                fontSize: '11px'
                                              }}>
                                                {t('routePlannerDuration')}: {`${Math.floor(leg.duration / 3600)}:${Math.floor((leg.duration % 3600) / 60).toString().padStart(2, '0')} hr`}
                                              </Typography>
                                            )}
                                          </div>
                                          
                                          {leg.steps && leg.steps.length > 0 && (
                                            <Typography variant="body2" style={{ 
                                              color: colors.textSecondary, 
                                              fontSize: '11px'
                                            }}>
                                              {leg.steps.length} {t('routePlannerSteps')}
                                            </Typography>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Step-by-Step Details */}
                                  {routeData.routes[0].legs && routeData.routes[0].legs.length > 0 && (
                                    <div style={{ marginTop: '1px' }}>
                                      
                                      {routeData.routes[0].legs.map((leg, legIndex) => (
                                        <div key={legIndex}>
                                          {leg.steps && leg.steps.map((step, stepIndex) => (
                                            <div key={stepIndex} style={{ 
                                              marginTop: '4px',
                                              marginBottom: '0px',
                                              padding: '10px 8px',
                                              backgroundColor: colors.background,
                                              borderRadius: '4px',
                                              border: `1px solid ${colors.border}`
                                            }}>
                                              <Typography variant="body2" style={{ 
                                                color: colors.text, 
                                                fontSize: '12px',
                                                fontWeight: '500'
                                              }}>
                                                {t('routePlannerStep')} {stepIndex + 1}
                                              </Typography>
                                              
                                              {step.maneuver && step.maneuver.instruction && (
                                                <Typography variant="body2" style={{ 
                                                  color: colors.text, 
                                                  fontSize: '11px',
                                                  marginTop: '4px',
                                                  lineHeight: '1.4'
                                                }}>
                                                  {step.maneuver.instruction}
                                                </Typography>
                                              )}
                                              
                                              <div style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                marginTop: '4px',
                                                fontSize: '11px',
                                                color: colors.textSecondary
                                              }}>
                                                {step.distance && (
                                                  <span>{(step.distance / 1000).toFixed(2)} km</span>
                                                )}
                                                {step.duration && (
                                                  <span>{Math.round(step.duration / 60)} min</span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>


                              </div>
                            )}
                            
                          </div>
                        );
                      }
                      
                      return (
                        <Typography variant="body2" style={{ 
                          color: colors.textSecondary, 
                          textAlign: 'center',
                          padding: '40px 20px'
                        }}>
                          {t('routePlannerClickToPlan')}
                        </Typography>
                      );
                    })()}
                  </div>
                )}

                {/* Costs Tab Content */}
                {routePlannerTab === 2 && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0px' }}>
                    {(() => {
                      const validWaypoints = routeWaypoints.filter(wp => wp && wp.address && wp.coordinates);
                      
                      if (validWaypoints.length < 2) {
                        return (
                          <Typography variant="body2" style={{ 
                            color: colors.textSecondary, 
                            textAlign: 'center',
                            padding: '40px 20px'
                          }}>
                            {t('routePlannerSelectAddresses')}
                          </Typography>
                        );
                      }
                      
                      if (isLoadingRoute) {
                        return (
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            padding: '40px 20px' 
                          }}>
                            <CircularProgress size={24} style={{ marginBottom: '16px' }} />
                            <Typography variant="body2" style={{ color: colors.textSecondary }}>
                              {t('routePlannerPlanningRoute')}
                            </Typography>
                          </div>
                        );
                      }
                      
                      if (routeData) {
                        return (
                          <div>
                            {routeData.routes && routeData.routes.length > 0 && (
                              <div>
                                {/* Cost Analysis */}
                                <div style={{ 
                                  backgroundColor: colors.background,
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '8px',
                                  padding: '12px',
                                  marginBottom: '12px'
                                }}>
                                  <Typography variant="body2" style={{ 
                                    color: colors.text, 
                                    marginBottom: '12px',
                                    fontWeight: '500',
                                    fontSize: '12px'
                                  }}>
                                    {t('routePlannerCostAnalysis')}
                                  </Typography>
                                  
                                  {/* Total Distance */}
                                  <div style={{ 
                                    marginBottom: '8px',
                                    padding: '8px',
                                    backgroundColor: colors.secondary,
                                    borderRadius: '4px',
                                    border: `1px solid ${colors.border}`
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text, 
                                        fontSize: '11px'
                                      }}>
                                        {t('routePlannerDistance')}
                                      </Typography>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text,
                                        fontWeight: '600',
                                        fontSize: '11px'
                                      }}>
                                        {(() => {
                                          const totalDistance = routeData.routes[0].distance / 1000; // Convert to km
                                          const multiplier = costSettings.roundTrip ? 2 : 1;
                                          return (totalDistance * multiplier).toFixed(2) + ' km';
                                        })()}
                                      </Typography>
                                    </div>
                                  </div>
                                  
                                  {/* Total Fuel Liters */}
                                  <div style={{ 
                                    marginBottom: '8px',
                                    padding: '8px',
                                    backgroundColor: colors.secondary,
                                    borderRadius: '4px',
                                    border: `1px solid ${colors.border}`
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text, 
                                        fontSize: '11px'
                                      }}>
                                        {t('routePlannerFuelLiters')}
                                      </Typography>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text,
                                        fontWeight: '600',
                                        fontSize: '11px'
                                      }}>
                                        {(() => {
                                          const totalDistance = routeData.routes[0].distance / 1000; // Convert to km
                                          const multiplier = costSettings.roundTrip ? 2 : 1;
                                          const fuelLiters = (totalDistance / costSettings.consumption) * multiplier;
                                          return fuelLiters.toFixed(2) + ' L';
                                        })()}
                                      </Typography>
                                    </div>
                                  </div>
                                  
                                  {/* Fuel Cost */}
                                  <div style={{ 
                                    marginBottom: '8px',
                                    padding: '8px',
                                    backgroundColor: colors.secondary,
                                    borderRadius: '4px',
                                    border: `1px solid ${colors.border}`
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text, 
                                        fontSize: '11px'
                                      }}>
                                        {t('routePlannerFuelCost')}
                                      </Typography>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text,
                                        fontWeight: '600',
                                        fontSize: '11px'
                                      }}>
                                        R$ {(() => {
                                          const totalDistance = routeData.routes[0].distance / 1000; // Convert to km
                                          const multiplier = costSettings.roundTrip ? 2 : 1;
                                          const fuelCost = ((totalDistance / costSettings.consumption) * costSettings.fuelPrice) * multiplier;
                                          return fuelCost.toFixed(2);
                                        })()}
                                      </Typography>
                                    </div>
                                  </div>
                                  
                                  {/* Toll Cost */}
                                  <div style={{ 
                                    marginBottom: '8px',
                                    padding: '8px',
                                    backgroundColor: colors.secondary,
                                    borderRadius: '4px',
                                    border: `1px solid ${colors.border}`
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text, 
                                        fontSize: '11px'
                                      }}>
                                        {t('routePlannerTollCost')}
                                      </Typography>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text,
                                        fontWeight: '600',
                                        fontSize: '11px'
                                      }}>
                                        R$ {(() => {
                                          const multiplier = costSettings.roundTrip ? 2 : 1;
                                          return (costSettings.tollCost * multiplier).toFixed(2);
                                        })()}
                                      </Typography>
                                    </div>
                                  </div>
                                  
                                  {/* Total Cost */}
                                  <div style={{ 
                                    padding: '8px',
                                    backgroundColor: colors.secondary,
                                    borderRadius: '4px',
                                    border: `1px solid ${colors.border}`
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text, 
                                        fontSize: '11px',
                                        fontWeight: '600'
                                      }}>
                                        {t('routePlannerTotalCost')}
                                      </Typography>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text,
                                        fontWeight: '700',
                                        fontSize: '11px'
                                      }}>
                                        R$ {(() => {
                                          const totalDistance = routeData.routes[0].distance / 1000; // Convert to km
                                          const multiplier = costSettings.roundTrip ? 2 : 1;
                                          const fuelCost = ((totalDistance / costSettings.consumption) * costSettings.fuelPrice) * multiplier;
                                          const tollCost = costSettings.tollCost * multiplier;
                                          const totalCost = fuelCost + tollCost;
                                          return totalCost.toFixed(2);
                                        })()}
                                      </Typography>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Profitability Analysis */}
                                <div style={{ 
                                  backgroundColor: colors.background,
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '8px',
                                  padding: '12px',
                                  marginBottom: '12px'
                                }}>
                                  <Typography variant="body2" style={{ 
                                    color: colors.text, 
                                    marginBottom: '12px',
                                    fontWeight: '500',
                                    fontSize: '12px'
                                  }}>
                                    {t('routePlannerProfitabilityAnalysis')}
                                  </Typography>
                                  
                                  {/* Handling Fee Input */}
                                  <div style={{ marginBottom: '8px' }}>
                                    <Typography variant="body2" style={{ 
                                      color: colors.text, 
                                      marginBottom: '4px',
                                      fontSize: '11px'
                                    }}>
                                      {t('routePlannerHandlingFee')} (R$)
                                    </Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={costSettings.handlingFee}
                                      onChange={(e) => setCostSettings(prev => ({
                                        ...prev,
                                        handlingFee: parseFloat(e.target.value) || 0
                                      }))}
                                      style={{ 
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                          fontSize: '11px'
                                        }
                                      }}
                                      inputProps={{
                                        style: { fontSize: '11px', padding: '6px 8px' }
                                      }}
                                    />
                                  </div>
                                  
                                  {/* Price per KM Input */}
                                  <div style={{ marginBottom: '8px' }}>
                                    <Typography variant="body2" style={{ 
                                      color: colors.text, 
                                      marginBottom: '4px',
                                      fontSize: '11px'
                                    }}>
                                      {t('routePlannerPricePerKm')} (R$/km)
                                    </Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={costSettings.pricePerKm}
                                      onChange={(e) => setCostSettings(prev => ({
                                        ...prev,
                                        pricePerKm: parseFloat(e.target.value) || 0
                                      }))}
                                      style={{ 
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                          fontSize: '11px'
                                        }
                                      }}
                                      inputProps={{
                                        style: { fontSize: '11px', padding: '6px 8px' }
                                      }}
                                    />
                                  </div>
                                  
                                  {/* Round Trip Checkbox */}
                                  <div style={{ marginBottom: '12px' }}>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={costSettings.roundTrip}
                                          onChange={(e) => setCostSettings(prev => ({
                                            ...prev,
                                            roundTrip: e.target.checked
                                          }))}
                                          size="small"
                                        />
                                      }
                                      label={
                                        <Typography variant="body2" style={{ 
                                          color: colors.text,
                                          fontSize: '11px'
                                        }}>
                                          {t('routePlannerRoundTrip')}
                                        </Typography>
                                      }
                                    />
                                  </div>
                                  
                                  {/* Toll Cost */}
                                  <div style={{ 
                                    marginBottom: '8px',
                                    padding: '8px',
                                    backgroundColor: colors.secondary,
                                    borderRadius: '4px',
                                    border: `1px solid ${colors.border}`
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text, 
                                        fontSize: '11px'
                                      }}>
                                        {t('routePlannerTollCost')}
                                      </Typography>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text,
                                        fontWeight: '600',
                                        fontSize: '11px'
                                      }}>
                                        R$ {(() => {
                                          const multiplier = costSettings.roundTrip ? 2 : 1;
                                          return (costSettings.tollCost * multiplier).toFixed(2);
                                        })()}
                                      </Typography>
                                    </div>
                                  </div>
                                  
                                  {/* Total Cost */}
                                  <div style={{ 
                                    marginBottom: '8px',
                                    padding: '8px',
                                    backgroundColor: colors.secondary,
                                    borderRadius: '4px',
                                    border: `1px solid ${colors.border}`
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text, 
                                        fontSize: '11px'
                                      }}>
                                        {t('routePlannerTotalCost')}
                                      </Typography>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text,
                                        fontWeight: '600',
                                        fontSize: '11px'
                                      }}>
                                        R$ {(() => {
                                          const totalDistance = routeData.routes[0].distance / 1000; // Convert to km
                                          const multiplier = costSettings.roundTrip ? 2 : 1;
                                          const fuelCost = ((totalDistance / costSettings.consumption) * costSettings.fuelPrice) * multiplier;
                                          const tollCost = costSettings.tollCost * multiplier;
                                          const totalCost = fuelCost + tollCost;
                                          return totalCost.toFixed(2);
                                        })()}
                                      </Typography>
                                    </div>
                                  </div>
                                  
                                  {/* Client Price */}
                                  <div style={{ 
                                    marginBottom: '8px',
                                    padding: '8px',
                                    backgroundColor: colors.secondary,
                                    borderRadius: '4px',
                                    border: `1px solid ${colors.border}`
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text, 
                                        fontSize: '11px'
                                      }}>
                                        {t('routePlannerClientPrice')}
                                      </Typography>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text,
                                        fontWeight: '600',
                                        fontSize: '11px'
                                      }}>
                                        R$ {(() => {
                                          const totalDistance = routeData.routes[0].distance / 1000; // Convert to km
                                          const multiplier = costSettings.roundTrip ? 2 : 1;
                                          const clientPrice = (totalDistance * costSettings.pricePerKm * multiplier) + costSettings.handlingFee;
                                          return clientPrice.toFixed(2);
                                        })()}
                                      </Typography>
                                    </div>
                                  </div>
                                  
                                  {/* Profit */}
                                  <div style={{ 
                                    padding: '8px',
                                    backgroundColor: colors.secondary,
                                    borderRadius: '4px',
                                    border: `1px solid ${colors.border}`
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text, 
                                        fontSize: '11px',
                                        fontWeight: '600'
                                      }}>
                                        {t('routePlannerProfit')}
                                      </Typography>
                                      <Typography variant="body2" style={{ 
                                        color: colors.text,
                                        fontWeight: '700',
                                        fontSize: '11px'
                                      }}>
                                        R$ {(() => {
                                          const totalDistance = routeData.routes[0].distance / 1000; // Convert to km
                                          const multiplier = costSettings.roundTrip ? 2 : 1;
                                          const clientPrice = (totalDistance * costSettings.pricePerKm * multiplier) + costSettings.handlingFee;
                                          const fuelCost = ((totalDistance / costSettings.consumption) * costSettings.fuelPrice) * multiplier;
                                          const tollCost = costSettings.tollCost * multiplier;
                                          const totalCost = fuelCost + tollCost;
                                          const profit = clientPrice - totalCost;
                                          return profit.toFixed(2);
                                        })()}
                                      </Typography>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Cost Settings */}
                                <div style={{ 
                                  backgroundColor: colors.background,
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '8px',
                                  padding: '12px'
                                }}>
                                  <Typography variant="body2" style={{ 
                                    color: colors.text, 
                                    marginBottom: '12px',
                                    fontWeight: '500',
                                    fontSize: '12px'
                                  }}>
                                    {t('routePlannerCostSettings')}
                                  </Typography>
                                  
                                  <div style={{ marginBottom: '8px' }}>
                                    <Typography variant="body2" style={{ 
                                      color: colors.text, 
                                      marginBottom: '4px',
                                      fontSize: '11px'
                                    }}>
                                      {t('routePlannerFuelPrice')} (R$/L)
                                    </Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={costSettings.fuelPrice}
                                      onChange={(e) => setCostSettings(prev => ({
                                        ...prev,
                                        fuelPrice: parseFloat(e.target.value) || 0
                                      }))}
                                      style={{ 
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                          fontSize: '11px'
                                        }
                                      }}
                                      inputProps={{
                                        style: { fontSize: '11px', padding: '6px 8px' }
                                      }}
                                    />
                                  </div>
                                  
                                  <div style={{ marginBottom: '8px' }}>
                                    <Typography variant="body2" style={{ 
                                      color: colors.text, 
                                      marginBottom: '4px',
                                      fontSize: '11px'
                                    }}>
                                      {t('routePlannerVehicleConsumption')} (km/L)
                                    </Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={costSettings.consumption}
                                      onChange={(e) => setCostSettings(prev => ({
                                        ...prev,
                                        consumption: parseFloat(e.target.value) || 0
                                      }))}
                                      style={{ 
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                          fontSize: '11px'
                                        }
                                      }}
                                      inputProps={{
                                        style: { fontSize: '11px', padding: '6px 8px' }
                                      }}
                                    />
                                  </div>
                                  
                                  <div style={{ marginBottom: '8px' }}>
                                    <Typography variant="body2" style={{ 
                                      color: colors.text, 
                                      marginBottom: '4px',
                                      fontSize: '11px'
                                    }}>
                                      {t('routePlannerTollCost')} (R$)
                                    </Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={costSettings.tollCost}
                                      onChange={(e) => setCostSettings(prev => ({
                                        ...prev,
                                        tollCost: parseFloat(e.target.value) || 0
                                      }))}
                                      style={{ 
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                          fontSize: '11px'
                                        }
                                      }}
                                      inputProps={{
                                        style: { fontSize: '11px', padding: '6px 8px' }
                                      }}
                                    />
                                  </div>
                                  
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <Typography variant="body2" style={{ 
                          color: colors.textSecondary, 
                          textAlign: 'center',
                          padding: '40px 20px'
                        }}>
                          {t('routePlannerClickToPlan')}
                        </Typography>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content - Only show for Basic tab */}
          {activeTab === 0 && (
          <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
            {isLoading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px',
                height: '200px'
              }}>
                <CircularProgress />
              </div>
            ) : error ? (
              <Alert severity="error" style={{ margin: '16px' }}>
                {t('sharedError')}
              </Alert>
            ) : filteredGeofences.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center'
              }}>
                <Typography variant="body1" style={{ color: colors.textSecondary, marginBottom: '8px' }}>
                  {searchKeyword ? t('sharedNoResults') : t('sharedNoGeofences')}
                </Typography>
                <Typography variant="body2" style={{ color: colors.textSecondary }}>
                  {searchKeyword ? t('sharedTryDifferentSearch') : t('sharedAddFirstGeofence')}
                </Typography>
              </div>
            ) : (
              <TableContainer>
                <Table>
                  <TableBody>
                    {paginatedGeofences.map((geofence) => (
                      <TableRow 
                        key={geofence.id} 
                        hover
                        onClick={() => handleGeofenceClick(geofence)}
                        style={{ 
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: colors.hover
                          }
                        }}
                      >
                        <TableCell>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {geofence.area.startsWith('CIRCLE') ? (
                              <CircleIcon 
                                style={{ 
                                  fontSize: '16px', 
                                  color: geofence.attributes?.color || '#3f51b5' 
                                }} 
                              />
                            ) : geofence.area.startsWith('LINESTRING') ? (
                              <LineIcon 
                                style={{ 
                                  fontSize: '16px', 
                                  color: geofence.attributes?.color || '#3f51b5' 
                                }} 
                              />
                            ) : geofence.area.startsWith('POLYGON') ? (
                              <PolygonIcon 
                                style={{ 
                                  fontSize: '16px', 
                                  color: geofence.attributes?.color || '#3f51b5' 
                                }} 
                              />
                            ) : (
                              <div
                                style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: geofence.attributes?.color || '#3f51b5'
                                }}
                              />
                            )}
                            <Typography variant="body2" style={{ color: colors.text }}>
                              {geofence.name}
                            </Typography>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" style={{ color: colors.textSecondary }}>
                            {geofence.description || t('sharedNoDescription')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(geofence);
                            }}
                            style={{
                              color: colors.textSecondary,
                              '&:hover': {
                                color: colors.error
                              }
                            }}
                          >
                            <DeleteIcon style={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </div>
          )}

          {/* Pagination - Only show for Basic tab */}
          {activeTab === 0 && totalPages > 1 && (
            <div style={{
              padding: '16px',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(event, value) => setPage(value)}
                size="small"
                color="primary"
              />
            </div>
          )}
        </div>


        {/* Edit Dialog */}
        <Dialog
          open={editDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            style: {
              backgroundColor: colors.surface,
              borderRadius: '12px',
              zIndex: 10004
            }
          }}
        >
          <DialogTitle style={{ color: colors.text, borderBottom: `1px solid ${colors.border}` }}>
            {editingGeofence?.id ? t('sharedEdit') : t('sharedAdd')} {t('sharedGeofence')}
          </DialogTitle>
          <DialogContent style={{ padding: '20px' }}>
            {editingGeofence && (
              <>
                <Accordion defaultExpanded style={{ marginBottom: '16px' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" style={{ color: colors.text }}>
                      {t('sharedRequired')}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      label={t('sharedName')}
                      value={editingGeofence.name || ''}
                      onChange={(e) => setEditingGeofence({
                        ...editingGeofence,
                        name: e.target.value,
                      })}
                      style={{ marginBottom: '16px' }}
                      required
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion style={{ marginBottom: '16px' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" style={{ color: colors.text }}>
                      {t('sharedExtra')}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      label={t('sharedDescription')}
                      value={editingGeofence.description || ''}
                      onChange={(e) => setEditingGeofence({
                        ...editingGeofence,
                        description: e.target.value,
                      })}
                      style={{ marginBottom: '16px' }}
                      multiline
                      rows={3}
                    />
                    <SelectField
                      value={editingGeofence.calendarId}
                      onChange={(e) => setEditingGeofence({
                        ...editingGeofence,
                        calendarId: Number(e.target.value) || null,
                      })}
                      endpoint="/api/calendars"
                      label={t('sharedCalendar')}
                      style={{ marginBottom: '16px' }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editingGeofence.attributes.hide || false}
                          onChange={(e) => setEditingGeofence({
                            ...editingGeofence,
                            attributes: {
                              ...editingGeofence.attributes,
                              hide: e.target.checked,
                            },
                          })}
                        />
                      }
                      label={t('sharedFilterMap')}
                    />
                  </AccordionDetails>
                </Accordion>

                <EditAttributesAccordion
                  attributes={editingGeofence.attributes}
                  setAttributes={(attributes) => setEditingGeofence({
                    ...editingGeofence,
                    attributes,
                  })}
                  definitions={geofenceAttributes}
                />
              </>
            )}
          </DialogContent>
          <DialogActions style={{ padding: '16px 20px', borderTop: `1px solid ${colors.border}` }}>
            <Button
              onClick={handleCloseDialog}
              disabled={saving}
              style={{ color: colors.textSecondary }}
            >
              {t('sharedCancel')}
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={!editingGeofence?.name || saving}
              style={{
                backgroundColor: colors.primary,
                color: colors.text,
                textTransform: 'none'
              }}
            >
              {saving ? <CircularProgress size={20} /> : t('sharedSave')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Modal - Matching logout style */}
        <AnimatePresence>
          {deleteDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
              }}
              onClick={cancelDelete}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: '8px',
                  padding: '20px',
                  maxWidth: '400px',
                  width: '90%',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <p style={{
                  margin: '0 0 20px 0',
                  fontSize: '16px',
                  color: colors.text,
                  lineHeight: '1.5'
                }}>
                  {t('sharedDeleteConfirm')} "{geofenceToDelete?.name}"?
                </p>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'space-between'
                }}>
                  <button
                    onClick={cancelDelete}
                    style={{
                      padding: '8px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      backgroundColor: colors.secondary,
                      color: colors.text,
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = colors.hover;
                      e.target.style.color = colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = colors.secondary;
                      e.target.style.color = colors.text;
                    }}
                  >
                    {t('sharedCancel')}
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteGeofenceMutation.isPending}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: deleteGeofenceMutation.isPending ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: deleteGeofenceMutation.isPending ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!deleteGeofenceMutation.isPending) {
                        e.target.style.backgroundColor = '#FEE2E2';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!deleteGeofenceMutation.isPending) {
                        e.target.style.backgroundColor = '#FEF2F2';
                      }
                    }}
                  >
                    {deleteGeofenceMutation.isPending ? (
                      <CircularProgress size={16} style={{ color: '#DC2626' }} />
                    ) : (
                      t('sharedRemove')
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingGeofencesPopover;
