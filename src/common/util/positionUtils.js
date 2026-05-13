/**
 * Shared position processing utilities for Replay and History modes.
 * Ensures consistent data handling and eliminates divergences.
 */

const EARTH_RADIUS_M = 6371000;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Conservative upper bound: 300 km/h covers emergency vehicles, motorbikes, etc.
// Points that would require a higher speed from the previous accepted point are
// treated as GPS teleports and dropped.
const MAX_SPEED_MS = 300 / 3.6;

function positionTime(p) {
  return new Date(p.fixTime || p.deviceTime || p.serverTime);
}

/**
 * Filters and sorts positions for display on map/reports.
 * - Drops null/NaN coordinates
 * - Drops null-island (0,0) fixes
 * - Drops positions explicitly marked valid:false by Traccar
 * - Sorts by fixTime (fallback deviceTime → serverTime)
 * - Drops teleport points: any point implying > 300 km/h from the last
 *   accepted point is skipped (GPS multipath / buffer-flush artefacts)
 *
 * @param {Array} positions - Raw positions from API
 * @returns {Array} Processed positions
 */
export const processPositions = (positions) => {
  if (!positions || !positions.length) return [];

  const sorted = positions
    .filter((p) => {
      if (p.latitude == null || p.longitude == null) return false;
      if (Number.isNaN(p.latitude) || Number.isNaN(p.longitude)) return false;
      if (Math.abs(p.latitude) < 0.001 && Math.abs(p.longitude) < 0.001) return false;
      if (p.valid === false) return false;
      return true;
    })
    .sort((a, b) => positionTime(a) - positionTime(b));

  const result = [];
  for (const p of sorted) {
    if (result.length === 0) {
      result.push(p);
      continue;
    }
    const prev = result[result.length - 1];
    const dt = (positionTime(p) - positionTime(prev)) / 1000;
    if (dt <= 0) continue;
    const dist = haversineDistance(prev.latitude, prev.longitude, p.latitude, p.longitude);
    if (dist / dt > MAX_SPEED_MS) continue;
    result.push(p);
  }
  return result;
};
