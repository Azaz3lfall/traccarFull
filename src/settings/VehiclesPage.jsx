import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import {
  addVehicle,
  deleteVehicle,
  fetchAllDevices,
  fetchClients,
  fetchVehicles,
  updateVehicle,
} from '../store';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAdministrator } from '../common/util/permissions';
import VehiclesTable from './components/vehicles/VehiclesTable';
import VehicleFormDialog from './components/vehicles/VehicleFormDialog';
import VehicleDetailsModal from './components/VehicleDetailsModal';

const STALE_MS = 30000;

const useDebouncedValue = (value, delay = 200) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export const VehiclesContent = () => {
  const dispatch = useDispatch();
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

  const {
    vehicles = [],
    error,
    vehiclesLoading,
    mutating,
    availableDevicesForVehicle = [],
    availableDevicesLoading,
    vehiclesLastFetchedAt = 0,
  } = useSelector((state) => state.fleet);
  const { items: clients = [], status: clientsStatus, lastFetchedAt: clientsLastFetchedAt = 0 } = useSelector((state) => state.clients);
  const { allDevices = [], loading: devicesLoading, lastFetchedAt: devicesLastFetchedAt = 0 } = useSelector((state) => state.devices || {});

  const loading = vehiclesLoading || mutating;
  const [openDialog, setOpenDialog] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsVehicle, setDetailsVehicle] = useState(null);
  const [keyword, setKeyword] = useState('');

  const debouncedKeyword = useDebouncedValue(keyword, 200);
  const devicesById = useMemo(
    () => new Map((Array.isArray(allDevices) ? allDevices : []).filter(Boolean).map((d) => [d.id, d])),
    [allDevices],
  );

  useEffect(() => {
    const now = Date.now();
    if (!vehiclesLastFetchedAt || now - vehiclesLastFetchedAt > STALE_MS) {
      dispatch(fetchVehicles());
    }
    if (!devicesLastFetchedAt || now - devicesLastFetchedAt > STALE_MS) {
      dispatch(fetchAllDevices());
    }
    if (!clientsLastFetchedAt || now - clientsLastFetchedAt > STALE_MS) {
      dispatch(fetchClients());
    }
  }, [clientsLastFetchedAt, devicesLastFetchedAt, dispatch, vehiclesLastFetchedAt]);

  const handleOpenDialog = useCallback(() => {
    setEditingVehicleId(null);
    setOpenDialog(true);
  }, []);

  const handleEditVehicle = useCallback((vehicle) => {
    setEditingVehicleId(vehicle.id);
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingVehicleId(null);
  }, []);

  const handleOpenDeleteConfirmation = useCallback((vehicleId) => {
    setItemToDeleteId(vehicleId);
    setDeleteConfirmationOpen(true);
  }, []);

  const handleCloseDeleteConfirmation = useCallback(() => {
    setDeleteConfirmationOpen(false);
    setItemToDeleteId(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDeleteId) return;
    const result = await dispatch(deleteVehicle(itemToDeleteId));
    if (deleteVehicle.fulfilled.match(result)) {
      handleCloseDeleteConfirmation();
    }
  }, [dispatch, handleCloseDeleteConfirmation, itemToDeleteId]);

  const handleSaveVehicle = useCallback(async ({ vehicleId, vehicleData }) => {
    const result = vehicleId
      ? await dispatch(updateVehicle({ id: vehicleId, vehicleData }))
      : await dispatch(addVehicle(vehicleData));
    if ((vehicleId && updateVehicle.fulfilled.match(result)) || (!vehicleId && addVehicle.fulfilled.match(result))) {
      handleCloseDialog();
      dispatch(fetchVehicles());
      dispatch(fetchAllDevices());
    }
    return result;
  }, [dispatch, handleCloseDialog]);

  const handleOpenDetails = useCallback((vehicle) => {
    setDetailsVehicle(vehicle);
    setDetailsModalOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsModalOpen(false);
    setDetailsVehicle(null);
  }, []);

  const selectedVehicle = useMemo(
    () => (editingVehicleId ? vehicles.find((vehicle) => vehicle.id === editingVehicleId) || null : null),
    [editingVehicleId, vehicles],
  );

  return (
    <>
      <VehiclesTable
        vehicles={vehicles}
        devicesById={devicesById}
        loading={loading}
        error={error}
        keyword={keyword}
        debouncedKeyword={debouncedKeyword}
        onKeywordChange={setKeyword}
        onOpenCreate={handleOpenDialog}
        onEditVehicle={handleEditVehicle}
        onDeleteVehicle={handleOpenDeleteConfirmation}
        onViewVehicle={handleOpenDetails}
        admin={admin}
        t={t}
      />

      {openDialog && (
        <VehicleFormDialog
          open={openDialog}
          onClose={handleCloseDialog}
          onSave={handleSaveVehicle}
          vehicle={selectedVehicle}
          clients={clients}
          clientsLoading={clientsStatus === 'loading'}
          availableDevices={availableDevicesForVehicle}
          availableDevicesLoading={availableDevicesLoading || devicesLoading}
          colors={colors}
          admin={admin}
        />
      )}

      <VehicleDetailsModal open={detailsModalOpen} onClose={handleCloseDetails} vehicle={detailsVehicle} />

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
            color: colors.text,
            zIndex: 12000,
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
          Confirmar Exclusao
        </DialogTitle>
        <DialogContent
          sx={{
            padding: '24px',
            backgroundColor: colors.surface,
          }}
        >
          <Typography sx={{ color: colors.text }}>
            Tem certeza que deseja excluir este veiculo? Esta acao nao pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            padding: '16px 24px',
            backgroundColor: colors.surface,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <Button
            onClick={handleCloseDeleteConfirmation}
            disabled={mutating}
            sx={{ color: colors.textSecondary }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={mutating}
            startIcon={mutating ? <CircularProgress size={20} /> : null}
          >
            {mutating ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const VehiclesPage = () => (
  <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Cadastro de Veículos']}>
    <VehiclesContent />
  </PageLayout>
);

export default VehiclesPage;
