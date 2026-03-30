/**
 * Shared stop detection algorithm used by MapStopMarkers and HistoryPanel.
 * Ensures consistent stop counts between Replay and History views.
 */
const STOP_SPEED_THRESHOLD = 1.0; // knots - max speed to consider stopped
const MIN_STOP_DURATION = 60000; // 1 minute in ms - min duration for a stop
const STOP_DISTANCE_THRESHOLD = 50; // meters - max distance between positions to consider same stop

const parseTime = (position) => {
  const t = position.fixTime || position.deviceTime || position.serverTime;
  return t ? new Date(t).getTime() : null;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Identifies stops in a sequence of positions.
 * @param {Array} positions - Array of position objects with latitude, longitude, speed, fixTime/deviceTime/serverTime
 * @returns {Array} Stops with { startIndex, endIndex, startTime, endTime, latitude, longitude, positions, duration }
 */
export const identifyStops = (positions) => {
  if (!positions || positions.length === 0) return [];

  const stops = [];
  let currentStop = null;

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    const speed = position.speed || 0;
    const t = parseTime(position);

    if (speed <= STOP_SPEED_THRESHOLD && t != null) {
      if (!currentStop) {
        currentStop = {
          startIndex: i,
          startTime: t,
          latitude: position.latitude,
          longitude: position.longitude,
          positions: [position],
        };
      } else {
        const lastPos = currentStop.positions[currentStop.positions.length - 1];
        const distance = calculateDistance(
          lastPos.latitude,
          lastPos.longitude,
          position.latitude,
          position.longitude
        );

        if (distance <= STOP_DISTANCE_THRESHOLD) {
          currentStop.positions.push(position);
          currentStop.latitude = position.latitude;
          currentStop.longitude = position.longitude;
          currentStop.endTime = t;
        } else {
          const lastPosInStop = currentStop.positions[currentStop.positions.length - 1];
          currentStop.endTime = parseTime(lastPosInStop) ?? currentStop.startTime;
          if (currentStop.endTime - currentStop.startTime >= MIN_STOP_DURATION) {
            stops.push({
              ...currentStop,
              endIndex: i - 1,
              duration: currentStop.endTime - currentStop.startTime,
            });
          }
          currentStop = {
            startIndex: i,
            startTime: t,
            latitude: position.latitude,
            longitude: position.longitude,
            positions: [position],
          };
        }
      }
    } else {
      if (currentStop) {
        const lastPos = currentStop.positions[currentStop.positions.length - 1];
        currentStop.endTime = parseTime(lastPos) ?? currentStop.startTime;
        if (currentStop.endTime - currentStop.startTime >= MIN_STOP_DURATION) {
          stops.push({
            ...currentStop,
            endIndex: i - 1,
            duration: currentStop.endTime - currentStop.startTime,
          });
        }
        currentStop = null;
      }
    }
  }

  if (currentStop) {
    const lastPos = currentStop.positions[currentStop.positions.length - 1];
    currentStop.endTime = parseTime(lastPos) ?? currentStop.startTime;
    if (currentStop.endTime - currentStop.startTime >= MIN_STOP_DURATION) {
      stops.push({
        ...currentStop,
        endIndex: positions.length - 1,
        duration: currentStop.endTime - currentStop.startTime,
      });
    }
  }

  return stops;
};

export const formatStopDuration = (durationMs) => {
  const hours = Math.floor(durationMs / 3600000);
  const minutes = Math.floor((durationMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h${minutes}m`;
  return `${minutes}m`;
};
