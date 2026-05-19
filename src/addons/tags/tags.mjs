import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Informações de Autenticação K-Tag API
const KTAG_USERNAME = 'TagLocation';
const KTAG_PASSWORD = 'a9B3xQ7z';
const KTAG_API_URL = 'http://47.113.127.14:6176';

// Traccar REST API Configuration (To fetch dynamic device config)
const TRACCAR_API_URL = 'http://localhost:8082';
const TRACCAR_USER = 'evangelista1908@gmail.com';
const TRACCAR_PASS = 'autoram1908';

// Traccar OsmAnd protocol URL (To report positions)
const TRACCAR_OSMAND_URL = 'http://localhost:5055';

const POLLING_INTERVAL = 60 * 1000;
const DEVICE_REFRESH_INTERVAL = 5 * 60 * 1000;

// Configuration for filtering (Geocode reduction)
const MIN_DISTANCE_METERS = 50;
const HEARTBEAT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour heartbeat

// Persistent state file — survives restarts so stale positions are not replayed
const STATE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ktag-state.json');

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const data = JSON.parse(raw);
    return {
      lastSentTimestamps: new Map(Object.entries(data.lastSentTimestamps || {})),
      lastReportedState: new Map(Object.entries(data.lastReportedState || {})),
    };
  } catch {
    return { lastSentTimestamps: new Map(), lastReportedState: new Map() };
  }
}

function saveState() {
  const data = {
    lastSentTimestamps: Object.fromEntries(lastSentTimestamps),
    lastReportedState: Object.fromEntries(lastReportedState),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(data), 'utf8');
}

// Global State
let dynamicTags = [];
const { lastSentTimestamps, lastReportedState } = loadState();

/**
 * Utility: Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Fetch devices from Traccar and extract K-Tag credentials from attributes
 */
async function fetchTagsFromTraccar() {
  const authString = `${TRACCAR_USER}:${TRACCAR_PASS}`;
  const authHeader = 'Basic ' + Buffer.from(authString).toString('base64');

  try {
    const response = await fetch(`${TRACCAR_API_URL}/api/devices`, {
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      console.error(`[Traccar API] Erro ao buscar dispositivos: Status ${response.status}`);
      return;
    }

    const devices = await response.json();
    const tags = devices
      .filter(d => d.attributes.ktag_hashedKey && d.attributes.ktag_privateKey)
      .map(d => ({
        deviceId: d.uniqueId,
        hashedKey: d.attributes.ktag_hashedKey,
        privateKey: d.attributes.ktag_privateKey
      }));

    if (tags.length !== dynamicTags.length) {
      console.log(`[Traccar API] Configuração atualizada: ${tags.length} dispositivos K-Tag detectados`);
    }
    dynamicTags = tags;
  } catch (error) {
    console.error(`[Traccar API] Falha na comunicação:`, error.message);
  }
}

/**
 * Fetch locations for a single tag from K-Tag API
 */
async function fetchKTagLocationsForTag(tag) {
  const authString = `${KTAG_USERNAME}:${KTAG_PASSWORD}`;
  const authHeader = 'Basic ' + Buffer.from(authString).toString('base64');
  
  const postData = {
    "accessoryId": tag.deviceId,
    "hashed_keys": [tag.hashedKey],
    "priv_keys": [tag.privateKey]
  };
  
  try {
    const response = await fetch(KTAG_API_URL, {
      method: 'POST',
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(postData) 
    });

    if (!response.ok) {
      console.error(`[K-Tag] Erro HTTP na tag ${tag.deviceId}: Status ${response.status}`);
      return [];
    }

    const data = await response.json(); 
    const results = data.results || [];
    
    return results.map(location => ({
      ...location,
      deviceId: tag.deviceId,
      tagConfig: tag
    }));
  } catch (error) {
    console.error(`[K-Tag] Erro na tag ${tag.deviceId}:`, error.message);
    return [];
  }
}

/**
 * Send K-Tag location to Traccar in OsmAnd format
 */
async function sendToTraccar(location) {
  // OsmAnd protocol: Traccar reads from URL query string, not request body
  // Timestamp must be in seconds (Unix epoch); divide if K-Tag returns milliseconds
  const tsSeconds = location.timestamp > 1e12
    ? Math.floor(location.timestamp / 1000)
    : location.timestamp;

  const params = new URLSearchParams();
  params.append('id', location.deviceId);
  params.append('lat', location.lat.toFixed(6));
  params.append('lon', location.lon.toFixed(6));
  params.append('timestamp', tsSeconds.toString());
  params.append('valid', 'true');
  if (location.speed !== undefined) params.append('speed', location.speed.toFixed(2));

  if (location.conf !== undefined) params.append('conf', location.conf.toString());
  if (location.status !== undefined) params.append('status', location.status.toString());

  try {
    const response = await fetch(`${TRACCAR_OSMAND_URL}/?${params.toString()}`);

    if (response.ok) {
      console.log(`[Traccar] Localização reportada - Device: ${location.deviceId}, Lat: ${location.lat}, Lon: ${location.lon}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[Traccar] Erro ao enviar (device: ${location.deviceId}):`, error.message);
    return false;
  }
}

/**
 * Main Processing Logic
 */
async function processTags() {
  if (dynamicTags.length === 0) return;

  console.log(`[${new Date().toLocaleTimeString()}] Polling K-Tag para ${dynamicTags.length} dispositivos...`);

  for (const tag of dynamicTags) {
    const locations = await fetchKTagLocationsForTag(tag);
    if (locations.length === 0) continue;

    // Save the most recent timestamp seen regardless of whether we send it,
    // so restarts don't replay already-seen positions
    const maxTimestamp = Math.max(...locations.map(l => l.timestamp));
    const lastSentApi = lastSentTimestamps.get(tag.deviceId) || 0;

    if (maxTimestamp > lastSentApi) {
      lastSentTimestamps.set(tag.deviceId, maxTimestamp);
      saveState();
    }

    const newLocations = locations
      .filter(loc => loc.timestamp > lastSentApi)
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const loc of newLocations) {
      const lastState = lastReportedState.get(tag.deviceId);

      const distance = lastState ? calculateDistance(lastState.lat, lastState.lon, loc.lat, loc.lon) : Infinity;
      const timeSinceLastReport = lastState ? (loc.timestamp - lastState.timestamp) : Infinity;

      // Filter: Distance > 50m OR Heartbeat (1h)
      if (distance > MIN_DISTANCE_METERS || timeSinceLastReport > HEARTBEAT_INTERVAL_MS) {
        // Calculate speed in km/h to bypass traccar filter.static=true (filters speed=0)
        // Use minimum 0.1 for heartbeat/static positions so they aren't silently discarded
        const timeDeltaSec = lastState ? ((loc.timestamp - lastState.timestamp) / 1000) : 0;
        const speedKmh = (timeDeltaSec > 0 && distance < Infinity)
          ? Math.max((distance / timeDeltaSec) * 3.6, 0.1)
          : 0.1;
        const success = await sendToTraccar({ ...loc, speed: speedKmh });
        if (success) {
          lastReportedState.set(tag.deviceId, {
            lat: loc.lat,
            lon: loc.lon,
            timestamp: loc.timestamp
          });
          saveState();
        }
      }
    }
  }
}

// Initialization
(async () => {
  console.log("[K-Tag Service] Iniciando...");
  
  // Initial config load
  await fetchTagsFromTraccar();

  // Periodic device refresh
  setInterval(fetchTagsFromTraccar, DEVICE_REFRESH_INTERVAL);

  // Main polling loop
  setInterval(processTags, POLLING_INTERVAL);

  // Run first cycle
  processTags();
})();
