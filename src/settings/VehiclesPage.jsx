import { useState, useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Image as ImageIcon,
  DeleteOutline as DeleteOutlineIcon,
  Check as CheckIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { fetchVehicles, fetchAvailableDevicesForVehicle, addVehicle, updateVehicle, deleteVehicle, fleetActions } from '../store';
import { fetchClients } from '../store';
import { fetchAllDevices } from '../store';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import TableShimmer from '../common/components/TableShimmer';
import useSettingsStyles from './common/useSettingsStyles';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAdministrator } from '../common/util/permissions';
import { DirectionsCar as DirectionsCarIcon } from '@mui/icons-material';
import { compressImage, validateImageFile } from '../utils/imageCompression';
import deviceCategories from '../common/util/deviceCategories';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import { vehicleTypeToIcon } from '../common/util/vehicleTypeIcon';
import VehicleDetailsModal from './components/VehicleDetailsModal';
import DeviceStatusIcons from './components/DeviceStatusIcons';

const VehiclesPage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();
  const admin = useAdministrator();
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
  const dispatch = useDispatch();
  const { vehicles, loading, error, availableDevicesForVehicle = [], availableDevicesLoading } = useSelector((state) => state.fleet);
  const { items: clients } = useSelector((state) => state.clients);
  const { allDevices = [] } = useSelector((state) => state.devices || {});
  const positions = useSelector((state) => state.session.positions || {});

  // Estado local
  const [openDialog, setOpenDialog] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsVehicle, setDetailsVehicle] = useState(null);
  const [formData, setFormData] = useState({
    plate: '',
    client_id: '',
    make: '',
    model: '',
    color: '',
    year: '',
    vehicle_type: '',
    nickname: '',
    installation_details: '',
    foto_veiculo: '',
    fotoFile: null,
    selectedDeviceIds: [],
  });
  const [formErrors, setFormErrors] = useState({});
  const [deviceSearchInput, setDeviceSearchInput] = useState('');
  const deviceInputRef = useRef('');
  const [keyword, setKeyword] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [vehicleTypeDropdownOpen, setVehicleTypeDropdownOpen] = useState(false);
  const vehicleTypeInputRef = useRef(null);

  // Dispositivos disponíveis para vincular (vindos da API - apenas não associados a outros veículos)
  const availableDevices = availableDevicesForVehicle;

  // Dispositivos para exibir no value do Autocomplete (merge: disponíveis + allDevices para IDs selecionados)
  const selectedDeviceObjects = useMemo(() => {
    const ids = formData.selectedDeviceIds || [];
    if (ids.length === 0) return [];
    const fromAvail = (Array.isArray(availableDevicesForVehicle) ? availableDevicesForVehicle : []).filter((d) => d && ids.includes(d.id));
    const fromAll = (Array.isArray(allDevices) ? allDevices : []).filter((d) => d && ids.includes(d.id) && !fromAvail.some((a) => a.id === d.id));
    return [...fromAvail, ...fromAll];
  }, [formData.selectedDeviceIds, availableDevicesForVehicle, allDevices]);

  // Veículos filtrados por busca (placa, marca, modelo, cliente, nome/IMEI do rastreador)
  const filteredVehicles = useMemo(() => {
    const list = Array.isArray(vehicles) ? vehicles : [];
    if (!keyword || !keyword.trim()) return list;
    const lowerKeyword = keyword.trim().toLowerCase();
    const devicesList = Array.isArray(allDevices) ? allDevices : [];
    return list.filter((vehicle) => {
      const plateMatch = (vehicle?.plate || '').toLowerCase().includes(lowerKeyword);
      const nicknameMatch = (vehicle?.nickname || '').toLowerCase().includes(lowerKeyword);
      const makeMatch = (vehicle?.make || '').toLowerCase().includes(lowerKeyword);
      const modelMatch = (vehicle?.model || '').toLowerCase().includes(lowerKeyword);
      const clientMatch = (vehicle?.client_name || '').toLowerCase().includes(lowerKeyword);
      const deviceIds =
        vehicle?.deviceIds && Array.isArray(vehicle.deviceIds)
          ? vehicle.deviceIds
          : vehicle?.devices && Array.isArray(vehicle.devices)
            ? vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
            : vehicle?.device_id != null
              ? [vehicle.device_id]
              : [];
      const deviceMatch = deviceIds.some((deviceId) => {
        const device = devicesList.find((d) => d && d.id === deviceId);
        if (!device) return false;
        return (
          (device.name || '').toLowerCase().includes(lowerKeyword) ||
          (device.uniqueId || '').toLowerCase().includes(lowerKeyword)
        );
      });
      return plateMatch || nicknameMatch || makeMatch || modelMatch || clientMatch || deviceMatch;
    });
  }, [vehicles, allDevices, keyword]);

  // Buscar veículos e dispositivos ao montar
  useEffect(() => {
    dispatch(fetchVehicles());
    dispatch(fetchAllDevices());
  }, [dispatch]);

  // Buscar dispositivos disponíveis (livres) quando o dialog de veículo abrir
  useEffect(() => {
    if (openDialog) {
      dispatch(fetchAvailableDevicesForVehicle(editingVehicleId));
    }
  }, [openDialog, editingVehicleId, dispatch]);

  // Buscar clientes ao montar e quando o dialog abrir
  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  // Buscar clientes quando o dialog abrir se a lista estiver vazia
  useEffect(() => {
    if (openDialog && clients.length === 0) {
      dispatch(fetchClients());
    }
  }, [openDialog, clients.length, dispatch]);

  // Limpar erro ao fechar dialog
  useEffect(() => {
    if (!openDialog && error) {
      dispatch(fleetActions.clearError());
    }
  }, [openDialog, error, dispatch]);

  // Fechar dropdown de tipo ao clicar fora
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

  // Handler para abrir dialog (novo veículo)
  const handleOpenDialog = () => {
    setEditingVehicleId(null);
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
    setFormErrors({});
    setOpenDialog(true);
    dispatch(fleetActions.clearError());
  };

  // Handler para editar veículo
  const handleEditVehicle = (vehicle) => {
    setEditingVehicleId(vehicle.id);
    setFormData({
      plate: vehicle.plate || '',
      client_id: vehicle.client_id || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      color: vehicle.color || '',
      year: vehicle.year || '',
      vehicle_type: (vehicle.vehicle_type && deviceCategories.includes(vehicle.vehicle_type) ? vehicle.vehicle_type : vehicleTypeToIcon(vehicle.vehicle_type) || 'default'),
      nickname: vehicle.nickname || '',
      installation_details: vehicle.installation_details || '',
      foto_veiculo: vehicle.foto_veiculo || '',
      fotoFile: null,
      selectedDeviceIds: (vehicle.deviceIds && Array.isArray(vehicle.deviceIds))
        ? vehicle.deviceIds.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
        : (vehicle.devices && Array.isArray(vehicle.devices))
          ? vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
          : (vehicle.device_id != null ? [vehicle.device_id] : []),
    });
    setFormErrors({});
    setDeviceSearchInput('');
    deviceInputRef.current = '';
    setOpenDialog(true);
    dispatch(fleetActions.clearError());
  };

  // Handler para fechar dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingVehicleId(null);
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
    setFormErrors({});
    setDeviceSearchInput('');
    deviceInputRef.current = '';
    dispatch(fleetActions.clearError());
  };

  // Handler para abrir diálogo de confirmação de exclusão
  const handleOpenDeleteConfirmation = (vehicleId) => {
    setItemToDeleteId(vehicleId);
    setDeleteConfirmationOpen(true);
  };

  // Handler para fechar diálogo de confirmação
  const handleCloseDeleteConfirmation = () => {
    setDeleteConfirmationOpen(false);
    setItemToDeleteId(null);
  };

  // Handler para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!itemToDeleteId) return;
    
    try {
      const result = await dispatch(deleteVehicle(itemToDeleteId));
      if (deleteVehicle.fulfilled.match(result)) {
        handleCloseDeleteConfirmation();
        // A lista já é atualizada automaticamente pelo Redux
      }
    } catch (err) {
      console.error('Erro ao deletar veículo:', err);
    }
  };

  // Handler para mudanças no formulário
  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Validação do formulário
  const validateForm = () => {
    const errors = {};
    if (!formData.plate.trim()) {
      errors.plate = 'Placa é obrigatória';
    }
    if (!formData.client_id) {
      errors.client_id = 'Cliente é obrigatório';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handler para seleção de foto
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

  // Handler para remover foto
  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, fotoFile: null, foto_veiculo: '' }));
    setFormErrors((prev) => ({ ...prev, foto: '' }));
  };

  // Handler para salvar veículo
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

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
            const errBody = await res.text();
            console.error('Upload foto falhou:', res.status, errBody);
            throw new Error(`Falha no upload da foto (${res.status})`);
          }
        } finally {
          setUploadingPhoto(false);
        }
      }

      const vehicleData = {
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

      let result;
      if (editingVehicleId) {
        // Atualizar veículo existente
        result = await dispatch(updateVehicle({
          id: editingVehicleId,
          vehicleData,
        }));
        if (updateVehicle.fulfilled.match(result)) {
          handleCloseDialog();
          dispatch(fetchVehicles());
        }
      } else {
        // Criar novo veículo
        result = await dispatch(addVehicle(vehicleData));
        if (addVehicle.fulfilled.match(result)) {
          handleCloseDialog();
          dispatch(fetchVehicles());
        }
      }
    } catch (err) {
      // Erro já é tratado pelo Redux
      console.error('Erro ao salvar veículo:', err);
    }
  };

  // Verificar se o botão salvar deve estar desabilitado
  const isSaveDisabled = !formData.plate.trim() || !formData.client_id || loading || uploadingPhoto;

  const content = (
    <Box sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          {/* Cabeçalho com botão Novo Veículo */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Cadastro de Veículos
            </Typography>
            {admin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              Novo Veículo
            </Button>
            )}
          </Box>

          {/* Mensagem de erro geral */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(fleetActions.clearError())}>
              {error}
            </Alert>
          )}

          {/* Busca por placa, modelo, cliente ou rastreador */}
          <TextField
            fullWidth
            placeholder="Buscar por placa, modelo, nome do rastreador ou IMEI..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            size="small"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Tabela de veículos */}
          <TableContainer>
            <Table className={classes.table}>
              <TableHead>
                <TableRow>
                  <TableCell>Placa</TableCell>
                  <TableCell>Apelido</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Marca</TableCell>
                  <TableCell>Modelo</TableCell>
                  <TableCell>Ano</TableCell>
                  <TableCell>Tipo de veículo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && vehicles.length === 0 ? (
                  <TableShimmer columns={9} />
                ) : error && vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Alert severity="error">{error}</Alert>
                    </TableCell>
                  </TableRow>
                ) : filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {keyword.trim() ? 'Nenhum veículo corresponde à busca' : 'Nenhum veículo encontrado'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => {
                    // Fonte de dados: deviceIds (array) ou devices (array de {id}) ou fallback device_id
                    const rawIds = (vehicle.deviceIds && Array.isArray(vehicle.deviceIds) && vehicle.deviceIds.length > 0)
                      ? vehicle.deviceIds
                      : (vehicle.devices && Array.isArray(vehicle.devices))
                        ? vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
                        : (vehicle.device_id != null ? [vehicle.device_id] : []);
                    const deviceIds = Array.isArray(rawIds) ? rawIds : [];
                    const safeAllDevices = Array.isArray(allDevices) ? allDevices : [];
                    const associatedDevices = deviceIds
                      .map((id) => safeAllDevices.find((d) => d && d.id === id))
                      .filter(Boolean);
                    
                    return (
                    <TableRow key={vehicle?.id || Math.random()}>
                      <TableCell>{(vehicle?.plate || '').toString()}</TableCell>
                      <TableCell>{(vehicle?.nickname || '-').toString()}</TableCell>
                      <TableCell>{(vehicle?.client_name || '-').toString()}</TableCell>
                      <TableCell>{(vehicle?.make || '-').toString()}</TableCell>
                      <TableCell>{(vehicle?.model || '-').toString()}</TableCell>
                      <TableCell>{(vehicle?.year || '-').toString()}</TableCell>
                      <TableCell>
                        {(() => {
                          const vt = (vehicle?.vehicle_type && deviceCategories.includes(vehicle.vehicle_type))
                            ? vehicle.vehicle_type
                            : vehicleTypeToIcon(vehicle?.vehicle_type) || 'default';
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box
                                component="img"
                                src={mapIcons[mapIconKey(vt)]}
                                alt=""
                                sx={{ width: 24, height: 24, objectFit: 'contain' }}
                              />
                              <Typography variant="body2">
                                {t(`category${String(vt).replace(/^\w/, (c) => c.toUpperCase())}`)}
                              </Typography>
                            </Box>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const mostRecentDevice = associatedDevices.reduce((best, dev) => {
                            const pos = positions?.[dev.id];
                            if (!pos) return best;
                            if (!best) return dev;
                            const bestPos = positions?.[best.id];
                            if (!bestPos) return dev;
                            return new Date(pos.fixTime) > new Date(bestPos.fixTime) ? dev : best;
                          }, null);
                          return mostRecentDevice ? (
                            <DeviceStatusIcons position={positions[mostRecentDevice.id]} />
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Ver detalhes" arrow>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setDetailsVehicle(vehicle);
                                setDetailsModalOpen(true);
                              }}
                              sx={{
                                color: '#10B981',
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                border: '1.5px solid rgba(16, 185, 129, 0.5)',
                                borderRadius: '6px',
                                padding: '6px',
                                minWidth: '32px',
                                minHeight: '32px',
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar veículo" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleEditVehicle(vehicle)}
                              sx={{
                                color: '#3B82F6',
                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                border: '1.5px solid rgba(59, 130, 246, 0.5)',
                                borderRadius: '6px',
                                padding: '6px',
                                minWidth: '32px',
                                minHeight: '32px',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.25)',
                                  border: '1.5px solid rgba(59, 130, 246, 0.8)',
                                  color: '#2563EB',
                                  transform: 'scale(1.1)',
                                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {admin && (
                            <Tooltip title="Excluir veículo" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDeleteConfirmation(vehicle.id)}
                                color="error"
                                sx={{
                                  borderRadius: '6px',
                                  padding: '6px',
                                  minWidth: '32px',
                                  minHeight: '32px',
                                  '&:hover': {
                                    transform: 'scale(1.1)',
                                    boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)',
                                  },
                                  transition: 'all 0.2s ease-in-out',
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Dialog de formulário */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          sx={{ zIndex: 11000 }}
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
            {editingVehicleId ? 'Editar Veículo' : 'Novo Veículo'}
          </DialogTitle>
          <DialogContent sx={{ 
            padding: '24px',
            backgroundColor: colors.surface,
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              {/* Campo Placa */}
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
                disabled={!admin}
              />

              {/* Campo Cliente */}
              <Autocomplete
                disabled={!admin}
                options={Array.isArray(clients) ? clients : []}
                getOptionLabel={(option) => option?.name || ''}
                value={(Array.isArray(clients) ? clients : []).find((c) => c?.id === formData.client_id) || null}
                onChange={(event, value) => {
                  handleFormChange('client_id', value ? value.id : '');
                }}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cliente"
                    required
                    placeholder="Pesquisar cliente..."
                    error={!!formErrors.client_id}
                    helperText={formErrors.client_id}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: colors.secondary,
                        color: colors.text,
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
                componentsProps={{
                  popper: {
                    style: { zIndex: 11001 },
                    sx: {
                      '& .MuiAutocomplete-paper': {
                        backgroundColor: colors.surface,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      },
                      '& .MuiAutocomplete-option': {
                        color: colors.text,
                        '&:hover': { backgroundColor: colors.hover },
                        '&[aria-selected="true"]': {
                          backgroundColor: `${colors.primary}20`,
                          color: colors.primary,
                        },
                      },
                    },
                  },
                }}
                noOptionsText={clients.length === 0 ? 'Carregando clientes...' : 'Nenhum cliente encontrado'}
                loading={clients.length === 0}
              />

              {/* Campo Marca */}
              <TextField
                label="Marca"
                value={formData.make}
                onChange={(e) => handleFormChange('make', e.target.value)}
                fullWidth
                placeholder="Ex: Volvo"
                disabled={!admin}
              />

              {/* Campo Modelo */}
              <TextField
                label="Modelo"
                value={formData.model}
                onChange={(e) => handleFormChange('model', e.target.value)}
                fullWidth
                placeholder="Ex: FH 540"
                disabled={!admin}
              />

              {/* Campo Cor */}
              <TextField
                label="Cor"
                value={formData.color}
                onChange={(e) => handleFormChange('color', e.target.value)}
                fullWidth
                placeholder="Ex: Branco"
                disabled={!admin}
              />

              {/* Campo Ano */}
              <TextField
                label="Ano"
                value={formData.year}
                onChange={(e) => handleFormChange('year', e.target.value)}
                fullWidth
                type="number"
                placeholder="Ex: 2023"
                inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
                disabled={!admin}
              />

              {/* Campo Tipo de veículo (categorias Traccar) */}
              <Box ref={vehicleTypeInputRef} sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  label="Tipo de veículo"
                  value={t(`category${(formData.vehicle_type || 'default').replace(/^\w/, (c) => c.toUpperCase())}`)}
                  onClick={() => admin && setVehicleTypeDropdownOpen(!vehicleTypeDropdownOpen)}
                  disabled={!admin}
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
                      zIndex: 11002,
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
                          {isSelected && <CheckIcon sx={{ color: '#10B981', fontSize: 20 }} />}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>

              {/* Campo Foto do veículo */}
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

              {/* Campo Apelido */}
              <TextField
                label="Apelido"
                value={formData.nickname}
                onChange={(e) => handleFormChange('nickname', e.target.value)}
                fullWidth
                placeholder="Ex: Caminhão do João"
              />

              {admin && (
              <>
              {/* Campo Detalhes da instalação */}
              <TextField
                label="Detalhes da instalação"
                value={formData.installation_details}
                onChange={(e) => handleFormChange('installation_details', e.target.value)}
                fullWidth
                multiline
                minRows={2}
                placeholder="Observações sobre a instalação do rastreador..."
              />

              {/* Campo Rastreador (GPS) */}
              <Autocomplete
                multiple
                options={availableDevices}
                loading={availableDevicesLoading}
                getOptionLabel={(option) => `${option?.name || 'Sem nome'} (ID: ${option?.id || 'N/A'})`}
                value={selectedDeviceObjects}
                inputValue={deviceSearchInput}
                onInputChange={(event, newInputValue, reason) => {
                  // Atualizar sempre que o usuário digitar
                  if (reason === 'input') {
                    deviceInputRef.current = newInputValue;
                    setDeviceSearchInput(newInputValue);
                  } else if (reason === 'clear') {
                    deviceInputRef.current = '';
                    setDeviceSearchInput('');
                  }
                  // Ignorar 'reset' para manter o texto digitado
                }}
                onChange={(event, newValue) => {
                  const ids = Array.isArray(newValue) ? newValue.map(d => d?.id).filter(id => id != null) : [];
                  handleFormChange('selectedDeviceIds', ids);
                  // Restaurar o texto digitado após selecionar
                  if (deviceInputRef.current) {
                    setDeviceSearchInput(deviceInputRef.current);
                  }
                }}
                disableCloseOnSelect
                clearOnBlur={false}
                selectOnFocus={false}
                filterOptions={(options, state) => {
                  const inputValue = (state.inputValue || '').toLowerCase();
                  if (!inputValue) return options;
                  return options.filter((option) =>
                    (option?.name || '').toLowerCase().includes(inputValue) ||
                    (option?.uniqueId || '').toLowerCase().includes(inputValue)
                  );
                }}
                componentsProps={{
                  popper: {
                    style: { zIndex: 11001 },
                    sx: {
                      '& .MuiAutocomplete-paper': {
                        backgroundColor: colors.surface,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      },
                      '& .MuiAutocomplete-option': {
                        color: colors.text,
                        '&:hover': {
                          backgroundColor: colors.hover,
                        },
                        '&[aria-selected="true"]': {
                          backgroundColor: `${colors.primary}20`,
                          color: colors.primary,
                        },
                      },
                    },
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Rastreador (GPS)"
                    placeholder="Digite para buscar ou selecione um ou mais rastreadores"
                    helperText="Opcional: Digite para buscar por nome ou ID. Apenas equipamentos não vinculados a outros veículos podem ser adicionados."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: colors.secondary,
                        color: colors.text,
                        '& fieldset': {
                          borderColor: colors.border,
                        },
                        '&:hover fieldset': {
                          borderColor: colors.primary,
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: colors.primary,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: colors.textSecondary,
                        '&.Mui-focused': {
                          color: colors.primary,
                        },
                      },
                    }}
                  />
                )}
                renderOption={(props, option, { selected }) => {
                  const { key, ...rest } = props;
                  return (
                    <li key={key} {...rest} style={{ color: colors.text }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{option?.name || 'Sem nome'}</span>
                        <span style={{ fontSize: '0.8em', color: colors.textSecondary || 'gray' }}>
                          IMEI: {(option?.uniqueId || option?.id) ?? '—'}
                        </span>
                      </Box>
                    </li>
                  );
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                noOptionsText={availableDevicesLoading ? 'Carregando...' : 'Nenhum rastreador disponível'}
              />
              </>
              )}

              {/* Mensagem de erro do Redux */}
              {error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ 
            padding: '16px 24px',
            backgroundColor: colors.surface,
            borderTop: `1px solid ${colors.border}`,
          }}>
            <Button 
              onClick={handleCloseDialog} 
              disabled={loading}
              sx={{ color: colors.textSecondary }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={isSaveDisabled}
              startIcon={loading ? <CircularProgress size={20} /> : null}
              sx={{
                backgroundColor: colors.primary,
                '&:hover': {
                  backgroundColor: colors.primaryDark,
                },
              }}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de confirmação de exclusão */}
        <Dialog
          open={deleteConfirmationOpen}
          onClose={handleCloseDeleteConfirmation}
          sx={{ zIndex: 12000 }}
          PaperProps={{
            sx: {
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              zIndex: 12000,
            },
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            padding: '24px 24px 20px 24px',
            backgroundColor: colors.surface,
            borderBottom: `1px solid ${colors.border}`,
            color: colors.text,
            fontWeight: 600,
          }}>
            Confirmar Exclusão
          </DialogTitle>
          <DialogContent sx={{ 
            padding: '24px',
            backgroundColor: colors.surface,
          }}>
            <Typography sx={{ color: colors.text }}>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ 
            padding: '16px 24px',
            backgroundColor: colors.surface,
            borderTop: `1px solid ${colors.border}`,
          }}>
            <Button 
              onClick={handleCloseDeleteConfirmation} 
              disabled={loading}
              sx={{ color: colors.textSecondary }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogActions>
        </Dialog>
        <VehicleDetailsModal
          open={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setDetailsVehicle(null);
          }}
          vehicle={detailsVehicle}
        />
      </Box>
  );

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Cadastro de Veículos']}>
      {content}
    </PageLayout>
  );
};

export default VehiclesPage;

// Exportar também o conteúdo para uso em popovers
export const VehiclesContent = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();
  const admin = useAdministrator();
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
  const dispatch = useDispatch();
  const { vehicles, loading, error, availableDevicesForVehicle = [], availableDevicesLoading } = useSelector((state) => state.fleet);
  const { items: clients } = useSelector((state) => state.clients);
  const { allDevices = [] } = useSelector((state) => state.devices || {});
  const positions = useSelector((state) => state.session.positions || {});

  // Estado local
  const [openDialog, setOpenDialog] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsVehicle, setDetailsVehicle] = useState(null);
  const [formData, setFormData] = useState({
    plate: '',
    client_id: '',
    make: '',
    model: '',
    color: '',
    year: '',
    vehicle_type: '',
    nickname: '',
    installation_details: '',
    foto_veiculo: '',
    fotoFile: null,
    selectedDeviceIds: [],
  });
  const [formErrors, setFormErrors] = useState({});
  const [deviceSearchInput, setDeviceSearchInput] = useState('');
  const deviceInputRef = useRef('');
  const [keyword, setKeyword] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [vehicleTypeDropdownOpen, setVehicleTypeDropdownOpen] = useState(false);
  const vehicleTypeInputRef = useRef(null);

  // Dispositivos disponíveis para vincular (vindos da API - apenas não associados a outros veículos)
  const availableDevices = availableDevicesForVehicle;

  // Dispositivos para exibir no value do Autocomplete (merge: disponíveis + allDevices para IDs selecionados)
  const selectedDeviceObjects = useMemo(() => {
    const ids = formData.selectedDeviceIds || [];
    if (ids.length === 0) return [];
    const fromAvail = (Array.isArray(availableDevicesForVehicle) ? availableDevicesForVehicle : []).filter((d) => d && ids.includes(d.id));
    const fromAll = (Array.isArray(allDevices) ? allDevices : []).filter((d) => d && ids.includes(d.id) && !fromAvail.some((a) => a.id === d.id));
    return [...fromAvail, ...fromAll];
  }, [formData.selectedDeviceIds, availableDevicesForVehicle, allDevices]);

  // Veículos filtrados por busca (placa, marca, modelo, cliente, nome/IMEI do rastreador)
  const filteredVehicles = useMemo(() => {
    const list = Array.isArray(vehicles) ? vehicles : [];
    if (!keyword || !keyword.trim()) return list;
    const lowerKeyword = keyword.trim().toLowerCase();
    const devicesList = Array.isArray(allDevices) ? allDevices : [];
    return list.filter((vehicle) => {
      const plateMatch = (vehicle?.plate || '').toLowerCase().includes(lowerKeyword);
      const nicknameMatch = (vehicle?.nickname || '').toLowerCase().includes(lowerKeyword);
      const makeMatch = (vehicle?.make || '').toLowerCase().includes(lowerKeyword);
      const modelMatch = (vehicle?.model || '').toLowerCase().includes(lowerKeyword);
      const clientMatch = (vehicle?.client_name || '').toLowerCase().includes(lowerKeyword);
      const deviceIds =
        vehicle?.deviceIds && Array.isArray(vehicle.deviceIds)
          ? vehicle.deviceIds
          : vehicle?.devices && Array.isArray(vehicle.devices)
            ? vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
            : vehicle?.device_id != null
              ? [vehicle.device_id]
              : [];
      const deviceMatch = deviceIds.some((deviceId) => {
        const device = devicesList.find((d) => d && d.id === deviceId);
        if (!device) return false;
        return (
          (device.name || '').toLowerCase().includes(lowerKeyword) ||
          (device.uniqueId || '').toLowerCase().includes(lowerKeyword)
        );
      });
      return plateMatch || nicknameMatch || makeMatch || modelMatch || clientMatch || deviceMatch;
    });
  }, [vehicles, allDevices, keyword]);

  // Buscar veículos, clientes e dispositivos ao montar
  useEffect(() => {
    dispatch(fetchVehicles());
    dispatch(fetchClients());
    dispatch(fetchAllDevices());
  }, [dispatch]);

  // Buscar dispositivos disponíveis (livres) quando o dialog de veículo abrir
  useEffect(() => {
    if (openDialog) {
      dispatch(fetchAvailableDevicesForVehicle(editingVehicleId));
    }
  }, [openDialog, editingVehicleId, dispatch]);

  // Buscar clientes quando o dialog abrir se a lista estiver vazia
  useEffect(() => {
    if (openDialog && clients.length === 0) {
      dispatch(fetchClients());
    }
  }, [openDialog, clients.length, dispatch]);

  // Limpar erro ao fechar dialog
  useEffect(() => {
    if (!openDialog && error) {
      dispatch(fleetActions.clearError());
    }
  }, [openDialog, error, dispatch]);

  // Fechar dropdown de tipo ao clicar fora
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

  // Handler para abrir dialog (novo veículo)
  const handleOpenDialog = () => {
    setEditingVehicleId(null);
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
    setFormErrors({});
    setOpenDialog(true);
    dispatch(fleetActions.clearError());
  };

  // Handler para editar veículo
  const handleEditVehicle = (vehicle) => {
    setEditingVehicleId(vehicle.id);
    setFormData({
      plate: vehicle.plate || '',
      client_id: vehicle.client_id || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      color: vehicle.color || '',
      year: vehicle.year || '',
      vehicle_type: (vehicle.vehicle_type && deviceCategories.includes(vehicle.vehicle_type) ? vehicle.vehicle_type : vehicleTypeToIcon(vehicle.vehicle_type) || 'default'),
      nickname: vehicle.nickname || '',
      installation_details: vehicle.installation_details || '',
      foto_veiculo: vehicle.foto_veiculo || '',
      fotoFile: null,
      selectedDeviceIds: (vehicle.deviceIds && Array.isArray(vehicle.deviceIds))
        ? vehicle.deviceIds.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
        : (vehicle.devices && Array.isArray(vehicle.devices))
          ? vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
          : (vehicle.device_id != null ? [vehicle.device_id] : []),
    });
    setFormErrors({});
    setDeviceSearchInput('');
    deviceInputRef.current = '';
    setOpenDialog(true);
    dispatch(fleetActions.clearError());
  };

  // Handler para fechar dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingVehicleId(null);
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
    setFormErrors({});
    setDeviceSearchInput('');
    deviceInputRef.current = '';
    dispatch(fleetActions.clearError());
  };

  // Handler para abrir diálogo de confirmação de exclusão
  const handleOpenDeleteConfirmation = (vehicleId) => {
    setItemToDeleteId(vehicleId);
    setDeleteConfirmationOpen(true);
  };

  // Handler para fechar diálogo de confirmação
  const handleCloseDeleteConfirmation = () => {
    setDeleteConfirmationOpen(false);
    setItemToDeleteId(null);
  };

  // Handler para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!itemToDeleteId) return;
    
    try {
      const result = await dispatch(deleteVehicle(itemToDeleteId));
      if (deleteVehicle.fulfilled.match(result)) {
        handleCloseDeleteConfirmation();
        // A lista já é atualizada automaticamente pelo Redux
      }
    } catch (err) {
      console.error('Erro ao deletar veículo:', err);
    }
  };

  // Handler para mudanças no formulário
  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Validação do formulário
  const validateForm = () => {
    const errors = {};
    if (!formData.plate.trim()) {
      errors.plate = 'Placa é obrigatória';
    }
    if (!formData.client_id) {
      errors.client_id = 'Cliente é obrigatório';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handler para seleção de foto
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

  // Handler para remover foto
  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, fotoFile: null, foto_veiculo: '' }));
    setFormErrors((prev) => ({ ...prev, foto: '' }));
  };

  // Handler para salvar veículo
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

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
            const errBody = await res.text();
            console.error('Upload foto falhou:', res.status, errBody);
            throw new Error(`Falha no upload da foto (${res.status})`);
          }
        } finally {
          setUploadingPhoto(false);
        }
      }

      const vehicleData = {
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

      let result;
      if (editingVehicleId) {
        // Atualizar veículo existente
        result = await dispatch(updateVehicle({
          id: editingVehicleId,
          vehicleData,
        }));
        if (updateVehicle.fulfilled.match(result)) {
          handleCloseDialog();
          dispatch(fetchVehicles());
        }
      } else {
        // Criar novo veículo
        result = await dispatch(addVehicle(vehicleData));
        if (addVehicle.fulfilled.match(result)) {
          handleCloseDialog();
          dispatch(fetchVehicles());
        }
      }
    } catch (err) {
      // Erro já é tratado pelo Redux
      console.error('Erro ao salvar veículo:', err);
    }
  };

  // Verificar se o botão salvar deve estar desabilitado
  const isSaveDisabled = !formData.plate.trim() || !formData.client_id || loading || uploadingPhoto;

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {/* Cabeçalho com botão Novo Veículo */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Cadastro de Veículos
          </Typography>
          {admin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Novo Veículo
          </Button>
          )}
        </Box>

        {/* Mensagem de erro geral */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(fleetActions.clearError())}>
            {error}
          </Alert>
        )}

        {/* Busca por placa, modelo, cliente ou rastreador */}
        <TextField
          fullWidth
          placeholder="Buscar por placa, modelo, nome do rastreador ou IMEI..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          size="small"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {/* Tabela de veículos */}
        <TableContainer>
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell>Placa</TableCell>
                <TableCell>Apelido</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Marca</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell>Ano</TableCell>
                <TableCell>Tipo de veículo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && vehicles.length === 0 ? (
                <TableShimmer columns={9} />
              ) : error && vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Alert severity="error">{error}</Alert>
                  </TableCell>
                </TableRow>
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {keyword.trim() ? 'Nenhum veículo corresponde à busca' : 'Nenhum veículo encontrado'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => {
                  // Fonte de dados: deviceIds (array) ou devices (array de {id}) ou fallback device_id
                  const rawIds = (vehicle.deviceIds && Array.isArray(vehicle.deviceIds) && vehicle.deviceIds.length > 0)
                    ? vehicle.deviceIds
                    : (vehicle.devices && Array.isArray(vehicle.devices))
                      ? vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null)
                      : (vehicle.device_id != null ? [vehicle.device_id] : []);
                  const deviceIds = Array.isArray(rawIds) ? rawIds : [];
                  const safeAllDevices = Array.isArray(allDevices) ? allDevices : [];
                  const associatedDevices = deviceIds
                    .map((id) => safeAllDevices.find((d) => d && d.id === id))
                    .filter(Boolean);
                  
                  return (
                  <TableRow key={vehicle.id}>
                    <TableCell>{vehicle.plate}</TableCell>
                    <TableCell>{vehicle.nickname || '-'}</TableCell>
                    <TableCell>{vehicle.client_name || '-'}</TableCell>
                    <TableCell>{vehicle.make || '-'}</TableCell>
                    <TableCell>{vehicle.model || '-'}</TableCell>
                    <TableCell>{vehicle.year || '-'}</TableCell>
                    <TableCell>
                      {(() => {
                        const vt = (vehicle?.vehicle_type && deviceCategories.includes(vehicle.vehicle_type))
                          ? vehicle.vehicle_type
                          : vehicleTypeToIcon(vehicle?.vehicle_type) || 'default';
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box
                              component="img"
                              src={mapIcons[mapIconKey(vt)]}
                              alt=""
                              sx={{ width: 24, height: 24, objectFit: 'contain' }}
                            />
                            <Typography variant="body2">
                              {t(`category${String(vt).replace(/^\w/, (c) => c.toUpperCase())}`)}
                            </Typography>
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const mostRecentDevice = associatedDevices.reduce((best, dev) => {
                          const pos = positions?.[dev.id];
                          if (!pos) return best;
                          if (!best) return dev;
                          const bestPos = positions?.[best.id];
                          if (!bestPos) return dev;
                          return new Date(pos.fixTime) > new Date(bestPos.fixTime) ? dev : best;
                        }, null);
                        return mostRecentDevice ? (
                          <DeviceStatusIcons position={positions[mostRecentDevice.id]} />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        );
                      })()}
                    </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Ver detalhes" arrow>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setDetailsVehicle(vehicle);
                                setDetailsModalOpen(true);
                              }}
                              sx={{
                                color: '#10B981',
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                border: '1.5px solid rgba(16, 185, 129, 0.5)',
                                borderRadius: '6px',
                                padding: '6px',
                                minWidth: '32px',
                                minHeight: '32px',
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar veículo" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleEditVehicle(vehicle)}
                              sx={{
                                color: '#3B82F6',
                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                border: '1.5px solid rgba(59, 130, 246, 0.5)',
                                borderRadius: '6px',
                                padding: '6px',
                                minWidth: '32px',
                                minHeight: '32px',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.25)',
                                  border: '1.5px solid rgba(59, 130, 246, 0.8)',
                                  color: '#2563EB',
                                  transform: 'scale(1.1)',
                                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {admin && (
                            <Tooltip title="Excluir veículo" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDeleteConfirmation(vehicle.id)}
                                color="error"
                                sx={{
                                  borderRadius: '6px',
                                  padding: '6px',
                                  minWidth: '32px',
                                  minHeight: '32px',
                                  '&:hover': {
                                    transform: 'scale(1.1)',
                                    boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)',
                                  },
                                  transition: 'all 0.2s ease-in-out',
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Dialog de formulário */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          sx={{ zIndex: 11000 }}
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
            {editingVehicleId ? 'Editar Veículo' : 'Novo Veículo'}
          </DialogTitle>
        <DialogContent sx={{ 
          padding: '24px',
          backgroundColor: colors.surface,
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {/* Campo Placa */}
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
              disabled={!admin}
            />

            {/* Campo Cliente */}
            <Autocomplete
              disabled={!admin}
              options={Array.isArray(clients) ? clients : []}
              getOptionLabel={(option) => option?.name || ''}
              value={(Array.isArray(clients) ? clients : []).find((c) => c?.id === formData.client_id) || null}
              onChange={(event, value) => {
                handleFormChange('client_id', value ? value.id : '');
              }}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  required
                  placeholder="Pesquisar cliente..."
                  error={!!formErrors.client_id}
                  helperText={formErrors.client_id}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      color: colors.text,
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
              componentsProps={{
                popper: {
                  style: { zIndex: 11001 },
                  sx: {
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    },
                    '& .MuiAutocomplete-option': {
                      color: colors.text,
                      '&:hover': { backgroundColor: colors.hover },
                      '&[aria-selected="true"]': {
                        backgroundColor: `${colors.primary}20`,
                        color: colors.primary,
                      },
                    },
                  },
                },
              }}
              noOptionsText={clients.length === 0 ? 'Carregando clientes...' : 'Nenhum cliente encontrado'}
              loading={clients.length === 0}
            />

            {/* Campo Marca */}
            <TextField
              label="Marca"
              value={formData.make}
              onChange={(e) => handleFormChange('make', e.target.value)}
              fullWidth
              placeholder="Ex: Volvo"
              disabled={!admin}
            />

            {/* Campo Modelo */}
            <TextField
              label="Modelo"
              value={formData.model}
              onChange={(e) => handleFormChange('model', e.target.value)}
              fullWidth
              placeholder="Ex: FH 540"
              disabled={!admin}
            />

            {/* Campo Cor */}
            <TextField
              label="Cor"
              value={formData.color}
              onChange={(e) => handleFormChange('color', e.target.value)}
              fullWidth
              placeholder="Ex: Branco"
              disabled={!admin}
            />

            {/* Campo Ano */}
            <TextField
              label="Ano"
              value={formData.year}
              onChange={(e) => handleFormChange('year', e.target.value)}
              fullWidth
              type="number"
              placeholder="Ex: 2023"
              inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
              disabled={!admin}
            />

            {/* Campo Tipo de veículo (categorias Traccar) */}
            <Box ref={vehicleTypeInputRef} sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                label="Tipo de veículo"
                value={t(`category${(formData.vehicle_type || 'default').replace(/^\w/, (c) => c.toUpperCase())}`)}
                onClick={() => admin && setVehicleTypeDropdownOpen(!vehicleTypeDropdownOpen)}
                disabled={!admin}
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
                    zIndex: 11002,
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
                        {isSelected && <CheckIcon sx={{ color: '#10B981', fontSize: 20 }} />}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Campo Foto do veículo */}
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

            {/* Campo Apelido */}
            <TextField
              label="Apelido"
              value={formData.nickname}
              onChange={(e) => handleFormChange('nickname', e.target.value)}
              fullWidth
              placeholder="Ex: Caminhão do João"
            />

            {admin && (
            <>
            {/* Campo Detalhes da instalação */}
            <TextField
              label="Detalhes da instalação"
              value={formData.installation_details}
              onChange={(e) => handleFormChange('installation_details', e.target.value)}
              fullWidth
              multiline
              minRows={2}
              placeholder="Observações sobre a instalação do rastreador..."
            />

            {/* Campo Rastreador (GPS) */}
            <Autocomplete
              multiple
              options={availableDevices}
              loading={availableDevicesLoading}
              getOptionLabel={(option) => `${option?.name || 'Sem nome'} (ID: ${option?.id || 'N/A'})`}
              value={selectedDeviceObjects}
              inputValue={deviceSearchInput}
              onInputChange={(event, newInputValue, reason) => {
                // Manter o texto digitado mesmo quando seleciona uma opção
                if (reason !== 'reset') {
                  setDeviceSearchInput(newInputValue);
                }
              }}
              onChange={(event, newValue) => {
                const ids = Array.isArray(newValue) ? newValue.map(d => d?.id).filter(id => id != null) : [];
                handleFormChange('selectedDeviceIds', ids);
                // Limpar o input apenas quando fechar o dropdown
                if (event?.type === 'keydown' && event?.key === 'Escape') {
                  setDeviceSearchInput('');
                }
              }}
              disableCloseOnSelect
              filterOptions={(options, state) => {
                const inputValue = (state.inputValue || '').toLowerCase();
                if (!inputValue) return options;
                return options.filter((option) =>
                  (option?.name || '').toLowerCase().includes(inputValue) ||
                  (option?.uniqueId || '').toLowerCase().includes(inputValue)
                );
              }}
              componentsProps={{
                popper: {
                  style: { zIndex: 11001 },
                  sx: {
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    },
                    '& .MuiAutocomplete-option': {
                      color: colors.text,
                      '&:hover': {
                        backgroundColor: colors.hover,
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: `${colors.primary}20`,
                        color: colors.primary,
                      },
                    },
                  },
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Rastreador (GPS)"
                  placeholder="Selecione um ou mais rastreadores"
                  helperText="Opcional: Associe um ou mais rastreadores GPS. Apenas equipamentos não vinculados a outros veículos podem ser adicionados."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.secondary,
                      color: colors.text,
                      '& fieldset': {
                        borderColor: colors.border,
                      },
                      '&:hover fieldset': {
                        borderColor: colors.primary,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: colors.primary,
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: colors.textSecondary,
                      '&.Mui-focused': {
                        color: colors.primary,
                      },
                    },
                  }}
                />
              )}
              renderOption={(props, option, { selected }) => {
                const { key, ...rest } = props;
                return (
                  <li key={key} {...rest} style={{ color: colors.text }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{option?.name || 'Sem nome'}</span>
                      <span style={{ fontSize: '0.8em', color: colors.textSecondary || 'gray' }}>
                        IMEI: {(option?.uniqueId || option?.id) ?? '—'}
                      </span>
                    </Box>
                  </li>
                );
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={availableDevicesLoading ? 'Carregando...' : 'Nenhum rastreador disponível'}
            />
            </>
            )}

            {/* Mensagem de erro do Redux */}
            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          padding: '16px 24px',
          backgroundColor: colors.surface,
          borderTop: `1px solid ${colors.border}`,
        }}>
          <Button 
            onClick={handleCloseDialog} 
            disabled={loading}
            sx={{ color: colors.textSecondary }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaveDisabled}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{
              backgroundColor: colors.primary,
              '&:hover': {
                backgroundColor: colors.primaryDark,
              },
            }}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog
        open={deleteConfirmationOpen}
        onClose={handleCloseDeleteConfirmation}
        sx={{ zIndex: 12000 }}
        PaperProps={{
          sx: {
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            zIndex: 12000,
          },
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          padding: '24px 24px 20px 24px',
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          color: colors.text,
          fontWeight: 600,
        }}>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent sx={{ 
          padding: '24px',
          backgroundColor: colors.surface,
        }}>
          <Typography sx={{ color: colors.text }}>
            Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          padding: '16px 24px',
          backgroundColor: colors.surface,
          borderTop: `1px solid ${colors.border}`,
        }}>
          <Button 
            onClick={handleCloseDeleteConfirmation} 
            disabled={loading}
            sx={{ color: colors.textSecondary }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
      <VehicleDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setDetailsVehicle(null);
        }}
        vehicle={detailsVehicle}
      />
    </Box>
  );
};
