import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Drawer,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  Divider,
  Box,
  Input,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  UploadFile as UploadFileIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../common/components/LocalizationProvider';
import { geofencesActions } from '../store';
import { useCatchCallback } from '../reactHelper';
import fetchOrThrow from '../common/util/fetchOrThrow';
import useGeofenceAttributes from '../common/attributes/useGeofenceAttributes';
import SelectField from '../common/components/SelectField';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';

const useStyles = makeStyles()((theme) => ({
  drawer: {
    width: 400,
    flexShrink: 0,
  },
  drawerPaper: {
    width: 400,
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    minHeight: 64,
  },
  title: {
    flexGrow: 1,
  },
  list: {
    flexGrow: 1,
    overflow: 'auto',
  },
  addButton: {
    margin: theme.spacing(2),
  },
  dialogContent: {
    paddingTop: theme.spacing(1),
  },
  formField: {
    marginBottom: theme.spacing(2),
  },
  fileInput: {
    display: 'none',
  },
  uploadButton: {
    marginBottom: theme.spacing(2),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
  },
}));

const GeofencesDrawer = ({ open, onClose }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();
  const geofenceAttributes = useGeofenceAttributes(t);

  const geofences = useSelector((state) => state.geofences.items);
  const [loading, setLoading] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // Load geofences on drawer open
  const refreshGeofences = useCatchCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchOrThrow('/api/geofences');
      dispatch(geofencesActions.refresh(await response.json()));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (open) {
      refreshGeofences();
    }
  }, [open, refreshGeofences]);

  // Filter geofences based on search
  const filteredGeofences = Object.values(geofences).filter(geofence =>
    geofence.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    geofence.description?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

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
  const handleDelete = useCatchCallback(async (geofenceId) => {
    try {
      await fetchOrThrow(`/api/geofences/${geofenceId}`, {
        method: 'DELETE',
      });
      refreshGeofences();
    } catch (error) {
      console.error('Failed to delete geofence:', error);
    }
  }, [refreshGeofences]);

  // Handle save geofence
  const handleSave = useCatchCallback(async () => {
    if (!editingGeofence?.name) return;

    setSaving(true);
    try {
      const url = editingGeofence.id ? `/api/geofences/${editingGeofence.id}` : '/api/geofences';
      const method = editingGeofence.id ? 'PUT' : 'POST';

      const response = await fetchOrThrow(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingGeofence),
      });

      const result = await response.json();
      dispatch(geofencesActions.update([result]));
      setEditDialog(false);
      setEditingGeofence(null);
    } catch (error) {
      console.error('Failed to save geofence:', error);
    } finally {
      setSaving(false);
    }
  }, [editingGeofence, dispatch]);

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

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <Toolbar className={classes.toolbar}>
          <Typography variant="h6" className={classes.title}>
            {t('sharedGeofences')}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Divider />

        <Box className={classes.addButton}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            fullWidth
            className={classes.addButton}
          >
            {t('sharedAdd')} {t('sharedGeofence')}
          </Button>

          <input
            accept=".gpx"
            id="upload-gpx"
            type="file"
            className={classes.fileInput}
            onChange={handleFileUpload}
          />
          <label htmlFor="upload-gpx">
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              component="span"
              fullWidth
              className={classes.uploadButton}
            >
              {t('sharedUpload')} GPX
            </Button>
          </label>

          <TextField
            fullWidth
            placeholder={t('sharedSearch')}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            size="small"
          />
        </Box>

        <Divider />

        <List className={classes.list}>
          {loading ? (
            <Box className={classes.loadingContainer}>
              <CircularProgress />
            </Box>
          ) : filteredGeofences.length === 0 ? (
            <ListItem>
              <ListItemText
                primary={searchKeyword ? t('sharedNoResults') : t('sharedNoGeofences')}
                secondary={searchKeyword ? t('sharedTryDifferentSearch') : t('sharedAddFirstGeofence')}
              />
            </ListItem>
          ) : (
            filteredGeofences.map((geofence) => (
              <ListItem key={geofence.id} divider>
                <ListItemText
                  primary={geofence.name}
                  secondary={geofence.description || t('sharedNoDescription')}
                />
                <ListItemSecondaryAction>
                  <Tooltip title={t('sharedEdit')}>
                    <IconButton
                      edge="end"
                      onClick={() => handleEdit(geofence)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('sharedRemove')}>
                    <IconButton
                      edge="end"
                      onClick={() => handleDelete(geofence.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          )}
        </List>
      </Drawer>

      {/* Edit Dialog */}
      <Dialog
        open={editDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingGeofence?.id ? t('sharedEdit') : t('sharedAdd')} {t('sharedGeofence')}
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          {editingGeofence && (
            <>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
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
                    className={classes.formField}
                    required
                  />
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
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
                    className={classes.formField}
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
                    className={classes.formField}
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
                    className={classes.formField}
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
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            {t('sharedCancel')}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!editingGeofence?.name || saving}
          >
            {saving ? <CircularProgress size={20} /> : t('sharedSave')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GeofencesDrawer;
