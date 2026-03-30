/**
 * Map style defaults — keep in sync with ids in useMapStyles.js (excluding `custom`).
 *
 * Traccar server (recommended for new users):
 * - Admin → Server: set attribute `activeMapStyles` to the same value as DEFAULT_ACTIVE_MAP_STYLES (full CSV).
 * - Set server default `map` (or user template) to DEFAULT_MAP_ID (`locationIqStreets`) or `openFreeMap`.
 * - If your build supports it, enable server "force settings" so every client inherits these without per-user setup.
 * - Existing users: optional SQL/JSON update on `tc_users` for `map` and `attributes` → `activeMapStyles` if you need a mass fix.
 */

export const DEFAULT_MAP_ID = 'locationIqStreets';

/** @type {readonly string[]} */
const ACTIVE_STYLE_IDS = [
  'openFreeMap',
  'locationIqStreets',
  'locationIqDark',
  'osm',
  'openTopoMap',
  'carto',
  'googleRoad',
  'googleSatellite',
  'googleHybrid',
  'mapTilerBasic',
  'mapTilerHybrid',
  'bingRoad',
  'bingAerial',
  'bingHybrid',
  'tomTomBasic',
  'hereBasic',
  'hereHybrid',
  'hereSatellite',
  'autoNavi',
  'ordnanceSurvey',
  'mapboxStreets',
  'mapboxStreetsDark',
  'mapboxOutdoors',
  'mapboxSatelliteStreet',
];

export const DEFAULT_ACTIVE_MAP_STYLES = ACTIVE_STYLE_IDS.join(',');

export function activeMapStylesContains(activeMapStylesCsv, styleId) {
  if (!activeMapStylesCsv || !styleId) {
    return false;
  }
  return activeMapStylesCsv
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .includes(styleId);
}

/**
 * @param {string} selectedId
 * @param {{ id: string }[]} filteredStyles - available styles allowed by activeMapStyles
 * @returns {{ id: string, style?: unknown } | undefined}
 */
export function resolveAppliedMapStyle(selectedId, filteredStyles) {
  if (!filteredStyles?.length) {
    return undefined;
  }
  const byId = (id) => filteredStyles.find((s) => s.id === id);
  if (selectedId && byId(selectedId)) {
    return byId(selectedId);
  }
  return (
    byId(DEFAULT_MAP_ID)
    || byId('openFreeMap')
    || filteredStyles[0]
  );
}
