import { motion, AnimatePresence } from 'framer-motion';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useThemeColors } from '../../common/components/ThemeProvider';
import { prefixString } from '../../common/util/stringUtils';
import { useAnnouncementForm } from '../hooks/useAnnouncementForm';

const AnnouncementDrawer = ({ open, onClose, sendMutation }) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const muiTheme = useTheme();
  const desktop = useMediaQuery(muiTheme.breakpoints.up('md'));

  const {
    announcementData,
    setAnnouncementData,
    filteredUsersOptions,
    filteredNotificatorsOptions,
    usersAutocompleteOpen,
    notificatorsAutocompleteOpen,
    usersInputValue,
    notificatorsInputValue,
    usersHighlightedIndex,
    notificatorsHighlightedIndex,
    usersInputRef,
    notificatorsInputRef,
    handleUsersInputChange,
    handleUsersOptionSelect,
    handleUsersRemove,
    handleUsersFocus,
    handleUsersBlur,
    handleNotificatorsInputChange,
    handleNotificatorsOptionSelect,
    handleNotificatorsFocus,
    handleNotificatorsBlur,
  } = useAnnouncementForm(open);

  const isPending = sendMutation?.isPending ?? false;
  const canSend = announcementData.users?.length > 0
    && announcementData.notificator
    && announcementData.message.subject
    && announcementData.message.body;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10000,
            }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: desktop ? '400px' : '100vw',
              height: '100vh',
              backgroundColor: colors.surface,
              borderLeft: desktop ? `1px solid ${colors.border}` : 'none',
              zIndex: 10001,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <ChevronLeftIcon
                style={{ cursor: 'pointer', color: colors.textSecondary, fontSize: '24px' }}
                onClick={onClose}
              />
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600' }}>
                {t('serverAnnouncement')}
              </Typography>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              padding: '20px',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {/* Users Multi-Select */}
              <Box sx={{ position: 'relative', width: '100%' }}>
                <TextField
                  ref={usersInputRef}
                  label={t('settingsUsers')}
                  value={usersInputValue}
                  onChange={handleUsersInputChange}
                  onFocus={handleUsersFocus}
                  onBlur={handleUsersBlur}
                  fullWidth
                  autoComplete="off"
                  placeholder={t('reportShow')}
                />
                {usersAutocompleteOpen && filteredUsersOptions.length > 0 && (
                  <Paper
                    sx={(theme) => ({
                      position: 'fixed',
                      zIndex: 10002,
                      maxHeight: '200px',
                      minWidth: '200px',
                      overflow: 'auto',
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                      boxShadow: theme.shadows[8],
                      backgroundColor: theme.palette.background.paper,
                      mt: 0.5,
                      '&::-webkit-scrollbar': { display: 'none' },
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                    })}
                    style={{
                      left: usersInputRef.current?.getBoundingClientRect().left || 0,
                      top: (usersInputRef.current?.getBoundingClientRect().bottom || 0) + 4,
                      width: usersInputRef.current?.getBoundingClientRect().width || 200,
                    }}
                  >
                    <List dense>
                      {filteredUsersOptions.map((option, index) => (
                        <ListItem
                          key={option.id}
                          onClick={() => handleUsersOptionSelect(option)}
                          style={{
                            backgroundColor: index === usersHighlightedIndex ? 'rgba(0,0,0,0.04)' : 'transparent',
                            cursor: 'pointer',
                          }}
                          sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                        >
                          <ListItemText primary={option.name} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {announcementData.users?.map((user) => (
                    <Chip
                      key={user.id}
                      label={user.name}
                      onDelete={() => handleUsersRemove(user)}
                      deleteIcon={<CloseIcon />}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>

              {/* Notificators Single-Select */}
              <Box sx={{ position: 'relative', width: '100%' }}>
                <TextField
                  ref={notificatorsInputRef}
                  label={t('notificationNotificators')}
                  value={notificatorsInputValue}
                  onChange={handleNotificatorsInputChange}
                  onFocus={handleNotificatorsFocus}
                  onBlur={handleNotificatorsBlur}
                  fullWidth
                  autoComplete="off"
                  placeholder={t('reportShow')}
                />
                {notificatorsAutocompleteOpen && filteredNotificatorsOptions.length > 0 && (
                  <Paper
                    sx={(theme) => ({
                      position: 'fixed',
                      zIndex: 10002,
                      maxHeight: '200px',
                      minWidth: '200px',
                      overflow: 'auto',
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                      boxShadow: theme.shadows[8],
                      backgroundColor: theme.palette.background.paper,
                      mt: 0.5,
                      '&::-webkit-scrollbar': { display: 'none' },
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                    })}
                    style={{
                      left: notificatorsInputRef.current?.getBoundingClientRect().left || 0,
                      top: (notificatorsInputRef.current?.getBoundingClientRect().bottom || 0) + 4,
                      width: notificatorsInputRef.current?.getBoundingClientRect().width || 200,
                    }}
                  >
                    <List dense>
                      {filteredNotificatorsOptions.map((option, index) => (
                        <ListItem
                          key={option.type}
                          onClick={() => handleNotificatorsOptionSelect(option)}
                          style={{
                            backgroundColor: index === notificatorsHighlightedIndex ? 'rgba(0,0,0,0.04)' : 'transparent',
                            cursor: 'pointer',
                          }}
                          sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                        >
                          <ListItemText primary={t(prefixString('notificator', option.type))} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
                {announcementData.notificator && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    <Chip
                      label={t(prefixString('notificator', announcementData.notificator))}
                      onDelete={() => setAnnouncementData({ ...announcementData, notificator: '' })}
                      deleteIcon={<CloseIcon />}
                      size="small"
                    />
                  </Box>
                )}
              </Box>

              {/* Message Fields */}
              <TextField
                fullWidth
                value={announcementData.message.subject || ''}
                onChange={(e) => setAnnouncementData({
                  ...announcementData,
                  message: { ...announcementData.message, subject: e.target.value },
                })}
                label={t('sharedSubject')}
                variant="outlined"
              />
              <TextField
                fullWidth
                multiline
                rows={4}
                value={announcementData.message.body || ''}
                onChange={(e) => setAnnouncementData({
                  ...announcementData,
                  message: { ...announcementData.message, body: e.target.value },
                })}
                label={t('commandMessage')}
                variant="outlined"
              />
            </div>

            {/* Footer */}
            <div style={{
              padding: '20px',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <Button
                variant="outlined"
                onClick={onClose}
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                {t('sharedCancel')}
              </Button>
              <Button
                variant="contained"
                onClick={() => sendMutation?.mutate(announcementData)}
                disabled={isPending || !canSend}
                style={{ backgroundColor: colors.primary, color: colors.text }}
              >
                {isPending ? t('sharedSending') : t('commandSend')}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementDrawer;
