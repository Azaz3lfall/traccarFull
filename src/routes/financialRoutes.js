import { Router } from 'express';
import crypto from 'crypto';
import pool from '../addons/traccar_wrapper/db/index.js';
import { authenticate } from '../middleware/authMiddleware.js';
import asaasService from '../services/asaasService.js';
import { calculateClientMonthlyBilling, normalizeEquipmentType } from '../services/financialPricingService.js';

const router = Router();

const runtimeEnv = globalThis.process?.env || {};
const CREDENTIAL_SECRET = runtimeEnv.ASAAS_CREDENTIALS_SECRET || runtimeEnv.SESSION_SECRET || 'fleet-finance-secret';
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.createHash('sha256').update(String(CREDENTIAL_SECRET)).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(payload) {
  if (!payload) return '';
  const [ivHex, encryptedHex] = String(payload).split(':');
  const key = crypto.createHash('sha256').update(String(CREDENTIAL_SECRET)).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString('utf8');
}

function isAdmin(req) {
  return Boolean(req.user?.administrator || req.user?.admin);
}

function extractAsaasErrorMessage(error) {
  const payload = error?.response?.data;
  if (!payload) return error?.message || 'Erro desconhecido ao integrar com Asaas';
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors.map((item) => item.description || item.code || 'Erro').join(' | ');
  }
  return payload.message || payload.error || JSON.stringify(payload);
}

function normalizeTaxId(value) {
  return String(value || '').replace(/\D/g, '');
}

async function getFinancialSetting() {
  const { rows } = await pool.query('SELECT * FROM financial_settings WHERE id = 1');
  return rows[0] || null;
}

async function getClientVehicleEquipment(clientId) {
  try {
    const { rows } = await pool.query(
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
      [clientId]
    );
    if (rows.length > 0) return rows;
  } catch (_) {
    // table tc_devices may be unavailable in some deployments
  }

  const fallback = await pool.query(
    `SELECT
       id,
       plate,
       ARRAY[
         COALESCE(NULLIF(LOWER(TRIM(vehicle_type)), ''), 'desconhecido')
       ]::text[] AS equipment_types
     FROM vehicles
     WHERE client_id = $1`,
    [clientId]
  );
  return fallback.rows;
}

async function calculateClientSnapshot(clientId) {
  const profileResult = await pool.query(
    `SELECT p.*, fp.name as plan_name, fp.base_price
     FROM client_financial_profiles p
     LEFT JOIN financial_plans fp ON fp.id = p.plan_id
     WHERE p.client_id = $1`,
    [clientId]
  );

  const profile = profileResult.rows[0];
  if (!profile?.plan_id) {
    return { total: 0, breakdown: [], profile };
  }

  const rulesResult = await pool.query(
    `SELECT * FROM financial_plan_rules
     WHERE plan_id = $1
     ORDER BY priority ASC`,
    [profile.plan_id]
  );

  const vehicles = await getClientVehicleEquipment(clientId);
  const normalizedVehicles = vehicles.map((item) => ({
    id: item.id,
    plate: item.plate,
    equipmentTypes: Array.isArray(item.equipment_types)
      ? item.equipment_types.map((t) => normalizeEquipmentType(t))
      : [],
  }));

  const billing = calculateClientMonthlyBilling({
    vehicles: normalizedVehicles,
    plan: profile,
    rules: rulesResult.rows,
  });

  return { ...billing, profile };
}

async function resolveUserClient(req) {
  const userId = req.user?.id;
  if (!userId) return null;
  const result = await pool.query(
    `SELECT c.*
     FROM clients c
     WHERE c.id IN (
       SELECT client_id FROM client_users WHERE traccar_user_id = $1
       UNION
       SELECT id FROM clients WHERE traccar_user_id = $1
     )
     ORDER BY c.created_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

function normalizeInvoice(payment) {
  return {
    id: payment.id,
    status: payment.status,
    value: Number(payment.value || 0),
    dueDate: payment.dueDate || null,
    invoiceUrl: payment.invoiceUrl || null,
    bankSlipUrl: payment.bankSlipUrl || null,
    description: payment.description || null,
    billingType: payment.billingType || null,
    nossoNumero: payment.nossoNumero || null,
    pixTransaction: payment.pixTransaction || null,
  };
}

router.post('/webhook/asaas', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  const event = req.body || {};
  const payment = event?.payment || {};
  const eventKey = `${event.id || payment.id || 'unknown'}:${event.event || 'unknown'}`;

  try {
    await pool.query(
      `INSERT INTO webhook_events (provider, event_key, event_type, payload, processed)
       VALUES ('asaas', $1, $2, $3::jsonb, FALSE)
       ON CONFLICT (event_key) DO NOTHING`,
      [eventKey, event.event || 'unknown', JSON.stringify(event)]
    );

    if (payment?.id) {
      const cycleResult = await pool.query(
        `SELECT id, client_id FROM client_billing_cycles WHERE asaas_payment_id = $1 LIMIT 1`,
        [payment.id]
      );
      const cycle = cycleResult.rows[0];

      if (cycle) {
        const paid = String(payment.status || '').toUpperCase() === 'RECEIVED' || String(payment.status || '').toUpperCase() === 'CONFIRMED';
        const nextStatus = paid ? 'paid' : (String(payment.status || '').toUpperCase().includes('OVERDUE') ? 'overdue' : 'pending');

        await pool.query(
          `UPDATE client_billing_cycles
           SET status = $1, payment_date = CASE WHEN $1 = 'paid' THEN NOW() ELSE payment_date END, updated_at = NOW()
           WHERE id = $2`,
          [nextStatus, cycle.id]
        );

        if (paid) {
          await pool.query(
            `UPDATE clients
             SET billing_status = 'ativo', billing_blocked = FALSE, billing_blocked_at = NULL, updated_at = NOW()
             WHERE id = $1`,
            [cycle.client_id]
          );
        }
      }
    }

    await pool.query(
      `UPDATE webhook_events
       SET processed = TRUE, processed_at = NOW()
       WHERE event_key = $1`,
      [eventKey]
    );
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Asaas webhook error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.use(authenticate);

router.get('/me/status', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const client = await resolveUserClient(req);
    if (!client) {
      return res.status(404).json({ error: 'Not found', message: 'Cliente não encontrado para o usuário logado.' });
    }
    const openResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS open_amount,
              MIN(due_date) AS next_due_date
       FROM client_billing_cycles
       WHERE client_id = $1
         AND status IN ('pending', 'overdue')`,
      [client.id]
    );
    const openData = openResult.rows[0] || {};
    return res.json({
      clientId: client.id,
      billing_status: client.billing_status || 'ativo',
      billing_blocked: Boolean(client.billing_blocked),
      nextDueDate: openData.next_due_date || null,
      openAmount: Number(openData.open_amount || 0),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.get('/me/invoices', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const client = await resolveUserClient(req);
    if (!client) {
      return res.status(404).json({ error: 'Not found', message: 'Cliente não encontrado para o usuário logado.' });
    }
    const settings = await getFinancialSetting();
    const apiKey = decrypt(settings?.asaas_api_key_enc);
    if (!apiKey) return res.status(400).json({ error: 'Validation error', message: 'API Key Asaas não configurada.' });

    const customerResult = await pool.query(
      'SELECT asaas_customer_id FROM asaas_customers WHERE client_id = $1 LIMIT 1',
      [client.id]
    );
    const customerId = customerResult.rows[0]?.asaas_customer_id;
    if (!customerId) {
      return res.json({ invoices: [], source: 'asaas', customerMapped: false });
    }

    const invoices = await asaasService.listPaymentsByCustomer({
      apiKey,
      environment: settings?.asaas_environment || 'sandbox',
      customerId,
      statuses: ['PENDING', 'OVERDUE', 'CONFIRMED', 'RECEIVED'],
      maxPages: 10,
    });

    return res.json({
      invoices: invoices.map(normalizeInvoice),
      source: 'asaas',
      customerMapped: true,
    });
  } catch (error) {
    const message = extractAsaasErrorMessage(error);
    const status = error?.response?.status && error.response.status >= 400 && error.response.status < 500
      ? error.response.status
      : 500;
    return res.status(status).json({
      error: status === 500 ? 'Internal server error' : 'Asaas integration error',
      message,
    });
  }
});

router.get('/me/invoices/:paymentId/pix', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const client = await resolveUserClient(req);
    if (!client) return res.status(404).json({ error: 'Not found', message: 'Cliente não encontrado.' });

    const settings = await getFinancialSetting();
    const apiKey = decrypt(settings?.asaas_api_key_enc);
    if (!apiKey) return res.status(400).json({ error: 'Validation error', message: 'API Key Asaas não configurada.' });

    const paymentId = String(req.params.paymentId || '').trim();
    const pix = await asaasService.getPaymentPixQrCode({
      apiKey,
      environment: settings?.asaas_environment || 'sandbox',
      paymentId,
    });
    return res.json({
      paymentId,
      encodedImage: pix.encodedImage || null,
      payload: pix.payload || pix.copyAndPasteCode || null,
      expirationDate: pix.expirationDate || null,
    });
  } catch (error) {
    const message = extractAsaasErrorMessage(error);
    const status = error?.response?.status && error.response.status >= 400 && error.response.status < 500
      ? error.response.status
      : 500;
    return res.status(status).json({
      error: status === 500 ? 'Internal server error' : 'Asaas integration error',
      message,
    });
  }
});

router.get('/me/invoices/:paymentId/boleto', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const client = await resolveUserClient(req);
    if (!client) return res.status(404).json({ error: 'Not found', message: 'Cliente não encontrado.' });

    const settings = await getFinancialSetting();
    const apiKey = decrypt(settings?.asaas_api_key_enc);
    if (!apiKey) return res.status(400).json({ error: 'Validation error', message: 'API Key Asaas não configurada.' });

    const paymentId = String(req.params.paymentId || '').trim();
    const [payment, idField] = await Promise.all([
      asaasService.getPayment({
        apiKey,
        environment: settings?.asaas_environment || 'sandbox',
        paymentId,
      }),
      asaasService.getPaymentIdentificationField({
        apiKey,
        environment: settings?.asaas_environment || 'sandbox',
        paymentId,
      }).catch(() => null),
    ]);

    return res.json({
      paymentId,
      bankSlipUrl: payment.bankSlipUrl || payment.invoiceUrl || null,
      invoiceUrl: payment.invoiceUrl || null,
      identificationField: idField?.identificationField || null,
      nossoNumero: payment.nossoNumero || null,
    });
  } catch (error) {
    const message = extractAsaasErrorMessage(error);
    const status = error?.response?.status && error.response.status >= 400 && error.response.status < 500
      ? error.response.status
      : 500;
    return res.status(status).json({
      error: status === 500 ? 'Internal server error' : 'Asaas integration error',
      message,
    });
  }
});

router.get('/settings/asaas', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const row = await getFinancialSetting();
    const baseUrl = runtimeEnv.PUBLIC_BASE_URL || `http://localhost:${runtimeEnv.CORE_PORT || 4000}`;
    res.json({
      asaas_environment: row?.asaas_environment || 'sandbox',
      asaas_api_key_masked: row?.asaas_api_key_masked || null,
      asaas_connected: Boolean(row?.asaas_connected),
      asaas_last_test_at: row?.asaas_last_test_at || null,
      asaas_last_error: row?.asaas_last_error || null,
      webhook_url: `${baseUrl}/api/financial/webhook/asaas`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings/asaas', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { apiKey, environment } = req.body || {};
  const env = environment === 'production' ? 'production' : 'sandbox';

  try {
    const current = await getFinancialSetting();
    const providedApiKey = String(apiKey || '').trim();
    const hasStoredApiKey = Boolean(current?.asaas_api_key_enc);

    if (!providedApiKey && !hasStoredApiKey) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'apiKey is required on first configuration.',
      });
    }

    const encrypted = providedApiKey ? encrypt(providedApiKey) : current.asaas_api_key_enc;
    const masked = providedApiKey ? asaasService.maskApiKey(providedApiKey) : current.asaas_api_key_masked;
    await pool.query(
      `UPDATE financial_settings
       SET asaas_api_key_enc = $1,
           asaas_api_key_masked = $2,
           asaas_environment = $3,
           asaas_connected = FALSE,
           asaas_last_error = NULL,
           updated_at = NOW()
       WHERE id = 1`,
      [encrypted, masked, env]
    );
    res.json({ success: true, asaas_api_key_masked: masked, asaas_environment: env });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/settings/asaas/test', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const settings = await getFinancialSetting();
    const apiKey = decrypt(settings?.asaas_api_key_enc);
    if (!apiKey) return res.status(400).json({ error: 'Validation error', message: 'Configure a API Key first.' });

    await asaasService.runConnectionTest({
      apiKey,
      environment: settings?.asaas_environment || 'sandbox',
    });

    await pool.query(
      `UPDATE financial_settings
       SET asaas_connected = TRUE, asaas_last_test_at = NOW(), asaas_last_error = NULL, updated_at = NOW()
       WHERE id = 1`
    );

    res.json({ connected: true });
  } catch (error) {
    await pool.query(
      `UPDATE financial_settings
       SET asaas_connected = FALSE, asaas_last_test_at = NOW(), asaas_last_error = $1, updated_at = NOW()
       WHERE id = 1`,
      [error?.response?.data?.errors?.[0]?.description || error.message]
    );
    res.status(400).json({ connected: false, message: error?.response?.data || error.message });
  }
});

router.get('/plans', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const plansResult = await pool.query('SELECT * FROM financial_plans ORDER BY created_at DESC');
    const ruleResult = await pool.query('SELECT * FROM financial_plan_rules ORDER BY priority ASC, created_at DESC');
    const rulesByPlan = ruleResult.rows.reduce((acc, rule) => {
      if (!acc[rule.plan_id]) acc[rule.plan_id] = [];
      acc[rule.plan_id].push(rule);
      return acc;
    }, {});
    const plans = plansResult.rows.map((plan) => ({
      ...plan,
      rules: rulesByPlan[plan.id] || [],
    }));
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/plans', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { name, description, base_price, recurring_interval, active, rules = [] } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Validation error', message: 'name is required.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const planResult = await client.query(
      `INSERT INTO financial_plans (name, description, base_price, recurring_interval, active, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [name, description || null, Number(base_price || 0), recurring_interval || 'MONTHLY', active !== false]
    );
    const plan = planResult.rows[0];

    for (const rule of rules) {
      await client.query(
        `INSERT INTO financial_plan_rules
           (plan_id, equipment_signature, equipment_count, monthly_price, discount_percent, priority, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          plan.id,
          String(rule.equipment_signature || '').toLowerCase(),
          Number(rule.equipment_count || 1),
          Number(rule.monthly_price || 0),
          Number(rule.discount_percent || 0),
          Number(rule.priority || 100),
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(plan);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Internal server error', message: error.message });
  } finally {
    client.release();
  }
});

router.put('/plans/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  const { name, description, base_price, recurring_interval, active, rules = [] } = req.body || {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE financial_plans
       SET name = $1, description = $2, base_price = $3, recurring_interval = $4, active = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, description || null, Number(base_price || 0), recurring_interval || 'MONTHLY', active !== false, id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }

    await client.query('DELETE FROM financial_plan_rules WHERE plan_id = $1', [id]);
    for (const rule of rules) {
      await client.query(
        `INSERT INTO financial_plan_rules
           (plan_id, equipment_signature, equipment_count, monthly_price, discount_percent, priority, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          id,
          String(rule.equipment_signature || '').toLowerCase(),
          Number(rule.equipment_count || 1),
          Number(rule.monthly_price || 0),
          Number(rule.discount_percent || 0),
          Number(rule.priority || 100),
        ]
      );
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Internal server error', message: error.message });
  } finally {
    client.release();
  }
});

router.delete('/plans/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM financial_plans WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/clients/profiles', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const { rows } = await pool.query(
      `SELECT c.id as client_id, c.name as client_name, c.billing_status, c.billing_blocked, c.billing_due_day,
              p.id as profile_id, p.plan_id, p.custom_due_day, p.grace_days_to_block, p.auto_block_enabled,
              fp.name as plan_name,
              be.created_at as last_override_at,
              be.details->>'reason' as last_override_reason,
              be.details->>'actorEmail' as last_override_actor_email,
              be.details->>'actorId' as last_override_actor_id,
              be.details->>'mode' as last_override_mode
       FROM clients c
       LEFT JOIN client_financial_profiles p ON p.client_id = c.id
       LEFT JOIN financial_plans fp ON fp.id = p.plan_id
       LEFT JOIN LATERAL (
         SELECT created_at, details
         FROM billing_events
         WHERE client_id = c.id
           AND event_type = 'manual_access_override'
         ORDER BY created_at DESC
         LIMIT 1
       ) be ON TRUE
       ORDER BY c.name ASC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/clients/:clientId/summary', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { clientId } = req.params;
  try {
    const clientResult = await pool.query(
      'SELECT id, name, billing_status, billing_blocked FROM clients WHERE id = $1 LIMIT 1',
      [clientId]
    );
    if (!clientResult.rows.length) {
      return res.status(404).json({ error: 'Not found', message: 'Client not found.' });
    }
    const clientRow = clientResult.rows[0];

    const profileResult = await pool.query(
      `SELECT p.*, fp.name AS plan_name, fp.base_price, fp.recurring_interval
       FROM client_financial_profiles p
       LEFT JOIN financial_plans fp ON fp.id = p.plan_id
       WHERE p.client_id = $1`,
      [clientId]
    );
    const profile = profileResult.rows[0] || null;

    const cyclesResult = await pool.query(
      `SELECT * FROM client_billing_cycles
       WHERE client_id = $1
         AND status IN ('pending', 'overdue')
       ORDER BY due_date ASC NULLS LAST`,
      [clientId]
    );

    let asaasOpenInvoices = [];
    let asaasCustomerMapped = false;
    try {
      const settings = await getFinancialSetting();
      const apiKey = decrypt(settings?.asaas_api_key_enc);
      if (apiKey) {
        const customerRow = await pool.query(
          'SELECT asaas_customer_id FROM asaas_customers WHERE client_id = $1 LIMIT 1',
          [clientId]
        );
        const asaasCustomerId = customerRow.rows[0]?.asaas_customer_id;
        if (asaasCustomerId) {
          asaasCustomerMapped = true;
          const invoices = await asaasService.listPaymentsByCustomer({
            apiKey,
            environment: settings?.asaas_environment || 'sandbox',
            customerId: asaasCustomerId,
            statuses: ['PENDING', 'OVERDUE'],
            maxPages: 10,
          });
          asaasOpenInvoices = invoices.map(normalizeInvoice);
        }
      }
    } catch (asaasErr) {
      console.error('clients/:clientId/summary Asaas list error:', asaasErr?.message || asaasErr);
    }

    return res.json({
      clientId: clientRow.id,
      clientName: clientRow.name,
      profile,
      billing: {
        billing_status: clientRow.billing_status || 'ativo',
        billing_blocked: Boolean(clientRow.billing_blocked),
      },
      openCycles: cyclesResult.rows,
      asaasOpenInvoices,
      asaasCustomerMapped,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.put('/clients/:clientId/profile', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { clientId } = req.params;
  const { plan_id, custom_due_day = 1, grace_days_to_block = 7, auto_block_enabled = true } = req.body || {};

  try {
    const result = await pool.query(
      `INSERT INTO client_financial_profiles
         (client_id, plan_id, custom_due_day, grace_days_to_block, auto_block_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (client_id)
       DO UPDATE SET
         plan_id = EXCLUDED.plan_id,
         custom_due_day = EXCLUDED.custom_due_day,
         grace_days_to_block = EXCLUDED.grace_days_to_block,
         auto_block_enabled = EXCLUDED.auto_block_enabled,
         updated_at = NOW()
       RETURNING *`,
      [clientId, plan_id || null, Number(custom_due_day || 1), Number(grace_days_to_block || 7), Boolean(auto_block_enabled)]
    );

    await pool.query(
      `UPDATE clients
       SET billing_due_day = $1, updated_at = NOW()
       WHERE id = $2`,
      [Number(custom_due_day || 1), clientId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.put('/clients/:clientId/access-override', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { clientId } = req.params;
  const { allowAccess, reason } = req.body || {};

  if (typeof allowAccess !== 'boolean') {
    return res.status(400).json({ error: 'Validation error', message: 'allowAccess (boolean) is required.' });
  }
  if (allowAccess && !String(reason || '').trim()) {
    return res.status(400).json({ error: 'Validation error', message: 'reason is required when allowAccess is true.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingProfile = await client.query(
      `SELECT * FROM client_financial_profiles WHERE client_id = $1 LIMIT 1`,
      [clientId]
    );
    const current = existingProfile.rows[0];

    await client.query(
      `INSERT INTO client_financial_profiles
         (client_id, plan_id, custom_due_day, grace_days_to_block, auto_block_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (client_id)
       DO UPDATE SET
         auto_block_enabled = EXCLUDED.auto_block_enabled,
         updated_at = NOW()`,
      [
        clientId,
        current?.plan_id || null,
        Number(current?.custom_due_day || 1),
        Number(current?.grace_days_to_block || 7),
        !allowAccess,
      ]
    );

    if (allowAccess) {
      await client.query(
        `UPDATE clients
         SET billing_status = 'ativo',
             billing_blocked = FALSE,
             billing_blocked_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [clientId]
      );
    } else {
      await client.query(
        `UPDATE clients c
         SET billing_status = CASE
               WHEN EXISTS (
                 SELECT 1
                 FROM client_billing_cycles b
                 WHERE b.client_id = c.id
                   AND b.status = 'overdue'
                   AND b.due_date <= CURRENT_DATE - INTERVAL '1 day'
               ) THEN 'inadimplente'
               ELSE 'ativo'
             END,
             billing_blocked = CASE
               WHEN EXISTS (
                 SELECT 1
                 FROM client_billing_cycles b
                 WHERE b.client_id = c.id
                   AND b.status = 'overdue'
                   AND b.due_date <= CURRENT_DATE - INTERVAL '7 day'
               ) THEN TRUE
               ELSE FALSE
             END,
             billing_blocked_at = CASE
               WHEN EXISTS (
                 SELECT 1
                 FROM client_billing_cycles b
                 WHERE b.client_id = c.id
                   AND b.status = 'overdue'
                   AND b.due_date <= CURRENT_DATE - INTERVAL '7 day'
               ) THEN COALESCE(c.billing_blocked_at, NOW())
               ELSE NULL
             END,
             updated_at = NOW()
         WHERE c.id = $1`,
        [clientId]
      );
    }

    await client.query(
      `INSERT INTO billing_events (client_id, event_type, details)
       VALUES ($1, 'manual_access_override', $2::jsonb)`,
      [
        clientId,
        JSON.stringify({
          allowAccess,
          mode: allowAccess ? 'manual_release' : 'automatic_reenabled',
          reason: String(reason || '').trim() || null,
          actorId: String(req.user?.id || ''),
          actorEmail: req.user?.email || null,
          executedAt: new Date().toISOString(),
        }),
      ]
    );

    await client.query('COMMIT');
    return res.json({ success: true, allowAccess });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  } finally {
    client.release();
  }
});

router.put('/cycles/:cycleId/manual-settlement', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { cycleId } = req.params;
  const { paidAmount, paidAt, note } = req.body || {};
  const paidAtDate = paidAt ? new Date(paidAt) : new Date();
  if (Number.isNaN(paidAtDate.getTime())) {
    return res.status(400).json({ error: 'Validation error', message: 'paidAt inválido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cycleResult = await client.query(
      `SELECT * FROM client_billing_cycles WHERE id = $1 LIMIT 1`,
      [cycleId]
    );
    const cycle = cycleResult.rows[0];
    if (!cycle) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found', message: 'Cobrança não encontrada.' });
    }

    const amountToSettle = Number(
      paidAmount !== undefined && paidAmount !== null && paidAmount !== ''
        ? paidAmount
        : cycle.amount
    );
    if (!Number.isFinite(amountToSettle) || amountToSettle < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Validation error', message: 'paidAmount inválido.' });
    }

    await client.query(
      `UPDATE client_billing_cycles
       SET status = 'paid',
           payment_date = $2,
           metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [
        cycleId,
        paidAtDate.toISOString(),
        JSON.stringify({
          manualSettlement: {
            paidAmount: amountToSettle,
            paidAt: paidAtDate.toISOString(),
            note: String(note || '').trim() || null,
            actorId: String(req.user?.id || ''),
            actorEmail: req.user?.email || null,
          },
        }),
      ]
    );

    await client.query(
      `UPDATE asaas_payments
       SET status = 'received',
           paid_at = $1,
           updated_at = NOW()
       WHERE cycle_id = $2
          OR (asaas_payment_id = $3 AND $3 IS NOT NULL)`,
      [paidAtDate.toISOString(), cycleId, cycle.asaas_payment_id || null]
    );

    const pastDueResult = await client.query(
      `SELECT EXISTS (
         SELECT 1
         FROM client_billing_cycles b
         WHERE b.client_id = $1
           AND b.status IN ('pending', 'overdue')
           AND b.due_date < CURRENT_DATE
       ) AS has_past_due`,
      [cycle.client_id]
    );
    const hasPastDue = Boolean(pastDueResult.rows[0]?.has_past_due);

    if (!hasPastDue) {
      await client.query(
        `UPDATE clients
         SET billing_status = 'ativo',
             billing_blocked = FALSE,
             billing_blocked_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [cycle.client_id]
      );
    }

    await client.query(
      `INSERT INTO billing_events (client_id, event_type, details)
       VALUES ($1, 'manual_settlement', $2::jsonb)`,
      [
        cycle.client_id,
        JSON.stringify({
          cycleId,
          cycleReference: cycle.cycle_reference,
          paidAmount: amountToSettle,
          paidAt: paidAtDate.toISOString(),
          note: String(note || '').trim() || null,
          actorId: String(req.user?.id || ''),
          actorEmail: req.user?.email || null,
        }),
      ]
    );

    await client.query('COMMIT');
    return res.json({ success: true, cycleId, paidAmount: amountToSettle });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  } finally {
    client.release();
  }
});

router.post('/clients/:clientId/sync-subscription', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { clientId } = req.params;

  try {
    const settings = await getFinancialSetting();
    const apiKey = decrypt(settings?.asaas_api_key_enc);
    if (!apiKey) return res.status(400).json({ error: 'Validation error', message: 'API Key not configured.' });

    const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    if (clientResult.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    const clientData = clientResult.rows[0];

    const { billingType: reqBillingType } = req.body || {};
    const allowedBillingTypes = ['BOLETO', 'PIX', 'CREDIT_CARD', 'UNDEFINED'];
    const billingType = allowedBillingTypes.includes(reqBillingType) ? reqBillingType : 'BOLETO';

    const snapshot = await calculateClientSnapshot(clientId);
    const amount = snapshot.total;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Validation error', message: 'Client total amount is zero. Configure plans/rules first.' });
    }

    const asaasCustomer = await asaasService.ensureCustomer({
      apiKey,
      environment: settings?.asaas_environment || 'sandbox',
      customerPayload: {
        name: clientData.name,
        email: clientData.email || undefined,
        cpfCnpj: clientData.tax_id || undefined,
        phone: clientData.contact_phone || undefined,
      },
    });

    await pool.query(
      `INSERT INTO asaas_customers (client_id, asaas_customer_id, raw_payload, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (client_id)
       DO UPDATE SET
         asaas_customer_id = EXCLUDED.asaas_customer_id,
         raw_payload = EXCLUDED.raw_payload,
         updated_at = NOW()`,
      [clientId, asaasCustomer.id, JSON.stringify(asaasCustomer)],
    );

    const profile = snapshot.profile;
    const subscriptionResult = await pool.query(
      `SELECT * FROM asaas_subscriptions WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [clientId],
    );
    const existingSubscription = subscriptionResult.rows[0];

    const dueDay = Number(profile?.custom_due_day || clientData.billing_due_day || 5);
    const nextDue = new Date();
    nextDue.setDate(dueDay);
    if (nextDue < new Date()) nextDue.setMonth(nextDue.getMonth() + 1);
    const dueDate = nextDue.toISOString().slice(0, 10);

    const asaasSubscription = await asaasService.createOrUpdateSubscription({
      apiKey,
      environment: settings?.asaas_environment || 'sandbox',
      subscriptionId: existingSubscription?.asaas_subscription_id,
      payload: {
        customer: asaasCustomer.id,
        billingType,
        value: amount,
        nextDueDate: dueDate,
        cycle: 'MONTHLY',
        description: `Plano financeiro ${profile?.plan_name || ''}`.trim(),
      },
    });

    await pool.query(
      `INSERT INTO asaas_subscriptions
        (client_id, plan_id, asaas_subscription_id, status, value, next_due_date, raw_payload, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
       ON CONFLICT (asaas_subscription_id)
       DO UPDATE SET
         status = EXCLUDED.status,
         value = EXCLUDED.value,
         next_due_date = EXCLUDED.next_due_date,
         raw_payload = EXCLUDED.raw_payload,
         updated_at = NOW()`,
      [
        clientId,
        profile?.plan_id || null,
        asaasSubscription.id,
        asaasSubscription.status || 'ACTIVE',
        Number(asaasSubscription.value || amount),
        asaasSubscription.nextDueDate || dueDate,
        JSON.stringify(asaasSubscription),
      ]
    );

    const cycleRef = `${nextDue.getFullYear()}-${String(nextDue.getMonth() + 1).padStart(2, '0')}`;
    await pool.query(
      `INSERT INTO client_billing_cycles
         (client_id, cycle_reference, due_date, amount, status, equipment_snapshot, metadata, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, $6::jsonb, NOW())
       ON CONFLICT (client_id, cycle_reference)
       DO UPDATE SET
         due_date = EXCLUDED.due_date,
         amount = EXCLUDED.amount,
         equipment_snapshot = EXCLUDED.equipment_snapshot,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()`,
      [
        clientId,
        cycleRef,
        asaasSubscription.nextDueDate || dueDate,
        Number(asaasSubscription.value || amount),
        JSON.stringify(snapshot.breakdown),
        JSON.stringify({ asaasSubscriptionId: asaasSubscription.id }),
      ]
    );

    res.json({
      success: true,
      total: amount,
      subscription: asaasSubscription,
    });
  } catch (error) {
    const message = extractAsaasErrorMessage(error);
    const status = error?.response?.status && error.response.status >= 400 && error.response.status < 500
      ? error.response.status
      : 500;
    console.error('sync-subscription error:', message);
    res.status(status).json({
      error: status === 500 ? 'Internal server error' : 'Asaas integration error',
      message,
    });
  }
});

router.post('/import/asaas', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const settings = await getFinancialSetting();
    const apiKey = decrypt(settings?.asaas_api_key_enc);
    if (!apiKey) return res.status(400).json({ error: 'Validation error', message: 'API Key not configured.' });

    const environment = settings?.asaas_environment || 'sandbox';
    const [customers, subscriptions, payments] = await Promise.all([
      asaasService.listCustomers({ apiKey, environment, maxPages: 15 }),
      asaasService.listSubscriptions({ apiKey, environment, maxPages: 15 }),
      asaasService.listPayments({ apiKey, environment, maxPages: 20 }),
    ]);

    const clientsResult = await pool.query('SELECT id, name, email, tax_id FROM clients');
    const clients = clientsResult.rows;

    const findClientByAsaas = (entity) => {
      const entityTax = normalizeTaxId(entity?.cpfCnpj);
      const entityEmail = String(entity?.email || '').trim().toLowerCase();
      if (entityTax) {
        const byTax = clients.find((c) => normalizeTaxId(c.tax_id) === entityTax);
        if (byTax) return byTax;
      }
      if (entityEmail) {
        const byEmail = clients.find((c) => String(c.email || '').trim().toLowerCase() === entityEmail);
        if (byEmail) return byEmail;
      }
      return null;
    };

    let importedCustomers = 0;
    let importedSubscriptions = 0;
    let importedPayments = 0;
    let importedCycles = 0;
    let skippedUnmapped = 0;

    for (const customer of customers) {
      const mappedClient = findClientByAsaas(customer);
      if (!mappedClient) {
        skippedUnmapped += 1;
        continue;
      }
      await pool.query(
        `INSERT INTO asaas_customers (client_id, asaas_customer_id, raw_payload, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW())
         ON CONFLICT (client_id)
         DO UPDATE SET
           asaas_customer_id = EXCLUDED.asaas_customer_id,
           raw_payload = EXCLUDED.raw_payload,
           updated_at = NOW()`,
        [mappedClient.id, customer.id, JSON.stringify(customer)]
      );
      importedCustomers += 1;
    }

    const customerToClientMap = {};
    const customerRows = await pool.query('SELECT client_id, asaas_customer_id FROM asaas_customers');
    for (const row of customerRows.rows) {
      customerToClientMap[row.asaas_customer_id] = row.client_id;
    }

    for (const sub of subscriptions) {
      if (!sub?.id) {
        skippedUnmapped += 1;
        continue;
      }
      const clientId = customerToClientMap[sub.customer];
      if (!clientId) {
        skippedUnmapped += 1;
        continue;
      }
      await pool.query(
        `INSERT INTO asaas_subscriptions
          (client_id, plan_id, asaas_subscription_id, status, value, next_due_date, raw_payload, updated_at)
         VALUES ($1, NULL, $2, $3, $4, $5, $6::jsonb, NOW())
         ON CONFLICT (asaas_subscription_id)
         DO UPDATE SET
           status = EXCLUDED.status,
           value = EXCLUDED.value,
           next_due_date = EXCLUDED.next_due_date,
           raw_payload = EXCLUDED.raw_payload,
           updated_at = NOW()`,
        [
          clientId,
          sub.id,
          sub.status || 'ACTIVE',
          Number(sub.value || 0),
          sub.nextDueDate || null,
          JSON.stringify(sub),
        ]
      );
      importedSubscriptions += 1;
    }

    for (const payment of payments) {
      if (!payment?.id) {
        skippedUnmapped += 1;
        continue;
      }
      const clientId = customerToClientMap[payment.customer];
      if (!clientId) {
        skippedUnmapped += 1;
        continue;
      }

      await pool.query(
        `INSERT INTO asaas_payments
          (client_id, cycle_id, asaas_payment_id, status, value, due_date, paid_at, raw_payload, updated_at)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7::jsonb, NOW())
         ON CONFLICT (asaas_payment_id)
         DO UPDATE SET
           status = EXCLUDED.status,
           value = EXCLUDED.value,
           due_date = EXCLUDED.due_date,
           paid_at = EXCLUDED.paid_at,
           raw_payload = EXCLUDED.raw_payload,
           updated_at = NOW()`,
        [
          clientId,
          payment.id,
          String(payment.status || 'PENDING').toLowerCase(),
          Number(payment.value || 0),
          payment.dueDate || null,
          payment.clientPaymentDate || null,
          JSON.stringify(payment),
        ]
      );
      importedPayments += 1;

      if (payment.dueDate) {
        const cycleReference = String(payment.dueDate).slice(0, 7);
        const mappedStatus = String(payment.status || '').toUpperCase();
        const cycleStatus = (
          mappedStatus === 'RECEIVED' || mappedStatus === 'CONFIRMED' ? 'paid'
            : (mappedStatus.includes('OVERDUE') ? 'overdue' : 'pending')
        );
        await pool.query(
          `INSERT INTO client_billing_cycles
             (client_id, cycle_reference, due_date, amount, status, payment_date, asaas_payment_id, metadata, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
           ON CONFLICT (client_id, cycle_reference)
           DO UPDATE SET
             due_date = EXCLUDED.due_date,
             amount = EXCLUDED.amount,
             status = EXCLUDED.status,
             payment_date = EXCLUDED.payment_date,
             asaas_payment_id = EXCLUDED.asaas_payment_id,
             metadata = EXCLUDED.metadata,
             updated_at = NOW()`,
          [
            clientId,
            cycleReference,
            payment.dueDate,
            Number(payment.value || 0),
            cycleStatus,
            payment.clientPaymentDate || null,
            payment.id,
            JSON.stringify({ importedFrom: 'asaas', paymentId: payment.id }),
          ]
        );
        importedCycles += 1;
      }
    }

    res.json({
      success: true,
      imported: {
        customers: importedCustomers,
        subscriptions: importedSubscriptions,
        payments: importedPayments,
        billingCycles: importedCycles,
      },
      skippedUnmapped,
    });
  } catch (error) {
    const message = extractAsaasErrorMessage(error);
    const status = error?.response?.status && error.response.status >= 400 && error.response.status < 500
      ? error.response.status
      : 500;
    console.error('import-asaas error details:', error?.stack || error?.message || error);
    res.status(status).json({
      error: status === 500 ? 'Internal server error' : 'Asaas integration error',
      message,
    });
  }
});

router.get('/overview', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const { rows: kpiRows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue', 'paid') THEN amount END), 0) AS forecast_total,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount END), 0) AS received_total,
         COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount END), 0) AS open_total,
         COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount END), 0) AS overdue_total
       FROM client_billing_cycles
       WHERE date_trunc('month', due_date) = date_trunc('month', CURRENT_DATE)`,
    );

    // Current month charges — all of them, filtered in SQL
    const { rows: currentMonthCharges } = await pool.query(
      `SELECT b.*, c.name AS client_name
       FROM client_billing_cycles b
       JOIN clients c ON c.id = b.client_id
       WHERE date_trunc('month', b.due_date) = date_trunc('month', CURRENT_DATE)
       ORDER BY c.name ASC`,
    );

    // All overdue / past-due pending — no limit
    const { rows: overdueCharges } = await pool.query(
      `SELECT b.*, c.name AS client_name
       FROM client_billing_cycles b
       JOIN clients c ON c.id = b.client_id
       WHERE b.status = 'overdue'
          OR (b.status = 'pending' AND b.due_date < CURRENT_DATE)
       ORDER BY b.due_date ASC`,
    );

    // Monthly series aggregated in SQL — last 13 months
    const { rows: monthlySeries } = await pool.query(
      `SELECT
         TO_CHAR(date_trunc('month', due_date), 'YYYY-MM') AS month,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS received,
         COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) AS overdue,
         COALESCE(SUM(amount), 0) AS total
       FROM client_billing_cycles
       WHERE due_date >= CURRENT_DATE - INTERVAL '13 months'
       GROUP BY date_trunc('month', due_date)
       ORDER BY date_trunc('month', due_date) ASC`,
    );

    const { rows: inadimplentes } = await pool.query(
      `SELECT id, name, billing_status, billing_blocked, billing_last_overdue_at, billing_blocked_at
       FROM clients
       WHERE billing_status = 'inadimplente'
       ORDER BY name ASC`,
    );

    const metrics = kpiRows[0] || {};
    const forecast = Number(metrics.forecast_total || 0);
    const received = Number(metrics.received_total || 0);
    const adimplenciaRate = forecast > 0 ? Number(((received / forecast) * 100).toFixed(2)) : 0;

    res.json({
      metrics: {
        forecast_total: forecast,
        received_total: received,
        open_total: Number(metrics.open_total || 0),
        overdue_total: Number(metrics.overdue_total || 0),
        adimplencia_rate: adimplenciaRate,
      },
      current_month_charges: currentMonthCharges,
      overdue_charges: overdueCharges,
      monthly_series: monthlySeries,
      overdue_clients: inadimplentes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Histórico completo de ciclos de um cliente
router.get('/clients/:clientId/billing-history', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { clientId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT b.*, c.name AS client_name
       FROM client_billing_cycles b
       JOIN clients c ON c.id = b.client_id
       WHERE b.client_id = $1
       ORDER BY b.due_date DESC
       LIMIT $2 OFFSET $3`,
      [clientId, Number(limit), Number(offset)],
    );
    const { rows: [{ total }] } = await pool.query(
      `SELECT COUNT(*) AS total FROM client_billing_cycles WHERE client_id = $1`,
      [clientId],
    );
    res.json({ cycles: rows, total: Number(total) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Bulk sync — sincroniza todos os clientes com plano no Asaas
router.post('/clients/bulk-sync', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const settings = await getFinancialSetting();
    const apiKey = decrypt(settings?.asaas_api_key_enc);
    if (!apiKey) return res.status(400).json({ error: 'Validation error', message: 'API Key not configured.' });

    const { rows: profiles } = await pool.query(
      `SELECT p.client_id FROM client_financial_profiles p WHERE p.plan_id IS NOT NULL`,
    );

    const results = { synced: 0, skipped: 0, errors: [] };
    for (const { client_id } of profiles) {
      try {
        const snapshot = await calculateClientSnapshot(client_id);
        if (!snapshot.total || snapshot.total <= 0) { results.skipped += 1; continue; }

        const clientRow = await pool.query('SELECT * FROM clients WHERE id = $1 LIMIT 1', [client_id]);
        if (!clientRow.rows.length) { results.skipped += 1; continue; }
        const clientData = clientRow.rows[0];

        const asaasCustomer = await asaasService.ensureCustomer({
          apiKey,
          environment: settings?.asaas_environment || 'sandbox',
          customerPayload: {
            name: clientData.name,
            email: clientData.email || undefined,
            cpfCnpj: clientData.tax_id || undefined,
            phone: clientData.contact_phone || undefined,
          },
        });

        await pool.query(
          `INSERT INTO asaas_customers (client_id, asaas_customer_id, raw_payload, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (client_id)
           DO UPDATE SET asaas_customer_id = EXCLUDED.asaas_customer_id, raw_payload = EXCLUDED.raw_payload, updated_at = NOW()`,
          [client_id, asaasCustomer.id, JSON.stringify(asaasCustomer)],
        );

        const profile = snapshot.profile;
        const dueDay = Number(profile?.custom_due_day || clientData.billing_due_day || 5);
        const nextDue = new Date();
        nextDue.setDate(dueDay);
        if (nextDue < new Date()) nextDue.setMonth(nextDue.getMonth() + 1);
        const dueDate = nextDue.toISOString().slice(0, 10);

        const existingSub = await pool.query(
          `SELECT asaas_subscription_id FROM asaas_subscriptions WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [client_id],
        );

        const sub = await asaasService.createOrUpdateSubscription({
          apiKey,
          environment: settings?.asaas_environment || 'sandbox',
          subscriptionId: existingSub.rows[0]?.asaas_subscription_id,
          payload: {
            customer: asaasCustomer.id,
            billingType: 'BOLETO',
            value: snapshot.total,
            nextDueDate: dueDate,
            cycle: 'MONTHLY',
            description: `Plano financeiro ${profile?.plan_name || ''}`.trim(),
          },
        });

        await pool.query(
          `INSERT INTO asaas_subscriptions (client_id, plan_id, asaas_subscription_id, status, value, next_due_date, raw_payload, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
           ON CONFLICT (asaas_subscription_id)
           DO UPDATE SET status = EXCLUDED.status, value = EXCLUDED.value, next_due_date = EXCLUDED.next_due_date, raw_payload = EXCLUDED.raw_payload, updated_at = NOW()`,
          [client_id, profile?.plan_id || null, sub.id, sub.status || 'ACTIVE', Number(sub.value || snapshot.total), sub.nextDueDate || dueDate, JSON.stringify(sub)],
        );

        results.synced += 1;
      } catch (err) {
        results.errors.push({ client_id, message: err?.response?.data?.errors?.[0]?.description || err.message });
      }
    }

    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Export CSV de todos os ciclos de cobrança
router.get('/export/charges.csv', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { month, status } = req.query;
  try {
    const conditions = ['1=1'];
    const params = [];
    if (month) {
      params.push(month);
      conditions.push(`TO_CHAR(date_trunc('month', b.due_date), 'YYYY-MM') = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }
    const { rows } = await pool.query(
      `SELECT c.name AS cliente, b.cycle_reference AS competencia, b.due_date AS vencimento,
              b.amount AS valor, b.status AS status, b.payment_date AS data_pagamento
       FROM client_billing_cycles b
       JOIN clients c ON c.id = b.client_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.due_date DESC, c.name ASC`,
      params,
    );

    const headers = ['Cliente', 'Competência', 'Vencimento', 'Valor (R$)', 'Status', 'Data Pagamento'];
    const csv = [
      headers.join(';'),
      ...rows.map((r) => [
        `"${String(r.cliente || '').replace(/"/g, '""')}"`,
        r.competencia || '',
        r.vencimento ? String(r.vencimento).slice(0, 10) : '',
        Number(r.valor || 0).toFixed(2).replace('.', ','),
        r.status || '',
        r.data_pagamento ? String(r.data_pagamento).slice(0, 10) : '',
      ].join(';')),
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cobranças-${month || 'todos'}.csv"`);
    res.send('﻿' + csv); // BOM for Excel
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

export default router;

