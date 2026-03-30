import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { formatDate, formatCurrency } from '../utils/formatters';
import { useThemeColors } from '../../../common/components/ThemeProvider';

const TripsTab = ({
  openTrips,
  closedTrips,
  vehicles,
  drivers,
  newTrip,
  setNewTrip,
  handleStartTrip,
  handleOpenFinishDialog,
  handleOpenCancelDialog,
  finishTripDialogOpen,
  cancelTripDialogOpen,
  selectedTrip,
  distanciaFinal,
  setDistanciaFinal,
  handleCloseFinishDialog,
  handleCloseCancelDialog,
  handleFinishTrip,
  handleCancelTrip
}) => {
  const colors = useThemeColors();
  return (
    <Box>
      {/* Formulário para iniciar nova viagem */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Iniciar Nova Viagem</Typography>
        <Box component="form" onSubmit={handleStartTrip} sx={{ mt: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <Autocomplete
                fullWidth
                options={vehicles}
                getOptionLabel={(option) => option.name || ''}
                value={vehicles.find(v => v.id === newTrip.vehicle_id) || null}
                onChange={(event, newValue) => {
                  setNewTrip(prev => ({ 
                    ...prev, 
                    vehicle_id: newValue ? newValue.id : '' 
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Veículo"
                    required
                    placeholder="Digite para buscar..."
                  />
                )}
                noOptionsText="Nenhum veículo encontrado"
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Cidade Origem"
                value={newTrip.start_city}
                onChange={(e) => setNewTrip(prev => ({ ...prev, start_city: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Cidade Destino"
                value={newTrip.end_city}
                onChange={(e) => setNewTrip(prev => ({ ...prev, end_city: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Autocomplete
                fullWidth
                options={drivers}
                getOptionLabel={(option) => option.name || ''}
                value={drivers.find(d => d.id === newTrip.driver_id) || null}
                onChange={(event, newValue) => {
                  setNewTrip(prev => ({ 
                    ...prev, 
                    driver_id: newValue ? newValue.id : '' 
                  }));
                }}
                componentsProps={{
                  popper: {
                    style: { zIndex: 20001 },
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
                    label="Motorista"
                    required
                    placeholder="Digite para buscar..."
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
                renderOption={(props, option) => (
                  <li {...props} style={{ color: colors.text }}>
                    {option.name || ''}
                  </li>
                )}
                noOptionsText="Nenhum motorista encontrado"
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newTrip.is_round_trip}
                    onChange={(e) => setNewTrip(prev => ({ ...prev, is_round_trip: e.target.checked }))}
                  />
                }
                label="Ida e Volta"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                fullWidth
              >
                Iniciar Viagem
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Viagens em Aberto */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Viagens em Aberto ({openTrips.length})
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Veículo</TableCell>
                <TableCell>Motorista</TableCell>
                <TableCell>Rota</TableCell>
                <TableCell>Início</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {openTrips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell>
                    {vehicles.find(v => v.id === trip.vehicle_id)?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {drivers.find(d => d.id === trip.driver_id)?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {trip.start_city} → {trip.end_city}
                    {trip.is_round_trip && ' (Ida e Volta)'}
                  </TableCell>
                  <TableCell>{formatDate(trip.start_date)}</TableCell>
                  <TableCell>
                    <Chip label="Em Andamento" color="warning" size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleOpenFinishDialog(trip)}
                      color="success"
                      size="small"
                    >
                      <CheckCircleIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleOpenCancelDialog(trip)}
                      color="error"
                      size="small"
                    >
                      <CancelIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Histórico de Viagens */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Histórico de Viagens ({closedTrips.length})
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Veículo</TableCell>
                <TableCell>Motorista</TableCell>
                <TableCell>Rota</TableCell>
                <TableCell>Início</TableCell>
                <TableCell>Fim</TableCell>
                <TableCell>Distância</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {closedTrips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell>
                    {vehicles.find(v => v.id === trip.vehicle_id)?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {drivers.find(d => d.id === trip.driver_id)?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {trip.start_city} → {trip.end_city}
                    {trip.is_round_trip && ' (Ida e Volta)'}
                  </TableCell>
                  <TableCell>{formatDate(trip.start_date)}</TableCell>
                  <TableCell>{formatDate(trip.end_date)}</TableCell>
                  <TableCell>{trip.distance ? `${trip.distance} km` : 'N/A'}</TableCell>
                  <TableCell>
                    <Chip label="Finalizada" color="success" size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog para finalizar viagem */}
      <Dialog 
        open={finishTripDialogOpen} 
        onClose={handleCloseFinishDialog}
        sx={{ zIndex: 11000 }}
      >
        <DialogTitle>Finalizar Viagem</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Distância Percorrida (km)"
            type="number"
            fullWidth
            variant="outlined"
            value={distanciaFinal}
            onChange={(e) => setDistanciaFinal(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFinishDialog}>Cancelar</Button>
          <Button onClick={handleFinishTrip} variant="contained">
            Finalizar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para cancelar viagem */}
      <Dialog 
        open={cancelTripDialogOpen} 
        onClose={handleCloseCancelDialog}
        sx={{ zIndex: 11000 }}
      >
        <DialogTitle>Cancelar Viagem</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja cancelar esta viagem? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog}>Cancelar</Button>
          <Button onClick={handleCancelTrip} variant="contained" color="error">
            Confirmar Cancelamento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TripsTab;
