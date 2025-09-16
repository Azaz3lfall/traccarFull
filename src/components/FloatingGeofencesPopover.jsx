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
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { geofencesActions, devicesActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';
import useGeofenceAttributes from '../common/attributes/useGeofenceAttributes';
import SelectField from '../common/components/SelectField';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';
import { map } from '../map/core/MapView';
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
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [geofenceToDelete, setGeofenceToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [saving, setSaving] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries(['geofences']);
      setDeleteDialog(false);
      setGeofenceToDelete(null);
    },
    onError: (error) => {
      console.error('Delete geofence error:', error);
    },
  });

  // Handle add geofence
  const handleAdd = () => {
    setEditingGeofence({
      name: '',
      description: '',
      calendarId: null,
      attributes: {
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

  // Handle save geofence
  const handleSave = useCatch(async () => {
    if (!editingGeofence?.name) return;

    setSaving(true);
    try {
      if (editingGeofence.id) {
        updateGeofenceMutation.mutate(editingGeofence);
      } else {
        createGeofenceMutation.mutate(editingGeofence);
      }
    } finally {
      setSaving(false);
    }
  });

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
    // Close the popover first
    onClose();
    
    // Navigate to geofences page with drawing tool
    // This will open the map with the drawing tool active
    window.location.href = `/geofences?tool=${tool}`;
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
  const handleMenuOpen = (event, geofence) => {
    setAnchorEl(event.currentTarget);
    setSelectedGeofence(geofence);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGeofence(null);
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

          {/* Search and Add */}
          <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}` }}>
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
            startIcon={<AddIcon />}
            onClick={handleAdd}
            fullWidth
            size="small"
            style={{
              backgroundColor: colors.primary,
              color: colors.text,
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              marginBottom: '12px'
            }}
          >
            {t('sharedAdd')} {t('sharedGeofence')}
          </Button>
          
          {/* Drawing Tools Row */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => handleDrawingTool('circle')}
              style={{
                color: colors.text,
                borderColor: colors.border,
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                fontSize: '12px'
              }}
            >
              {t('sharedCircle')}
            </Button>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => handleDrawingTool('line')}
              style={{
                color: colors.text,
                borderColor: colors.border,
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                fontSize: '12px'
              }}
            >
              {t('sharedLine')}
            </Button>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => handleDrawingTool('polygon')}
              style={{
                color: colors.text,
                borderColor: colors.border,
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                fontSize: '12px'
              }}
            >
              {t('sharedPolygon')}
            </Button>
          </div>
          </div>

          {/* Content */}
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
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: geofence.attributes?.color || '#3f51b5'
                              }}
                            />
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
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuOpen(e, geofence);
                            }}
                          >
                            <MoreVertIcon style={{ fontSize: 16, color: colors.textSecondary }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
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

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          style={{ zIndex: 10002 }}
          PaperProps={{
            style: {
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              boxShadow: colors.shadow,
              minWidth: '160px',
              zIndex: 10002
            }
          }}
        >
          <MenuItem
            onClick={() => {
              handleEdit(selectedGeofence);
              handleMenuClose();
            }}
            style={{ color: colors.text, fontSize: '12px' }}
          >
            <EditIcon fontSize="small" />
            <span style={{ marginLeft: '6px' }}>{t('sharedEdit')}</span>
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleDelete(selectedGeofence);
            }}
            style={{ color: colors.text, fontSize: '12px' }}
          >
            <DeleteIcon fontSize="small" />
            <span style={{ marginLeft: '6px' }}>{t('sharedRemove')}</span>
          </MenuItem>
        </Menu>

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

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog}
          onClose={() => setDeleteDialog(false)}
          style={{ zIndex: 10004 }}
          PaperProps={{
            style: {
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              zIndex: 10004,
            },
          }}
        >
          <DialogTitle style={{ color: colors.text, padding: '16px 20px' }}>
            {t('sharedConfirmDelete')}
          </DialogTitle>
          <DialogContent style={{ color: colors.text, padding: '0 20px' }}>
            <Typography variant="body2" style={{ color: colors.textSecondary }}>
              {t('sharedRemoveConfirm')} "{geofenceToDelete?.name}"?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialog(false)}
              style={{ color: colors.textSecondary }}
            >
              {t('sharedCancel')}
            </Button>
            <Button
              onClick={() => deleteGeofenceMutation.mutate(geofenceToDelete?.id)}
              style={{ color: colors.error }}
              disabled={deleteGeofenceMutation.isPending}
            >
              {deleteGeofenceMutation.isPending ? (
                <CircularProgress size={16} />
              ) : (
                t('sharedRemove')
              )}
            </Button>
          </DialogActions>
        </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingGeofencesPopover;
