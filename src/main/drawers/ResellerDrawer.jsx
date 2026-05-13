import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import {
  Autocomplete,
  Box,
  CircularProgress,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useThemeColors } from '../../common/components/ThemeProvider';
import { useResellerDrawer } from '../hooks/useResellerDrawer';

const fieldSx = (colors) => ({
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

const ResellerDrawer = ({ open, onClose }) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const muiTheme = useTheme();
  const desktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  const [activeResellerTab, setActiveResellerTab] = useState(0);

  const {
    user,
    resellerData,
    setResellerData,
    resellerErrors,
    setResellerErrors,
    resellerUsers,
    resellerUsersLoading,
    resellerUsersError,
    resellerAutocompleteOpen,
    setResellerAutocompleteOpen,
    fetchResellerUsers,
    handleResellerFieldChange,
    handleResellerFileUpload,
  } = useResellerDrawer({ open, onClose });

  const handleSave = async () => {
    const errors = [];
    const requiredFields = [
      { key: 'resellerId', label: t('resellerId') },
      { key: 'resellerUser', label: t('resellerUser') },
      { key: 'resellerEmail', label: t('resellerEmail') },
      { key: 'companyName', label: t('resellerCompanyName') },
      { key: 'logo', label: t('resellerLogotype') },
      { key: 'url', label: t('resellerAppUrl') },
      { key: 'whatsapp', label: t('resellerWhatsapp') },
      { key: 'billingEmail', label: t('resellerBillingEmail') },
      { key: 'supportEmail', label: t('resellerSupportEmail') },
      { key: 'resellerLimit', label: t('resellerLimit') },
      { key: 'deviceLimit', label: t('userDeviceLimit') },
      { key: 'userLimit', label: t('userUserLimit') },
    ];

    if (!resellerData.resellerId || resellerData.resellerId === '' || isNaN(resellerData.resellerId)) {
      errors.push(`${t('resellerId')} (must select a valid user)`);
    }

    requiredFields.forEach((field) => {
      const value = resellerData[field.key];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(field.label);
      }
    });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (resellerData.resellerEmail && !emailRegex.test(resellerData.resellerEmail)) {
      errors.push(`${t('resellerEmail')} has invalid format`);
    }
    if (resellerData.billingEmail && !emailRegex.test(resellerData.billingEmail)) {
      errors.push(`${t('resellerBillingEmail')} has invalid format`);
    }
    if (resellerData.supportEmail && !emailRegex.test(resellerData.supportEmail)) {
      errors.push(`${t('resellerSupportEmail')} has invalid format`);
    }

    ['resellerLimit', 'deviceLimit', 'userLimit'].forEach((key) => {
      if (resellerData[key]) {
        const v = parseInt(resellerData[key]);
        const labels = { resellerLimit: t('resellerLimit'), deviceLimit: t('userDeviceLimit'), userLimit: t('userUserLimit') };
        if (isNaN(v) || v < 1) errors.push(`${labels[key]} must be a positive number`);
      }
    });

    if (errors.length > 0) {
      setResellerErrors(errors);
      return;
    }
    setResellerErrors([]);

    const payload = {
      currentDomain: resellerData.currentDomain,
      parentUserId: resellerData.parentUserId,
      parentUser: resellerData.parentUser,
      parentEmail: resellerData.parentEmail,
      resellerId: resellerData.resellerId.trim(),
      resellerUser: resellerData.resellerUser.trim(),
      resellerEmail: resellerData.resellerEmail.trim(),
      companyName: resellerData.companyName.trim(),
      logotype: resellerData.logo.trim(),
      appUrl: resellerData.url.trim(),
      whatsapp: resellerData.whatsapp.trim(),
      billingEmail: resellerData.billingEmail.trim(),
      supportEmail: resellerData.supportEmail.trim(),
      resellerLimit: parseInt(resellerData.resellerLimit) || 0,
      deviceLimit: parseInt(resellerData.deviceLimit) || 0,
      userLimit: parseInt(resellerData.userLimit) || 0,
      timestamp: new Date().toISOString(),
      createdBy: user?.name || 'Unknown',
      createdById: user?.id || null,
    };

    await handleResellerFileUpload(payload);
  };

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
                  {t('resellerPanel')}
                </Typography>
              </div>
              <IconButton
                onClick={handleSave}
                style={{ backgroundColor: colors.primary, color: colors.text, width: '40px', height: '40px' }}
                title={t('sharedSave')}
              >
                <SaveIcon />
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
            }}>
              <input type="hidden" value={resellerData.currentDomain} name="currentDomain" />
              <input type="hidden" value={resellerData.parentUserId} name="parentUserId" />
              <input type="hidden" value={resellerData.parentUser} name="parentUser" />
              <input type="hidden" value={resellerData.parentEmail} name="parentEmail" />

              <Tabs
                value={activeResellerTab}
                onChange={(e, v) => setActiveResellerTab(v)}
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
                  },
                  '& .MuiTabs-indicator': { backgroundColor: '#1976d2', height: '2px' },
                }}
              >
                <Tab label={t('resellerBranding')} />
                <Tab label={t('resellerContact')} />
                <Tab label={t('resellerPermissions')} />
              </Tabs>

              <Box style={{ flex: 1, overflow: 'auto', paddingTop: '16px' }}>
                {/* Branding Tab */}
                {activeResellerTab === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Autocomplete
                      fullWidth
                      options={resellerUsers}
                      getOptionLabel={(option) => {
                        if (typeof option === 'string') return option;
                        const name = option.name || option.email || `User ${option.id}`;
                        return `${option.id} - ${name}`;
                      }}
                      value={resellerUsers.find((u) => u.id === resellerData.resellerId) || null}
                      onChange={(event, newValue) => {
                        if (typeof newValue === 'string') {
                          const match = resellerUsers.find((u) => {
                            const name = u.name || u.email || `User ${u.id}`;
                            return `${u.id} - ${name}`.toLowerCase() === newValue.toLowerCase();
                          });
                          if (match) {
                            setResellerData((prev) => ({
                              ...prev,
                              resellerId: match.id,
                              resellerUser: match.login || match.email,
                              resellerEmail: match.email,
                            }));
                          } else {
                            handleResellerFieldChange('resellerId', newValue);
                          }
                        } else if (newValue) {
                          setResellerData((prev) => ({
                            ...prev,
                            resellerId: newValue.id,
                            resellerUser: newValue.login || newValue.email,
                            resellerEmail: newValue.email,
                          }));
                        } else {
                          setResellerData((prev) => ({
                            ...prev,
                            resellerId: '',
                            resellerUser: '',
                            resellerEmail: '',
                          }));
                        }
                      }}
                      onFocus={fetchResellerUsers}
                      loading={resellerUsersLoading}
                      disabled={resellerUsersLoading}
                      open={resellerAutocompleteOpen}
                      onOpen={() => setResellerAutocompleteOpen(true)}
                      onClose={() => setTimeout(() => setResellerAutocompleteOpen(false), 0)}
                      filterOptions={(options, { inputValue }) => {
                        if (!inputValue) return options.slice(0, 10);
                        const q = inputValue.toLowerCase();
                        return options.filter((o) => (
                          o.id.toString().toLowerCase().includes(q)
                          || (o.name || '').toLowerCase().includes(q)
                          || (o.email || '').toLowerCase().includes(q)
                          || (o.login || '').toLowerCase().includes(q)
                        ));
                      }}
                      freeSolo
                      selectOnFocus={false}
                      clearOnBlur={false}
                      handleHomeEndKeys
                      autoSelect={false}
                      autoComplete={false}
                      disablePortal
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('resellerId')}
                          required
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {resellerUsersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                          sx={fieldSx(colors)}
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...rest } = props;
                        return (
                          <Box component="li" key={key} {...rest}>
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                              <Typography variant="body2" style={{ color: colors.text, fontWeight: '500' }}>
                                {option.id} - {option.name || option.email || `User ${option.id}`}
                              </Typography>
                              <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px' }}>
                                {option.login || option.email || 'No login/email'}
                              </Typography>
                            </div>
                          </Box>
                        );
                      }}
                      noOptionsText={resellerUsersError ? `${t('sharedError')}: ${resellerUsersError}` : t('sharedNoData')}
                      PopperComponent={(props) => {
                        const { disablePortal: _dp, anchorEl: _ac, ...rest } = props;
                        return <div {...rest} style={{ ...props.style, zIndex: 10001 }} />;
                      }}
                      sx={{
                        '& .MuiAutocomplete-popper': { zIndex: '10001 !important' },
                        '& .MuiAutocomplete-listbox': { zIndex: '10001 !important' },
                        '& .MuiPaper-root': { zIndex: '10001 !important' },
                      }}
                    />

                    {[
                      { key: 'companyName', label: t('resellerCompanyName') },
                      { key: 'logo', label: t('resellerLogotype') },
                      { key: 'url', label: t('resellerAppUrl') },
                    ].map(({ key, label }) => (
                      <TextField
                        key={key}
                        fullWidth
                        value={resellerData[key]}
                        onChange={(e) => handleResellerFieldChange(key, e.target.value)}
                        label={label}
                        required
                        sx={fieldSx(colors)}
                      />
                    ))}
                  </div>
                )}

                {/* Contact Tab */}
                {activeResellerTab === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { key: 'resellerUser', label: t('resellerUser'), readOnly: true },
                      { key: 'resellerEmail', label: t('resellerEmail'), type: 'email', readOnly: true },
                      { key: 'whatsapp', label: t('resellerWhatsapp') },
                      { key: 'billingEmail', label: t('resellerBillingEmail'), type: 'email' },
                      { key: 'supportEmail', label: t('resellerSupportEmail'), type: 'email' },
                    ].map(({ key, label, type, readOnly }) => (
                      <TextField
                        key={key}
                        fullWidth
                        value={resellerData[key]}
                        onChange={readOnly ? undefined : (e) => handleResellerFieldChange(key, e.target.value)}
                        label={label}
                        type={type || 'text'}
                        required
                        InputProps={readOnly ? { readOnly: true } : undefined}
                        sx={fieldSx(colors)}
                      />
                    ))}
                  </div>
                )}

                {/* Permissions Tab */}
                {activeResellerTab === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { key: 'resellerLimit', label: t('resellerLimit') },
                      { key: 'deviceLimit', label: t('userDeviceLimit') },
                      { key: 'userLimit', label: t('userUserLimit') },
                    ].map(({ key, label }) => (
                      <TextField
                        key={key}
                        fullWidth
                        value={resellerData[key]}
                        onChange={(e) => handleResellerFieldChange(key, e.target.value)}
                        label={label}
                        type="number"
                        required
                        inputProps={{ min: 1 }}
                        sx={fieldSx(colors)}
                      />
                    ))}
                  </div>
                )}
              </Box>

              {resellerErrors.length > 0 && (
                <div style={{
                  padding: '16px',
                  border: '2px solid #f44336',
                  borderRadius: '8px',
                  backgroundColor: '#ffebee',
                  marginTop: '16px',
                }}>
                  <Typography variant="body2" style={{ color: '#d32f2f', fontWeight: '600', marginBottom: '8px' }}>
                    {t('sharedError')}: {t('sharedRequiredFields')}
                  </Typography>
                  {resellerErrors.map((error, index) => (
                    <Typography key={`err-${index}`} variant="body2" style={{ color: '#d32f2f', marginBottom: '4px' }}>
                      • {error}
                    </Typography>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ResellerDrawer;
