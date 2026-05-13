/** Presets: day_of_week JS convention — 0 Domingo … 6 Sábado */

export const PRESET_DAYS = {
  weekdays: [1, 2, 3, 4, 5],
  mon_sat: [1, 2, 3, 4, 5, 6],
  all_week: [0, 1, 2, 3, 4, 5, 6],
};

export function generateScheduleGroupId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `g-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** @returns {string|null} HH:mm */
export function normalizeTime(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = Math.min(23, parseInt(m[1], 10));
  const mm = Math.min(59, parseInt(m[2], 10));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Interpreta entrada digitada (ex.: "19", "19:30", "1930") para HH:mm ou null.
 */
export function parseTimeInput(value) {
  if (value == null || String(value).trim() === '') return null;
  const digits = String(value).replace(/\D/g, '').slice(0, 4);
  if (!digits) return null;
  let hh;
  let mm;
  if (digits.length <= 2) {
    hh = parseInt(digits, 10);
    mm = 0;
  } else {
    hh = parseInt(digits.slice(0, 2), 10);
    mm = parseInt(digits.slice(2, 4), 10);
  }
  if (Number.isNaN(hh)) return null;
  hh = Math.min(23, Math.max(0, hh));
  mm = Number.isNaN(mm) ? 0 : Math.min(59, Math.max(0, mm));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Exibe HH:mm armazenado conforme preferência do usuário (API permanece em 24h).
 * @param {string|null|undefined} value24h
 * @param {'24h'|'12h'} mode
 */
export function formatTimeForDisplay(value24h, mode) {
  if (!value24h || mode !== '12h') return value24h ?? '';
  const n = normalizeTime(value24h);
  if (!n) return '';
  const [hs, ms] = n.split(':');
  let h = parseInt(hs, 10);
  const mm = ms;
  const ap = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${mm} ${ap}`;
}

function parseTimeInput12h(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const spaced = String(raw).trim().toUpperCase().replace(/\s+/g, ' ');
  let m = spaced.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!m) {
    const compact = String(raw).trim().toUpperCase().replace(/\s/g, '');
    m = compact.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
  }
  if (m) {
    let h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const ap = m[3];
    if (h < 1 || h > 12 || mm > 59 || Number.isNaN(mm)) return null;
    let hh24 = h;
    if (ap === 'AM') {
      if (h === 12) hh24 = 0;
    } else if (h !== 12) {
      hh24 = h + 12;
    }
    return `${String(hh24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return parseTimeInput(raw);
}

/**
 * @param {string|null|undefined} raw
 * @param {'24h'|'12h'} mode
 */
export function parseTimeInputWithMode(raw, mode) {
  if (mode === '12h') return parseTimeInput12h(raw);
  return parseTimeInput(raw);
}

function arraysEqualSorted(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * @param {number[]} sortedUniqueDays
 * @returns {'weekdays'|'mon_sat'|'all_week'|null}
 */
function matchPreset(sortedUniqueDays) {
  const keys = /** @type {(keyof typeof PRESET_DAYS)[]} */ (['weekdays', 'mon_sat', 'all_week']);
  for (const key of keys) {
    const preset = [...PRESET_DAYS[key]].sort((x, y) => x - y);
    if (arraysEqualSorted(sortedUniqueDays, preset)) return key;
  }
  return null;
}

/**
 * @param {string} recurrence
 * @param {number[]} customDays
 * @returns {number[]} sorted unique days in [0..6]
 */
export function expandRecurrence(recurrence, customDays) {
  if (recurrence === 'custom') {
    const arr = Array.isArray(customDays) ? customDays : [];
    return [...new Set(arr.filter((d) => typeof d === 'number' && d >= 0 && d <= 6))]
      .sort((a, b) => a - b);
  }
  const preset = PRESET_DAYS[recurrence];
  return preset ? [...preset] : [];
}

function minDayForGroup(group) {
  const days = expandRecurrence(group.recurrence, group.customDays);
  return days.length ? Math.min(...days) : 99;
}

/**
 * @param {object} group
 * @returns {ScheduleGroupRow}
 */
export function createDefaultScheduleGroup() {
  return {
    id: generateScheduleGroupId(),
    recurrence: 'weekdays',
    customDays: [],
    lock_time: null,
    unlock_time: null,
    enabled: true,
  };
}

/**
 * Merge ordered groups into 7 rows. Later groups overwrite overlapping days.
 * Neutral rows: enabled false, times null.
 *
 * @param {ScheduleGroupRow[]} groups
 * @returns {{ day_of_week: number, lock_time: string|null, unlock_time: string|null, enabled: boolean }[]}
 */
export function mergeGroupsToSchedules(groups) {
  const rows = Array.from({ length: 7 }, (_, d) => ({
    day_of_week: d,
    lock_time: null,
    unlock_time: null,
    enabled: false,
  }));

  const list = Array.isArray(groups) ? groups : [];
  for (const g of list) {
    if (!g || g.enabled === false) continue;

    const days = expandRecurrence(g.recurrence, g.customDays);
    const lockTime = normalizeTime(g.lock_time);
    const unlockTime = normalizeTime(g.unlock_time);

    for (const dow of days) {
      rows[dow] = {
        day_of_week: dow,
        lock_time: lockTime,
        unlock_time: unlockTime,
        enabled: true,
      };
    }
  }

  return rows;
}

/**
 * Signature for clustering enabled rows (same lock/unlock schedule).
 */
function timeSignature(lockTime, unlockTime) {
  return `${lockTime ?? ''}\u0000${unlockTime ?? ''}`;
}

/**
 * Reconstruct UI groups from API schedules (exactly 7 rows).
 *
 * @param {Array<{ day_of_week: number, lock_time?: string|null, unlock_time?: string|null, enabled?: boolean }>} schedules
 * @returns {ScheduleGroupRow[]}
 */
export function clusterSchedulesToGroups(schedules) {
  if (!Array.isArray(schedules) || schedules.length !== 7) {
    return [createDefaultScheduleGroup()];
  }

  const byDow = {};
  schedules.forEach((r) => {
    const dow = r.day_of_week;
    if (typeof dow === 'number' && dow >= 0 && dow <= 6) {
      byDow[dow] = r;
    }
  });

  /** Days explicitly enabled in stored row */
  const clustersBySig = new Map();

  for (let d = 0; d < 7; d += 1) {
    const r = byDow[d];
    if (!r || r.enabled === false) continue;

    const lockTime = normalizeTime(r.lock_time);
    const unlockTime = normalizeTime(r.unlock_time);
    const sig = timeSignature(lockTime, unlockTime);

    if (!clustersBySig.has(sig)) {
      clustersBySig.set(sig, {
        lock_time: lockTime,
        unlock_time: unlockTime,
        days: [],
      });
    }
    clustersBySig.get(sig).days.push(d);
  }

  if (clustersBySig.size === 0) {
    return [{
      ...createDefaultScheduleGroup(),
      enabled: false,
    }];
  }

  /** @type {ScheduleGroupRow[]} */
  const groups = [];

  clustersBySig.forEach((cluster) => {
    const sortedDays = [...new Set(cluster.days)].sort((a, b) => a - b);
    const preset = matchPreset(sortedDays);
    groups.push({
      id: generateScheduleGroupId(),
      recurrence: preset || 'custom',
      customDays: preset ? [] : sortedDays,
      lock_time: cluster.lock_time,
      unlock_time: cluster.unlock_time,
      enabled: true,
    });
  });

  groups.sort((a, b) => {
    const ma = minDayForGroup(a);
    const mb = minDayForGroup(b);
    if (ma !== mb) return ma - mb;
    const la = expandRecurrence(a.recurrence, a.customDays).length;
    const lb = expandRecurrence(b.recurrence, b.customDays).length;
    return la - lb;
  });

  return groups;
}
