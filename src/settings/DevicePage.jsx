import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import { MuiFileInput } from 'mui-file-input';
import EditItemView from './components/EditItemView';
import EditAttributesAccordion from './components/EditAttributesAccordion';
import SelectField from '../common/components/SelectField';
import deviceCategories from '../common/util/deviceCategories';
import { useTranslation } from '../common/components/LocalizationProvider';
import useDeviceAttributes from '../common/attributes/useDeviceAttributes';
import { useAdministrator } from '../common/util/permissions';
import SettingsMenu from './components/SettingsMenu';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import { useCatch } from '../reactHelper';
import useSettingsStyles from './common/useSettingsStyles';
import QrCodeDialog from '../common/components/QrCodeDialog';
import fetchOrThrow from '../common/util/fetchOrThrow';

const TELECOM_BASE = '/gestao/telecom';

const DevicePage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();

  const admin = useAdministrator();

  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const deviceAttributes = useDeviceAttributes(t);

  const [searchParams] = useSearchParams();
  const uniqueId = searchParams.get('uniqueId');

  const [item, setItem] = useState(uniqueId ? { uniqueId } : null);
  const [showQr, setShowQr] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [availableChips, setAvailableChips] = useState([]);
  const [selectedChipId, setSelectedChipId] = useState(null);
  const [addChipOpen, setAddChipOpen] = useState(false);
  const [newChipNumero, setNewChipNumero] = useState('');

  const fetchAvailableChips = useCallback(async () => {
    try {
      const deviceId = item?.id ? parseInt(item.id, 10) : null;
      const url = deviceId ? `${TELECOM_BASE}/chips/available?deviceId=${deviceId}` : `${TELECOM_BASE}/chips/available`;
      const res = await fetchOrThrow(url, { credentials: 'include' });
      const data = await res.json();
      setAvailableChips(Array.isArray(data) ? data : []);
    } catch {
      setAvailableChips([]);
    }
  }, [item?.id]);

  useEffect(() => {
    if (item) fetchAvailableChips();
  }, [item, fetchAvailableChips]);

  useEffect(() => {
    if (item?.phone && availableChips.length > 0) {
      const match = availableChips.find((c) => c.numero === item.phone || String(c.numero) === String(item.phone));
      setSelectedChipId(match?.id ?? null);
    } else {
      setSelectedChipId(null);
    }
  }, [item?.phone, availableChips]);

  const handleChipSelect = (chipId) => {
    setSelectedChipId(chipId);
    const chip = availableChips.find((c) => c.id === chipId);
    if (chip) {
      setItem({ ...item, phone: chip.numero });
    } else {
      setItem({ ...item, phone: '' });
    }
  };

  const handleAddChip = async () => {
    if (!newChipNumero?.trim()) return;
    try {
      const res = await fetchOrThrow(`${TELECOM_BASE}/chips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ numero: newChipNumero.trim() }),
      });
      const created = await res.json();
      setAddChipOpen(false);
      setNewChipNumero('');
      await fetchAvailableChips();
      handleChipSelect(created.id);
    } catch (e) {
      alert(e.message || 'Erro ao criar chip');
    }
  };

  const handleSaveWithChip = useCatch(async () => {
    const url = item.id ? `/api/devices/${item.id}` : '/api/devices';
    const res = await fetchOrThrow(url, {
      method: item.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const saved = await res.json();
    const deviceId = saved.id ? parseInt(saved.id, 10) : null;
    if (deviceId) {
      try {
        const currentRes = await fetchOrThrow(`${TELECOM_BASE}/chips/by-device/${deviceId}`, { credentials: 'include' });
        const currentChip = await currentRes.json();
        if (currentChip && currentChip.id !== selectedChipId) {
          await fetchOrThrow(`${TELECOM_BASE}/chips/${currentChip.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ traccar_device_id: null }),
          });
        }
        if (selectedChipId) {
          await fetchOrThrow(`${TELECOM_BASE}/chips/${selectedChipId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ traccar_device_id: deviceId }),
          });
        }
      } catch {
        // ignore chip link errors
      }
    }
    window.history.back();
  });

  const handleFileInput = useCatch(async (newFile) => {
    setImageFile(newFile);
    if (newFile && item?.id) {
      const response = await fetchOrThrow(`/api/devices/${item.id}/image`, {
        method: 'POST',
        body: newFile,
      });
      setItem({ ...item, attributes: { ...item.attributes, deviceImage: await response.text() } });
    } else if (!newFile) {
      // eslint-disable-next-line no-unused-vars
      const { deviceImage, ...remainingAttributes } = item.attributes || {};
      setItem({ ...item, attributes: remainingAttributes });
    }
  });

  const validate = () => item && item.name && item.uniqueId;

  return (
    <EditItemView
      endpoint="devices"
      item={item}
      setItem={setItem}
      validate={validate}
      customSaveHandler={handleSaveWithChip}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedDevice']}
    >
      {item && (
        <>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                {t('sharedRequired')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                value={item.name || ''}
                onChange={(event) => setItem({ ...item, name: event.target.value })}
                label={t('sharedName')}
              />
              <TextField
                value={item.uniqueId || ''}
                onChange={(event) => setItem({ ...item, uniqueId: event.target.value })}
                label={t('deviceIdentifier')}
                helperText={t('deviceIdentifierHelp')}
                disabled={Boolean(uniqueId)}
              />
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                {t('sharedExtra')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <SelectField
                value={item.groupId}
                onChange={(event) => setItem({ ...item, groupId: Number(event.target.value) })}
                endpoint="/api/groups"
                label={t('groupParent')}
              />
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('sharedPhone')}</InputLabel>
                  <Select
                    value={selectedChipId || ''}
                    label={t('sharedPhone')}
                    onChange={(e) => handleChipSelect(e.target.value || null)}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Nenhum chip selecionado</em>
                    </MenuItem>
                    {availableChips.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.numero} {c.operadora ? `(${c.operadora})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  onClick={() => setAddChipOpen(true)}
                  title="Adicionar chip"
                  sx={{ mt: 0.5 }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
              {availableChips.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Nenhum chip disponível. Clique no + para adicionar.
                </Typography>
              )}
              <TextField
                value={item.model || ''}
                onChange={(event) => setItem({ ...item, model: event.target.value })}
                label={t('deviceModel')}
              />
              <TextField
                value={item.contact || ''}
                onChange={(event) => setItem({ ...item, contact: event.target.value })}
                label={t('deviceContact')}
              />
              <SelectField
                value={item.category || 'default'}
                onChange={(event) => setItem({ ...item, category: event.target.value })}
                data={deviceCategories.map((category) => ({
                  id: category,
                  name: t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`),
                })).sort((a, b) => a.name.localeCompare(b.name))}
                label={t('deviceCategory')}
              />
              <SelectField
                value={item.calendarId}
                onChange={(event) => setItem({ ...item, calendarId: Number(event.target.value) })}
                endpoint="/api/calendars"
                label={t('sharedCalendar')}
              />
              <TextField
                label={t('userExpirationTime')}
                type="date"
                value={item.expirationTime ? item.expirationTime.split('T')[0] : '2099-01-01'}
                onChange={(e) => {
                  if (e.target.value) {
                    setItem({ ...item, expirationTime: new Date(e.target.value).toISOString() });
                  }
                }}
                disabled={!admin}
              />
              <FormControlLabel
                control={<Checkbox checked={item.disabled} onChange={(event) => setItem({ ...item, disabled: event.target.checked })} />}
                label={t('sharedDisabled')}
                disabled={!admin}
              />
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setShowQr(true)}
              >
                {t('sharedQrCode')}
              </Button>
            </AccordionDetails>
          </Accordion>
          {item.id && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  {t('attributeDeviceImage')}
                </Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.details}>
                <MuiFileInput
                  placeholder={t('attributeDeviceImage')}
                  value={imageFile}
                  onChange={handleFileInput}
                  inputProps={{ accept: 'image/*' }}
                />
              </AccordionDetails>
            </Accordion>
          )}
          <EditAttributesAccordion
            attributes={item.attributes}
            setAttributes={(attributes) => setItem({ ...item, attributes })}
            definitions={{ ...commonDeviceAttributes, ...deviceAttributes }}
          />
        </>
      )}
      <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />
      <Dialog open={addChipOpen} onClose={() => setAddChipOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Adicionar chip</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Número da linha"
            value={newChipNumero}
            onChange={(e) => setNewChipNumero(e.target.value)}
            placeholder="5511999999999"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddChipOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAddChip} disabled={!newChipNumero?.trim()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </EditItemView>
  );
};

export default DevicePage;
