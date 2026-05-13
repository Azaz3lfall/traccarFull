import { useMemo, useCallback, memo } from 'react';
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
  selected: {
    backgroundColor: theme.palette.action.selected,
  },
}));

const FleetDeviceCard = memo(({ item, desktop, style }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const selectedPlate = useSelector((state) => state.fleet.selectedPlate);

  const devicePrimary = useAttributePreference('devicePrimary', 'name');

  // Pick the device with the most recent communication (same logic as FloatingFleetList)
  const { currentDevice, currentPosition } = useMemo(() => {
    const ids = item.deviceIds
      || (item.devices?.map((d) => d.id))
      || (item.device_id ? [item.device_id] : []);

    if (ids.length === 0) return { currentDevice: null, currentPosition: null };

    const candidates = ids
      .map((id) => ({ device: devices[id], position: positions[id] }))
      .filter((c) => c.device);

    if (candidates.length === 0) return { currentDevice: null, currentPosition: null };

    // Sort by most recent communication
    candidates.sort((a, b) => {
      const getTime = ({ device, position }) => {
        const ts = device?.lastUpdate || position?.serverTime || position?.deviceTime || position?.fixTime;
        if (!ts) return 0;
        const d = dayjs(ts);
        return d.isValid() ? d.valueOf() : 0;
      };
      return getTime(b) - getTime(a);
    });

    return { currentDevice: candidates[0].device, currentPosition: candidates[0].position };
  }, [item, devices, positions]);

  const deviceCount = item?.devices?.length || (item.deviceIds?.length) || (item.device_id ? 1 : 0);
  const isSelected = item.plate === selectedPlate;

  const handleCardClick = useCallback(() => {
    dispatch(fleetActions.setSelectedPlate(item.plate));
  }, [dispatch, item.plate]);

  const secondaryText = () => {
    if (!currentDevice) return item.client_name || '';

    let status;
    if (currentDevice.status === 'online' || !currentDevice.lastUpdate) {
      status = formatStatus(currentDevice.status, t);
    } else {
      status = dayjs(currentDevice.lastUpdate).fromNow();
    }

    const parts = [];
    if (item.client_name) parts.push(item.client_name);
    if (deviceCount > 1) parts.push(`${deviceCount} dispositivos`);
    parts.push(status);

    return parts.join(' • ');
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
              <img className={classes.icon} src={mapIcons[mapIconKey(currentDevice.category)]} alt="" />
            ) : (
              <img className={classes.icon} src={mapIcons[mapIconKey('default')] || mapIcons[mapIconKey('car')]} alt="" />
            )}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={primaryText()}
          secondary={secondaryText()}
          slots={{ primary: Typography, secondary: Typography }}
          slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
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
