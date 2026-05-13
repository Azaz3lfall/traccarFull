import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { MuiFileInput } from 'mui-file-input';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useThemeColors } from '../../common/components/ThemeProvider';
import EditAttributesAccordion from '../../settings/components/EditAttributesAccordion';
import { map } from '../../map/core/MapView';

const checkboxSx = (colors) => ({
  color: colors.textSecondary,
  '&:hover': { backgroundColor: `${colors.primary}20` },
  '&.Mui-checked': {
    color: colors.primary,
    '&:hover': { backgroundColor: `${colors.primary}30` },
  },
  '&.MuiCheckbox-root': { color: colors.textSecondary },
});

const selectMenuProps = (colors, zIndex = 10002) => ({
  disablePortal: false,
  style: { zIndex },
  PaperProps: {
    style: { backgroundColor: colors.surface, border: `1px solid ${colors.border}`, zIndex },
  },
});

const selectSx = (colors) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: colors.secondary,
    '& fieldset': { borderColor: colors.border },
    '&:hover fieldset': { borderColor: colors.primary },
    '&.Mui-focused fieldset': { borderColor: colors.primary },
  },
  '& .MuiInputLabel-root': {
    color: colors.textSecondary,
    '&.Mui-focused': { color: colors.primary },
  },
});

const ServerDrawer = ({
  open,
  onClose,
  serverData,
  setServerData,
  timezones,
  mapStyles,
  commonUserAttributes,
  commonDeviceAttributes,
  serverAttributes,
  updateServerMutation,
  handleFileChange,
}) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const muiTheme = useTheme();
  const desktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  const [activeServerTab, setActiveServerTab] = useState(0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{
              position: 'fixed',
              top: 0, right: 0,
              width: desktop ? '400px' : '100vw',
              height: '100vh',
              backgroundColor: colors.surface,
              borderLeft: desktop ? `1px solid ${colors.border}` : 'none',
              zIndex: 10000,
              boxShadow: desktop ? '-4px 0 20px rgba(0,0,0,0.15)' : 'none',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                  {t('settingsServer')}
                </Typography>
              </div>
              <IconButton
                onClick={() => updateServerMutation.mutate(serverData)}
                disabled={updateServerMutation.isPending}
                style={{ backgroundColor: colors.primary, color: colors.text, width: '40px', height: '40px' }}
                title={updateServerMutation.isPending ? t('sharedSaving') : t('sharedSave')}
              >
                {updateServerMutation.isPending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SaveIcon />
                )}
              </IconButton>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              paddingBottom: '200px',
            }}>
              {serverData && (
                <>
                  <Tabs
                    value={activeServerTab}
                    onChange={(e, v) => setActiveServerTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    style={{ marginBottom: '16px' }}
                    sx={{
                      '& .MuiTab-root': {
                        color: '#666',
                        fontSize: '12px',
                        fontWeight: '500',
                        textTransform: 'none',
                        minHeight: '40px',
                        padding: '8px 16px',
                        '&.Mui-selected': { color: '#1976d2', fontWeight: '600', backgroundColor: 'transparent' },
                        '&:hover': { color: '#1976d2', backgroundColor: 'rgba(25,118,210,0.1)' },
                        '&.Mui-selected:hover': { color: '#1976d2', backgroundColor: 'rgba(25,118,210,0.15)' },
                      },
                      '& .MuiTabs-indicator': { backgroundColor: '#1976d2', height: '2px' },
                    }}
                  >
                    <Tab label={t('sharedPreferences')} />
                    <Tab label={t('sharedLocation')} />
                    <Tab label={t('sharedPermissions')} />
                    <Tab label={t('sharedFile')} />
                    <Tab label={t('sharedAttributes')} />
                  </Tabs>

                  {/* Preferences Tab */}
                  {activeServerTab === 0 && (
                    <Box sx={{ paddingTop: '16px' }}>
                      <TextField fullWidth value={serverData.mapUrl || ''} onChange={(e) => setServerData({ ...serverData, mapUrl: e.target.value })} label={t('mapCustomLabel')} margin="normal" />
                      <TextField fullWidth value={serverData.overlayUrl || ''} onChange={(e) => setServerData({ ...serverData, overlayUrl: e.target.value })} label={t('mapOverlayCustom')} margin="normal" />

                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('mapDefault')}</InputLabel>
                        <Select label={t('mapDefault')} value={serverData.map || 'locationIqStreets'} onChange={(e) => setServerData({ ...serverData, map: e.target.value })} MenuProps={selectMenuProps(colors)} sx={selectSx(colors)}>
                          {mapStyles.filter((s) => s.available).map((s) => (
                            <MenuItem key={s.id} value={s.id}><Typography component="span">{s.title}</Typography></MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('settingsCoordinateFormat')}</InputLabel>
                        <Select label={t('settingsCoordinateFormat')} value={serverData.coordinateFormat || 'dd'} onChange={(e) => setServerData({ ...serverData, coordinateFormat: e.target.value })} MenuProps={selectMenuProps(colors)} sx={selectSx(colors)}>
                          <MenuItem value="dd">{t('sharedDecimalDegrees')}</MenuItem>
                          <MenuItem value="ddm">{t('sharedDegreesDecimalMinutes')}</MenuItem>
                          <MenuItem value="dms">{t('sharedDegreesMinutesSeconds')}</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('settingsSpeedUnit')}</InputLabel>
                        <Select label={t('settingsSpeedUnit')} value={serverData.attributes?.speedUnit || 'kn'} onChange={(e) => setServerData({ ...serverData, attributes: { ...serverData.attributes, speedUnit: e.target.value } })} MenuProps={selectMenuProps(colors)} sx={selectSx(colors)}>
                          <MenuItem value="kn">{t('sharedKn')}</MenuItem>
                          <MenuItem value="kmh">{t('sharedKmh')}</MenuItem>
                          <MenuItem value="mph">{t('sharedMph')}</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('settingsDistanceUnit')}</InputLabel>
                        <Select label={t('settingsDistanceUnit')} value={serverData.attributes?.distanceUnit || 'km'} onChange={(e) => setServerData({ ...serverData, attributes: { ...serverData.attributes, distanceUnit: e.target.value } })} MenuProps={selectMenuProps(colors)} sx={selectSx(colors)}>
                          <MenuItem value="km">{t('sharedKm')}</MenuItem>
                          <MenuItem value="mi">{t('sharedMi')}</MenuItem>
                          <MenuItem value="nmi">{t('sharedNmi')}</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('settingsAltitudeUnit')}</InputLabel>
                        <Select label={t('settingsAltitudeUnit')} value={serverData.attributes?.altitudeUnit || 'm'} onChange={(e) => setServerData({ ...serverData, attributes: { ...serverData.attributes, altitudeUnit: e.target.value } })} MenuProps={{ disablePortal: false, style: { zIndex: 10002 } }}>
                          <MenuItem value="m">{t('sharedMeters')}</MenuItem>
                          <MenuItem value="ft">{t('sharedFeet')}</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('settingsVolumeUnit')}</InputLabel>
                        <Select label={t('settingsVolumeUnit')} value={serverData.attributes?.volumeUnit || 'ltr'} onChange={(e) => setServerData({ ...serverData, attributes: { ...serverData.attributes, volumeUnit: e.target.value } })} MenuProps={{ disablePortal: false, style: { zIndex: 10002 } }}>
                          <MenuItem value="ltr">{t('sharedLiter')}</MenuItem>
                          <MenuItem value="usGal">{t('sharedUsGallon')}</MenuItem>
                          <MenuItem value="impGal">{t('sharedImpGallon')}</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('sharedTimezone')}</InputLabel>
                        <Select label={t('sharedTimezone')} value={serverData.attributes?.timezone || ''} onChange={(e) => setServerData({ ...serverData, attributes: { ...serverData.attributes, timezone: e.target.value } })} MenuProps={{ disablePortal: false, style: { zIndex: 10005 } }} style={{ width: '100%' }}>
                          {timezones.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
                        </Select>
                      </FormControl>

                      <TextField fullWidth value={serverData.poiLayer || ''} onChange={(e) => setServerData({ ...serverData, poiLayer: e.target.value })} label={t('mapPoiLayer')} margin="normal" />
                      <TextField fullWidth value={serverData.announcement || ''} onChange={(e) => setServerData({ ...serverData, announcement: e.target.value })} label={t('serverAnnouncement')} margin="normal" />

                      <FormGroup>
                        <FormControlLabel
                          control={<Checkbox checked={serverData.forceSettings} onChange={(e) => setServerData({ ...serverData, forceSettings: e.target.checked })} sx={checkboxSx(colors)} />}
                          label={t('serverForceSettings')}
                        />
                      </FormGroup>
                    </Box>
                  )}

                  {/* Location Tab */}
                  {activeServerTab === 1 && (
                    <Box sx={{ paddingTop: '16px' }}>
                      <TextField fullWidth type="number" value={serverData.latitude || 0} onChange={(e) => setServerData({ ...serverData, latitude: Number(e.target.value) })} label={t('positionLatitude')} margin="normal" />
                      <TextField fullWidth type="number" value={serverData.longitude || 0} onChange={(e) => setServerData({ ...serverData, longitude: Number(e.target.value) })} label={t('positionLongitude')} margin="normal" />
                      <TextField fullWidth type="number" value={serverData.zoom || 0} onChange={(e) => setServerData({ ...serverData, zoom: Number(e.target.value) })} label={t('serverZoom')} margin="normal" />
                      <Button variant="outlined" color="primary" style={{ marginTop: '16px' }}
                        onClick={() => {
                          const { lng, lat } = map.getCenter();
                          setServerData({ ...serverData, latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)), zoom: Number(map.getZoom().toFixed(1)) });
                        }}
                      >
                        {t('mapCurrentLocation')}
                      </Button>
                    </Box>
                  )}

                  {/* Permissions Tab */}
                  {activeServerTab === 2 && (
                    <Box sx={{ paddingTop: '16px' }}>
                      <FormGroup>
                        {[
                          { key: 'registration', label: t('serverRegistration') },
                          { key: 'readonly', label: t('serverReadonly') },
                          { key: 'deviceReadonly', label: t('userDeviceReadonly') },
                          { key: 'limitCommands', label: t('userLimitCommands') },
                          { key: 'disableReports', label: t('userDisableReports') },
                          { key: 'fixedEmail', label: t('userFixedEmail') },
                        ].map(({ key, label }) => (
                          <FormControlLabel
                            key={key}
                            control={<Checkbox checked={!!serverData[key]} onChange={(e) => setServerData({ ...serverData, [key]: e.target.checked })} sx={checkboxSx(colors)} />}
                            label={label}
                          />
                        ))}
                      </FormGroup>
                    </Box>
                  )}

                  {/* File Tab */}
                  {activeServerTab === 3 && (
                    <Box sx={{ paddingTop: '16px' }}>
                      <MuiFileInput placeholder={t('sharedSelectFile')} value={null} onChange={handleFileChange} fullWidth margin="normal" />
                      <Typography variant="body2" color="textSecondary" style={{ marginTop: '8px', fontSize: '12px' }}>
                        {t('serverFileDescription')}
                      </Typography>
                    </Box>
                  )}

                  {/* Attributes Tab */}
                  {activeServerTab === 4 && (
                    <Box sx={{ paddingTop: '16px' }}>
                      <EditAttributesAccordion
                        attributes={serverData.attributes}
                        setAttributes={(attrs) => setServerData({ ...serverData, attributes: attrs })}
                        definitions={{ ...commonUserAttributes, ...commonDeviceAttributes, ...serverAttributes }}
                      />
                    </Box>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ServerDrawer;
