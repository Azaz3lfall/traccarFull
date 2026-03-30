/**
 * Shared position processing utilities for Replay and History modes.
 * Ensures consistent data handling and eliminates divergences.
 */

/**
 * Filters and sorts positions for display on map/reports.
 * Removes invalid coordinates and sorts by time.
 * @param {Array} positions - Raw positions from API
 * @returns {Array} Processed positions
 */
export const processPositions = (positions) => {
  if (!positions || !positions.length) return [];
  return positions
    .filter((p) => p.latitude != null && p.longitude != null
      && !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude))
    .sort((a, b) => new Date(a.fixTime || a.deviceTime || a.serverTime)
      - new Date(b.fixTime || b.deviceTime || b.serverTime));
};
