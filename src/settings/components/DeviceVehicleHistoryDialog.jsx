import { useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { fetchVehicles } from '../../store';

const DEFAULT_HISTORY_Z = 99999;

const DeviceVehicleHistoryDialog = ({ open, onClose, deviceId, dialogZIndex = DEFAULT_HISTORY_Z }) => {
  const t = useTranslation();
  const dispatch = useDispatch();
  const vehicles = useSelector((state) => state.fleet.vehicles) || [];
  const loading = useSelector((state) => state.fleet.vehiclesLoading);

  useEffect(() => {
    if (open) {
      dispatch(fetchVehicles());
    }
  }, [open, dispatch]);

  const linkedVehicles = useMemo(() => {
    if (!deviceId || !Array.isArray(vehicles)) return [];
    return vehicles.filter((v) => {
      const ids = v.deviceIds || (v.devices?.map((d) => d.id)) || (v.device_id != null ? [v.device_id] : []);
      return ids.includes(deviceId);
    });
  }, [vehicles, deviceId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ root: { sx: { zIndex: dialogZIndex } } }}
    >
      <DialogTitle>{t('deviceVehicleHistory')}</DialogTitle>
      <DialogContent>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
            <CircularProgress size={32} />
          </div>
        ) : linkedVehicles.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            {t('deviceNoLinkedVehicles')}
          </p>
        ) : (
          <List dense>
            {linkedVehicles.map((v) => (
              <ListItem key={v.id}>
                <ListItemText
                  primary={v.plate}
                  secondary={[v.nickname, v.client_name].filter(Boolean).join(' • ') || v.model || '-'}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeviceVehicleHistoryDialog;
