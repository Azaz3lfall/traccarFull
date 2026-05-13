import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Key,
  Lock,
  Battery,
  Plug,
  Signal,
  DoorOpen,
  DoorClosed,
} from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { getDeviceStatusDescriptors } from '../../common/util/deviceStatusFromAttributes';

// Inject door-open pulse animation once when this module is first loaded
if (typeof document !== 'undefined' && !document.getElementById('j16-door-anim')) {
  const s = document.createElement('style');
  s.id = 'j16-door-anim';
  s.textContent = '@keyframes j16pulse{0%,100%{opacity:1}50%{opacity:.4}}';
  document.head.appendChild(s);
}

const ICON_SIZE = 16;
const DOOR_ICON_SIZE = 17;

const ICON_BY_KEY = {
  ignition: Key,
  lock: Lock,
  battery: Battery,
  power: Plug,
  rssi: Signal,
};

const DeviceStatusIcons = ({ position, device }) => {
  const t = useTranslation();

  // Single source of truth: door state confirmed by SocketController and stored in Redux.
  // SocketController seeds on first authoritative packet (no event) and fires events
  // only on genuine transitions — so this value never flips on GPS-only packets.
  const doorIsOpen = useSelector((state) => (
    device?.model === 'J16+' ? state.session.doorStates?.[device.id] : undefined
  ));

  const descriptors = useMemo(() => {
    const attrs = position?.attributes || {};
    return getDeviceStatusDescriptors(attrs, t);
  }, [position, t]);

  const doorInfo = useMemo(() => {
    if (device?.model !== 'J16+') return null;
    if (doorIsOpen === undefined || doorIsOpen === null) return null;
    return {
      isOpen: doorIsOpen,
      label: doorIsOpen ? t('positionDoorOpen') : t('positionDoorClosed'),
    };
  }, [device, doorIsOpen, t]);

  if (!position) {
    return <span style={{ color: '#6b7280', fontSize: '12px' }}>-</span>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      {doorInfo && (
        <Tooltip title={doorInfo.label}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: doorInfo.isOpen ? 'rgba(220,38,38,0.12)' : 'rgba(22,163,74,0.10)',
            borderRadius: '4px',
            padding: '1px 4px',
          }}>
            {doorInfo.isOpen
              ? <DoorOpen size={DOOR_ICON_SIZE} color="#dc2626" style={{ animation: 'j16pulse 1s infinite' }} />
              : <DoorClosed size={DOOR_ICON_SIZE} color="#16a34a" />}
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: doorInfo.isOpen ? '#dc2626' : '#16a34a',
              letterSpacing: '0.3px',
            }}>
              {doorInfo.isOpen ? t('positionDoorOpen') : t('positionDoorClosed')}
            </span>
          </span>
        </Tooltip>
      )}
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
