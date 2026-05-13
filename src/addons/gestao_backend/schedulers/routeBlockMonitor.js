import cron from 'node-cron';
import axios from 'axios';
import pool from '../../traccar_wrapper/db/index.js';
import { processScheduledTrigger } from './commandScheduler.js';
import { ensureRouteRulesTable } from '../../../routes/routeRulesRoutes.js';

const STATE_KEY = 'route_block_monitor';
const LOOKBACK_SECONDS = 90;
const BLOCK_THROTTLE_MINUTES = 5;

async function ensureRouteBlockMonitorStateTable(executor = pool) {
  await executor.query(`
    CREATE TABLE IF NOT EXISTS route_block_monitor_state (
      key TEXT PRIMARY KEY,
      last_tick TIMESTAMP NOT NULL
    )
  `);
}

async function ensureRouteBlockActionsTable(executor = pool) {
  await executor.query(`
    CREATE TABLE IF NOT EXISTS route_block_monitor_actions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      geofence_id BIGINT NOT NULL,
      event_id BIGINT,
      triggered_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await executor.query(
    'CREATE INDEX IF NOT EXISTS idx_route_block_monitor_actions_lookup ON route_block_monitor_actions(vehicle_id, geofence_id, triggered_at DESC)',
  );
}

async function getLastTick() {
  const result = await pool.query(
    'SELECT last_tick FROM route_block_monitor_state WHERE key = $1',
    [STATE_KEY],
  );
  if (result.rowCount > 0) {
    return new Date(result.rows[0].last_tick);
  }
  const fallback = new Date(Date.now() - LOOKBACK_SECONDS * 1000);
  await pool.query(
    'INSERT INTO route_block_monitor_state (key, last_tick) VALUES ($1, $2)',
    [STATE_KEY, fallback.toISOString()],
  );
  return fallback;
}

async function updateLastTick(dateObj) {
  await pool.query(
    `INSERT INTO route_block_monitor_state (key, last_tick)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET last_tick = EXCLUDED.last_tick`,
    [STATE_KEY, dateObj.toISOString()],
  );
}

function extractGeofenceId(event) {
  return event?.geofenceId
    || event?.attributes?.geofenceId
    || event?.attributes?.geofenceid
    || null;
}

async function hasRecentBlock(vehicleId, geofenceId) {
  const result = await pool.query(
    `SELECT 1
     FROM route_block_monitor_actions
     WHERE vehicle_id = $1::uuid
       AND geofence_id = $2
       AND triggered_at >= NOW() - INTERVAL '${BLOCK_THROTTLE_MINUTES} minutes'
     LIMIT 1`,
    [vehicleId, geofenceId],
  );
  return result.rowCount > 0;
}

async function runRouteBlockMonitorTick() {
  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;
  if (!traccarApiUrl || !traccarEmail || !traccarPassword) {
    return;
  }

  const auth = { username: traccarEmail, password: traccarPassword };
  const now = new Date();
  const from = await getLastTick();

  const rulesRes = await pool.query(
    `SELECT id, vehicle_id::text AS vehicle_id, geofence_id
     FROM vehicle_route_rules
     WHERE enabled = true AND block_on_exit = true`,
  );
  const rules = rulesRes.rows;
  if (!rules.length) {
    await updateLastTick(now);
    return;
  }

  const ruleVehicleIds = [...new Set(rules.map((rule) => rule.vehicle_id))];
  const vehicleDeviceRes = await pool.query(
    `SELECT vehicle_id::text AS vehicle_id, device_id
     FROM vehicle_devices
     WHERE vehicle_id = ANY($1::uuid[])
       AND device_id IS NOT NULL`,
    [ruleVehicleIds],
  );
  const vehicleByDevice = new Map();
  for (const row of vehicleDeviceRes.rows) {
    vehicleByDevice.set(row.device_id, row.vehicle_id);
  }
  if (vehicleByDevice.size === 0) {
    await updateLastTick(now);
    return;
  }

  const events = [];
  for (const [deviceId] of vehicleByDevice) {
    try {
      const eventsRes = await axios.get(`${traccarApiUrl}/api/reports/events`, {
        auth,
        params: {
          deviceId,
          type: 'geofenceExit',
          from: from.toISOString(),
          to: now.toISOString(),
        },
      });
      const deviceEvents = Array.isArray(eventsRes.data) ? eventsRes.data : [];
      events.push(...deviceEvents);
    } catch (error) {
      console.error(`[routeBlockMonitor] failed events query for device ${deviceId}:`, error?.message);
    }
  }
  if (!events.length) {
    await updateLastTick(now);
    return;
  }

  for (const event of events) {
    const geofenceId = Number(extractGeofenceId(event));
    const deviceId = event?.deviceId;
    if (!Number.isFinite(geofenceId) || !deviceId) {
      continue;
    }

    const vehicleId = vehicleByDevice.get(deviceId);
    if (!vehicleId) {
      continue;
    }

    const matchingRule = rules.find((rule) => rule.vehicle_id === vehicleId && Number(rule.geofence_id) === geofenceId);
    if (!matchingRule) {
      continue;
    }

    const blockedRecently = await hasRecentBlock(vehicleId, geofenceId);
    if (blockedRecently) {
      continue;
    }

    const scheduledFor = new Date(event.eventTime || now).toISOString();
    await processScheduledTrigger(vehicleId, 'engineStop', scheduledFor, traccarApiUrl, auth);
    await pool.query(
      `INSERT INTO route_block_monitor_actions (vehicle_id, geofence_id, event_id, triggered_at)
       VALUES ($1::uuid, $2, $3, NOW())`,
      [vehicleId, geofenceId, event.id || null],
    );
  }

  await updateLastTick(now);
}

export async function startRouteBlockMonitor() {
  if (!pool) {
    console.warn('[routeBlockMonitor] DATABASE_URL não configurado — monitor desativado.');
    return () => {};
  }

  try {
    await ensureRouteRulesTable(pool);
    await ensureRouteBlockMonitorStateTable(pool);
    await ensureRouteBlockActionsTable(pool);
  } catch (error) {
    console.error('[routeBlockMonitor] ensure tables:', error?.message);
    return () => {};
  }

  const cronOpts = {};
  if (process.env.TZ) {
    cronOpts.timezone = process.env.TZ;
  }

  const job = cron.schedule(
    '*/30 * * * * *',
    () => {
      runRouteBlockMonitorTick().catch((error) => {
        console.error('[routeBlockMonitor] tick error:', error?.message);
      });
    },
    cronOpts,
  );

  console.log('[routeBlockMonitor] Ativo: verificação de geofenceExit a cada 30s.');
  return () => job.stop();
}
