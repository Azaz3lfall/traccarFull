/**
 * COINTAG Webhook Middleware
 * Receives device location data from COINTAG platform via POST and forwards to Traccar using OsmAnd protocol.
 * @see src/addons/tags/cointag.md
 */

import express from 'express';

const PORT = 3696;
const TRACCAR_OSMAND_URL = process.env.TRACCAR_OSMAND_URL || 'http://127.0.0.1:5055';

// Log de configuração básica para facilitar debug
console.log(`[COINTAG] Usando TRACCAR_OSMAND_URL=${TRACCAR_OSMAND_URL}`);

const app = express();
app.use(express.json());

/**
 * Convert COINTAG timestamp (yyyy-MM-ddTHH:mm:ss UTC) to Unix milliseconds
 */
function toUnixMs(timestampStr) {
  if (!timestampStr) return null;
  const date = new Date(timestampStr);
  return isNaN(date.getTime()) ? null : date.getTime();
}

async function handleCointag(req, res) {
  const payload = req.body;

  if (payload.code === 200 && Array.isArray(payload.data)) {
    for (const device of payload.data) {
      try {
        const deviceTimestamp = toUnixMs(device.timestamp);
        let timestampToSend = deviceTimestamp;
        const now = Date.now();

        if (!deviceTimestamp) {
          console.warn(`[COINTAG] Timestamp inválido para dispositivo ${device.deviceId}: ${device.timestamp}`);
          timestampToSend = now;
        } else if (Math.abs(now - deviceTimestamp) > 5 * 60 * 1000) {
          console.warn(
            `[COINTAG] Timestamp do dispositivo muito diferente do horário atual (device=${new Date(
              deviceTimestamp,
            ).toISOString()}, now=${new Date(now).toISOString()}). ` +
            `Usando horário do servidor para dispositivo ${device.deviceId}.`,
          );
          timestampToSend = now;
        }

        const params = new URLSearchParams();
        params.append('id', device.deviceId);
        params.append('lat', String(device.latitude));
        params.append('lon', String(device.longitude));
        params.append('valid', 'true');

        if (device.altitude !== undefined && device.altitude !== null && device.altitude !== '') {
          params.append('altitude', String(device.altitude));
        }
        if (timestampToSend) {
          params.append('timestamp', String(timestampToSend));
        }
        if (device.accuracy !== undefined && device.accuracy !== '') {
          params.append('hdop', String(device.accuracy));
        }

        const bodyString = params.toString();
        console.log(
          `[COINTAG] Payload para Traccar (dispositivo ${device.deviceId}): ` +
          bodyString.substring(0, 500)
        );

        const response = await fetch(TRACCAR_OSMAND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyString,
        });

        if (response.ok) {
          console.log(`[COINTAG] Dispositivo ${device.deviceId} enviado ao Traccar.`);
        } else {
          const errText = await response.text().catch(() => '');
          console.error(
            `[COINTAG] Erro HTTP ao repassar dispositivo ${device.deviceId} para ${TRACCAR_OSMAND_URL}: ` +
            `Status ${response.status} - ${errText.substring(0, 300)}`
          );
        }
      } catch (err) {
        console.error(
          `[COINTAG] Erro de rede ao repassar dispositivo ${device.deviceId} para ${TRACCAR_OSMAND_URL}:`,
          {
            message: err?.message,
            name: err?.name,
            code: err?.code,
            cause: err?.cause,
            stack: err?.stack,
          }
        );
      }
    }
    return res.status(200).send('Processed');
  }

  res.status(400).send('Invalid Format');
}

app.post('/api/cointa', handleCointag);
app.post('/api/test', handleCointag);

app.listen(PORT, () => {
  console.log(`[COINTAG] Middleware rodando em http://0.0.0.0:${PORT}/api/cointa`);
});
