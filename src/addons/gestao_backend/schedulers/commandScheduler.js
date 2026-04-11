import cron from 'node-cron';
import axios from 'axios';
import pool from '../../traccar_wrapper/db/index.js';

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

async function sendCommandForVehicles(vehicleIds, commandType, traccarApiUrl, auth) {
  if (!vehicleIds.length) return;
  const uniqueVehicles = [...new Set(vehicleIds)];
  for (const vehicleId of uniqueVehicles) {
    let devicesRes;
    try {
      devicesRes = await pool.query(
        'SELECT device_id FROM vehicle_devices WHERE vehicle_id = $1::uuid AND device_id IS NOT NULL',
        [vehicleId],
      );
    } catch (e) {
      console.error(`commandScheduler: list devices for vehicle ${vehicleId}:`, e?.message);
      continue;
    }
    const deviceIds = devicesRes.rows.map((r) => r.device_id).filter((id) => id != null);
    for (const deviceId of deviceIds) {
      try {
        await axios.post(
          `${traccarApiUrl}/api/commands/send`,
          { type: commandType, attributes: {}, deviceId },
          { auth, timeout: 30000 },
        );
        console.log(`[commandScheduler] ${commandType} -> device ${deviceId} (vehicle ${vehicleId})`);
      } catch (e) {
        console.error(
          `[commandScheduler] ${commandType} failed device ${deviceId}:`,
          e.response?.data || e.message,
        );
      }
    }
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

  await sendCommandForVehicles(
    lockVehicles.map((r) => r.vehicle_id),
    'engineStop',
    traccarApiUrl,
    auth,
  );
  await sendCommandForVehicles(
    unlockVehicles.map((r) => r.vehicle_id),
    'engineResume',
    traccarApiUrl,
    auth,
  );
}

/**
 * Garante tabela e inicia cron a cada minuto (Traccar engineStop/engineResume).
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
    await ensureVehicleScheduledCommandsTable(pool);
  } catch (e) {
    console.error('[commandScheduler] ensure table:', e?.message);
    return () => {};
  }

  const cronOpts = {};
  if (process.env.TZ) {
    cronOpts.timezone = process.env.TZ;
  }

  const job = cron.schedule(
    '* * * * *',
    () => {
      runScheduledCommandsTick().catch((e) => {
        console.error('[commandScheduler] tick error:', e?.message);
      });
    },
    cronOpts,
  );

  console.log('[commandScheduler] Ativo: verificação a cada minuto (bloqueio/desbloqueio programados).');
  return () => job.stop();
}
