/**
 * Monitor de comandos de bloqueio/desbloqueio para dispositivos não-J16+.
 *
 * Assiste novos eventos do tipo 'commandResult' em tc_events e converte
 * resultados conhecidos de bloqueio/desbloqueio em eventos de alarme
 * (alarm=engineStop / alarm=engineResume) visíveis nos relatórios.
 *
 * Dispositivos J16+ são ignorados aqui — o j16DoorMonitor monitora o atributo
 * 'blocked' das posições, pois o J16+ responde apenas "SET OK" (sem identificar
 * qual comando foi executado).
 *
 * Mapeamento de resultados:
 *   "DYD=Success!"                    → engineStop  (EC33)
 *   "Cut off the fuel supply:..."     → engineStop  (outros)
 *   "RELAY 1 OK"                      → engineStop  (Relay,1)
 *   "HFYD=Success!"                   → engineResume (EC33)
 *   "Restore fuel supply: Success!"   → engineResume (outros)
 *   "RELAY 0 OK"                      → engineResume (Relay,0)
 *   "DYD=Fail!"                       → engineStopFailed
 *   "HFYD=Fail!"                      → engineResumeFailed
 *   "Speed exceeds...Cut off..."      → engineStopDelayed
 *   Outros                            → ignorado
 */

import pg from 'pg';

const { Pool } = pg;

const POLL_INTERVAL_MS = 20_000;
// Evita múltiplos eventos do mesmo tipo para o mesmo device num curto intervalo
// (causado por filas de retry do Traccar)
const COOLDOWN_MS = 90_000;

const traccarPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'traccar',
  user: 'traccaruser',
  password: 'traccarpass',
});

// `${deviceId}:${alarmType}` → Date.now() do último evento emitido
const lastEmittedAt = new Map();

let lastCommandEventId = 0;

function parseResult(result) {
  if (!result) return null;

  if (result === 'DYD=Success!') return 'engineStop';
  if (result === 'RELAY 1 OK') return 'engineStop';
  if (result.startsWith('Cut off the fuel supply: Success')) return 'engineStop';

  if (result === 'HFYD=Success!') return 'engineResume';
  if (result === 'RELAY 0 OK') return 'engineResume';
  if (result === 'Restore fuel supply: Success!') return 'engineResume';

  if (result === 'DYD=Fail!') return 'engineStopFailed';
  if (result === 'HFYD=Fail!') return 'engineResumeFailed';

  if (result.includes('Speed exceed') && result.includes('Cut off')) return 'engineStopDelayed';

  return null;
}

async function seedLastEventId() {
  // Processa a partir de 2 horas atrás para cobrir downtime curto do serviço
  const result = await traccarPool.query(
    `SELECT COALESCE(MAX(id), 0) AS max_id
     FROM tc_events
     WHERE type = 'commandResult'
       AND eventtime < NOW() - INTERVAL '2 hours'`,
  );
  return Number(result.rows[0].max_id);
}

async function fetchNewCommandResults(afterId) {
  const result = await traccarPool.query(
    `SELECT id, eventtime, deviceid, positionid,
            attributes::json->>'result' AS result
     FROM tc_events
     WHERE type = 'commandResult'
       AND id > $1
     ORDER BY id ASC`,
    [afterId],
  );
  return result.rows;
}

async function insertAlarmIfNew(deviceId, positionId, eventtime, alarm, sourceEventId) {
  const rows = await traccarPool.query(
    `INSERT INTO tc_events (type, eventtime, deviceid, positionid, attributes)
     SELECT 'alarm', $1, $2, $3, $4
     WHERE NOT EXISTS (
       SELECT 1 FROM tc_events
       WHERE type = 'alarm'
         AND deviceid = $2
         AND attributes::json->>'sourceEventId' = $5::text
     )`,
    [
      eventtime,
      deviceId,
      positionId,
      JSON.stringify({ alarm, sourceEventId }),
      sourceEventId,
    ],
  );
  if (rows.rowCount > 0) {
    console.log(`[CmdEvent] alarm=${alarm} — device=${deviceId} src=${sourceEventId}`);
  }
}

async function tick() {
  try {
    const rows = await fetchNewCommandResults(lastCommandEventId);

    for (const row of rows) {
      lastCommandEventId = Math.max(lastCommandEventId, row.id);

      const alarm = parseResult(row.result);
      if (!alarm) continue;

      const cooldownKey = `${row.deviceid}:${alarm}`;
      const now = Date.now();
      const lastEmit = lastEmittedAt.get(cooldownKey) || 0;
      if (now - lastEmit < COOLDOWN_MS) continue;

      await insertAlarmIfNew(row.deviceid, row.positionid, row.eventtime, alarm, row.id);
      lastEmittedAt.set(cooldownKey, now);
    }
  } catch (e) {
    console.error('[CmdEvent] Tick error:', e.message);
  }
}

export async function startCommandEventMonitor() {
  lastCommandEventId = await seedLastEventId();
  console.log(`[CmdEvent] Monitor iniciado (intervalo: 20s) — lastEventId=${lastCommandEventId}`);
  await tick();
  setInterval(tick, POLL_INTERVAL_MS);
}
