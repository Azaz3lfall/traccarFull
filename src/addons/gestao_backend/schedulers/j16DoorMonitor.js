/**
 * Monitor de porta e bloqueio para dispositivos J16+.
 *
 * O J16+ reporta estado da porta (door/io1) e bloqueio (blocked) como atributos
 * de posição, não como pacotes de alarme — portanto o Traccar nativo não gera
 * eventos em tc_events.
 *
 * Este scheduler lê tc_positions diretamente para detectar TODAS as transições
 * entre polls, incluindo ciclos rápidos (porta abre e fecha em menos de 15s).
 *
 * Porta:
 *   door=true  → PORTA ABERTA  → alarm=door
 *   io1=false  → PORTA ABERTA  → alarm=door (quando não há 'door')
 *   Pacote sem door nem io1 → ignorar
 *
 * Bloqueio:
 *   blocked=true  → VEÍCULO BLOQUEADO   → alarm=engineStop
 *   blocked=false → VEÍCULO DESBLOQUEADO → alarm=engineResume
 */

import pg from 'pg';
import axios from 'axios';

const { Pool } = pg;

const J16_MODEL = 'J16+';
const POLL_INTERVAL_MS = 15_000;

const traccarPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'traccar',
  user: 'traccaruser',
  password: 'traccarpass',
});

// deviceId → { isOpen: boolean|null, isBlocked: boolean|null, lastPositionId: number }
const deviceStates = new Map();

let sessionCookie = null;

async function login() {
  const params = new URLSearchParams();
  params.append('email', process.env.TRACCAR_EMAIL || '');
  params.append('password', process.env.TRACCAR_PASSWORD || '');
  try {
    const res = await axios.post('http://localhost:8082/api/session', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10_000,
    });
    const raw = res.headers['set-cookie'];
    sessionCookie = raw ? raw[0].split(';')[0] : null;
    if (sessionCookie) console.log('[J16Door] Login OK');
    return !!sessionCookie;
  } catch (e) {
    console.error('[J16Door] Login error:', e.message);
    return false;
  }
}

async function fetchJ16DeviceIds() {
  const res = await axios.get('http://localhost:8082/api/devices?all=true', {
    headers: { Cookie: sessionCookie },
    timeout: 10_000,
  });
  return res.data.filter((d) => d.model === J16_MODEL).map((d) => d.id);
}

/**
 * Retorna todas as posições com dado de porta ou bloqueio para um device,
 * com id > afterId, em ordem cronológica.
 */
async function fetchNewPositions(deviceId, afterId) {
  const result = await traccarPool.query(
    `SELECT id, devicetime,
            (attributes::json->>'door')    AS door,
            (attributes::json->>'io1')     AS io1,
            (attributes::json->>'blocked') AS blocked
     FROM tc_positions
     WHERE deviceid = $1
       AND id > $2
       AND (attributes::text LIKE '%"door"%'
         OR attributes::text LIKE '%"io1"%'
         OR attributes::text LIKE '%"blocked"%')
     ORDER BY id ASC`,
    [deviceId, afterId],
  );
  return result.rows;
}

/**
 * Semeia o estado inicial a partir das posições mais recentes.
 */
async function seedInitialState(deviceId) {
  const doorRes = await traccarPool.query(
    `SELECT id,
            (attributes::json->>'door') AS door,
            (attributes::json->>'io1')  AS io1
     FROM tc_positions
     WHERE deviceid = $1
       AND (attributes::text LIKE '%"door"%' OR attributes::text LIKE '%"io1"%')
     ORDER BY id DESC
     LIMIT 1`,
    [deviceId],
  );

  const blockedRes = await traccarPool.query(
    `SELECT id,
            (attributes::json->>'blocked') AS blocked
     FROM tc_positions
     WHERE deviceid = $1
       AND attributes::text LIKE '%"blocked"%'
     ORDER BY id DESC
     LIMIT 1`,
    [deviceId],
  );

  let isOpen = null;
  let isBlocked = null;
  let lastPositionId = 0;

  if (doorRes.rowCount) {
    const row = doorRes.rows[0];
    isOpen = parseDoorRow(row);
    lastPositionId = Math.max(lastPositionId, row.id);
  }
  if (blockedRes.rowCount) {
    const row = blockedRes.rows[0];
    isBlocked = row.blocked === 'true';
    lastPositionId = Math.max(lastPositionId, row.id);
  }

  if (isOpen === null && isBlocked === null) return null;
  return { isOpen, isBlocked, lastPositionId };
}

function parseDoorRow(row) {
  if (row.door !== null && row.door !== undefined) {
    return row.door === 'true';
  }
  if (row.io1 !== null && row.io1 !== undefined) {
    return row.io1 === 'false'; // io1=false → porta aberta
  }
  return null;
}

async function insertAlarmIfNew(deviceId, positionId, eventtime, alarm) {
  await traccarPool.query(
    `INSERT INTO tc_events (type, eventtime, deviceid, positionid, attributes)
     SELECT 'alarm', $1, $2, $3, $4
     WHERE NOT EXISTS (
       SELECT 1 FROM tc_events
       WHERE type = 'alarm'
         AND deviceid = $2
         AND positionid = $3
         AND attributes::json->>'alarm' = $5
     )`,
    [eventtime, deviceId, positionId, JSON.stringify({ alarm }), alarm],
  );
  console.log(`[J16Door] alarm=${alarm} — device=${deviceId} pos=${positionId}`);
}

async function tick() {
  try {
    if (!sessionCookie) {
      const ok = await login();
      if (!ok) return;
    }

    let deviceIds;
    try {
      deviceIds = await fetchJ16DeviceIds();
    } catch (e) {
      if (e.response?.status === 401) sessionCookie = null;
      throw e;
    }

    if (!deviceIds.length) return;

    for (const deviceId of deviceIds) {
      try {
        let state = deviceStates.get(deviceId);

        if (!state) {
          const seeded = await seedInitialState(deviceId);
          if (!seeded) continue;
          deviceStates.set(deviceId, seeded);
          state = seeded;
        }

        const newPositions = await fetchNewPositions(deviceId, state.lastPositionId);

        for (const row of newPositions) {
          let { isOpen, isBlocked } = state;
          let updated = false;

          // Porta
          const doorOpen = parseDoorRow(row);
          if (doorOpen !== null) {
            if (isOpen !== null && doorOpen !== isOpen) {
              await insertAlarmIfNew(deviceId, row.id, row.devicetime, doorOpen ? 'door' : 'doorClosed');
            }
            isOpen = doorOpen;
            updated = true;
          }

          // Bloqueio
          if (row.blocked !== null && row.blocked !== undefined) {
            const blocked = row.blocked === 'true';
            if (isBlocked !== null && blocked !== isBlocked) {
              await insertAlarmIfNew(deviceId, row.id, row.devicetime, blocked ? 'engineStop' : 'engineResume');
            }
            isBlocked = blocked;
            updated = true;
          }

          if (updated) {
            state = { isOpen, isBlocked, lastPositionId: row.id };
          } else {
            state = { ...state, lastPositionId: row.id };
          }
          deviceStates.set(deviceId, state);
        }
      } catch (e) {
        console.error(`[J16Door] Erro ao processar device ${deviceId}:`, e.message);
      }
    }
  } catch (e) {
    if (e.response?.status === 401) sessionCookie = null;
    console.error('[J16Door] Tick error:', e.message);
  }
}

export async function startJ16DoorMonitor() {
  console.log('[J16Door] Monitor iniciado (intervalo: 15s) — porta e bloqueio');
  await tick();
  setInterval(tick, POLL_INTERVAL_MS);
}
