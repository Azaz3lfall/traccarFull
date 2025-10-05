import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
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
  onClose 
}) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const geofenceAttributes = useGeofenceAttributes(t);

  // State management
  const [activeTab, setActiveTab] = useState(0);
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
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [startSearchResults, setStartSearchResults] = useState([]);
  const [endSearchResults, setEndSearchResults] = useState([]);
  const [isStartSearching, setIsStartSearching] = useState(false);
  const [isEndSearching, setIsEndSearching] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState([]);
  const [fieldOrder, setFieldOrder] = useState(['start', 'end']); // Track field order

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

  // Address search functionality for route planner
  const searchAddresses = async (query, isStart) => {
    if (!query.trim() || query.trim().length < 5) {
      if (isStart) {
        setStartSearchResults([]);
      } else {
        setEndSearchResults([]);
      }
      return;
    }

    if (isStart) {
      setIsStartSearching(true);
    } else {
      setIsEndSearching(true);
    }

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
          geometry: {
            type: 'Point',
            coordinates: center,
          },
          place_name: feature.properties.display_name,
          properties: feature.properties,
          text: feature.properties.display_name,
          place_type: ['place'],
          center,
        };
      });
      
      if (isStart) {
        setStartSearchResults(results);
      } else {
        setEndSearchResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
      if (isStart) {
        setStartSearchResults([]);
      } else {
        setEndSearchResults([]);
      }
    } finally {
      if (isStart) {
        setIsStartSearching(false);
      } else {
        setIsEndSearching(false);
      }
    }
  };

  // Handle start address search
  const handleStartAddressChange = (e) => {
    const query = e.target.value;
    setStartAddress(query);
    
    // Clear previous timeout
    clearTimeout(window.startSearchTimeout);
    
    // Only search if query has at least 5 characters
    if (query.trim().length >= 5) {
      // Debounce search with 800ms delay
      window.startSearchTimeout = setTimeout(() => {
        searchAddresses(query, true);
      }, 800);
    } else {
      // Clear results if less than 5 characters
      setStartSearchResults([]);
      setIsStartSearching(false);
    }
  };

  // Handle end address search
  const handleEndAddressChange = (e) => {
    const query = e.target.value;
    setEndAddress(query);
    
    // Clear previous timeout
    clearTimeout(window.endSearchTimeout);
    
    // Only search if query has at least 5 characters
    if (query.trim().length >= 5) {
      // Debounce search with 800ms delay
      window.endSearchTimeout = setTimeout(() => {
        searchAddresses(query, false);
      }, 800);
    } else {
      // Clear results if less than 5 characters
      setEndSearchResults([]);
      setIsEndSearching(false);
    }
  };

  // Handle start address selection
  const handleStartAddressSelect = (result) => {
    setStartAddress(result.properties?.display_name || result.text);
    setStartSearchResults([]);
    // Add to route waypoints
    setRouteWaypoints(prev => {
      const newWaypoints = [...prev];
      newWaypoints[0] = {
        address: result.properties?.display_name || result.text,
        coordinates: result.center,
        type: 'start'
      };
      return newWaypoints;
    });
  };

  // Handle end address selection
  const handleEndAddressSelect = (result) => {
    setEndAddress(result.properties?.display_name || result.text);
    setEndSearchResults([]);
    // Add to route waypoints
    setRouteWaypoints(prev => {
      const newWaypoints = [...prev];
      newWaypoints[1] = {
        address: result.properties?.display_name || result.text,
        coordinates: result.center,
        type: 'end'
      };
      return newWaypoints;
    });
  };

  // Handle field reordering
  const handleReorderFields = (direction) => {
    if (direction === 'up') {
      // Move first field up (swap positions)
      setFieldOrder(prev => [prev[1], prev[0]]);
    } else if (direction === 'down') {
      // Move second field down (swap positions)
      setFieldOrder(prev => [prev[1], prev[0]]);
    }
    
    // Update route waypoints to reflect new order
    setRouteWaypoints(prev => {
      if (prev.length >= 2) {
        const newWaypoints = [...prev];
        // Swap the waypoints
        [newWaypoints[0], newWaypoints[1]] = [newWaypoints[1], newWaypoints[0]];
        // The first position (index 0) is always START, second position (index 1) is always END
        newWaypoints[0].type = 'start';
        newWaypoints[1].type = 'end';
        return newWaypoints;
      }
      return prev;
    });
  };

  // Render address field based on type
  const renderAddressField = (fieldType, isFirst) => {
    const isStart = fieldType === 'start';
    const address = isStart ? startAddress : endAddress;
    const setAddress = isStart ? setStartAddress : setEndAddress;
    const searchResults = isStart ? startSearchResults : endSearchResults;
    const setSearchResults = isStart ? setStartSearchResults : setEndSearchResults;
    const isSearching = isStart ? isStartSearching : isEndSearching;
    const setIsSearching = isStart ? setIsStartSearching : setIsEndSearching;
    const handleChange = isStart ? handleStartAddressChange : handleEndAddressChange;
    const handleSelect = isStart ? handleStartAddressSelect : handleEndAddressSelect;
    const placeholder = isStart ? "Enter start address..." : "Enter end address...";

    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder={placeholder}
              value={address}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: colors.secondary,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                fontSize: '14px',
                outline: 'none',
                paddingRight: isSearching ? '40px' : '16px'
              }}
            />
            {isSearching && (
              <div style={{
                position: 'absolute',
                right: '12px',
                top: 'calc(50% - 8px)',
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTop: '2px solid #18a9fd',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
          </div>
          
          {/* Reorder buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={() => handleReorderFields('up')}
              disabled={isFirst}
              style={{
                width: '32px',
                height: '16px',
                border: 'none',
                backgroundColor: isFirst ? colors.border : colors.secondary,
                color: isFirst ? colors.textSecondary : colors.text,
                cursor: isFirst ? 'not-allowed' : 'pointer',
                borderRadius: '4px 4px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}
            >
              <ArrowUpIcon style={{ fontSize: '14px' }} />
            </button>
            <button
              onClick={() => handleReorderFields('down')}
              disabled={!isFirst}
              style={{
                width: '32px',
                height: '16px',
                border: 'none',
                backgroundColor: !isFirst ? colors.border : colors.secondary,
                color: !isFirst ? colors.textSecondary : colors.text,
                cursor: !isFirst ? 'not-allowed' : 'pointer',
                borderRadius: '0 0 4px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}
            >
              <ArrowDownIcon style={{ fontSize: '14px' }} />
            </button>
          </div>
        </div>
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{
            marginTop: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            backgroundColor: colors.surface
          }}>
            {searchResults.map((result, index) => (
              <div
                key={`${fieldType}-search-${result.id || result.name || index}`}
                onClick={() => handleSelect(result)}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  borderBottom: index < searchResults.length - 1 ? `1px solid ${colors.border}` : 'none',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {result.properties?.name || result.properties?.display_name?.split(',')[0]}
                </div>
                <div style={{
                  color: colors.textSecondary,
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {result.properties?.display_name}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Character Count Message */}
        {address && address.trim().length > 0 && address.trim().length < 5 && (
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
        
        {/* No Results */}
        {address && address.trim().length >= 5 && searchResults.length === 0 && !isSearching && !routeWaypoints.find(wp => wp.type === fieldType) && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            color: colors.textSecondary,
            fontSize: '12px',
            textAlign: 'center'
          }}>
            No results found
          </div>
        )}
      </div>
    );
  };

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
              <Tab label="Basic" />
              <Tab label="Route Planner" />
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
                    style={{
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
            <div style={{ padding: '20px' }}>
              {/* Dynamic Address Fields based on order */}
              {fieldOrder.map((fieldType, index) => 
                renderAddressField(fieldType, index === 0)
              )}

              {/* Route Waypoints Display */}
              {routeWaypoints.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <Typography variant="body2" style={{ color: colors.text, marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Selected Waypoints
                  </Typography>
                  <div style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    backgroundColor: colors.secondary,
                    padding: '12px'
                  }}>
                    {routeWaypoints.map((waypoint, index) => (
                      <div key={`waypoint-${index}`} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: index < routeWaypoints.length - 1 ? '8px' : '0'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: index === 0 ? '#4caf50' : '#f44336' // First position is green (start), second is red (end)
                        }} />
                        <Typography variant="body2" style={{ color: colors.text, fontSize: '12px' }}>
                          {waypoint.address}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
