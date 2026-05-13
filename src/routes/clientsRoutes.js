import { Router } from 'express';
import axios from 'axios';
import pool from '../addons/traccar_wrapper/db/index.js';
import { syncUserVehiclePermissions, removeTraccarPermission } from './traccarPermissions.js';

const router = Router();

/** GET / – list all clients (with user_count from client_users when available) */
router.get('/', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    let rows;
    try {
      const r = await pool.query(
        `SELECT c.*, (SELECT count(*)::int FROM client_users cu WHERE cu.client_id = c.id) as user_count
         FROM clients c ORDER BY c.created_at DESC`,
      );
      rows = r.rows;
    } catch (_) {
      const r = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
      rows = r.rows.map((row) => ({ ...row, user_count: row.traccar_user_id ? 1 : 0 }));
    }
    res.status(200).json(rows);
  } catch (err) {
    console.error('GET /api/clients DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST / – create client */
router.post('/', async (req, res) => {
  const {
    type,
    name,
    tax_id,
    address,
    cep,
    contact_phone,
    email,
    traccar_user_id,
    active,
    billing_status,
    billing_blocked,
  } = req.body ?? {};

  if (!type || !name) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'type (PF or PJ) and name are required.',
    });
  }
  if (type !== 'PF' && type !== 'PJ') {
    return res.status(400).json({
      error: 'Validation error',
      message: 'type must be PF or PJ.',
    });
  }

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO clients (type, name, tax_id, address, cep, contact_phone, email, traccar_user_id, active, billing_status, billing_blocked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        type,
        name,
        tax_id ?? null,
        address ?? null,
        cep ?? null,
        contact_phone ?? null,
        email ?? null,
        traccar_user_id ?? null,
        active !== undefined ? active : true,
        billing_status === 'inadimplente' ? 'inadimplente' : 'ativo',
        billing_blocked === true,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    const code = err?.code;
    if (code === '23505') {
      const detail = err?.detail ?? '';
      const msg = detail.includes('tax_id')
        ? 'tax_id already exists.'
        : detail.includes('traccar_user_id')
          ? 'traccar_user_id already exists.'
          : 'Duplicate value for unique constraint.';
      return res.status(409).json({ error: 'Conflict', message: msg });
    }
    console.error('POST /api/clients DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /:id – update client */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    type,
    name,
    tax_id,
    address,
    cep,
    contact_phone,
    email,
    traccar_user_id,
    active,
    billing_status,
    billing_blocked,
  } = req.body ?? {};

  if (!type || !name) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'type (PF or PJ) and name are required.',
    });
  }
  if (type !== 'PF' && type !== 'PJ') {
    return res.status(400).json({
      error: 'Validation error',
      message: 'type must be PF or PJ.',
    });
  }

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    // Verificar se o cliente existe
    const checkResult = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Client not found.',
      });
    }

    const { rows } = await pool.query(
      `UPDATE clients 
       SET type = $1, name = $2, tax_id = $3, address = $4, cep = $5, contact_phone = $6, email = $7, traccar_user_id = $8, active = $9,
           billing_status = $10, billing_blocked = $11, updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        type,
        name,
        tax_id ?? null,
        address ?? null,
        cep ?? null,
        contact_phone ?? null,
        email ?? null,
        traccar_user_id ?? null,
        active !== undefined ? active : true,
        billing_status === 'inadimplente' ? 'inadimplente' : 'ativo',
        billing_blocked === true,
        id,
      ],
    );
    res.status(200).json(rows[0]);
  } catch (err) {
    const code = err?.code;
    if (code === '23505') {
      const detail = err?.detail ?? '';
      const msg = detail.includes('tax_id')
        ? 'tax_id already exists.'
        : detail.includes('traccar_user_id')
          ? 'traccar_user_id already exists.'
          : 'Duplicate value for unique constraint.';
      return res.status(409).json({ error: 'Conflict', message: msg });
    }
    console.error('PUT /api/clients/:id DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /:id – delete client */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    // Verificar se o cliente existe
    const checkResult = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Client not found.',
      });
    }

    // Deletar o cliente
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    res.status(200).json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/clients/:id DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /:id/available-users – list Traccar users available to link (uses admin auth, excludes already linked) */
router.get('/:id/available-users', async (req, res) => {
  const { id } = req.params;
  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;
  if (!traccarApiUrl || !traccarEmail || !traccarPassword) {
    return res.status(503).json({ error: 'Traccar not configured', message: 'TRACCAR_API_URL/TRACCAR_EMAIL/TRACCAR_PASSWORD not set' });
  }
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    const checkResult = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Client not found.' });
    }
    const { rows: linkedRows } = await pool.query(
      'SELECT traccar_user_id FROM client_users WHERE client_id = $1',
      [id]
    );
    const alreadyLinkedIds = new Set(linkedRows.map((r) => r.traccar_user_id).filter(Boolean));
    const auth = { username: traccarEmail, password: traccarPassword };
    const traccarRes = await axios.get(`${traccarApiUrl}/api/users`, { auth });
    const allUsers = Array.isArray(traccarRes.data) ? traccarRes.data : [];
    const available = allUsers.filter((u) => !alreadyLinkedIds.has(u.id));
    res.status(200).json(available);
  } catch (err) {
    console.error('GET /api/clients/:id/available-users error:', err?.message);
    res.status(500).json({ error: 'Internal server error', message: err?.response?.data?.message || err?.message });
  }
});

/** GET /:id/traccar-users – list ALL Traccar users (uses admin auth, for display of linked users) */
router.get('/:id/traccar-users', async (req, res) => {
  const { id } = req.params;
  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;
  if (!traccarApiUrl || !traccarEmail || !traccarPassword) {
    return res.status(503).json({ error: 'Traccar not configured', message: 'TRACCAR_API_URL/TRACCAR_EMAIL/TRACCAR_PASSWORD not set' });
  }
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    const checkResult = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Client not found.' });
    }
    const auth = { username: traccarEmail, password: traccarPassword };
    const traccarRes = await axios.get(`${traccarApiUrl}/api/users`, { auth });
    const allUsers = Array.isArray(traccarRes.data) ? traccarRes.data : [];
    res.status(200).json(allUsers);
  } catch (err) {
    console.error('GET /api/clients/:id/traccar-users error:', err?.message);
    res.status(500).json({ error: 'Internal server error', message: err?.response?.data?.message || err?.message });
  }
});

/** GET /:id/users – list users linked to client */
router.get('/:id/users', async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    const checkResult = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Client not found.' });
    }
    const { rows } = await pool.query(
      'SELECT client_id, traccar_user_id, created_at FROM client_users WHERE client_id = $1 ORDER BY created_at ASC',
      [id]
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error('GET /api/clients/:id/users DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /:id/users – add user to client (body: traccar_user_id) */
router.post('/:id/users', async (req, res) => {
  const { id } = req.params;
  const { traccar_user_id } = req.body ?? {};
  if (!traccar_user_id) {
    return res.status(400).json({ error: 'Validation error', message: 'traccar_user_id is required.' });
  }
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    const checkResult = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Client not found.' });
    }
    await pool.query(
      'INSERT INTO client_users (client_id, traccar_user_id) VALUES ($1, $2) ON CONFLICT (client_id, traccar_user_id) DO NOTHING',
      [id, traccar_user_id]
    );
    const vehResult = await pool.query('SELECT id FROM vehicles WHERE client_id = $1', [id]);
    for (const row of vehResult.rows) {
      await pool.query(
        'INSERT INTO user_vehicles (traccar_user_id, vehicle_id) VALUES ($1, $2) ON CONFLICT (traccar_user_id, vehicle_id) DO NOTHING',
        [traccar_user_id, row.id]
      );
      syncUserVehiclePermissions(traccar_user_id, row.id).catch((e) => console.error('Sync permissions:', e));
    }
    const { rows } = await pool.query(
      'SELECT client_id, traccar_user_id, created_at FROM client_users WHERE client_id = $1 AND traccar_user_id = $2',
      [id, traccar_user_id]
    );
    res.status(201).json(rows[0] || { client_id: id, traccar_user_id, created_at: new Date() });
  } catch (err) {
    console.error('POST /api/clients/:id/users DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /:id/users/:traccarUserId – remove user from client */
router.delete('/:id/users/:traccarUserId', async (req, res) => {
  const { id, traccarUserId } = req.params;
  const traccarUserIdInt = parseInt(traccarUserId, 10);
  if (isNaN(traccarUserIdInt)) {
    return res.status(400).json({ error: 'Validation error', message: 'Invalid traccarUserId.' });
  }
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    const checkResult = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Client not found.' });
    }
    const uvRes = await pool.query(
      'SELECT vehicle_id FROM user_vehicles WHERE traccar_user_id = $1 AND vehicle_id IN (SELECT id FROM vehicles WHERE client_id = $2)',
      [traccarUserIdInt, id]
    );
    for (const row of uvRes.rows) {
      const vdRes = await pool.query('SELECT device_id FROM vehicle_devices WHERE vehicle_id = $1::uuid AND device_id IS NOT NULL', [row.vehicle_id]);
      for (const vd of vdRes.rows) {
        removeTraccarPermission(traccarUserIdInt, vd.device_id).catch((e) => console.error('Remove permission:', e));
      }
    }
    await pool.query('DELETE FROM client_users WHERE client_id = $1 AND traccar_user_id = $2', [id, traccarUserIdInt]);
    await pool.query('DELETE FROM user_vehicles WHERE traccar_user_id = $1 AND vehicle_id IN (SELECT id FROM vehicles WHERE client_id = $2)', [traccarUserIdInt, id]);
    res.status(200).json({ message: 'User removed from client successfully' });
  } catch (err) {
    console.error('DELETE /api/clients/:id/users/:traccarUserId DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /:id/users/:traccarUserId/vehicles – list vehicles associated to user (with notify flag) */
router.get('/:id/users/:traccarUserId/vehicles', async (req, res) => {
  const { id, traccarUserId } = req.params;
  const traccarUserIdInt = parseInt(traccarUserId, 10);
  if (isNaN(traccarUserIdInt)) {
    return res.status(400).json({ error: 'Validation error', message: 'Invalid traccarUserId.' });
  }
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    const checkResult = await pool.query('SELECT 1 FROM client_users WHERE client_id = $1 AND traccar_user_id = $2', [id, traccarUserIdInt]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'User not linked to this client.' });
    }
    const { rows } = await pool.query(
      `SELECT uv.traccar_user_id, uv.vehicle_id, uv.notify, uv.created_at,
              v.plate, v.nickname, v.make, v.model
       FROM user_vehicles uv
       JOIN vehicles v ON v.id = uv.vehicle_id AND v.client_id = $1
       WHERE uv.traccar_user_id = $2
       ORDER BY v.plate`,
      [id, traccarUserIdInt]
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error('GET /api/clients/:id/users/:traccarUserId/vehicles DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /:id/users/:traccarUserId/vehicles – update vehicle associations (body: [{ vehicle_id, notify }]) */
router.put('/:id/users/:traccarUserId/vehicles', async (req, res) => {
  const { id, traccarUserId } = req.params;
  const traccarUserIdInt = parseInt(traccarUserId, 10);
  if (isNaN(traccarUserIdInt)) {
    return res.status(400).json({ error: 'Validation error', message: 'Invalid traccarUserId.' });
  }
  const payload = req.body ?? {};
  const associations = Array.isArray(payload.associations) ? payload.associations : (Array.isArray(payload) ? payload : []);
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    const checkResult = await pool.query('SELECT 1 FROM client_users WHERE client_id = $1 AND traccar_user_id = $2', [id, traccarUserIdInt]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'User not linked to this client.' });
    }
    const client = await pool.connect();
    try {
      const newVehicleIds = new Set(associations.map((a) => (a.vehicle_id || a.vehicleId)?.toString()).filter(Boolean));
      const currentRes = await client.query(
        `SELECT uv.vehicle_id FROM user_vehicles uv
         JOIN vehicles v ON v.id = uv.vehicle_id AND v.client_id = $1
         WHERE uv.traccar_user_id = $2`,
        [id, traccarUserIdInt]
      );
      for (const row of currentRes.rows) {
        const vid = row.vehicle_id?.toString();
        if (vid && !newVehicleIds.has(vid)) {
          const vdRes = await pool.query('SELECT device_id FROM vehicle_devices WHERE vehicle_id = $1::uuid', [row.vehicle_id]);
          for (const vd of vdRes.rows) {
            if (vd.device_id != null) {
              removeTraccarPermission(traccarUserIdInt, vd.device_id).catch((e) => console.error('Remove permission:', e));
            }
          }
        }
      }
      await client.query('DELETE FROM user_vehicles WHERE traccar_user_id = $1 AND vehicle_id IN (SELECT id FROM vehicles WHERE client_id = $2)', [traccarUserIdInt, id]);
      const vehicleIds = associations.map((a) => a.vehicle_id || a.vehicleId).filter(Boolean);
      const validVehicleIds = [];
      for (const vid of vehicleIds) {
        const vCheck = await client.query('SELECT id FROM vehicles WHERE id = $1::uuid AND client_id = $2', [vid, id]);
        if (vCheck.rows.length > 0) validVehicleIds.push(vid);
      }
      for (const a of associations) {
        const vid = a.vehicle_id || a.vehicleId;
        if (!vid || !validVehicleIds.includes(vid)) continue;
        const notify = Boolean(a.notify);
        await client.query(
          'INSERT INTO user_vehicles (traccar_user_id, vehicle_id, notify) VALUES ($1, $2, $3) ON CONFLICT (traccar_user_id, vehicle_id) DO UPDATE SET notify = $3',
          [traccarUserIdInt, vid, notify]
        );
        syncUserVehiclePermissions(traccarUserIdInt, vid).catch((e) => console.error('Sync permissions:', e));
      }
      const { rows } = await client.query(
        `SELECT uv.traccar_user_id, uv.vehicle_id, uv.notify
         FROM user_vehicles uv
         JOIN vehicles v ON v.id = uv.vehicle_id AND v.client_id = $1
         WHERE uv.traccar_user_id = $2`,
        [id, traccarUserIdInt]
      );
      res.status(200).json(rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PUT /api/clients/:id/users/:traccarUserId/vehicles DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
