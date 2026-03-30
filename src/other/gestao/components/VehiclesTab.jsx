import React, { useState, useMemo } from 'react';
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
  InputAdornment
} from '@mui/material';
import {
  Sync as SyncIcon,
  Edit as EditIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import AuthStatusIndicator from './AuthStatusIndicator';

// Exibe "-" para valores nulos ou indefinidos
const na = (value) => (value != null && value !== '') ? value : '-';

// Combina make e model no formato "Marca - Modelo"
const makeModel = (vehicle) => {
  const make = vehicle?.make;
  const model = vehicle?.model;
  if (!make && !model) return '-';
  if (make && model) return `${make} - ${model}`;
  return make || model || '-';
};

const VehiclesTab = ({
  vehicles,
  setVehicles,
  editVehicleModalOpen,
  setEditVehicleModalOpen,
  selectedVehicle,
  vehicleEditData,
  setVehicleEditData,
  loading,
  handleSyncVehicles,
  handleEditVehicle,
  handleSaveVehicleEdit
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar veículos por placa (plate/name) e apelido (nickname)
  const filteredVehicles = useMemo(() => {
    if (!searchTerm.trim()) {
      return vehicles;
    }

    const term = searchTerm.toLowerCase().trim();
    return vehicles.filter(vehicle => {
      const plate = (vehicle.plate || vehicle.name || '').toLowerCase();
      const nickname = (vehicle.nickname || '').toLowerCase();
      return plate.includes(term) || nickname.includes(term);
    });
  }, [vehicles, searchTerm]);

  const columnCount = 7; // Placa, Apelido, Marca/Modelo, Detalhes, Odômetro, Tanque, Ações

  return (
    <Box>
      {/* Indicador de status de autenticação */}
      <AuthStatusIndicator />

      {/* Cabeçalho com botão de sincronização */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Veículos da Frota</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              💡 Para sincronizar, você precisa estar logado no Traccar
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleSyncVehicles}
            disabled={loading}
            color="primary"
          >
            {loading ? <CircularProgress size={20} /> : 'Sincronizar com Traccar'}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Total de veículos: {vehicles.length}
          {searchTerm && ` (${filteredVehicles.length} encontrados)`}
        </Typography>
      </Paper>

      {/* Lista de veículos */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Lista de Veículos
          </Typography>
          <TextField
            placeholder="Pesquisar por placa ou apelido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Placa</TableCell>
                <TableCell>Apelido</TableCell>
                <TableCell>Marca/Modelo</TableCell>
                <TableCell>Detalhes da Instalação</TableCell>
                <TableCell>Odômetro Atual</TableCell>
                <TableCell>Capacidade do Tanque (L)</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? `Nenhum veículo encontrado para "${searchTerm}"` : 'Nenhum veículo disponível'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>{na(vehicle.plate || vehicle.name)}</TableCell>
                    <TableCell>{na(vehicle.nickname)}</TableCell>
                    <TableCell>{makeModel(vehicle)}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={vehicle?.installation_details || ''}
                    >
                      {na(vehicle.installation_details)}
                    </TableCell>
                    <TableCell>
                      {vehicle.current_odometer != null && vehicle.current_odometer !== ''
                        ? `${vehicle.current_odometer} km`
                        : '-'}
                    </TableCell>
                    <TableCell>{na(vehicle.tank_capacity)}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleEditVehicle(vehicle)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal para editar veículo */}
      <Dialog
        open={editVehicleModalOpen}
        onClose={() => setEditVehicleModalOpen(false)}
        sx={{ zIndex: 11000 }} // Forçar acima do FloatingGestaoPopover (10002)
      >
        <DialogTitle>Editar Veículo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Placa / Nome"
                value={vehicleEditData.plate ?? ''}
                onChange={(e) => setVehicleEditData(prev => ({ ...prev, plate: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apelido"
                value={vehicleEditData.nickname ?? ''}
                onChange={(e) => setVehicleEditData(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder="Ex: Caminhão do João"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Capacidade do Tanque (L)"
                type="number"
                value={vehicleEditData.tank_capacity ?? ''}
                onChange={(e) => setVehicleEditData(prev => ({ ...prev, tank_capacity: e.target.value }))}
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Odômetro Inicial (km)"
                type="number"
                value={vehicleEditData.initial_odometer ?? ''}
                onChange={(e) => setVehicleEditData(prev => ({ ...prev, initial_odometer: e.target.value }))}
                inputProps={{ min: 0, step: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Detalhes da Instalação"
                value={vehicleEditData.installation_details ?? ''}
                onChange={(e) => setVehicleEditData(prev => ({ ...prev, installation_details: e.target.value }))}
                multiline
                rows={3}
                placeholder="Ex: Instalado em 15/01/2024, tracker modelo XYZ..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditVehicleModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveVehicleEdit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VehiclesTab;
