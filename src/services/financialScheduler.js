import cron from 'node-cron';
import pool from '../addons/traccar_wrapper/db/index.js';
import { calculateClientMonthlyBilling, normalizeEquipmentType } from './financialPricingService.js';

let financialJob;

async function getClientVehicleEquipmentForScheduler(client, clientId) {
  try {
    const { rows } = await client.query(
      `SELECT
         v.id,
         v.plate,
         COALESCE(
           ARRAY_REMOVE(ARRAY_AGG(LOWER(TRIM(td.category))) FILTER (WHERE td.category IS NOT NULL), NULL),
           ARRAY[]::text[]
         ) AS equipment_types
       FROM vehicles v
       LEFT JOIN vehicle_devices vd ON vd.vehicle_id = v.id
       LEFT JOIN tc_devices td ON td.id = vd.device_id
       WHERE v.client_id = $1
       GROUP BY v.id, v.plate`,
      [clientId],
    );
    if (rows.length > 0) return rows;
  } catch (_) {
    // tc_devices may be unavailable
  }
  const fallback = await client.query(
    `SELECT
       id,
       plate,
       ARRAY[COALESCE(NULLIF(LOWER(TRIM(vehicle_type)), ''), 'desconhecido')]::text[] AS equipment_types
     FROM vehicles
     WHERE client_id = $1`,
    [clientId],
  );
  return fallback.rows;
}

export async function generateMonthlyCycles() {
  if (!pool) return;
  const now = new Date();
  const cycleRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: profiles } = await client.query(
      `SELECT p.client_id, p.plan_id, p.custom_due_day,
              COALESCE(p.custom_due_day, cl.billing_due_day, 5) AS due_day
       FROM client_financial_profiles p
       JOIN clients cl ON cl.id = p.client_id
       WHERE p.plan_id IS NOT NULL`,
    );

    let created = 0;
    for (const profile of profiles) {
      const existing = await client.query(
        `SELECT id FROM client_billing_cycles WHERE client_id = $1 AND cycle_reference = $2 LIMIT 1`,
        [profile.client_id, cycleRef],
      );
      if (existing.rows.length > 0) continue;

      const planResult = await client.query(
        `SELECT fp.*, array_agg(row_to_json(r)) FILTER (WHERE r.id IS NOT NULL) AS rules
         FROM financial_plans fp
         LEFT JOIN financial_plan_rules r ON r.plan_id = fp.id
         WHERE fp.id = $1
         GROUP BY fp.id`,
        [profile.plan_id],
      );
      if (!planResult.rows.length) continue;
      const plan = planResult.rows[0];
      const rules = Array.isArray(plan.rules) ? plan.rules.filter(Boolean) : [];

      const vehicles = await getClientVehicleEquipmentForScheduler(client, profile.client_id);
      const normalizedVehicles = vehicles.map((v) => ({
        id: v.id,
        plate: v.plate,
        equipmentTypes: Array.isArray(v.equipment_types)
          ? v.equipment_types.map((t) => normalizeEquipmentType(t))
          : [],
      }));

      const billing = calculateClientMonthlyBilling({ vehicles: normalizedVehicles, plan, rules });
      if (!billing.total || billing.total <= 0) continue;

      const dueDay = Number(profile.due_day || 5);
      const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
      if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);

      await client.query(
        `INSERT INTO client_billing_cycles
           (client_id, cycle_reference, due_date, amount, status, equipment_snapshot, updated_at)
         VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, NOW())
         ON CONFLICT (client_id, cycle_reference) DO NOTHING`,
        [
          profile.client_id,
          cycleRef,
          dueDate.toISOString().slice(0, 10),
          billing.total,
          JSON.stringify(billing.breakdown),
        ],
      );
      created += 1;
    }

    await client.query(
      `INSERT INTO billing_events (client_id, event_type, details)
       VALUES (NULL, 'monthly_cycles_generated', $1::jsonb)`,
      [JSON.stringify({ cycleRef, created, executedAt: new Date().toISOString() })],
    );

    await client.query('COMMIT');
    if (created > 0) {
      console.log(`[financialScheduler] Generated ${created} billing cycles for ${cycleRef}`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Monthly cycle generation error:', error.message);
  } finally {
    client.release();
  }
}

async function applyDelinquencyRules() {
  if (!pool) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Rule 1: pending cycles past due → overdue
    await client.query(
      `UPDATE client_billing_cycles
       SET status = 'overdue', updated_at = NOW()
       WHERE status = 'pending' AND due_date < CURRENT_DATE`,
    );

    // Rule 2: mark as inadimplente (only if auto_block_enabled)
    await client.query(
      `UPDATE clients c
       SET billing_status = 'inadimplente',
           billing_last_overdue_at = NOW(),
           updated_at = NOW()
       WHERE COALESCE((
         SELECT p.auto_block_enabled
         FROM client_financial_profiles p
         WHERE p.client_id = c.id
         LIMIT 1
       ), TRUE) = TRUE
         AND EXISTS (
           SELECT 1
           FROM client_billing_cycles b
           WHERE b.client_id = c.id
             AND b.status = 'overdue'
             AND b.due_date <= CURRENT_DATE - INTERVAL '1 day'
         )`,
    );

    // Rule 3: block after grace period (only if auto_block_enabled)
    await client.query(
      `UPDATE clients c
       SET billing_blocked = TRUE,
           billing_blocked_at = COALESCE(c.billing_blocked_at, NOW()),
           updated_at = NOW()
       WHERE COALESCE((
         SELECT p.auto_block_enabled
         FROM client_financial_profiles p
         WHERE p.client_id = c.id
         LIMIT 1
       ), TRUE) = TRUE
         AND c.billing_status = 'inadimplente'
         AND EXISTS (
           SELECT 1
           FROM client_billing_cycles b
           WHERE b.client_id = c.id
             AND b.status = 'overdue'
             AND b.due_date <= CURRENT_DATE - INTERVAL '7 day'
         )`,
    );

    // Rule 4: restore ativo — only for clients under automatic control
    // Clients with auto_block_enabled = FALSE are managed manually; scheduler does not touch them
    await client.query(
      `UPDATE clients c
       SET billing_status = 'ativo',
           billing_blocked = FALSE,
           billing_blocked_at = NULL,
           updated_at = NOW()
       WHERE COALESCE((
         SELECT p.auto_block_enabled
         FROM client_financial_profiles p
         WHERE p.client_id = c.id
         LIMIT 1
       ), TRUE) = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM client_billing_cycles b
           WHERE b.client_id = c.id
             AND b.status IN ('pending', 'overdue')
             AND b.due_date < CURRENT_DATE
         )`,
    );

    await client.query(
      `INSERT INTO billing_events (client_id, event_type, details)
       SELECT NULL, 'delinquency_scan_completed', jsonb_build_object('executedAt', NOW())`,
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Financial scheduler error:', error.message);
  } finally {
    client.release();
  }
}

export function startFinancialScheduler() {
  if (financialJob) return financialJob;

  const pattern = globalThis.process?.env?.FINANCIAL_CRON || '0 * * * *';
  const cyclePattern = globalThis.process?.env?.CYCLE_GEN_CRON || '30 0 1-5 * *';

  // Delinquency check — every hour by default
  financialJob = cron.schedule(pattern, () => {
    applyDelinquencyRules().catch((err) => {
      console.error('Financial scheduler execution failed:', err.message);
    });
  });

  // Monthly cycle generation — runs on days 1–5 of each month at 00:30
  cron.schedule(cyclePattern, () => {
    generateMonthlyCycles().catch((err) => {
      console.error('Monthly cycle generation failed:', err.message);
    });
  });

  // Run immediately on startup
  applyDelinquencyRules().catch((err) => {
    console.error('Initial delinquency scan failed:', err.message);
  });
  generateMonthlyCycles().catch((err) => {
    console.error('Initial cycle generation failed:', err.message);
  });

  return financialJob;
}

export { applyDelinquencyRules };
