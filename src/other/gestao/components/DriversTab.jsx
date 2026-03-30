import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormControlLabel,
  ListItemText,
  Chip,
  Tooltip,
  Autocomplete
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VpnKey as VpnKeyIcon,
  PersonAdd as PersonAddIcon,
  DirectionsCar as DirectionsCarIcon,
  AutoMode as AutoModeIcon,
  TouchApp as TouchAppIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { formatDate, formatCPF, formatPhone, formatCNH } from '../utils/formatters';
import { CNH_CATEGORIES } from '../constants';
import AssociationDashboard from './AssociationDashboard';
import DriverAssociationManager from './DriverAssociationManager';
import SyncScheduleConfig from './SyncScheduleConfig';
import AssociationHistory from './AssociationHistory';
import DriverCreateModal from './DriverCreateModal';
import DriverEditModal from './DriverEditModal';
import DriverCompleteModal from './DriverCompleteModal';
import { useDraggable } from '../hooks/useDraggable';
import { useThemeColors } from '../../../common/components/ThemeProvider';

const DriversTab = ({
  drivers,
  vehicles,
  newDriver,
  setNewDriver,
  selectedDriver,
  driverEditData,
  setDriverEditData,
  editDriverModalOpen,
  setEditDriverModalOpen,
  editDriverDataModalOpen,
  setEditDriverDataModalOpen,
  handleEditDriverData,
  deleteDriverDialogOpen,
  setDeleteDriverDialogOpen,
  passwordChangeModalOpen,
  setPasswordChangeModalOpen,
  newPassword,
  setNewPassword,
  newPasswordConfirm,
  setNewPasswordConfirm,
  passwordChangeError,
  createUserModalOpen,
  setCreateUserModalOpen,
  newUsername,
  setNewUsername,
  newPasswordCreate,
  setNewPasswordCreate,
  createUserError,
  loadingDrivers,
  handleCreateDriver,
  handleEditDriver,
  handleSaveDriverEdit,
  handleDeleteDriver,
  handleConfirmDeleteDriver,
  handleNameChange,
  // Props para associação de veículos
  vehicleAssignmentModalOpen,
  selectedDriverForVehicles,
  driverVehicles,
  availableVehicles,
  setAvailableVehicles,
  selectedVehicleIds,
  setSelectedVehicleIds,
  handleOpenVehicleAssignment,
  handleCloseVehicleAssignment,
  handleSaveVehicleAssignment,
  handleVehicleSelectionChange,
  // Funções da Fase 2
  handleSyncAllDrivers,
  handleReloadDrivers,
  // Estado para modal de criação
  createDriverModalOpen,
  setCreateDriverModalOpen,
  // Função de sincronização do Traccar
  handleSyncDriverFromTraccar,
  // Função para sincronizar todos os motoristas do Traccar
  handleSyncDriversFromTraccar,
  // Função para completar cadastro pendente
  handleCompleteDriver
}) => {
  const colors = useThemeColors();
  const associationDrag = useDraggable(true);
  const vehicleDrag = useDraggable(true);
  const [completeDriverModalOpen, setCompleteDriverModalOpen] = useState(false);
  const [selectedDriverForComplete, setSelectedDriverForComplete] = useState(null);
  const [vehicleSearchText, setVehicleSearchText] = useState('');
  
  // Resetar posições quando os modais são fechados
  useEffect(() => {
    if (!editDriverModalOpen) {
      associationDrag.resetPosition();
    }
  }, [editDriverModalOpen, associationDrag]);
  
  useEffect(() => {
    if (!vehicleAssignmentModalOpen) {
      vehicleDrag.resetPosition();
    }
  }, [vehicleAssignmentModalOpen, vehicleDrag]);
  
  const handleOpenVehicleAssignmentWithLog = (driver) => {
    console.log('🚗 Abrindo associação de veículos para:', driver.name);
    console.log('📋 Lista de veículos recebida na Tab:', vehicles);
    handleOpenVehicleAssignment(driver);
  };

  return (
    <Box>
      {/* ⭐️ FASE 2: Dashboard de Associação */}
      <AssociationDashboard onSyncComplete={handleReloadDrivers} />
      
      {/* ⭐️ FASE 3: Sincronização Agendada */}
      <Box sx={{ mb: 3 }}>
        <SyncScheduleConfig />
      </Box>
      
      {/* Lista de motoristas - Foco em Gestão Operacional */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Gestão Operacional de Motoristas ({drivers.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {handleSyncDriversFromTraccar && (
              <Button
                variant="outlined"
                color="info"
                onClick={async () => {
                  try {
                    const result = await handleSyncDriversFromTraccar();
                    if (handleReloadDrivers) {
                      handleReloadDrivers();
                    }
                    alert(`Sincronização concluída!\nNovos motoristas: ${result.new_drivers || 0}\nMotoristas atualizados: ${result.updated_drivers || 0}\nTotal no Traccar: ${result.total_traccar || 0}`);
                  } catch (error) {
                    alert('Erro ao sincronizar motoristas: ' + (error.message || 'Erro desconhecido'));
                  }
                }}
                startIcon={<SyncIcon />}
                size="medium"
                disabled={loadingDrivers}
              >
                {loadingDrivers ? 'Sincronizando...' : 'Sincronizar do Traccar'}
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={() => setCreateDriverModalOpen(true)}
              startIcon={<PersonAddIcon />}
              size="medium"
            >
              Novo Motorista
            </Button>
          </Box>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>CPF</TableCell>
                <TableCell>Tipo Associação</TableCell>
                <TableCell>Veículos Associados</TableCell>
                <TableCell align="center">Ações de Gestão</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(drivers || []).map((driver) => (
                <TableRow key={driver.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {driver.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {driver.username || '-'}
                        </Typography>
                      </Box>
                      {(driver.status === 'pending' || driver.status === 'pending_traccar_error') && (
                        <Chip
                          label={driver.status === 'pending' ? 'Pendente' : 'Erro Traccar'}
                          size="small"
                          color={driver.status === 'pending' ? 'warning' : 'error'}
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{driver.cpf ? formatCPF(driver.cpf) : '-'}</TableCell>
                  <TableCell>
                    <Tooltip title={driver.association_type === 'auto' ? 'Associação Automática' : 'Associação Manual'}>
                      <Chip
                        icon={driver.association_type === 'auto' ? <AutoModeIcon /> : <TouchAppIcon />}
                        label={driver.association_type === 'auto' ? 'Auto' : 'Manual'}
                        size="small"
                        color={driver.association_type === 'auto' ? 'primary' : 'secondary'}
                        variant="outlined"
                      />
                    </Tooltip>
                    {driver.association_type === 'auto' && driver.last_sync && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        Sync: {formatDate(driver.last_sync)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {driver.vehicle_count > 0 ? (
                        <Chip 
                          label={`${driver.vehicle_count} veículo${driver.vehicle_count > 1 ? 's' : ''}`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Chip 
                          label="Nenhum veículo"
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {(driver.status === 'pending' || driver.status === 'pending_traccar_error') && handleCompleteDriver && (
                      <Tooltip title="Completar Cadastro">
                        <IconButton
                          onClick={() => {
                            setSelectedDriverForComplete(driver);
                            setCompleteDriverModalOpen(true);
                          }}
                          color="success"
                          size="small"
                          sx={{ mr: 0.5 }}
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Configurar Associação">
                      <IconButton
                        onClick={() => handleEditDriver(driver)}
                        color="primary"
                        size="small"
                      >
                        <SyncIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Gerenciar Veículos">
                      <IconButton
                        onClick={() => handleOpenVehicleAssignmentWithLog(driver)}
                        color="info"
                        size="small"
                      >
                        <DirectionsCarIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar Dados Cadastrais">
                      <IconButton
                        onClick={() => handleEditDriverData(driver)}
                        color="secondary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ⭐️ FASE 3: Histórico de Associações */}
      <Box sx={{ mt: 3 }}>
        <AssociationHistory />
      </Box>

      {/* Modal de Cadastro de Novo Motorista */}
      <DriverCreateModal
        open={!!createDriverModalOpen}
        onClose={() => setCreateDriverModalOpen(false)}
        onSubmit={async (driverData) => {
          try {
            await handleCreateDriver(driverData);
            setCreateDriverModalOpen(false);
            if (handleReloadDrivers) {
              handleReloadDrivers();
            }
          } catch (error) {
            console.error('Erro ao criar motorista:', error);
            // O erro será tratado pelo handleCreateDriver
          }
        }}
        loading={loadingDrivers}
      />

      {/* Modal de Edição de Motorista */}
      <DriverEditModal
        open={editDriverDataModalOpen}
        onClose={() => {
          setEditDriverDataModalOpen(false);
          setSelectedDriver(null);
        }}
        onSubmit={async (driverData) => {
          try {
            await handleSaveDriverEdit(driverData);
            setEditDriverModalOpen(false);
            setSelectedDriver(null);
            if (handleReloadDrivers) {
              handleReloadDrivers();
            }
          } catch (error) {
            console.error('Erro ao atualizar motorista:', error);
            throw error; // Re-throw para o modal tratar
          }
        }}
        driver={selectedDriver}
        loading={loadingDrivers}
        onSyncFromTraccar={handleSyncDriverFromTraccar}
      />

      {/* Modal de Completar Cadastro Pendente */}
      {handleCompleteDriver && (
        <DriverCompleteModal
          open={completeDriverModalOpen}
          onClose={() => {
            setCompleteDriverModalOpen(false);
            setSelectedDriverForComplete(null);
          }}
          onSubmit={async (driverData) => {
            try {
              await handleCompleteDriver(selectedDriverForComplete.id, driverData);
              setCompleteDriverModalOpen(false);
              setSelectedDriverForComplete(null);
              if (handleReloadDrivers) {
                handleReloadDrivers();
              }
            } catch (error) {
              console.error('Erro ao completar cadastro:', error);
              throw error; // Re-throw para o modal tratar
            }
          }}
          driver={selectedDriverForComplete}
          loading={loadingDrivers}
        />
      )}

      {/* Modal para Configurar Associação - APENAS GESTÃO */}
      <Dialog 
        open={editDriverModalOpen} 
        onClose={() => setEditDriverModalOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 11000 }} // Forçar acima do FloatingGestaoPopover (10002)
        PaperProps={{
          sx: {
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }
        }}
      >
        <DialogTitle 
          {...associationDrag.dragHandleProps}
          sx={{
            userSelect: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SyncIcon color="primary" />
            Configurar Associação - {selectedDriver?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* ⭐️ FASE 2: Gerenciador de Associação */}
          {selectedDriver && (
            <DriverAssociationManager
              driver={selectedDriver}
              onUpdate={handleReloadDrivers}
            />
          )}

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDriverModalOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal para associar veículos ao motorista */}
      <Dialog 
        open={vehicleAssignmentModalOpen} 
        onClose={handleCloseVehicleAssignment}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus // Importante para permitir que o Autocomplete funcione sem perder foco
        sx={{ zIndex: 11000 }}
        PaperProps={{
          sx: {
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }
        }}
      >
        <DialogTitle 
          {...vehicleDrag.dragHandleProps}
          sx={{
            userSelect: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DirectionsCarIcon />
            Gerenciar Veículos - {selectedDriverForVehicles?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecione os veículos que este motorista terá acesso:
          </Typography>
          
          <Autocomplete
            multiple
            id="vehicle-assignment-autocomplete"
            options={(vehicles || []).filter(v => v && (v.name || v.id))}
            disableCloseOnSelect
            disablePortal
            getOptionLabel={(option) => {
              if (!option) return "";
              return String(option.name || option.id || "");
            }}
            value={(vehicles || []).filter(v => v && (selectedVehicleIds || []).includes(v.id))}
            onChange={(event, newValue) => {
              setSelectedVehicleIds(newValue.map(v => v.id));
            }}
            isOptionEqualToValue={(option, value) => option?.id === value?.id}
            noOptionsText="Nenhum veículo encontrado"
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                />
                <ListItemText 
                  primary={option.name || `ID: ${option.id}`} 
                  secondary={option.category || 'Sem categoria'}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </li>
            )}
            renderInput={(params) => (
              <TextField 
                {...params} 
                variant="outlined"
                label="Veículos Disponíveis" 
                placeholder="Pesquisar..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }
                }}
              />
            )}
            sx={{ 
              mt: 1,
              '& .MuiAutocomplete-paper': {
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                mt: 0.5,
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
              },
              '& .MuiAutocomplete-listbox': {
                padding: 0,
                maxHeight: '40vh',
                '& .MuiAutocomplete-option': {
                  padding: '8px 16px',
                  borderBottom: `1px solid ${colors.border}33`,
                  '&:last-child': {
                    borderBottom: 'none'
                  },
                  '&[aria-selected="true"]': {
                    backgroundColor: `${colors.primary}22`,
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }
                }
              }
            }}
          />

          {selectedVehicleIds.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: colors.primary }}>
                <DirectionsCarIcon fontSize="small" />
                Veículos Selecionados ({selectedVehicleIds.length})
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1, 
                p: 2, 
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: `1px dashed ${colors.border}`,
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {(selectedVehicleIds || []).map((vehicleId) => {
                  const vehicle = (vehicles || []).find(v => v.id === vehicleId);
                  return (
                    <Chip
                      key={vehicleId}
                      label={vehicle?.name || `ID: ${vehicleId}`}
                      color="primary"
                      variant="filled"
                      onDelete={() => handleVehicleSelectionChange(vehicleId, false)}
                      sx={{ 
                        borderRadius: '8px',
                        fontWeight: 500,
                        '& .MuiChip-deleteIcon': {
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'scale(1.2)' }
                        }
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVehicleAssignment}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveVehicleAssignment} 
            variant="contained"
            disabled={loadingDrivers}
          >
            {loadingDrivers ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DriversTab;
