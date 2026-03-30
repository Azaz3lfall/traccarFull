import { useState, useCallback, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAdministrator } from '../../common/util/permissions';
import { 
  Paper, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert,
  IconButton,
  Dialog,
  DialogContent,
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import { fleetActions } from '../../store';
import { ClientsManager } from '../management';
import { VehicleRegisterModal } from '../management';
import { useThemeColors } from '../../common/components/ThemeProvider';

const FleetList = memo(() => {
  const dispatch = useDispatch();
  const admin = useAdministrator();
  const { items, loading, error } = useSelector((state) => state.fleet);
  const colors = useThemeColors();
  const [clientsDialogOpen, setClientsDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);

  // Removido useEffect - o polling já está no MainPage.jsx
  // useEffect(() => {
  //   dispatch(fetchFleetMap());
  // }, [dispatch]);

  const handleSelectPlate = useCallback((plate) => {
    dispatch(fleetActions.setSelectedPlate(plate));
  }, [dispatch]);

  const handleOpenClientsDialog = useCallback(() => {
    setClientsDialogOpen(true);
  }, []);

  const handleCloseClientsDialog = useCallback(() => {
    setClientsDialogOpen(false);
  }, []);

  const handleOpenVehicleDialog = useCallback(() => {
    setVehicleDialogOpen(true);
  }, []);

  const handleCloseVehicleDialog = useCallback(() => {
    setVehicleDialogOpen(false);
  }, []);

  if (loading) {
    return (
      <Paper className="p-4">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper className="p-4">
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <>
      <Paper className="w-full max-w-md">
        <Box className="p-4 border-b" sx={{ position: 'relative' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" component="h2">
              Frota
            </Typography>
            <Box display="flex" gap={0.5} sx={{ alignItems: 'center' }}>
              {admin && (
              <IconButton
                size="small"
                onClick={handleOpenClientsDialog}
                title="Gerenciar Clientes"
                sx={{
                  color: colors.text,
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: colors.hover,
                    color: colors.text,
                  },
                  padding: '4px',
                  minWidth: '28px',
                  minHeight: '28px',
                }}
              >
                <PersonIcon fontSize="small" />
              </IconButton>
              )}
              <IconButton
                size="small"
                onClick={handleOpenVehicleDialog}
                title="Cadastrar Veículo"
                sx={{
                  color: colors.text,
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: colors.hover,
                    color: colors.text,
                  },
                  padding: '4px',
                  minWidth: '28px',
                  minHeight: '28px',
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {items.length} veículo{items.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      <List className="max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <ListItem>
            <ListItemText primary="Nenhum veículo encontrado" />
          </ListItem>
        ) : (
          items.map((item) => (
            <ListItem key={item.plate} disablePadding>
              <ListItemButton onClick={() => handleSelectPlate(item.plate)}>
                <Box className="flex items-center gap-3 w-full">
                  <DirectionsCarIcon className="text-gray-500" />
                  <Box className="flex-1">
                    <Typography variant="body1" fontWeight="medium">
                      {item.plate}
                    </Typography>
                    {item.client_name && (
                      <Typography variant="body2" color="text.secondary">
                        {item.client_name}
                      </Typography>
                    )}
                    {(item.make || item.model) && (
                      <Typography variant="caption" color="text.secondary">
                        {[item.make, item.model].filter(Boolean).join(' ')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </Paper>

    {/* Dialog para ClientsManager */}
    <Dialog
      open={clientsDialogOpen}
      onClose={handleCloseClientsDialog}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <ClientsManager />
      </DialogContent>
    </Dialog>

    {/* Dialog para VehicleRegisterModal */}
    <VehicleRegisterModal
      open={vehicleDialogOpen}
      onClose={handleCloseVehicleDialog}
    />
    </>
  );
});

FleetList.displayName = 'FleetList';

export default FleetList;
