/**
 * Estado visual unificado para ícones de telemetria (lista frota, mapa, etc.).
 * Mantém a mesma regra que DeviceStatusIcons.
 */

export const DEVICE_STATUS_COLORS = {
  active: '#10B981',
  inactive: '#6b7280',
  bad: '#EF4444',
};

const boolOn = (v) => v === true || v === 'true' || v === 1;

const hasAttr = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * @param {Record<string, unknown>} attrs - position.attributes
 * @param {function(string): string} t - i18n
 * @returns {Array<{ key: string, title: string, color: string, opacity: number, value?: string|number|null }>}
 */
export function getDeviceStatusDescriptors(attrs, t) {
  const a = attrs && typeof attrs === 'object' ? attrs : {};

  const list = [];

  const ignition = a.ignition;
  const ignitionKnown = hasAttr(a, 'ignition');
  const ignitionOn = boolOn(ignition);
  const ignBad = ignitionKnown && !ignitionOn;
  const ignActive = ignitionOn;
  list.push({
    key: 'ignition',
    title: t('positionIgnition'),
    ...iconStyle(ignActive, ignBad, false),
  });

  const blocked = a.blocked;
  const armed = a.armed;
  const lock = a.lock;
  const isBlocked = boolOn(blocked);
  const lockActive = (!isBlocked && (boolOn(armed) || boolOn(lock))) || (hasAttr(a, 'blocked') && !isBlocked);
  const lockParts = [
    isBlocked && t('positionBlocked'),
    boolOn(armed) && t('positionArmed'),
    boolOn(lock) && t('alarmLock'),
  ].filter(Boolean);
  const lockTitle = lockParts.length ? lockParts.join(' · ') : t('deviceStatus');
  list.push({
    key: 'lock',
    title: lockTitle,
    ...iconStyle(lockActive, isBlocked, false),
  });

  const battery = a.battery ?? a.batteryLevel;
  const hasBattery = battery != null && battery !== '';
  const batVal = hasBattery ? (a.batteryLevel ?? a.battery) : null;
  list.push({
    key: 'battery',
    title: t('positionBattery'),
    value: batVal,
    ...iconStyle(hasBattery, false, false),
  });

  const power = a.power;
  const hasPowerRaw = power != null && power !== '';
  const powerNum = hasPowerRaw ? Number(power) : NaN;
  const hasPower = hasPowerRaw && !Number.isNaN(powerNum);
  const alarmStr = (a.alarm || '').toString();
  const alarms = alarmStr.split(',').map((x) => String(x).trim().toLowerCase());
  const isPowerCut = alarms.some((x) => x === 'powercut' || x === 'poweroff');
  const noExternalPower = hasPower && powerNum <= 0;

  const rawStatus = a.status;
  const statusNum = rawStatus != null && rawStatus !== '' ? Number(rawStatus) : NaN;
  const hasStatus = !Number.isNaN(statusNum);
  const statusChargeBit = hasStatus && (statusNum & 4) !== 0;
  const statusDisconnectBit = hasStatus && (statusNum & 128) !== 0;

  const hasChargeAttr = hasAttr(a, 'charge');
  const chargeOn = boolOn(a.charge);

  let powerOk = false;
  let powerBad = false;
  if (isPowerCut || statusDisconnectBit) {
    powerBad = true;
  } else if (hasChargeAttr) {
    powerOk = chargeOn;
    powerBad = !chargeOn;
  } else if (hasPower && powerNum > 0) {
    powerOk = true;
  } else if (statusChargeBit && !statusDisconnectBit) {
    powerOk = true;
  } else if (noExternalPower) {
    powerBad = true;
  }

  const powerDisconnected = isPowerCut;
  const powerBadFinal = powerBad || isPowerCut || noExternalPower || statusDisconnectBit;
  list.push({
    key: 'power',
    title: t('positionPower'),
    ...iconStyle(powerOk, powerBadFinal, powerDisconnected),
  });

  const rssi = a.rssi;
  const hasRssi = rssi != null && rssi !== '';
  list.push({
    key: 'rssi',
    title: t('positionRssi'),
    ...iconStyle(hasRssi, false, false),
  });

  return list;
}

function iconStyle(active, bad, disconnected) {
  let color = DEVICE_STATUS_COLORS.inactive;
  if (bad || disconnected) color = DEVICE_STATUS_COLORS.bad;
  else if (active) color = DEVICE_STATUS_COLORS.active;
  const opacity = active || bad || disconnected ? 1 : 0.5;
  return { color, opacity };
}
