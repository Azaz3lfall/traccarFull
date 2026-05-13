import cron from 'node-cron';
import axios from 'axios';
import pool from '../../traccar_wrapper/db/index.js';

const DEFAULT_PENDING_TTL_MINUTES = 360;

function getPendingTtlMinutes() {
  const configured = Number(process.env.SCHEDULED_COMMAND_OFFLINE_TTL_MIN);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_PENDING_TTL_MINUTES;
}

async function ensureVehicleScheduledCommandsTable(executor) {
  await executor.query(`
    CREATE TABLE IF NOT EXISTS vehicle_scheduled_commands (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      lock_time TIME,
      unlock_time TIME,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(vehicle_id, day_of_week)
    )`);
  await executor.query(
    'CREATE INDEX IF NOT EXISTS idx_vsc_vehicle_id ON vehicle_scheduled_commands(vehicle_id)',
  );
}

async function ensureCommandHistoryTable(executor) {
  await executor.query(`
    CREATE TABLE IF NOT EXISTS vehicle_scheduled_command_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      device_id BIGINT,
      command_type VARCHAR(32) NOT NULL,
      scheduled_for TIMESTAMP NOT NULL,
      attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
      status VARCHAR(24) NOT NULL,
      http_code INT,
      error_message TEXT,
      pending_id UUID,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
  await executor.query(
    'CREATE INDEX IF NOT EXISTS idx_vsch_vehicle_attempted ON vehicle_scheduled_command_history(vehicle_id, attempted_at DESC)',
  );
}

async function ensurePendingCommandsTable(executor) {
  await executor.query(`
    CREATE TABLE IF NOT EXISTS vehicle_pending_commands (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      device_id BIGINT NOT NULL,
      command_type VARCHAR(32) NOT NULL,
      scheduled_for TIMESTAMP NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      last_attempt_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
  await executor.query(
    'CREATE INDEX IF NOT EXISTS idx_vpc_pending_lookup ON vehicle_pending_commands(status, device_id)',
  );
}

async function ensureCommandSchedulerTables(executor) {
  await ensureVehicleScheduledCommandsTable(executor);
  await ensureCommandHistoryTable(executor);
  await ensurePendingCommandsTable(executor);
}

async function insertCommandHistory({
  vehicleId,
  deviceId,
  commandType,
  scheduledFor,
  status,
  httpCode = null,
  errorMessage = null,
  pendingId = null,
}) {
  await pool.query(
    `INSERT INTO vehicle_scheduled_command_history
       (vehicle_id, device_id, command_type, scheduled_for, status, http_code, error_message, pending_id)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::uuid)`,
    [
      vehicleId,
      deviceId ?? null,
      commandType,
      scheduledFor,
      status,
      httpCode,
      errorMessage ? String(errorMessage).slice(0, 1000) : null,
      pendingId,
    ],
  );
}

async function getDeviceStatus(deviceId, traccarApiUrl, auth) {
  const response = await axios.get(`${traccarApiUrl}/api/devices/${deviceId}`, {
    auth,
    timeout: 15000,
  });
  return response.data?.status || 'unknown';
}

async function sendTraccarCommand(deviceId, commandType, traccarApiUrl, auth) {
  const response = await axios.post(
    `${traccarApiUrl}/api/commands/send`,
    { type: commandType, attributes: {}, deviceId },
    { auth, timeout: 30000 },
  );
  return response.status;
}

async function enqueuePendingCommand(vehicleId, deviceId, commandType, scheduledFor) {
  const { rows } = await pool.query(
    `INSERT INTO vehicle_pending_commands
       (vehicle_id, device_id, command_type, scheduled_for, expires_at)
     VALUES ($1::uuid, $2, $3, $4, NOW() + ($5::int * INTERVAL '1 minute'))
     RETURNING id`,
    [vehicleId, deviceId, commandType, scheduledFor, getPendingTtlMinutes()],
  );
  return rows[0]?.id;
}

export async function processScheduledTrigger(vehicleId, commandType, scheduledFor, traccarApiUrl, auth) {
  const devicesRes = await pool.query(
    'SELECT device_id FROM vehicle_devices WHERE vehicle_id = $1::uuid AND device_id IS NOT NULL',
    [vehicleId],
  );
  const deviceIds = devicesRes.rows.map((row) => row.device_id).filter((id) => id != null);

  for (const deviceId of deviceIds) {
    try {
      const status = await getDeviceStatus(deviceId, traccarApiUrl, auth);
      if (status === 'online') {
        const httpCode = await sendTraccarCommand(deviceId, commandType, traccarApiUrl, auth);
        await insertCommandHistory({
          vehicleId,
          deviceId,
          commandType,
          scheduledFor,
          status: 'sent',
          httpCode,
        });
        console.log(`[commandScheduler] ${commandType} -> device ${deviceId} (vehicle ${vehicleId})`);
      } else {
        const pendingId = await enqueuePendingCommand(vehicleId, deviceId, commandType, scheduledFor);
        await insertCommandHistory({
          vehicleId,
          deviceId,
          commandType,
          scheduledFor,
          status: 'queued_offline',
          pendingId,
          errorMessage: `Device status: ${status}`,
        });
        console.log(`[commandScheduler] ${commandType} aguardando device ${deviceId} voltar online`);
      }
    } catch (error) {
      await insertCommandHistory({
        vehicleId,
        deviceId,
        commandType,
        scheduledFor,
        status: 'failed',
        httpCode: error.response?.status || null,
        errorMessage: error.response?.data?.message || error.response?.data?.error || error.message,
      });
      console.error(`[commandScheduler] ${commandType} failed device ${deviceId}:`, error.response?.data || error.message);
    }
  }
}

async function retryPendingCommands(traccarApiUrl, auth) {
  const { rows } = await pool.query(
    `SELECT id, vehicle_id::text, device_id, command_type, scheduled_for
     FROM vehicle_pending_commands
     WHERE status = 'pending'
       AND expires_at > NOW()
     ORDER BY created_at ASC
     LIMIT 500`,
  );
  if (!rows.length) return;

  const statusByDevice = new Map();
  const uniqueDeviceIds = [...new Set(rows.map((row) => row.device_id))];
  for (const deviceId of uniqueDeviceIds) {
    try {
      statusByDevice.set(deviceId, await getDeviceStatus(deviceId, traccarApiUrl, auth));
    } catch (error) {
      statusByDevice.set(deviceId, 'unknown');
      console.error(`[commandScheduler] pending status failed device ${deviceId}:`, error.response?.data || error.message);
    }
  }

  for (const row of rows) {
    if (statusByDevice.get(row.device_id) !== 'online') continue;

    try {
      const httpCode = await sendTraccarCommand(row.device_id, row.command_type, traccarApiUrl, auth);
      await pool.query(
        `UPDATE vehicle_pending_commands
         SET status = 'sent', attempts = attempts + 1, last_attempt_at = NOW(), updated_at = NOW()
         WHERE id = $1::uuid`,
        [row.id],
      );
      await insertCommandHistory({
        vehicleId: row.vehicle_id,
        deviceId: row.device_id,
        commandType: row.command_type,
        scheduledFor: row.scheduled_for,
        status: 'retried',
        httpCode,
        pendingId: row.id,
      });
      console.log(`[commandScheduler] pending ${row.command_type} -> device ${row.device_id}`);
    } catch (error) {
      await pool.query(
        `UPDATE vehicle_pending_commands
         SET attempts = attempts + 1, last_attempt_at = NOW(), updated_at = NOW()
         WHERE id = $1::uuid`,
        [row.id],
      );
      await insertCommandHistory({
        vehicleId: row.vehicle_id,
        deviceId: row.device_id,
        commandType: row.command_type,
        scheduledFor: row.scheduled_for,
        status: 'failed',
        httpCode: error.response?.status || null,
        errorMessage: error.response?.data?.message || error.response?.data?.error || error.message,
        pendingId: row.id,
      });
    }
  }
}

async function expirePendingCommands() {
  const { rows } = await pool.query(
    `UPDATE vehicle_pending_commands
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'pending'
       AND expires_at <= NOW()
     RETURNING id, vehicle_id::text, device_id, command_type, scheduled_for`,
  );

  for (const row of rows) {
    await insertCommandHistory({
      vehicleId: row.vehicle_id,
      deviceId: row.device_id,
      commandType: row.command_type,
      scheduledFor: row.scheduled_for,
      status: 'expired',
      pendingId: row.id,
      errorMessage: 'Tempo limite de espera offline expirado.',
    });
  }
}

async function runScheduledCommandsTick() {
  if (!pool) return;

  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;
  if (!traccarApiUrl || !traccarEmail || !traccarPassword) return;

  const auth = { username: traccarEmail, password: traccarPassword };

  const now = new Date();
  const dow = now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const scheduledFor = now.toISOString();

  const { rows: lockVehicles } = await pool.query(
    `SELECT DISTINCT vehicle_id::text
     FROM vehicle_scheduled_commands
     WHERE enabled = true
       AND day_of_week = $1
       AND lock_time IS NOT NULL
       AND to_char(lock_time, 'HH24:MI') = $2`,
    [dow, hhmm],
  );

  const { rows: unlockVehicles } = await pool.query(
    `SELECT DISTINCT vehicle_id::text
     FROM vehicle_scheduled_commands
     WHERE enabled = true
       AND day_of_week = $1
       AND unlock_time IS NOT NULL
       AND to_char(unlock_time, 'HH24:MI') = $2`,
    [dow, hhmm],
  );

  for (const row of lockVehicles) {
    await processScheduledTrigger(row.vehicle_id, 'engineStop', scheduledFor, traccarApiUrl, auth);
  }
  for (const row of unlockVehicles) {
    await processScheduledTrigger(row.vehicle_id, 'engineResume', scheduledFor, traccarApiUrl, auth);
  }

  await retryPendingCommands(traccarApiUrl, auth);
  await expirePendingCommands();
}

/**
 * Garante tabelas e inicia cron a cada minuto (Traccar engineStop/engineResume).
 * Usa fuso horário do node-cron se TZ estiver definido; senão, horário local do processo.
 */
export async function startCommandScheduler() {
  if (!pool) {
    console.warn('[commandScheduler] DATABASE_URL não configurado — agendador desativado.');
    return () => {};
  }
  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;
  if (!traccarApiUrl || !traccarEmail || !traccarPassword) {
    console.warn('[commandScheduler] TRACCAR_API_URL / TRACCAR_EMAIL / TRACCAR_PASSWORD incompletos — agendador desativado.');
    return () => {};
  }

  try {
    await ensureCommandSchedulerTables(pool);
  } catch (error) {
    console.error('[commandScheduler] ensure tables:', error?.message);
    return () => {};
  }

  const cronOpts = {};
  if (process.env.TZ) {
    cronOpts.timezone = process.env.TZ;
  }

  const job = cron.schedule(
    '* * * * *',
    () => {
      runScheduledCommandsTick().catch((error) => {
        console.error('[commandScheduler] tick error:', error?.message);
      });
    },
    cronOpts,
  );

  console.log('[commandScheduler] Ativo: verificação a cada minuto (bloqueio/desbloqueio programados).');
  return () => job.stop();
}
