import { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { createFilterOptions } from '@mui/material/Autocomplete';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SaveIcon from '@mui/icons-material/Save';
import CachedIcon from '@mui/icons-material/Cached';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation, useTranslationKeys } from '../../common/components/LocalizationProvider';
import { useThemeColors } from '../../common/components/ThemeProvider';
import { useAdministrator, useRestriction } from '../../common/util/permissions';
import { prefixString, unprefixString } from '../../common/util/stringUtils';
import { DEFAULT_ACTIVE_MAP_STYLES } from '../../map/core/mapStyleDefaults';
import useMapStyles from '../../map/core/useMapStyles';
import useMapOverlays from '../../map/overlay/useMapOverlays';
import usePositionAttributes from '../../common/attributes/usePositionAttributes';
import { usePreferencesDrawer } from '../hooks/usePreferencesDrawer';

const DEVICE_FIELDS = [
  { id: 'name', name: 'sharedName' },
  { id: 'uniqueId', name: 'deviceIdentifier' },
  { id: 'phone', name: 'sharedPhone' },
  { id: 'model', name: 'deviceModel' },
  { id: 'contact', name: 'deviceContact' },
];

const menuProps = (colors) => ({
  disablePortal: false,
  style: { zIndex: 10010 },
  PaperProps: {
    style: { backgroundColor: colors.surface, border: `1px solid ${colors.border}`, zIndex: 10010 },
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

const checkboxSx = (colors) => ({
  color: colors.textSecondary,
  '&:hover': { backgroundColor: `${colors.primary}20` },
  '&.Mui-checked': {
    color: colors.primary,
    '&:hover': { backgroundColor: `${colors.primary}30` },
  },
  '&.MuiCheckbox-root': { color: colors.textSecondary },
});

const TAB_LABELS = ['mapTitle', 'deviceTitle', 'sharedSound', 'userToken', 'sharedInfoTitle', 'sharedNotification'];

const PreferencesDrawer = ({ open, onClose }) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const muiTheme = useTheme();
  const desktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  const admin = useAdministrator();
  const readonly = useRestriction('readonly');

  const versionApp = import.meta.env.VITE_APP_VERSION;
  const versionServer = useSelector((state) => state.session.server.version);
  const socket = useSelector((state) => state.session.socket);

  const mapStyles = useMapStyles();
  const mapOverlays = useMapOverlays();
  const positionAttributes = usePositionAttributes(t);

  const alarms = useTranslationKeys((it) => it.startsWith('alarm')).map((it) => ({
    key: unprefixString('alarm', it),
    name: t(it),
  }));
  const createFilter = createFilterOptions();

  const [activePreferencesTab, setActivePreferencesTab] = useState(0);
  const [popupInfoOpen, setPopupInfoOpen] = useState(false);

  const {
    preferencesAttributes,
    setPreferencesAttributes,
    preferencesSaving,
    notificationTypes,
    token,
    setToken,
    tokenExpiration,
    setTokenExpiration,
    generateToken,
    handlePreferencesSave,
    handleReboot,
  } = usePreferencesDrawer({ open, onClose });

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
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
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
                  {t(TAB_LABELS[activePreferencesTab] || 'sharedPreferences')}
                </Typography>
              </div>
              <IconButton
                onClick={handlePreferencesSave}
                disabled={preferencesSaving}
                style={{ backgroundColor: colors.primary, color: colors.text, width: '40px', height: '40px' }}
                title={preferencesSaving ? t('sharedSaving') : t('sharedSave')}
              >
                {preferencesSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              </IconButton>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              paddingBottom: '200px',
            }}>
              <Tabs
                value={activePreferencesTab}
                onChange={(e, v) => setActivePreferencesTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                style={{ borderBottom: `1px solid ${colors.border}`, marginBottom: '16px' }}
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
                  },
                  '& .MuiTabs-indicator': { backgroundColor: '#1976d2', height: '2px' },
                }}
              >
                {TAB_LABELS.map((label) => (
                  <Tab key={label} label={t(label)} />
                ))}
              </Tabs>

              {/* Map Tab */}
              {activePreferencesTab === 0 && (
                <Box>
                  {!readonly && (
                    <div style={{ marginBottom: '24px' }}>
                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('mapActive')}</InputLabel>
                        <Select
                          label={t('mapActive')}
                          value={(preferencesAttributes.activeMapStyles || DEFAULT_ACTIVE_MAP_STYLES).split(',').map((s) => s.trim()).filter(Boolean)}
                          onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, activeMapStyles: e.target.value.join(',') })}
                          multiple
                          MenuProps={menuProps(colors)}
                          sx={selectSx(colors)}
                        >
                          {mapStyles.map((style) => (
                            <MenuItem key={style.id} value={style.id}>
                              <Typography component="span" color={style.available ? 'textPrimary' : 'error'}>{style.title}</Typography>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('mapOverlay')}</InputLabel>
                        <Select
                          label={t('mapOverlay')}
                          value={preferencesAttributes.selectedMapOverlay || ''}
                          onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, selectedMapOverlay: e.target.value })}
                          MenuProps={menuProps(colors)}
                          sx={selectSx(colors)}
                        >
                          <MenuItem value="">{' '}</MenuItem>
                          {mapOverlays.map((overlay) => (
                            <MenuItem key={overlay.id} value={overlay.id}>
                              <Typography component="span" color={overlay.available ? 'textPrimary' : 'error'}>{overlay.title}</Typography>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Autocomplete
                        multiple
                        freeSolo
                        openOnFocus
                        blurOnSelect={false}
                        open={popupInfoOpen}
                        onOpen={() => setPopupInfoOpen(true)}
                        onClose={() => setPopupInfoOpen(false)}
                        options={Object.keys(positionAttributes).filter((key) => key !== 'fixTime')}
                        getOptionLabel={(option) => {
                          if (typeof option === 'object' && option.inputValue) return option.inputValue;
                          return positionAttributes[option]?.name || option;
                        }}
                        value={preferencesAttributes.positionItems?.split(',') || ['serverTime', 'address', 'speed', 'totalDistance']}
                        onChange={(_, newValue) => {
                          setPreferencesAttributes({
                            ...preferencesAttributes,
                            positionItems: newValue.map((x) => (typeof x === 'string' ? x : x.inputValue)).join(','),
                          });
                        }}
                        filterOptions={(options, params) => {
                          const filtered = createFilter(options, params);
                          if (params.inputValue && !options.includes(params.inputValue)) {
                            filtered.push({ inputValue: params.inputValue, name: `${t('sharedAdd')} "${params.inputValue}"` });
                          }
                          return filtered;
                        }}
                        renderOption={(props, option) => (
                          <li {...props}>{option.name ? option.name : (positionAttributes[option]?.name || option)}</li>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t('attributePopupInfo')}
                            margin="normal"
                            sx={selectSx(colors)}
                          />
                        )}
                        ListboxProps={{
                          disablePortal: false,
                          style: { backgroundColor: colors.surface, border: `1px solid ${colors.border}`, zIndex: 99999 },
                        }}
                        PopperComponent={(props) => {
                          const { disablePortal: _dp, anchorEl: _ac, ...rest } = props;
                          return <div {...rest} style={{ ...props.style, zIndex: 99999 }} />;
                        }}
                      />

                      {[
                        { key: 'mapLiveRoutes', label: t('mapLiveRoutes'), options: [['none', t('sharedDisabled')], ['selected', t('deviceSelected')], ['all', t('notificationAlways')]], default: 'none' },
                        { key: 'mapDirection', label: t('mapDirection'), options: [['none', t('sharedDisabled')], ['selected', t('deviceSelected')], ['all', t('notificationAlways')]], default: 'selected' },
                      ].map(({ key, label, options, default: def }) => (
                        <FormControl key={key} fullWidth margin="normal">
                          <InputLabel>{label}</InputLabel>
                          <Select
                            label={label}
                            value={preferencesAttributes[key] || def}
                            onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, [key]: e.target.value })}
                            MenuProps={menuProps(colors)}
                            sx={selectSx(colors)}
                          >
                            {options.map(([value, text]) => <MenuItem key={value} value={value}>{text}</MenuItem>)}
                          </Select>
                        </FormControl>
                      ))}

                      <FormGroup style={{ marginTop: '16px' }}>
                        {[
                          { key: 'mapGeofences', label: t('attributeShowGeofences'), default: true },
                          { key: 'mapFollow', label: t('deviceFollow'), default: false },
                          { key: 'mapCluster', label: t('mapClustering'), default: true },
                          { key: 'mapOnSelect', label: t('mapOnSelect'), default: true },
                        ].map(({ key, label, default: def }) => (
                          <FormControlLabel
                            key={key}
                            control={(
                              <Checkbox
                                checked={Object.prototype.hasOwnProperty.call(preferencesAttributes, key) ? preferencesAttributes[key] : def}
                                onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, [key]: e.target.checked })}
                                sx={checkboxSx(colors)}
                              />
                            )}
                            label={label}
                            style={{ color: colors.text }}
                          />
                        ))}
                      </FormGroup>
                    </div>
                  )}
                </Box>
              )}

              {/* Device Tab */}
              {activePreferencesTab === 1 && (
                <Box>
                  {!readonly && (
                    <div style={{ marginBottom: '24px' }}>
                      {[
                        { key: 'devicePrimary', label: t('devicePrimaryInfo'), default: 'name', allowEmpty: false },
                        { key: 'deviceSecondary', label: t('deviceSecondaryInfo'), default: '', allowEmpty: true },
                      ].map(({ key, label, default: def, allowEmpty }) => (
                        <FormControl key={key} fullWidth margin="normal">
                          <InputLabel>{label}</InputLabel>
                          <Select
                            label={label}
                            value={preferencesAttributes[key] || def}
                            onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, [key]: e.target.value })}
                            MenuProps={menuProps(colors)}
                            sx={selectSx(colors)}
                          >
                            {allowEmpty && <MenuItem value="">{' '}</MenuItem>}
                            {DEVICE_FIELDS.map((field) => (
                              <MenuItem key={field.id} value={field.id}>{t(field.name)}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ))}
                    </div>
                  )}
                </Box>
              )}

              {/* Sound Tab */}
              {activePreferencesTab === 2 && (
                <Box>
                  {!readonly && (
                    <div style={{ marginBottom: '24px' }}>
                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('eventsSoundEvents')}</InputLabel>
                        <Select
                          label={t('eventsSoundEvents')}
                          value={preferencesAttributes.soundEvents?.split(',') || []}
                          onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, soundEvents: e.target.value.join(',') })}
                          multiple
                          MenuProps={menuProps(colors)}
                          sx={selectSx(colors)}
                        />
                      </FormControl>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('eventsSoundAlarms')}</InputLabel>
                        <Select
                          label={t('eventsSoundAlarms')}
                          value={preferencesAttributes.soundAlarms?.split(',') || ['sos']}
                          onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, soundAlarms: e.target.value.join(',') })}
                          multiple
                          MenuProps={menuProps(colors)}
                          sx={selectSx(colors)}
                        >
                          {alarms.map((alarm) => (
                            <MenuItem key={alarm.key} value={alarm.key}>{alarm.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                  )}
                </Box>
              )}

              {/* Token Tab */}
              {activePreferencesTab === 3 && (
                <Box>
                  <div style={{ marginBottom: '24px' }}>
                    <TextField
                      fullWidth
                      label={t('userExpirationTime')}
                      type="date"
                      value={tokenExpiration}
                      onChange={(e) => { setTokenExpiration(e.target.value); setToken(null); }}
                      margin="normal"
                      sx={selectSx(colors)}
                    />
                    <FormControl fullWidth margin="normal">
                      <OutlinedInput
                        multiline
                        rows={6}
                        readOnly
                        type="text"
                        value={token || ''}
                        endAdornment={(
                          <InputAdornment position="end">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <IconButton size="small" edge="end" onClick={generateToken} disabled={!!token}>
                                <CachedIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" edge="end" onClick={() => navigator.clipboard.writeText(token)} disabled={!token}>
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </div>
                          </InputAdornment>
                        )}
                        sx={{
                          backgroundColor: colors.secondary,
                          '& fieldset': { borderColor: colors.border },
                          '&:hover fieldset': { borderColor: colors.primary },
                          '&.Mui-focused fieldset': { borderColor: colors.primary },
                        }}
                      />
                    </FormControl>
                  </div>
                </Box>
              )}

              {/* System Info Tab */}
              {activePreferencesTab === 4 && (
                <Box>
                  {!readonly && (
                    <div style={{ marginBottom: '24px' }}>
                      {[
                        { value: versionApp, label: t('settingsAppVersion') },
                        { value: versionServer || '-', label: t('settingsServerVersion') },
                        { value: socket ? t('deviceStatusOnline') : t('deviceStatusOffline'), label: t('settingsConnection') },
                      ].map(({ value, label }) => (
                        <TextField
                          key={label}
                          fullWidth
                          value={value}
                          label={label}
                          disabled
                          margin="normal"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: colors.secondary,
                              '& fieldset': { borderColor: colors.border },
                            },
                            '& .MuiInputLabel-root': { color: colors.textSecondary },
                          }}
                        />
                      ))}
                      <Button
                        variant="outlined"
                        onClick={() => { window.location.href = '/emulator'; }}
                        style={{ borderColor: colors.border, color: colors.text, marginTop: '16px' }}
                      >
                        {t('sharedEmulator')}
                      </Button>
                      {admin && (
                        <Button
                          variant="outlined"
                          onClick={handleReboot}
                          style={{ borderColor: '#f44336', color: '#f44336', marginTop: '16px', marginLeft: '12px' }}
                        >
                          {t('serverReboot')}
                        </Button>
                      )}
                    </div>
                  )}
                </Box>
              )}

              {/* Notifications Tab */}
              {activePreferencesTab === 5 && (
                <Box>
                  {!readonly && (
                    <div style={{ marginBottom: '24px' }}>
                      <FormControl fullWidth margin="normal">
                        <InputLabel>{t('eventsVisibleTypes')}</InputLabel>
                        <Select
                          label={t('eventsVisibleTypes')}
                          value={preferencesAttributes.visibleEventTypes?.split(',').filter(Boolean) || []}
                          onChange={(e) => setPreferencesAttributes({ ...preferencesAttributes, visibleEventTypes: e.target.value.join(',') })}
                          multiple
                          MenuProps={menuProps(colors)}
                          sx={selectSx(colors)}
                        >
                          {notificationTypes.map((nt) => (
                            <MenuItem key={nt.type} value={nt.type}>
                              {t(prefixString('event', nt.type))}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography variant="caption" style={{ color: colors.textSecondary, display: 'block', marginTop: '8px' }}>
                        {t('eventsVisibleTypesDescription')}
                      </Typography>
                    </div>
                  )}
                </Box>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PreferencesDrawer;
