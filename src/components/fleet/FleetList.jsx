import { useState, useCallback, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAdministrator } from '../../common/util/permissions';
import {
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
import { formatStatus } from '../../common/util/formatter';
import { useTranslation } from '../../common/components/LocalizationProvider';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const STATUS_COLOR = { online: '#10B981', offline: '#EF4444', unknown: '#F59E0B' };

const FleetList = memo(() => {
  const dispatch = useDispatch();
  const admin = useAdministrator();
  const t = useTranslation();
  const colors = useThemeColors();
  const { items, fleetMapLoading: loading, error } = useSelector((state) => state.fleet);
  const devices = useSelector((state) => state.devices.items);
  const selectedPlate = useSelector((state) => state.fleet.selectedPlate);

  const [clientsDialogOpen, setClientsDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);

  const handleSelectPlate = useCallback((plate) => {
    dispatch(fleetActions.setSelectedPlate(plate));
  }, [dispatch]);

  const handleOpenClientsDialog = useCallback(() => setClientsDialogOpen(true), []);
  const handleCloseClientsDialog = useCallback(() => setClientsDialogOpen(false), []);
  const handleOpenVehicleDialog = useCallback(() => setVehicleDialogOpen(true), []);
  const handleCloseVehicleDialog = useCallback(() => setVehicleDialogOpen(false), []);

  if (loading && items.length === 0) {
    return (
      <Box
        sx={{
          width: '100%', maxWidth: 440,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '16px',
          display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px',
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100%', maxWidth: 440, padding: '16px' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            padding: '12px 16px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="h6" component="h2" sx={{ color: colors.text, lineHeight: 1.3 }}>
              Frota
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '2px' }}>
              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                {items.length} veículo{items.length !== 1 ? 's' : ''}
              </Typography>
              {loading && <CircularProgress size={12} />}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {admin && (
              <IconButton
                size="small"
                onClick={handleOpenClientsDialog}
                title="Gerenciar Clientes"
                sx={{
                  color: colors.text, backgroundColor: 'transparent',
                  '&:hover': { backgroundColor: colors.hover },
                  padding: '4px',
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
                color: colors.text, backgroundColor: 'transparent',
                '&:hover': { backgroundColor: colors.hover },
                padding: '4px',
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* List */}
        <List sx={{ maxHeight: '60vh', overflowY: 'auto', padding: 0 }}>
          {items.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Nenhum veículo encontrado"
                primaryTypographyProps={{ sx: { color: colors.textSecondary } }}
              />
            </ListItem>
          ) : (
            items.map((item) => {
              // Find best device (most recent)
              const ids = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id ? [item.device_id] : []);
              const bestDevice = ids
                .map((id) => devices[id])
                .filter(Boolean)
                .sort((a, b) => dayjs(b.lastUpdate || 0).valueOf() - dayjs(a.lastUpdate || 0).valueOf())[0] || null;

              const status = bestDevice?.status;
              const statusLabel = bestDevice
                ? (status === 'online' || !bestDevice.lastUpdate
                    ? formatStatus(status, t)
                    : dayjs(bestDevice.lastUpdate).fromNow())
                : null;

              const isSelected = item.plate === selectedPlate;

              return (
                <ListItem key={item.plate} disablePadding>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleSelectPlate(item.plate)}
                    sx={{
                      padding: '10px 16px',
                      backgroundColor: isSelected ? `${colors.primary}18` : 'transparent',
                      borderLeft: isSelected ? `3px solid ${colors.primary || '#3b82f6'}` : '3px solid transparent',
                      '&:hover': { backgroundColor: colors.hover },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <DirectionsCarIcon sx={{ color: colors.textSecondary, flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body1"
                          fontWeight="medium"
                          noWrap
                          sx={{ color: colors.text }}
                        >
                          {item.nickname || item.plate}
                        </Typography>
                        {item.client_name && (
                          <Typography variant="body2" noWrap sx={{ color: colors.textSecondary }}>
                            {item.client_name}
                          </Typography>
                        )}
                        {(item.make || item.model) && (
                          <Typography variant="caption" noWrap sx={{ color: colors.textSecondary }}>
                            {[item.make, item.model].filter(Boolean).join(' ')}
                          </Typography>
                        )}
                      </Box>
                      {status && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLOR[status] || '#6B7280' }} />
                          <Typography variant="caption" sx={{ color: colors.textSecondary, whiteSpace: 'nowrap' }}>
                            {statusLabel}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })
          )}
        </List>
      </Box>

      {/* Dialog — Clients Manager */}
      <Dialog
        open={clientsDialogOpen}
        onClose={handleCloseClientsDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        <DialogContent sx={{ p: 0 }}>
          <ClientsManager />
        </DialogContent>
      </Dialog>

      {/* Dialog — Vehicle Register */}
      <VehicleRegisterModal
        open={vehicleDialogOpen}
        onClose={handleCloseVehicleDialog}
      />
    </>
  );
});

FleetList.displayName = 'FleetList';

export default FleetList;
