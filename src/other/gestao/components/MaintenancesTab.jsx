import React, { useState } from 'react';
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
  CircularProgress,
  Autocomplete
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  Visibility as VisibilityIcon,
  DirectionsCar as CarIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Description as DescriptionIcon,
  Speed as SpeedIcon,
  Store as StoreIcon,
  Build as BuildIcon
} from '@mui/icons-material';
import { InputAdornment } from '@mui/material';
import { Wrench } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/formatters';
import PhotoModal from './common/PhotoModal';

const MaintenancesTab = ({
  vehicles,
  allMaintenances,
  newMaintenanceForm,
  setNewMaintenanceForm,
  selectedMaintenance,
  setSelectedMaintenance,
  editMaintenanceModalOpen,
  setEditMaintenanceModalOpen,
  deleteMaintenanceDialogOpen,
  setDeleteMaintenanceDialogOpen,
  loadingMaintenances,
  handleCreateMaintenance,
  handleEditMaintenance,
  handleSaveMaintenanceEdit,
  handleDeleteMaintenance,
  handleConfirmDeleteMaintenance
}) => {
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhotoPath, setSelectedPhotoPath] = useState(null);

  // Garantir que vehicles seja sempre um array válido
  const safeVehicles = React.useMemo(() => Array.isArray(vehicles) ? vehicles : [], [vehicles]);
  const safeMaintenances = React.useMemo(() => Array.isArray(allMaintenances) ? allMaintenances : [], [allMaintenances]);

  // Debug para verificar dados recebidos
  React.useEffect(() => {
    console.log('🔍 MaintenancesTab - Dados recebidos:', {
      vehicles: safeVehicles.length,
      maintenances: safeMaintenances.length,
      vehiclesSample: safeVehicles.slice(0, 2)
    });
  }, [safeVehicles, safeMaintenances]);

  const handleViewPhoto = (photoPath) => {
    setSelectedPhotoPath(photoPath);
    setPhotoModalOpen(true);
  };

  return (
    <Box>
      {/* Formulário para adicionar manutenção */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
          <Wrench size={24} color="#3f51b5" />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Registrar Manutenção</Typography>
        </Box>
        <Box component="form" onSubmit={handleCreateMaintenance} sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Autocomplete
                fullWidth
                size="small"
                options={safeVehicles}
                getOptionLabel={(option) => option?.name || ''}
                value={safeVehicles.find(v => v?.id === newMaintenanceForm.vehicle_id) || null}
                onChange={(event, newValue) => {
                  setNewMaintenanceForm(prev => ({ 
                    ...prev, 
                    vehicle_id: newValue ? newValue.id : '' 
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Veículo"
                    required
                    placeholder={safeVehicles.length === 0 ? "Carregando veículos..." : "Digite para buscar..."}
                    error={safeVehicles.length === 0}
                    helperText={safeVehicles.length === 0 ? "Nenhum veículo disponível" : ""}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <CarIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                noOptionsText={safeVehicles.length === 0 ? "Carregando veículos..." : "Nenhum veículo encontrado"}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                disabled={safeVehicles.length === 0}
                componentsProps={{
                  popper: { style: { zIndex: 20001 } }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Data da Manutenção"
                type="date"
                value={newMaintenanceForm.maintenance_date}
                onChange={(e) => setNewMaintenanceForm(prev => ({ ...prev, maintenance_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Custo (R$)"
                type="number"
                value={newMaintenanceForm.cost}
                onChange={(e) => setNewMaintenanceForm(prev => ({ ...prev, cost: e.target.value }))}
                inputProps={{ min: 0, step: 0.01 }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Descrição"
                value={newMaintenanceForm.description}
                onChange={(e) => setNewMaintenanceForm(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <DescriptionIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Odômetro (km)"
                type="number"
                value={newMaintenanceForm.odometer}
                onChange={(e) => setNewMaintenanceForm(prev => ({ ...prev, odometer: e.target.value }))}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SpeedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Fornecedor"
                value={newMaintenanceForm.provider_name}
                onChange={(e) => setNewMaintenanceForm(prev => ({ ...prev, provider_name: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <StoreIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
                color={newMaintenanceForm.foto ? "success" : "primary"}
                sx={{ height: '40px' }}
              >
                {newMaintenanceForm.foto ? `Foto: ${newMaintenanceForm.foto.name.substring(0, 20)}...` : 'Foto do Comprovante (Opcional)'}
                <input
                  id="foto-upload-maintenance"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewMaintenanceForm(prev => ({ 
                    ...prev, 
                    foto: e.target.files[0] 
                  }))}
                  hidden
                />
              </Button>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                disabled={loadingMaintenances}
                fullWidth
                size="large"
                sx={{ mt: 1, py: 1.5, fontWeight: 'bold' }}
              >
                {loadingMaintenances ? <CircularProgress size={24} /> : 'Finalizar Registro de Manutenção'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Lista de manutenções */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BuildIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Manutenções ({safeMaintenances.length})
            </Typography>
          </Box>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CarIcon fontSize="small" /> Veículo</Box></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CalendarIcon fontSize="small" /> Data</Box></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><DescriptionIcon fontSize="small" /> Descrição</Box></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><MoneyIcon fontSize="small" /> Custo</Box></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><SpeedIcon fontSize="small" /> Odômetro</Box></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><StoreIcon fontSize="small" /> Fornecedor</Box></TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {safeMaintenances.map((maintenance) => (
                <TableRow key={maintenance.id}>
                  <TableCell>
                    {maintenance.vehicle_name || safeVehicles.find(v => v?.id === maintenance.vehicle_id)?.name || 'N/A'}
                  </TableCell>
                  <TableCell>{formatDate(maintenance.maintenance_date)}</TableCell>
                  <TableCell>{maintenance.description}</TableCell>
                  <TableCell>{formatCurrency(maintenance.cost)}</TableCell>
                  <TableCell>{maintenance.odometer ? `${maintenance.odometer} km` : '-'}</TableCell>
                  <TableCell>{maintenance.provider_name || '-'}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
                      {maintenance.foto_path && (
                        <IconButton
                          onClick={() => handleViewPhoto(maintenance.foto_path)}
                          color="info"
                          size="small"
                          title="Ver foto"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        onClick={() => handleEditMaintenance(maintenance)}
                        color="primary"
                        size="small"
                        title="Editar"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteMaintenance(maintenance)}
                        color="error"
                        size="small"
                        title="Excluir"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal para editar manutenção */}
      <Dialog 
        open={editMaintenanceModalOpen} 
        onClose={() => setEditMaintenanceModalOpen(false)} 
        maxWidth="md" 
        fullWidth
        sx={{ zIndex: 11000 }}
      >
        <DialogTitle>Editar Manutenção</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                size="small"
                options={safeVehicles}
                getOptionLabel={(option) => option?.name || ''}
                value={safeVehicles.find(v => v?.id === selectedMaintenance?.vehicle_id) || null}
                onChange={(event, newValue) => {
                  const updatedData = { 
                    ...selectedMaintenance, 
                    vehicle_id: newValue ? newValue.id : '' 
                  };
                  setSelectedMaintenance(updatedData);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Veículo"
                    required
                    placeholder={safeVehicles.length === 0 ? "Carregando veículos..." : "Digite para buscar..."}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <CarIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                noOptionsText={safeVehicles.length === 0 ? "Carregando veículos..." : "Nenhum veículo encontrado"}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                disabled={safeVehicles.length === 0}
                componentsProps={{
                  popper: { style: { zIndex: 20001 } }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Data da Manutenção"
                type="date"
                value={selectedMaintenance?.maintenance_date ? (String(selectedMaintenance.maintenance_date).slice(0, 10) || '') : ''}
                onChange={(e) => setSelectedMaintenance(prev => ({ ...prev, maintenance_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Custo (R$)"
                type="number"
                value={selectedMaintenance?.cost || ''}
                onChange={(e) => setSelectedMaintenance(prev => ({ ...prev, cost: e.target.value }))}
                inputProps={{ min: 0, step: 0.01 }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Odômetro (km)"
                type="number"
                value={selectedMaintenance?.odometer || ''}
                onChange={(e) => setSelectedMaintenance(prev => ({ ...prev, odometer: e.target.value }))}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SpeedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Descrição"
                value={selectedMaintenance?.description || ''}
                onChange={(e) => setSelectedMaintenance(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <DescriptionIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Fornecedor"
                value={selectedMaintenance?.provider_name || ''}
                onChange={(e) => setSelectedMaintenance(prev => ({ ...prev, provider_name: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <StoreIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
                color={(selectedMaintenance?.foto || selectedMaintenance?.foto_path) ? "success" : "primary"}
                sx={{ height: '40px' }}
              >
                {(selectedMaintenance?.foto || selectedMaintenance?.foto_path) 
                  ? `Foto: ${selectedMaintenance?.foto?.name?.substring(0, 20) || 'Anexada'}...` 
                  : 'Foto do Comprovante (Opcional)'}
                <input
                  id="foto-upload-edit-maintenance"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedMaintenance(prev => ({ 
                    ...prev, 
                    foto: e.target.files[0] 
                  }))}
                  hidden
                />
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMaintenanceModalOpen(false)}>Cancelar</Button>
          <Button 
            onClick={async () => {
              try {
                await handleSaveMaintenanceEdit(selectedMaintenance);
                setEditMaintenanceModalOpen(false);
              } catch (error) {
                console.error('Erro ao salvar:', error);
              }
            }} 
            variant="contained" 
            disabled={loadingMaintenances}
          >
            {loadingMaintenances ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para confirmar exclusão */}
      <Dialog 
        open={deleteMaintenanceDialogOpen} 
        onClose={() => setDeleteMaintenanceDialogOpen(false)}
        sx={{ zIndex: 11000 }}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteMaintenanceDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDeleteMaintenance} variant="contained" color="error" disabled={loadingMaintenances}>
            {loadingMaintenances ? <CircularProgress size={20} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para visualizar foto */}
      <PhotoModal
        open={photoModalOpen}
        onClose={() => {
          setPhotoModalOpen(false);
          setSelectedPhotoPath(null);
        }}
        photoPath={selectedPhotoPath}
        title="Foto da Manutenção"
      />
    </Box>
  );
};

export default MaintenancesTab;

