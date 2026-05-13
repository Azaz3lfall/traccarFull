import { getDeviceStatusDescriptors } from './deviceStatusFromAttributes';

/**
 * Telemetria base (ignição, bateria, carga, sat, adc1) — alinhada a public/j16-door-status.js.
 */
export function getBaseTelemetry(attrs) {
  const a = attrs && typeof attrs === 'object' ? attrs : {};
  return {
    ignition: a.ignition === true,
    batteryLevel: typeof a.batteryLevel === 'number' ? a.batteryLevel : null,
    charge: a.charge === true,
    sat: typeof a.sat === 'number' ? a.sat : 0,
    adc1: typeof a.adc1 === 'number' ? a.adc1 : null,
  };
}

/** Mesma escala de barras que icoSignal no j16-door-status.js */
export function j16SignalBarsFromSat(sat) {
  const n = typeof sat === 'number' && !Number.isNaN(sat) ? sat : 0;
  if (n === 0) return 0;
  if (n < 3) return 1;
  if (n < 6) return 2;
  if (n < 9) return 3;
  if (n < 12) return 4;
  return 5;
}

const hasAttr = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function isSharedUnknownDoorValue(dv, unknownText) {
  if (dv === 'sharedUnknown' || dv === unknownText) return true;
  if (typeof dv !== 'string') return false;
  const s = dv.trim();
  return s === unknownText || s.toLowerCase() === 'sharedunknown' || s === '';
}

/**
 * Porta: boolean direto (e interceptor), io1, fio aterrado sem chave `door`, ou sharedUnknown + doorSensorMode.
 * @returns {{ showDoor: boolean, doorOpen: boolean | null }}
 */
export function resolveDoorDisplay(attrs, device, t) {
  const a = attrs && typeof attrs === 'object' ? attrs : {};
  const unknownText = t('sharedUnknown');
  const isJ16 = device?.model === 'J16+';
  const hasSensorMode = isJ16 && device?.attributes != null
    && Object.prototype.hasOwnProperty.call(device.attributes, 'doorSensorMode');
  const doorSensorMode = String(device?.attributes?.doorSensorMode ?? '1');

  if (hasAttr(a, 'door')) {
    const dv = a.door;
    if (typeof dv === 'boolean') {
      return { showDoor: true, doorOpen: dv };
    }
    if (dv === true || dv === 'true' || dv === 1) {
      return { showDoor: true, doorOpen: true };
    }
    if (dv === false || dv === 'false' || dv === 0) {
      return { showDoor: true, doorOpen: false };
    }
    if (hasSensorMode && (isSharedUnknownDoorValue(dv, unknownText) || typeof dv === 'string')) {
      const isGrounded = false;
      if (doorSensorMode === '2' || doorSensorMode === 2) {
        return { showDoor: true, doorOpen: isGrounded ? false : true };
      }
      return { showDoor: true, doorOpen: isGrounded ? true : false };
    }
    if (hasSensorMode) {
      if (doorSensorMode === '2' || doorSensorMode === 2) {
        return { showDoor: true, doorOpen: true };
      }
      return { showDoor: true, doorOpen: false };
    }
    return { showDoor: false, doorOpen: null };
  }

  if (hasAttr(a, 'io1')) {
    return { showDoor: true, doorOpen: a.io1 === false };
  }

  if (hasSensorMode && !hasAttr(a, 'door')) {
    const isGrounded = true;
    if (doorSensorMode === '2' || doorSensorMode === 2) {
      return { showDoor: true, doorOpen: isGrounded ? false : true };
    }
    return { showDoor: true, doorOpen: isGrounded ? true : false };
  }

  if (isJ16) {
    return { showDoor: true, doorOpen: null };
  }

  return { showDoor: false, doorOpen: null };
}

/**
 * Snapshot completo para faixa de status (UI unificada).
 */
export function getVehicleTelemetrySnapshot(attrs, device, t) {
  const base = getBaseTelemetry(attrs);
  const door = resolveDoorDisplay(attrs, device, t);
  const descriptors = getDeviceStatusDescriptors(attrs && typeof attrs === 'object' ? attrs : {}, t);
  const lockDesc = descriptors.find((d) => d.key === 'lock') || null;
  return {
    ...base,
    showDoor: door.showDoor,
    doorOpen: door.doorOpen,
    lockDesc,
  };
}

const escAttr = (str) => String(str ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
  .replace(/</g, '&lt;');

/** HTML da faixa inferior do popup do mapa (paridade com VehicleTelemetryStatusBar). */
export function buildVehicleTelemetryPopupRowHtml(attrs, device, t, borderColor, secondaryColor) {
  const snap = getVehicleTelemetrySnapshot(attrs, device || {}, t);
  const doorOpen = snap.doorOpen;
  const showDoor = snap.showDoor;

  const doorSvg14 = doorOpen === true
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#dc2626"><path d="M19 19V3L5 3v16H3v2h18v-2h-2zM13 13v-2h-2v2H9V7h6v6h-2z"/></svg>'
    : doorOpen === false
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#16a34a"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#64748b"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';

  const doorTip = !showDoor
    ? ''
    : doorOpen === true
      ? escAttr(t('positionDoorOpen'))
      : doorOpen === false
        ? escAttr(t('positionDoorClosed'))
        : escAttr(t('sharedNoData'));
  const bg = !showDoor
    ? 'rgba(71,85,105,0.06)'
    : doorOpen === true
      ? 'rgba(220,38,38,0.10)'
      : doorOpen === false
        ? 'rgba(22,163,74,0.08)'
        : 'rgba(71,85,105,0.06)';

  const keyFill = snap.ignition ? '#16a34a' : '#dc2626';
  const keySvg = `<span title="${escAttr(t('positionIgnition'))}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${keyFill}"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg></span>`;

  const ld = snap.lockDesc;
  const lockTitle = ld && (ld.value != null ? `${ld.title}: ${ld.value}` : ld.title);
  const lockColor = ld ? ld.color : '#9ca3af';
  const lockOp = ld ? ld.opacity : 0.5;
  const lockInner = '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
  const lockSvg = `<span title="${escAttr(lockTitle || t('deviceStatus'))}" style="opacity:${lockOp};line-height:0;display:inline-flex;align-items:center"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${lockColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${lockInner}</svg></span>`;

  let batHtml = '';
  if (snap.batteryLevel != null) {
    const bl = snap.batteryLevel;
    const c = bl < 20 ? '#dc2626' : bl < 40 ? '#d97706' : '#16a34a';
    const w = Math.max(1, Math.round((bl / 100) * 13));
    batHtml = `<span style="display:inline-flex;align-items:center;gap:3px" title="${escAttr(`${t('positionBattery')}: ${bl}%`)}">`
      + `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 22 12">`
      + `<rect x="0" y="1" width="18" height="10" rx="2" stroke="${c}" stroke-width="1.5" fill="none"/>`
      + `<rect x="18" y="3.5" width="3" height="5" rx="1" fill="${c}"/>`
      + `<rect x="1.5" y="2.5" width="${w}" height="7" rx="1" fill="${c}"/>`
      + `</svg><small style="color:${bl < 20 ? '#dc2626' : bl < 40 ? '#d97706' : secondaryColor}">${bl}%</small></span>`;
  }

  const plugFill = snap.charge ? '#16a34a' : '#9ca3af';
  const plugSvg = `<span title="${escAttr(t('positionPower'))}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${plugFill}"><path d="M16 7V3h-2v4h-4V3H8v4c0 2.21 1.79 4 4 4v5c0 .55-.45 1-1 1H9c-.55 0-1-.45-1-1v-3H6v3c0 1.66 1.34 3 3 3h2v3h2v-3h2c1.66 0 3-1.34 3-3v-3h-2v3c0 .55-.45 1-1 1h-2v-5c2.21 0 4-1.79 4-4z"/></svg></span>`;

  const bars = j16SignalBarsFromSat(snap.sat);
  let signalRects = '';
  for (let i = 0; i < 5; i += 1) {
    const h = (i + 1) * 2.2;
    const fill = i < bars ? '#16a34a' : 'rgba(148,163,184,0.35)';
    signalRects += `<rect x="${i * 4}" y="${12 - h}" width="3" height="${h}" rx="0.5" fill="${fill}"/>`;
  }
  const satHtml = `<span style="display:inline-flex;align-items:center;gap:3px" title="${escAttr(t('positionRssi'))}">`
    + `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="12" viewBox="0 0 21 12">${signalRects}</svg>`
    + `<small style="color:${secondaryColor}">${snap.sat}sat</small></span>`;

  const adcHtml = snap.adc1 != null
    ? `<span style="color:#3b82f6;font-weight:700;font-size:11px" title="ADC1">${snap.adc1.toFixed(1)}V</span>`
    : '';

  const doorHtml = showDoor
    ? `<span title="${doorTip}" style="line-height:0;display:inline-flex;align-items:center">${doorSvg14}</span>`
    : '';

  const sensors = `${keySvg}${lockSvg}${batHtml}${plugSvg}${satHtml}${adcHtml}${doorHtml}`;

  return `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:6px;padding:8px 10px;border-top:1px solid ${borderColor};border-radius:0 0 8px 8px;background:${bg};justify-content:flex-start;">`
    + `<span style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:10px;font-weight:600">${sensors}</span>`
    + `</div>`;
}

/** @deprecated use getBaseTelemetry */
export function getJ16TelemetrySnapshot(attrs) {
  return getBaseTelemetry(attrs);
}
