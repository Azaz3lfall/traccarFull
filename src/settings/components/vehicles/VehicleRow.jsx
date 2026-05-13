import { memo, useMemo } from 'react';
import { Box, IconButton, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import deviceCategories from '../../../common/util/deviceCategories';
import { mapIconKey, mapIcons } from '../../../map/core/preloadImages';
import { vehicleTypeToIcon } from '../../../common/util/vehicleTypeIcon';
import DeviceStatusIcons from '../DeviceStatusIcons';

const getVehicleDeviceIds = (vehicle) => {
  if (Array.isArray(vehicle?.deviceIds) && vehicle.deviceIds.length > 0) {
    return vehicle.deviceIds;
  }
  if (Array.isArray(vehicle?.devices)) {
    return vehicle.devices.map((d) => (d && typeof d === 'object' && d.id != null ? d.id : d)).filter((id) => id != null);
  }
  return vehicle?.device_id != null ? [vehicle.device_id] : [];
};

const VehicleRow = ({
  vehicle,
  devicesById,
  onViewVehicle,
  onEditVehicle,
  onDeleteVehicle,
  admin,
  t,
}) => {
  const deviceIds = useMemo(() => getVehicleDeviceIds(vehicle), [vehicle]);

  const mostRecentPosition = useSelector((state) => {
    const positions = state.session.positions || {};
    let bestPosition = null;
    let bestTime = 0;

    for (const id of deviceIds) {
      const pos = positions[id];
      if (!pos) continue;
      const currentTime = new Date(pos.fixTime).valueOf() || 0;
      if (currentTime > bestTime) {
        bestTime = currentTime;
        bestPosition = pos;
      }
    }

    return bestPosition;
  });

  const vehicleType = useMemo(() => (
    vehicle?.vehicle_type && deviceCategories.includes(vehicle.vehicle_type)
      ? vehicle.vehicle_type
      : vehicleTypeToIcon(vehicle?.vehicle_type) || 'default'
  ), [vehicle?.vehicle_type]);

  const hasAnyDevice = deviceIds.some((id) => devicesById.has(id));

  return (
    <TableRow key={vehicle?.id}>
      <TableCell>{(vehicle?.plate || '').toString()}</TableCell>
      <TableCell>{(vehicle?.nickname || '-').toString()}</TableCell>
      <TableCell>{(vehicle?.client_name || '-').toString()}</TableCell>
      <TableCell>{(vehicle?.make || '-').toString()}</TableCell>
      <TableCell>{(vehicle?.model || '-').toString()}</TableCell>
      <TableCell>{(vehicle?.year || '-').toString()}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            component="img"
            src={mapIcons[mapIconKey(vehicleType)]}
            alt=""
            sx={{ width: 24, height: 24, objectFit: 'contain' }}
          />
          <Typography variant="body2">
            {t(`category${String(vehicleType).replace(/^\w/, (c) => c.toUpperCase())}`)}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        {hasAnyDevice && mostRecentPosition ? (
          <DeviceStatusIcons position={mostRecentPosition} />
        ) : (
          <Typography variant="body2" color="text.secondary">-</Typography>
        )}
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Ver detalhes" arrow>
            <IconButton
              size="small"
              onClick={() => onViewVehicle(vehicle)}
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
              onClick={() => onEditVehicle(vehicle)}
              sx={{
                color: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1.5px solid rgba(59, 130, 246, 0.5)',
                borderRadius: '6px',
                padding: '6px',
                minWidth: '32px',
                minHeight: '32px',
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {admin && (
            <Tooltip title="Excluir veículo" arrow>
              <IconButton
                size="small"
                onClick={() => onDeleteVehicle(vehicle.id)}
                color="error"
                sx={{ borderRadius: '6px', padding: '6px', minWidth: '32px', minHeight: '32px' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default memo(VehicleRow);
