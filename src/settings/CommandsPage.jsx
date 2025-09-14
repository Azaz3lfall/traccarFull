import { useState } from 'react';
import {
  Table, TableRow, TableCell, TableHead, TableBody,
  TextField, Button, IconButton, Typography, Container,
  Accordion, AccordionSummary, AccordionDetails,
  FormControl, InputLabel, Select, MenuItem,
  FormControlLabel, Checkbox, Box, CircularProgress,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useEffectAsync, useCatch } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import { formatBoolean } from '../common/util/formatter';
import { prefixString } from '../common/util/stringUtils';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import SearchHeader, { filterByKeyword } from './components/SearchHeader';
import { useRestriction } from '../common/util/permissions';
import useSettingsStyles from './common/useSettingsStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useThemeColors } from '../common/components/ThemeProvider';
import useCommandAttributes from '../common/attributes/useCommandAttributes';

const CommandsPage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();
  const colors = useThemeColors();

  const [timestamp, setTimestamp] = useState(Date.now());
  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingCommand, setEditingCommand] = useState(null);
  const [commandTypes, setCommandTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const limitCommands = useRestriction('limitCommands');

  const availableAttributes = useCommandAttributes(t);

  useEffectAsync(async () => {
    setLoading(true);
    try {
      const response = await fetchOrThrow('/api/commands');
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  }, [timestamp]);

  // Load command types
  useEffectAsync(async () => {
    try {
      const response = await fetchOrThrow('/api/commands/types');
      setCommandTypes(await response.json());
    } catch (error) {
      console.error('Failed to load command types:', error);
    }
  }, []);

  // Handle edit command
  const handleEdit = (command) => {
    setEditingCommand({
      ...command,
      attributes: command.attributes || {}
    });
    setEditDialog(true);
  };

  // Handle add command
  const handleAdd = () => {
    setEditingCommand({
      description: '',
      type: '',
      textChannel: false,
      attributes: {}
    });
    setEditDialog(true);
  };

  // Handle close drawer
  const handleCloseDrawer = () => {
    setEditDialog(false);
    setEditingCommand(null);
  };

  // Handle save command
  const handleSave = useCatch(async () => {
    setSaving(true);
    try {
      if (editingCommand.id) {
        await fetchOrThrow(`/api/commands/${editingCommand.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingCommand),
        });
      } else {
        await fetchOrThrow('/api/commands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingCommand),
        });
      }
      setTimestamp(Date.now());
      handleCloseDrawer();
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'sharedSavedCommands']}>
        <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell>{t('sharedDescription')}</TableCell>
              <TableCell>{t('sharedType')}</TableCell>
              <TableCell>{t('commandSendSms')}</TableCell>
              {!limitCommands && <TableCell className={classes.columnAction} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading ? items.filter(filterByKeyword(searchKeyword)).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell>{t(prefixString('command', item.type))}</TableCell>
                <TableCell>{formatBoolean(item.textChannel, t)}</TableCell>
                {!limitCommands && (
                  <TableCell className={classes.columnAction} padding="none">
                    <CollectionActions 
                      itemId={item.id} 
                      editPath="/settings/command" 
                      endpoint="commands" 
                      setTimestamp={setTimestamp}
                      customActions={[{
                        key: 'edit',
                        title: t('sharedEdit'),
                        icon: null,
                        handler: () => handleEdit(item)
                      }]}
                      onEdit={() => handleEdit(item)}
                    />
                  </TableCell>
                )}
              </TableRow>
            )) : (<TableShimmer columns={limitCommands ? 3 : 4} endAction />)}
          </TableBody>
        </Table>
        <CollectionFab editPath="/settings/command" disabled={limitCommands} onClick={handleAdd} />
      </PageLayout>
      
      
      {/* Edit Command Drawer */}
      <AnimatePresence>
        {editDialog && (
          <>
            {/* Backdrop */}
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
                zIndex: 9999,
              }}
              onClick={handleCloseDrawer}
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '500px',
                height: '100vh',
                backgroundColor: colors.surface,
                borderLeft: `1px solid ${colors.border}`,
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
              }}
            >
              {/* Drawer Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconButton
                    onClick={handleCloseDrawer}
                    size="small"
                    style={{ color: colors.textSecondary }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                    {editingCommand?.id ? t('sharedEdit') : t('sharedAdd')} {t('sharedSavedCommands')}
                  </Typography>
                </div>
              </div>

              {/* Drawer Content */}
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '0 24px 24px 24px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {editingCommand && (
                  <Container maxWidth="sm" style={{ padding: 0, marginTop: '20px' }}>
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">
                          {t('sharedRequired')}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails className={classes.details}>
                        <TextField
                          value={editingCommand.description || ''}
                          onChange={(e) => setEditingCommand({ ...editingCommand, description: e.target.value })}
                          label={t('sharedDescription')}
                          fullWidth
                          margin="normal"
                        />
                        <FormControl fullWidth margin="normal">
                          <InputLabel>{t('sharedType')}</InputLabel>
                          <Select
                            value={editingCommand.type || ''}
                            onChange={(e) => setEditingCommand({ ...editingCommand, type: e.target.value })}
                            label={t('sharedType')}
                          >
                            {commandTypes.map((type) => (
                              <MenuItem key={type.type} value={type.type}>
                                {t(prefixString('command', type.type))}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={editingCommand.textChannel || false}
                              onChange={(e) => setEditingCommand({ ...editingCommand, textChannel: e.target.checked })}
                            />
                          }
                          label={t('commandSendSms')}
                        />
                      </AccordionDetails>
                    </Accordion>
                  </Container>
                )}
              </div>

              {/* Drawer Footer */}
              <div style={{
                padding: '20px 24px',
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: colors.surface,
              }}>
                <Button
                  onClick={handleCloseDrawer}
                  size="small"
                  style={{ color: colors.textSecondary }}
                >
                  {t('sharedCancel')}
                </Button>
                <Button
                  onClick={handleSave}
                  variant="contained"
                  disabled={saving || !editingCommand?.description || !editingCommand?.type}
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.text,
                  }}
                >
                  {saving ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      {t('sharedSaving')}
                    </Box>
                  ) : (
                    t('sharedSave')
                  )}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default CommandsPage;
