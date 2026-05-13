const NANOTAG_API_URL = 'http://nanotag.com.br:8082/api.php';
const NANOTAG_TOKEN = 'e99b795bf5d94f0a4ab22e9b8d7bb8b5';
const TRACCAR_API_URL = 'http://localhost:8082';
const TRACCAR_USER = 'evangelista1908@gmail.com';
const TRACCAR_PASS = 'autoram1908';
const TRACCAR_OSMAND_URL = 'http://localhost:5055';

const POLLING_INTERVAL = 60 * 1000;
const DEVICE_REFRESH_INTERVAL = 2 * 60 * 1000;
const TARGET_DEVICE_MODEL = 'Nanotag';
const NANOTAG_TIMEZONE_OFFSET = '-03:00';

let allowedTagIds = new Set();
const lastSentTimestamps = new Map();

async function refreshRegisteredIds() {
  const authString = `${TRACCAR_USER}:${TRACCAR_PASS}`;
  const authHeader = 'Basic ' + Buffer.from(authString).toString('base64');

  try {
    const response = await fetch(`${TRACCAR_API_URL}/api/devices`, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      console.error(`[Traccar API] Erro ao buscar objetos cadastrados: Status ${response.status}`);
      return;
    }

    const devices = await response.json();
    const ids = devices
      .filter((device) => String(device.model || '').trim().toLowerCase() === TARGET_DEVICE_MODEL.toLowerCase())
      .map((device) => String(device.uniqueId || '').trim())
      .filter(Boolean);

    allowedTagIds = new Set(ids);
    console.log(
      `[Traccar API] ${allowedTagIds.size} objetos do modelo ${TARGET_DEVICE_MODEL} carregados para filtro nanoTAG.`,
    );
  } catch (error) {
    console.error('[Traccar API] Falha ao atualizar objetos cadastrados:', error.message);
  }
}

function parseNanotagDate(value) {
  if (!value || typeof value !== 'string') {
    return NaN;
  }

  const [datePart, timePart = '00:00:00'] = value.trim().split(/\s+/);
  const [day, month, year] = datePart.split('/').map(Number);
  const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);

  if ([day, month, year, hour, minute, second].some(Number.isNaN)) {
    return NaN;
  }

  const isoDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isoTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  return new Date(`${isoDate}T${isoTime}${NANOTAG_TIMEZONE_OFFSET}`).getTime();
}

async function fetchLastPositions() {
  const payload = {
    token: NANOTAG_TOKEN,
    requisicao: 'last_position',
  };

  try {
    const formBody = new URLSearchParams(payload).toString();
    let response = await fetch(NANOTAG_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    });

    // Fallback para JSON caso o servidor altere o parser de entrada.
    if (!response.ok) {
      response = await fetch(NANOTAG_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      console.error(`[nanoTAG] Erro HTTP ao consultar posições: Status ${response.status}`);
      return [];
    }

    const json = await response.json();
    if (!json.success || !Array.isArray(json.data)) {
      console.error('[nanoTAG] Resposta inválida para last_position');
      return [];
    }

    return json.data
      .filter((item) => item && item.id !== undefined && item.id !== null)
      .map((item) => ({
        ...item,
        id: String(item.id).trim(),
      }))
      .filter((item) => allowedTagIds.has(item.id))
      .map((item) => {
        const lat = Number(item.lat);
        const lon = Number(item.lng ?? item.Ing);
        const timestamp = parseNanotagDate(item.datahora);

        return {
          id: item.id,
          lat,
          lon,
          timestamp,
          battery: item.bat !== undefined ? Number(item.bat) : undefined,
        };
      })
      .filter(
        (position) =>
          Number.isFinite(position.lat) &&
          Number.isFinite(position.lon) &&
          Number.isFinite(position.timestamp),
      );
  } catch (error) {
    console.error('[nanoTAG] Falha na consulta de posições:', error.message);
    return [];
  }
}

async function sendToTraccar(position) {
  const params = new URLSearchParams();
  params.append('id', position.id);
  params.append('lat', position.lat.toFixed(6));
  params.append('lon', position.lon.toFixed(6));
  params.append('timestamp', position.timestamp.toString());
  params.append('valid', 'true');

  if (Number.isFinite(position.battery)) {
    params.append('batteryLevel', position.battery.toString());
  }

  try {
    const response = await fetch(TRACCAR_OSMAND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error(`[Traccar] Erro ao enviar ${position.id}: Status ${response.status}`);
      return false;
    }

    console.log(
      `[Traccar] Localização enviada - ID: ${position.id}, Lat: ${position.lat}, Lon: ${position.lon}`,
    );
    return true;
  } catch (error) {
    console.error(`[Traccar] Falha ao enviar ${position.id}:`, error.message);
    return false;
  }
}

async function processTags() {
  if (allowedTagIds.size === 0) {
    console.warn('[nanoTAG] Nenhum objeto cadastrado carregado. Aguardando atualização da lista.');
    return;
  }

  console.log(`[${new Date().toLocaleTimeString()}] Polling nanoTAG para ${allowedTagIds.size} tags...`);

  const positions = await fetchLastPositions();
  for (const position of positions) {
    const lastTimestamp = lastSentTimestamps.get(position.id) || 0;
    if (position.timestamp <= lastTimestamp) {
      continue;
    }

    const sent = await sendToTraccar(position);
    if (sent) {
      lastSentTimestamps.set(position.id, position.timestamp);
    }
  }
}

(async () => {
  console.log('[nanoTAG Service] Iniciando...');
  await refreshRegisteredIds();
  await processTags();
  setInterval(refreshRegisteredIds, DEVICE_REFRESH_INTERVAL);
  setInterval(processTags, POLLING_INTERVAL);
})();
