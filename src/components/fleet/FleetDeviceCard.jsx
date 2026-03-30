import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
  Avatar,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Typography,
} from '@mui/material';
import { fleetActions } from '../../store';
import { formatStatus } from '../../common/util/formatter';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';
import { useAttributePreference } from '../../common/util/preferences';
import DeviceStatusIcons from '../../settings/components/DeviceStatusIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme) => ({
  icon: {
    width: '28px',
    height: '28px',
    objectFit: 'contain',
    filter: 'brightness(0) invert(1)',
  },
  batteryText: {
    fontSize: '0.75rem',
    fontWeight: 'normal',
    lineHeight: '0.875rem',
  },
  success: {
    color: theme.palette.success.main,
  },
  warning: {
    color: theme.palette.warning.main,
  },
  error: {
    color: theme.palette.error.main,
  },
  neutral: {
    color: theme.palette.neutral.main,
  },
  selected: {
    backgroundColor: theme.palette.action.selected,
  },
  navigationButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '8px',
  },
}));

const FleetDeviceCard = memo(({ item, index, desktop, style }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const selectedPlate = useSelector((state) => state.fleet.selectedPlate);
  
  const devicePrimary = useAttributePreference('devicePrimary', 'name');

  // Obter primeiro dispositivo para exibição na lista
  const currentDevice = useMemo(() => {
    if (!item?.devices || item.devices.length === 0) return null;
    const deviceId = item.devices[0]?.id;
    if (!deviceId) return null;
    return devices[deviceId];
  }, [item, devices]);

  // Obter posição atual
  const currentPosition = useMemo(() => {
    if (!currentDevice) return null;
    return positions[currentDevice.id];
  }, [currentDevice, positions]);

  const deviceCount = item?.devices?.length || 0;
  const isSelected = item.plate === selectedPlate;

  // Selecionar veículo ao clicar no card
  const handleCardClick = useCallback(() => {
    dispatch(fleetActions.setSelectedPlate(item.plate));
  }, [dispatch, item.plate]);

  const secondaryText = () => {
    if (!currentDevice) {
      return item.client_name || '';
    }
    
    let status;
    if (currentDevice.status === 'online' || !currentDevice.lastUpdate) {
      status = formatStatus(currentDevice.status, t);
    } else {
      status = dayjs(currentDevice.lastUpdate).fromNow();
    }
    
    const parts = [];
    if (item.client_name) {
      parts.push(item.client_name);
    }
    if (deviceCount > 1) {
      parts.push(`${deviceCount} dispositivos`);
    }
    parts.push(status);
    
    return (
      <>
        {parts.join(' • ')}
      </>
    );
  };

  const primaryText = () => {
    if (currentDevice) {
      return currentDevice[devicePrimary] || currentDevice.name || item.plate;
    }
    return item.plate;
  };

  return (
    <div style={style || {}}>
      <ListItemButton
        onClick={handleCardClick}
        selected={isSelected}
        className={isSelected ? classes.selected : null}
      >
        <ListItemAvatar>
          <Avatar>
            {currentDevice ? (
              <img 
                className={classes.icon} 
                src={mapIcons[mapIconKey(currentDevice.category)]} 
                alt="" 
              />
            ) : (
              <img 
                className={classes.icon} 
                src={mapIcons[mapIconKey('default')] || mapIcons[mapIconKey('car')]} 
                alt="" 
              />
            )}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={primaryText()}
          secondary={secondaryText()}
          slots={{
            primary: Typography,
            secondary: Typography,
          }}
          slotProps={{
            primary: { noWrap: true },
            secondary: { noWrap: true },
          }}
        />
        {currentPosition && currentDevice && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8, flexShrink: 0 }}>
            <DeviceStatusIcons position={currentPosition} />
          </div>
        )}
      </ListItemButton>
    </div>
  );
});

FleetDeviceCard.displayName = 'FleetDeviceCard';

export default FleetDeviceCard;
