import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Autocomplete,
  CircularProgress,
  Alert,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import {
  Image as ImageIcon,
  DeleteOutline as DeleteOutlineIcon,
} from '@mui/icons-material';
import { DirectionsCar as DirectionsCarIcon } from '@mui/icons-material';
import { fetchClients, addVehicle, fetchAvailableDevicesForVehicle, fleetActions } from '../../store';
import { useThemeColors } from '../../common/components/ThemeProvider';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { compressImage, validateImageFile } from '../../utils/imageCompression';
import deviceCategories from '../../common/util/deviceCategories';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';

const VehicleRegisterModal = ({ open, onClose, initialClientId, onSuccess }) => {
  const dispatch = useDispatch();
  const t = useTranslation();
  const colorsRaw = useThemeColors();
  const colors = colorsRaw || {
    primary: '#3B82F6',
    secondary: '#F3F4F6',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#9CA3AF',
    border: '#E5E7EB',
    hover: '#F3F4F6',
  };
  const { items: clients } = useSelector((state) => state.clients);
  const { loading, error, availableDevicesForVehicle = [], availableDevicesLoading } = useSelector((state) => state.fleet);

  const [formData, setFormData] = useState({
    plate: '',
    client_id: null,
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
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [vehicleTypeDropdownOpen, setVehicleTypeDropdownOpen] = useState(false);
  const vehicleTypeInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      dispatch(fetchAvailableDevicesForVehicle(null));
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (open && clients.length === 0) {
      dispatch(fetchClients());
    }
  }, [open, clients.length, dispatch]);

  useEffect(() => {
    if (!open) {
      setFormData({
        plate: '',
        client_id: null,
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
      setFormErrors({});
      setSuccessMessage('');
    } else if (initialClientId) {
      setFormData((prev) => ({ ...prev, client_id: initialClientId }));
    }
  }, [open, initialClientId]);

  useEffect(() => {
    if (!open && error) {
      dispatch(fleetActions.clearError());
    }
  }, [open, error, dispatch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vehicleTypeInputRef?.current && !vehicleTypeInputRef.current.contains(event.target)) {
        setVehicleTypeDropdownOpen(false);
      }
    };
    if (vehicleTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [vehicleTypeDropdownOpen]);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    e.target.value = '';
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
    } catch (err) {
      setFormData((prev) => ({ ...prev, fotoFile: file, foto_veiculo: '' }));
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, fotoFile: null, foto_veiculo: '' }));
    setFormErrors((prev) => ({ ...prev, foto: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.plate.trim()) errors.plate = 'Placa é obrigatória';
    if (!formData.client_id) errors.client_id = 'Cliente é obrigatório';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      let fotoPath = formData.foto_veiculo || null;
      if (formData.fotoFile) {
        setUploadingPhoto(true);
        try {
          const fd = new FormData();
          fd.append('file', formData.fotoFile);
          const res = await fetch('/api/vehicles/upload', {
            method: 'POST',
            credentials: 'include',
            body: fd,
          });
          if (res.ok) {
            const { filePath } = await res.json();
            fotoPath = filePath;
          } else {
            throw new Error('Falha no upload da foto');
          }
        } finally {
          setUploadingPhoto(false);
        }
      }

      const vehiclePayload = {
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
      };

      const result = await dispatch(addVehicle(vehiclePayload));

      if (addVehicle.fulfilled.match(result)) {
        const vehicle = result.payload;
        onSuccess?.(vehicle);
        setSuccessMessage('Veículo cadastrado com sucesso!');
        setShowSuccess(true);
        setTimeout(() => {
          onClose?.();
          setShowSuccess(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Erro ao salvar veículo:', err);
    }
  };

  const isSaveDisabled = !formData.plate.trim() || !formData.client_id || loading || uploadingPhoto;
  const selectedClient = clients.find((c) => c.id === formData.client_id) || null;
  const availableDevices = availableDevicesForVehicle || [];
  const selectedDeviceObjects = availableDevices.filter((d) =>
    (formData.selectedDeviceIds || []).includes(d?.id)
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        sx={{ zIndex: 20002 }}
        slotProps={{ root: { sx: { zIndex: 20002 } } }}
        PaperProps={{
          sx: {
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            padding: '24px 24px 20px 24px',
            backgroundColor: colors.surface,
            borderBottom: `1px solid ${colors.border}`,
            color: colors.text,
            fontWeight: 600,
          }}
        >
          <DirectionsCarIcon sx={{ color: colors.primary, fontSize: 28 }} />
          Novo Veículo
        </DialogTitle>
        <DialogContent sx={{ padding: '24px', backgroundColor: colors.surface }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Placa"
              value={formData.plate}
              onChange={(e) => handleFormChange('plate', e.target.value)}
              fullWidth
              required
              error={!!formErrors.plate}
              helperText={formErrors.plate}
              placeholder="ABC-1234"
              autoFocus
            />

            <Autocomplete
              options={Array.isArray(clients) ? clients : []}
              getOptionLabel={(option) => option?.name || ''}
              value={selectedClient}
              onChange={(event, value) => handleFormChange('client_id', value ? value.id : null)}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  required
                  error={!!formErrors.client_id}
                  helperText={formErrors.client_id || 'Selecione o cliente dono do veículo'}
                  placeholder={clients.length === 0 ? 'Carregando clientes...' : 'Pesquisar cliente...'}
                  sx={{
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
                  }}
                />
              )}
              slotProps={{ popper: { style: { zIndex: 20003 } } }}
              noOptionsText={clients.length === 0 ? 'Carregando clientes...' : 'Nenhum cliente encontrado'}
              disabled={clients.length === 0 || !!initialClientId}
              loading={clients.length === 0}
            />

            <TextField
              label="Marca"
              value={formData.make}
              onChange={(e) => handleFormChange('make', e.target.value)}
              fullWidth
              placeholder="Ex: Volvo, Scania, Mercedes"
            />

            <TextField
              label="Modelo"
              value={formData.model}
              onChange={(e) => handleFormChange('model', e.target.value)}
              fullWidth
              placeholder="Ex: FH 540, R 450"
            />

            <TextField
              label="Cor"
              value={formData.color}
              onChange={(e) => handleFormChange('color', e.target.value)}
              fullWidth
              placeholder="Ex: Branco, Azul, Vermelho"
            />

            <TextField
              label="Ano"
              value={formData.year}
              onChange={(e) => handleFormChange('year', e.target.value)}
              fullWidth
              type="number"
              inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
              placeholder="Ex: 2020"
            />

            <Box ref={vehicleTypeInputRef} sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                label="Tipo de veículo"
                value={t(`category${(formData.vehicle_type || 'default').replace(/^\w/, (c) => c.toUpperCase())}`)}
                onClick={() => setVehicleTypeDropdownOpen(!vehicleTypeDropdownOpen)}
                readOnly
                size="small"
                InputProps={{
                  startAdornment: (
                    <Box
                      component="img"
                      src={mapIcons[mapIconKey(formData.vehicle_type || 'default')]}
                      alt=""
                      sx={{
                        width: formData.vehicle_type === 'tag' ? '44px' : '32px',
                        height: formData.vehicle_type === 'tag' ? '44px' : '32px',
                        objectFit: 'contain',
                        mr: 1,
                      }}
                    />
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': { backgroundColor: colors.secondary },
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: colors.primary },
                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                }}
              />
              {vehicleTypeDropdownOpen && (
                <Box
                  sx={{
                    position: 'fixed',
                    zIndex: 20004,
                    maxHeight: '220px',
                    overflow: 'auto',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    backgroundColor: colors.surface,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    left: vehicleTypeInputRef?.current?.getBoundingClientRect?.()?.left ?? 0,
                    top: (vehicleTypeInputRef?.current?.getBoundingClientRect?.()?.bottom ?? 0) + 4,
                    width: Math.max(vehicleTypeInputRef?.current?.getBoundingClientRect?.()?.width ?? 200, 200),
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
                          color: colors.text,
                          fontSize: '14px',
                          borderBottom: `1px solid ${colors.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: isSelected ? `${colors.primary}20` : 'transparent',
                          '&:hover': { backgroundColor: colors.hover },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            component="img"
                            src={mapIcons[mapIconKey(category)]}
                            alt=""
                            sx={{
                              width: category === 'tag' ? 56 : 40,
                              height: category === 'tag' ? 56 : 40,
                              objectFit: 'contain',
                            }}
                          />
                          {t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`)}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Foto do veículo (opcional)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                {(formData.fotoFile || formData.foto_veiculo) && (
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={
                        formData.fotoFile
                          ? URL.createObjectURL(formData.fotoFile)
                          : formData.foto_veiculo
                            ? `/api/vehicles/image/${formData.foto_veiculo.replace(/^\/?uploads\//, '')}`
                            : null
                      }
                      alt="Preview"
                      sx={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: `1px solid ${colors.border}`,
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemovePhoto}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        '&:hover': { backgroundColor: colors.hover },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                  size="small"
                  color={formData.fotoFile || formData.foto_veiculo ? 'success' : 'primary'}
                >
                  {formData.fotoFile ? `Foto: ${formData.fotoFile.name.substring(0, 15)}...` : formData.foto_veiculo ? 'Alterar foto' : 'Adicionar foto'}
                  <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                </Button>
              </Box>
              {formErrors.foto && (
                <Typography variant="caption" color="error">
                  {formErrors.foto}
                </Typography>
              )}
            </Box>

            <TextField
              label="Apelido"
              value={formData.nickname}
              onChange={(e) => handleFormChange('nickname', e.target.value)}
              fullWidth
              placeholder="Ex: Caminhão do João"
            />

            <TextField
              label="Detalhes da instalação"
              value={formData.installation_details}
              onChange={(e) => handleFormChange('installation_details', e.target.value)}
              fullWidth
              multiline
              minRows={2}
              placeholder="Observações sobre a instalação do rastreador..."
            />

            <Autocomplete
              multiple
              options={availableDevices}
              loading={availableDevicesLoading}
              getOptionLabel={(option) => `${option?.name || 'Sem nome'} (ID: ${option?.id || 'N/A'})`}
              value={selectedDeviceObjects}
              onChange={(event, newValue) => {
                const ids = Array.isArray(newValue) ? newValue.map((d) => d?.id).filter((id) => id != null) : [];
                handleFormChange('selectedDeviceIds', ids);
              }}
              disableCloseOnSelect
              slotProps={{ popper: { style: { zIndex: 20003 } } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Rastreador (GPS)"
                  placeholder="Digite para buscar ou selecione um ou mais rastreadores"
                  helperText="Opcional: Digite para buscar por nome ou ID. Apenas equipamentos não vinculados a outros veículos podem ser adicionados."
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={availableDevicesLoading ? 'Carregando...' : 'Nenhum rastreador disponível'}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            padding: '16px 24px',
            backgroundColor: colors.surface,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <Button onClick={onClose} disabled={loading} sx={{ color: colors.textSecondary }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaveDisabled}
            startIcon={loading || uploadingPhoto ? <CircularProgress size={20} /> : null}
            sx={{
              backgroundColor: colors.primary,
              '&:hover': { backgroundColor: colors.primaryDark || '#2563EB' },
            }}
          >
            {loading || uploadingPhoto ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: 20005 }}
      >
        <Alert severity="success" onClose={() => setShowSuccess(false)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default VehicleRegisterModal;
