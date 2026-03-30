import { useMemo } from 'react';
import { Key, Lock, Battery, Plug, Signal } from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { getDeviceStatusDescriptors } from '../../common/util/deviceStatusFromAttributes';

const ICON_SIZE = 16;

const ICON_BY_KEY = {
  ignition: Key,
  lock: Lock,
  battery: Battery,
  power: Plug,
  rssi: Signal,
};

const DeviceStatusIcons = ({ position }) => {
  const t = useTranslation();

  const descriptors = useMemo(() => {
    const attrs = position?.attributes || {};
    return getDeviceStatusDescriptors(attrs, t);
  }, [position, t]);

  if (!position) {
    return <span style={{ color: '#6b7280', fontSize: '12px' }}>-</span>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      {descriptors.map(({ key, title, color, opacity, value }) => {
        const Icon = ICON_BY_KEY[key];
        if (!Icon) return null;
        return (
          <Tooltip
            key={key}
            title={value != null ? `${title}: ${value}` : title}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Icon
                size={ICON_SIZE}
                color={color}
                style={{ opacity }}
              />
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default DeviceStatusIcons;
