import { useMemo } from 'react';
import {
  Key,
  Plug,
  Lock,
  DoorOpen,
  DoorClosed,
} from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from '../../common/components/LocalizationProvider';
import {
  getVehicleTelemetrySnapshot,
  j16SignalBarsFromSat,
} from '../../common/util/vehicleTelemetrySnapshot';

if (typeof document !== 'undefined' && !document.getElementById('j16-door-anim')) {
  const s = document.createElement('style');
  s.id = 'j16-door-anim';
  s.textContent = '@keyframes j16pulse{0%,100%{opacity:1}50%{opacity:.4}}';
  document.head.appendChild(s);
}

const ICO_SIZE = 14;

const SignalBarsSvg = ({ sat, activeColor, inactiveColor }) => {
  const bars = j16SignalBarsFromSat(sat);
  const rects = [];
  for (let i = 0; i < 5; i += 1) {
    const h = (i + 1) * 2.2;
    rects.push(
      <rect
        key={i}
        x={i * 4}
        y={12 - h}
        width={3}
        height={h}
        rx={0.5}
        fill={i < bars ? activeColor : inactiveColor}
      />,
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={21} height={12} viewBox="0 0 21 12">
      {rects}
    </svg>
  );
};

const BatteryGlyph = ({ level }) => {
  const c = level < 20 ? '#dc2626' : level < 40 ? '#d97706' : '#16a34a';
  const w = Math.max(1, Math.round((level / 100) * 13));
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={20} height={12} viewBox="0 0 22 12">
      <rect x="0" y="1" width="18" height="10" rx="2" stroke={c} strokeWidth="1.5" fill="none" />
      <rect x="18" y="3.5" width="3" height="5" rx="1" fill={c} />
      <rect x="1.5" y="2.5" width={w} height="7" rx="1" fill={c} />
    </svg>
  );
};

/**
 * Faixa compacta: ignição, bloqueio, bateria, carga, sat, ADC1, porta (último ícone, só ícone).
 */
const VehicleTelemetryStatusBar = ({ position, device, compact = false }) => {
  const t = useTranslation();
  const snap = useMemo(
    () => getVehicleTelemetrySnapshot(position?.attributes, device, t),
    [position, device, t],
  );

  const { showDoor, doorOpen, lockDesc } = snap;

  const bg = !showDoor
    ? 'rgba(71,85,105,0.06)'
    : doorOpen === true
      ? 'rgba(220,38,38,0.10)'
      : doorOpen === false
        ? 'rgba(22,163,74,0.08)'
        : 'rgba(71,85,105,0.06)';
  const border = !showDoor
    ? '1px solid rgba(148,163,184,0.2)'
    : doorOpen === true
      ? '1px solid rgba(220,38,38,0.22)'
      : doorOpen === false
        ? '1px solid rgba(22,163,74,0.18)'
        : '1px solid rgba(148,163,184,0.2)';

  const inactiveBar = 'rgba(148,163,184,0.35)';

  const lockTip = lockDesc
    ? (lockDesc.value != null ? `${lockDesc.title}: ${lockDesc.value}` : lockDesc.title)
    : t('deviceStatus');
  const lockColor = lockDesc?.color || '#9ca3af';
  const lockOpacity = lockDesc?.opacity ?? 0.5;

  const doorTip = !showDoor
    ? ''
    : doorOpen === true
      ? t('positionDoorOpen')
      : doorOpen === false
        ? t('positionDoorClosed')
        : t('sharedNoData');

  const ignColor = snap.ignition ? '#16a34a' : '#dc2626';
  const plugColor = snap.charge ? '#16a34a' : '#9ca3af';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 6 : 10,
        padding: compact ? '6px 8px' : '8px 12px',
        borderRadius: 8,
        backgroundColor: bg,
        border,
        flexWrap: 'wrap',
        boxSizing: 'border-box',
        width: '100%',
        justifyContent: 'flex-start',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        <Tooltip title={t('positionIgnition')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: ignColor }}>
            <Key size={ICO_SIZE} strokeWidth={2} />
          </span>
        </Tooltip>
        <Tooltip title={lockTip}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: lockColor, opacity: lockOpacity }}>
            <Lock size={ICO_SIZE} strokeWidth={2.25} />
          </span>
        </Tooltip>
        {snap.batteryLevel != null && (
          <Tooltip title={`${t('positionBattery')}: ${snap.batteryLevel}%`}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <BatteryGlyph level={snap.batteryLevel} />
              <small
                style={{
                  color: snap.batteryLevel < 20 ? '#dc2626' : snap.batteryLevel < 40 ? '#d97706' : '#94a3b8',
                }}
              >
                {snap.batteryLevel}%
              </small>
            </span>
          </Tooltip>
        )}
        <Tooltip title={t('positionPower')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: plugColor }}>
            <Plug size={ICO_SIZE} strokeWidth={2} />
          </span>
        </Tooltip>
        <Tooltip title={t('positionRssi')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <SignalBarsSvg sat={snap.sat} activeColor="#16a34a" inactiveColor={inactiveBar} />
            <small style={{ color: '#94a3b8' }}>{snap.sat}sat</small>
          </span>
        </Tooltip>
        {snap.adc1 != null && (
          <Tooltip title="ADC1">
            <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 11 }}>{snap.adc1.toFixed(1)}V</span>
          </Tooltip>
        )}
        {showDoor && (
          <Tooltip title={doorTip}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                lineHeight: 0,
                color: doorOpen === true ? '#dc2626' : doorOpen === false ? '#16a34a' : '#64748b',
                opacity: doorOpen === null ? 0.75 : 1,
              }}
            >
              {doorOpen === true ? (
                <DoorOpen size={ICO_SIZE} style={{ animation: 'j16pulse 1s infinite' }} strokeWidth={2} />
              ) : doorOpen === false ? (
                <DoorClosed size={ICO_SIZE} strokeWidth={2} />
              ) : (
                <DoorClosed size={ICO_SIZE} strokeWidth={2} />
              )}
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default VehicleTelemetryStatusBar;
