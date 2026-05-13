import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import {
  Check as CheckIcon,
  DeleteOutline as DeleteOutlineIcon,
  DirectionsCar as DirectionsCarIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { fetchAvailableDevicesForVehicle } from '../../../store';
import { compressImage, validateImageFile } from '../../../utils/imageCompression';
import deviceCategories from '../../../common/util/deviceCategories';
import { mapIconKey, mapIcons } from '../../../map/core/preloadImages';
import { vehicleTypeToIcon } from '../../../common/util/vehicleTypeIcon';

/** Popper z-index above Dialog (this modal uses zIndex 11000) so Autocomplete lists are visible */
const AUTOCOMPLETE_POPPER_Z = 12000;

const VehicleFormDialog = ({
  open,
  onClose,
  onSave,
  vehicle,
  clients,
  clientsLoading,
  availableDevices,
  availableDevicesLoading,
  colors,
  admin,
}) => {
  const dispatch = useDispatch();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [deviceSearchInput, setDeviceSearchInput] = useState('');
  const [vehicleTypeDropdownOpen, setVehicleTypeDropdownOpen] = useState(false);
  const vehicleTypeInputRef = useRef(null);
  const editingVehicleId = vehicle?.id || null;

  const [formData, setFormData] = useState({
    plate: '',
    client_id: '',
    make: '',
    model: '',
    color: '',
    year: '',
    vehicle_type: 'default',
    nickname: '',
    installation_details: '',
    foto_veiculo: '',
    fotoFile: null,
    selectedDeviceIds: [],
  });

  useEffect(() => {
    if (!open) return;
    dispatch(fetchAvailableDevicesForVehicle(editingVehicleId || null));
  }, [dispatch, editingVehicleId, open]);

  useEffect(() => {
    if (!open) return;
    if (vehicle) {
      setFormData({
        plate: vehicle.plate || '',
        client_id: vehicle.client_id || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        color: vehicle.color || '',
        year: vehicle.year || '',
        vehicle_type: (vehicle.vehicle_type && deviceCategories.includes(vehicle.vehicle_type))
          ? vehicle.vehicle_type
          : vehicleTypeToIcon(vehicle.vehicle_type) || 'default',
        nickname: vehicle.nickname || '',
        installation_details: vehicle.installation_details || '',
        foto_veiculo: vehicle.foto_veiculo || '',
        fotoFile: null,
        selectedDeviceIds: Array.isArray(vehicle.deviceIds)
          ? vehicle.deviceIds
          : Array.isArray(vehicle.devices)
            ? vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
            : vehicle.device_id != null
              ? [vehicle.device_id]
              : [],
      });
    } else {
      setFormData({
        plate: '',
        client_id: '',
        make: '',
        model: '',
        color: '',
        year: '',
        vehicle_type: 'default',
        nickname: '',
        installation_details: '',
        foto_veiculo: '',
        fotoFile: null,
        selectedDeviceIds: [],
      });
    }
    setFormErrors({});
    setDeviceSearchInput('');
    setVehicleTypeDropdownOpen(false);
  }, [open, vehicle]);

  const previewUrl = useMemo(
    () => (formData.fotoFile ? URL.createObjectURL(formData.fotoFile) : null),
    [formData.fotoFile],
  );

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectedDeviceObjects = useMemo(() => {
    const ids = formData.selectedDeviceIds || [];
    if (ids.length === 0) return [];
    return (Array.isArray(availableDevices) ? availableDevices : []).filter((d) => d && ids.includes(d.id));
  }, [availableDevices, formData.selectedDeviceIds]);

  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  }, [formErrors]);

  const handleFileChange = useCallback(async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    event.target.value = '';
    const validation = validateImageFile(file, 500);
    if (!validation.success) {
      setFormErrors((prev) => ({ ...prev, foto: validation.message }));
      return;
    }

    setFormErrors((prev) => ({ ...prev, foto: '' }));
    try {
      const compressedFile = await compressImage(file, {
        maxSizeKB: 80,
        minSizeKB: 50,
        maxWidth: 800,
        maxHeight: 600,
        outputFormat: 'image/jpeg',
        initialQuality: 0.8,
      });
      setFormData((prev) => ({ ...prev, fotoFile: compressedFile, foto_veiculo: '' }));
    } catch {
      setFormData((prev) => ({ ...prev, fotoFile: file, foto_veiculo: '' }));
    }
  }, []);

  const handleRemovePhoto = useCallback(() => {
    setFormData((prev) => ({ ...prev, fotoFile: null, foto_veiculo: '' }));
    setFormErrors((prev) => ({ ...prev, foto: '' }));
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};
    if (!formData.plate.trim()) errors.plate = 'Placa é obrigatória';
    if (!formData.client_id) errors.client_id = 'Cliente é obrigatório';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.client_id, formData.plate]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    let fotoPath = formData.foto_veiculo || null;
    if (formData.fotoFile) {
      setUploadingPhoto(true);
      try {
        const fd = new FormData();
        fd.append('file', formData.fotoFile);
        const response = await fetch('/api/vehicles/upload', {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
        if (response.ok) {
          const body = await response.json();
          fotoPath = body.filePath;
        } else {
          throw new Error(`Falha no upload da foto (${response.status})`);
        }
      } finally {
        setUploadingPhoto(false);
      }
    }

    await onSave({
      vehicleId: editingVehicleId,
      vehicleData: {
        plate: formData.plate.trim(),
        client_id: formData.client_id,
        make: formData.make.trim() || null,
        model: formData.model.trim() || null,
        color: formData.color.trim() || null,
        year: formData.year ? parseInt(formData.year, 10) : null,
        vehicle_type: formData.vehicle_type?.trim() || null,
        nickname: formData.nickname?.trim() || null,
        installation_details: formData.installation_details?.trim() || null,
        foto_veiculo: fotoPath,
        deviceIds: formData.selectedDeviceIds || [],
      },
    });
  }, [editingVehicleId, formData, onSave, validateForm]);

  const isSaveDisabled = !formData.plate.trim() || !formData.client_id || uploadingPhoto;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth sx={{ zIndex: 11000 }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <DirectionsCarIcon sx={{ color: colors.primary, fontSize: 28 }} />
        {editingVehicleId ? 'Editar Veículo' : 'Novo Veículo'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Placa"
            value={formData.plate}
            onChange={(e) => handleFormChange('plate', e.target.value)}
            fullWidth
            required
            error={!!formErrors.plate}
            helperText={formErrors.plate}
            disabled={!admin}
          />

          <Autocomplete
            disabled={!admin}
            options={Array.isArray(clients) ? clients : []}
            getOptionLabel={(option) => option?.name || ''}
            value={(Array.isArray(clients) ? clients : []).find((c) => c?.id === formData.client_id) || null}
            onChange={(event, value) => handleFormChange('client_id', value ? value.id : '')}
            isOptionEqualToValue={(option, value) => option?.id === value?.id}
            renderInput={(params) => (
              <TextField {...params} label="Cliente" required error={!!formErrors.client_id} helperText={formErrors.client_id} />
            )}
            noOptionsText={clientsLoading ? 'Carregando clientes...' : 'Nenhum cliente encontrado'}
            loading={clientsLoading}
            slotProps={{ popper: { style: { zIndex: AUTOCOMPLETE_POPPER_Z } } }}
          />

          <TextField label="Marca" value={formData.make} onChange={(e) => handleFormChange('make', e.target.value)} fullWidth disabled={!admin} />
          <TextField label="Modelo" value={formData.model} onChange={(e) => handleFormChange('model', e.target.value)} fullWidth disabled={!admin} />
          <TextField label="Cor" value={formData.color} onChange={(e) => handleFormChange('color', e.target.value)} fullWidth disabled={!admin} />

          <TextField
            label="Ano"
            value={formData.year}
            onChange={(e) => handleFormChange('year', e.target.value)}
            fullWidth
            type="number"
            inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
            disabled={!admin}
          />

          <Box ref={vehicleTypeInputRef} sx={{ position: 'relative' }}>
            <TextField
              fullWidth
              label="Tipo de veículo"
              value={(formData.vehicle_type || 'default').replace(/^\w/, (c) => c.toUpperCase())}
              onClick={() => admin && setVehicleTypeDropdownOpen((prev) => !prev)}
              disabled={!admin}
              inputProps={{ readOnly: true }}
            />
            {vehicleTypeDropdownOpen && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 11002,
                  maxHeight: '220px',
                  overflow: 'auto',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  backgroundColor: colors.surface,
                }}
              >
                {deviceCategories.map((category) => {
                  const isSelected = (formData.vehicle_type || 'default') === category;
                  return (
                    <Box
                      key={category}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleFormChange('vehicle_type', category);
                        setVehicleTypeDropdownOpen(false);
                      }}
                      sx={{
                        px: 1.5,
                        py: 1,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isSelected ? `${colors.primary}20` : 'transparent',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="img" src={mapIcons[mapIconKey(category)]} alt="" sx={{ width: 28, height: 28, objectFit: 'contain' }} />
                        {category}
                      </Box>
                      {isSelected && <CheckIcon sx={{ color: '#10B981', fontSize: 20 }} />}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="textSecondary">Foto do veículo (opcional)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {(previewUrl || formData.foto_veiculo) && (
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={previewUrl || `/api/vehicles/image/${formData.foto_veiculo.replace(/^\/?uploads\//, '')}`}
                    alt="Preview"
                    sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, border: `1px solid ${colors.border}` }}
                  />
                  <IconButton size="small" onClick={handleRemovePhoto} sx={{ position: 'absolute', top: -8, right: -8 }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              <Button variant="outlined" component="label" startIcon={<ImageIcon />} size="small">
                {formData.fotoFile ? 'Alterar foto' : formData.foto_veiculo ? 'Trocar foto' : 'Adicionar foto'}
                <input type="file" accept="image/*" onChange={handleFileChange} hidden />
              </Button>
            </Box>
            {formErrors.foto && <Typography variant="caption" color="error">{formErrors.foto}</Typography>}
          </Box>

          <TextField label="Apelido" value={formData.nickname} onChange={(e) => handleFormChange('nickname', e.target.value)} fullWidth />
          <TextField
            label="Detalhes da instalação"
            value={formData.installation_details}
            onChange={(e) => handleFormChange('installation_details', e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <Autocomplete
            multiple
            options={Array.isArray(availableDevices) ? availableDevices : []}
            loading={availableDevicesLoading}
            getOptionLabel={(option) => `${option?.name || 'Sem nome'} (ID: ${option?.id || 'N/A'})`}
            value={selectedDeviceObjects}
            inputValue={deviceSearchInput}
            onInputChange={(event, value, reason) => {
              if (reason !== 'reset') setDeviceSearchInput(value);
            }}
            onChange={(event, newValue) => {
              const ids = Array.isArray(newValue) ? newValue.map((d) => d?.id).filter((id) => id != null) : [];
              handleFormChange('selectedDeviceIds', ids);
            }}
            disableCloseOnSelect
            renderInput={(params) => (
              <TextField
                {...params}
                label="Rastreador (GPS)"
                placeholder="Selecione um ou mais rastreadores"
                helperText="Ao salvar, os rastreadores associados serão renomeados para PLACA-Modelo e terão o tipo igual ao do veículo."
              />
            )}
            noOptionsText={availableDevicesLoading ? 'Carregando...' : 'Nenhum rastreador disponível'}
            slotProps={{ popper: { style: { zIndex: AUTOCOMPLETE_POPPER_Z } } }}
          />

          {formErrors.global && <Alert severity="error">{formErrors.global}</Alert>}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={uploadingPhoto}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaveDisabled} startIcon={uploadingPhoto ? <CircularProgress size={20} /> : null}>
          {uploadingPhoto ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VehicleFormDialog;
