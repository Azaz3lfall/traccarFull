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
import { geofencesActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';
import useGeofenceAttributes from '../common/attributes/useGeofenceAttributes';
import SelectField from '../common/components/SelectField';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';

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
                fontWeight: '500'
              }}
            >
              {t('sharedAdd')} {t('sharedGeofence')}
            </Button>
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
                      <TableRow key={geofence.id} hover>
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
                            onClick={(e) => handleMenuOpen(e, geofence)}
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

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          style={{ zIndex: 10003 }}
          PaperProps={{
            style: {
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              boxShadow: colors.shadow,
              zIndex: 10003
            }
          }}
        >
          <MenuItem
            onClick={() => {
              handleEdit(selectedGeofence);
              handleMenuClose();
            }}
            style={{ color: colors.text }}
          >
            <EditIcon style={{ marginRight: '8px', fontSize: 16 }} />
            {t('sharedEdit')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleDelete(selectedGeofence);
            }}
            style={{ color: '#EF4444' }}
          >
            <DeleteIcon style={{ marginRight: '8px', fontSize: 16 }} />
            {t('sharedRemove')}
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
          PaperProps={{
            style: {
              backgroundColor: colors.surface,
              borderRadius: '12px',
              zIndex: 10004
            }
          }}
        >
          <DialogTitle style={{ color: colors.text }}>
            {t('sharedConfirmDelete')}
          </DialogTitle>
          <DialogContent style={{ color: colors.text }}>
            {t('sharedConfirmDeleteGeofence', { name: geofenceToDelete?.name })}
          </DialogContent>
          <DialogActions style={{ padding: '16px 20px' }}>
            <Button
              onClick={() => setDeleteDialog(false)}
              style={{ color: colors.textSecondary }}
            >
              {t('sharedCancel')}
            </Button>
            <Button
              onClick={() => deleteGeofenceMutation.mutate(geofenceToDelete?.id)}
              variant="contained"
              style={{
                backgroundColor: '#EF4444',
                color: 'white',
                textTransform: 'none'
              }}
            >
              {t('sharedDelete')}
            </Button>
          </DialogActions>
        </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingGeofencesPopover;
