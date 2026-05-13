import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import axios from 'axios';
import pool from '../addons/traccar_wrapper/db/index.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { syncUserVehiclePermissions } from './traccarPermissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Uploads directory (same as gestao_backend for shared storage)
const uploadsDir = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const vehicleUploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `veiculo_${Date.now()}_${(file.originalname || 'img').replace(/[^a-zA-Z0-9.-]/g, '_')}`),
});
const vehicleUpload = multer({ storage: vehicleUploadStorage });

// Aplicar middleware de autenticação em todas as rotas deste router
router.use(authenticate);

/**
 * Sincroniza permissões no Traccar para um veículo recém-criado/atualizado.
 * Usa client_users: para cada usuário vinculado ao cliente, adiciona o veículo em user_vehicles
 * e sincroniza permissões. Fallback para clients.traccar_user_id (legado).
 * @param {string} clientId - ID do cliente no banco local
 * @param {string} vehicleId - UUID do veículo
 * @param {number[]} deviceIds - Array de IDs dos dispositivos (para fallback legado)
 */
async function syncTraccarPermissions(clientId, vehicleId, deviceIds = []) {
  if (!clientId || !vehicleId) return;

  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;
  if (!traccarApiUrl || !traccarEmail || !traccarPassword) {
    console.warn('⚠️ Traccar API credentials not configured. Skipping permission sync.');
    return;
  }

  try {
    let userIds = [];
    try {
      const cuResult = await pool.query(
        'SELECT traccar_user_id FROM client_users WHERE client_id = $1',
        [clientId]
      );
      userIds = cuResult.rows.map((r) => r.traccar_user_id).filter(Boolean);
    } catch (_) {
      // client_users pode não existir (pré-migração)
    }

    if (userIds.length === 0) {
      const clientResult = await pool.query(
        'SELECT traccar_user_id FROM clients WHERE id = $1 AND traccar_user_id IS NOT NULL',
        [clientId]
      );
      if (clientResult.rows.length > 0 && clientResult.rows[0].traccar_user_id) {
        userIds = [clientResult.rows[0].traccar_user_id];
        try {
          await pool.query(
            'INSERT INTO client_users (client_id, traccar_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [clientId, clientResult.rows[0].traccar_user_id]
          );
        } catch (__) {}
        try {
          await pool.query(
            'INSERT INTO user_vehicles (traccar_user_id, vehicle_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [clientResult.rows[0].traccar_user_id, vehicleId]
          );
        } catch (__) {}
      }
    } else {
      for (const uid of userIds) {
        try {
          await pool.query(
            'INSERT INTO user_vehicles (traccar_user_id, vehicle_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [uid, vehicleId]
          );
        } catch (__) {}
      }
    }

    for (const traccarUserId of userIds) {
      syncUserVehiclePermissions(traccarUserId, vehicleId).catch((e) =>
        console.error('Sync permissions for user', traccarUserId, e?.message)
      );
    }
  } catch (err) {
    console.error('❌ Erro ao sincronizar permissões do Traccar:', err.message);
  }
}

/**
 * Sincroniza campos dos devices no Traccar com dados do veículo.
 * @param {number[]} deviceIds - Array de IDs dos dispositivos
 * @param {{ plate?: string, category?: string | null }} options
 */
async function syncTraccarDeviceFields(deviceIds, options = {}) {
  if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
    return;
  }

  const normalizedPlate = String(options.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const trimmedCategory = typeof options.category === 'string' && options.category.trim()
    ? options.category.trim()
    : null;

  if (!normalizedPlate && !trimmedCategory) {
    return;
  }

  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;

  if (!traccarApiUrl || !traccarEmail || !traccarPassword) {
    console.warn('⚠️ Traccar API credentials not configured. Skipping device sync.');
    return;
  }

  const auth = { username: traccarEmail, password: traccarPassword };

  for (const deviceId of deviceIds) {
    if (!deviceId) continue;
    try {
      const getRes = await axios.get(`${traccarApiUrl}/api/devices/${deviceId}`, { auth });
      const device = getRes.data;
      if (!device) continue;

      const modelOrName = String(device.model || device.name || '').trim();
      const nextName = normalizedPlate && modelOrName ? `${normalizedPlate}-${modelOrName}` : device.name;
      const nextCategory = trimmedCategory || device.category;

      const updatedDevice = {
        ...device,
        name: nextName,
        category: nextCategory,
      };
      await axios.put(`${traccarApiUrl}/api/devices/${deviceId}`, updatedDevice, {
        auth,
        headers: { 'Content-Type': 'application/json' },
      });
      console.log(`✅ Device ${deviceId} atualizado para nome "${nextName}" e categoria "${nextCategory}"`);
    } catch (err) {
      console.error(`❌ Erro ao atualizar campos do device ${deviceId}:`, err.response?.data || err.message);
      // Não lançar - continuar com os demais
    }
  }
}

/** GET / – list all vehicles with client name and device IDs */
router.get('/', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  
  try {
    // 1. Identificar quem é
    const isSuperAdmin = req.user && (
      req.user.email === 'evangelista1908@gmail.com' || 
      req.user.administrator === true || 
      req.user.admin === true
    );

    console.log('User requesting vehicles:', {
      id: req.user?.id,
      email: req.user?.email,
      administrator: req.user?.administrator,
      isSuperAdmin
    });

    let query = `
      SELECT 
        v.*,
        v.tank_capacity,
        v.initial_odometer,
        c.name as client_name,
        -- TRUQUE: Pegar o primeiro device_id para enganar o frontend legado
        COALESCE(
          (SELECT device_id FROM vehicle_devices vd WHERE vd.vehicle_id = v.id AND vd.is_primary = true LIMIT 1),
          (SELECT device_id FROM vehicle_devices vd WHERE vd.vehicle_id = v.id LIMIT 1)
        ) as device_id,
        -- Pegar lista completa para o formulário de edição
        (SELECT json_agg(vd.device_id) FROM vehicle_devices vd WHERE vd.vehicle_id = v.id) as "deviceIds"
      FROM vehicles v
      LEFT JOIN clients c ON v.client_id = c.id
    `;
    
    const params = [];
    
    // 2. Aplicar Filtro de Segurança
    if (!isSuperAdmin) {
      if (!req.user || !req.user.id) {
        console.log('No user ID found, returning empty array');
        return res.json([]);
      }

      let clientIds = [];
      try {
        const cuResult = await pool.query(
          `SELECT cu.client_id
           FROM client_users cu
           JOIN clients c ON c.id = cu.client_id
           WHERE cu.traccar_user_id = $1
             AND COALESCE(c.active, TRUE) = TRUE
             AND COALESCE(c.billing_blocked, FALSE) = FALSE
             AND COALESCE(c.billing_status, 'ativo') <> 'inadimplente'`,
          [req.user.id]
        );
        clientIds = cuResult.rows.map((r) => r.client_id);
      } catch (_) {}
      if (clientIds.length === 0) {
        const clientResult = await pool.query(
          `SELECT id
           FROM clients
           WHERE traccar_user_id = $1
             AND COALESCE(active, TRUE) = TRUE
             AND COALESCE(billing_blocked, FALSE) = FALSE
             AND COALESCE(billing_status, 'ativo') <> 'inadimplente'`,
          [req.user.id]
        );
        clientIds = clientResult.rows.map((r) => r.id);
      }
      if (clientIds.length === 0) {
        console.log(`No client found for user ID ${req.user.id}, returning empty array`);
        return res.json([]);
      }
      query += ` WHERE v.client_id = ANY($1::uuid[])
        AND COALESCE(c.active, TRUE) = TRUE
        AND COALESCE(c.billing_blocked, FALSE) = FALSE
        AND COALESCE(c.billing_status, 'ativo') <> 'inadimplente'
        AND EXISTS (SELECT 1 FROM user_vehicles uv WHERE uv.traccar_user_id = $2 AND uv.vehicle_id = v.id)`;
      params.push(clientIds, req.user.id);
      console.log(`Client(s) found: ${clientIds.length} for user ${req.user.id}, filtering vehicles`);
    } else {
      console.log('Super Admin user detected, returning all vehicles');
    }
    
    // 3. Ordenação e Execução
    query += ` ORDER BY v.created_at DESC`;
    
    const { rows } = await pool.query(query, params);
    console.log(`Query executed successfully, returning ${rows.length} vehicles`);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    console.error('Error stack:', error?.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /available-devices – list devices not associated with any vehicle (or not with other vehicles when editing) */
router.get('/available-devices', async (req, res) => {
  const excludeVehicleId = req.query.excludeVehicleId || null;

  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;

  if (!traccarApiUrl || !traccarEmail || !traccarPassword) {
    return res.status(503).json({ error: 'Traccar API not configured', message: 'TRACCAR_API_URL not set' });
  }

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    const isSuperAdmin = req.user && (
      req.user.email === 'evangelista1908@gmail.com' ||
      req.user.administrator === true ||
      req.user.admin === true
    );

    // Device IDs already associated with vehicles (excluding excludeVehicleId when editing)
    let usedIdsQuery = `
      SELECT DISTINCT vd.device_id
      FROM vehicle_devices vd
      JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE vd.device_id IS NOT NULL
    `;
    const usedParams = [];
    if (excludeVehicleId) {
      usedIdsQuery += ` AND vd.vehicle_id != $1::uuid`;
      usedParams.push(excludeVehicleId);
    }
    if (!isSuperAdmin && req.user?.id) {
      let clientIds = [];
      try {
        const cuResult = await pool.query(
          `SELECT cu.client_id
           FROM client_users cu
           JOIN clients c ON c.id = cu.client_id
           WHERE cu.traccar_user_id = $1
             AND COALESCE(c.active, TRUE) = TRUE
             AND COALESCE(c.billing_blocked, FALSE) = FALSE
             AND COALESCE(c.billing_status, 'ativo') <> 'inadimplente'`,
          [req.user.id]
        );
        clientIds = cuResult.rows.map((r) => r.client_id);
      } catch (_) {}
      if (clientIds.length === 0) {
        const clientResult = await pool.query(
          `SELECT id
           FROM clients
           WHERE traccar_user_id = $1
             AND COALESCE(active, TRUE) = TRUE
             AND COALESCE(billing_blocked, FALSE) = FALSE
             AND COALESCE(billing_status, 'ativo') <> 'inadimplente'`,
          [req.user.id]
        );
        clientIds = clientResult.rows.map((r) => r.id);
      }
      if (clientIds.length === 0) {
        return res.json([]);
      }
      usedIdsQuery += ` AND v.client_id = ANY($${usedParams.length + 1}::uuid[])`;
      usedParams.push(clientIds);
    }

    const { rows: usedRows } = await pool.query(usedIdsQuery, usedParams);
    const usedDeviceIds = new Set(usedRows.map((r) => r.device_id).filter((id) => id != null));

    const auth = { username: traccarEmail, password: traccarPassword };
    const traccarRes = await axios.get(`${traccarApiUrl}/api/devices?all=true`, { auth });
    const allDevices = Array.isArray(traccarRes.data) ? traccarRes.data : [];

    const available = allDevices.filter((d) => d && d.id != null && !usedDeviceIds.has(d.id));
    res.json(available);
  } catch (err) {
    console.error('GET /api/vehicles/available-devices error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /linked-devices – list devices linked to a vehicle (by plate + client_id) */
router.get('/linked-devices', async (req, res) => {
  const plate = req.query.plate || '';
  const clientId = req.query.client_id || null;

  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;

  if (!plate || !clientId) {
    return res.json([]);
  }

  if (!traccarApiUrl || !traccarEmail || !traccarPassword) {
    return res.status(503).json({ error: 'Traccar API not configured', message: 'TRACCAR_API_URL not set' });
  }

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    const vehicleRes = await pool.query(
      'SELECT id FROM vehicles WHERE LOWER(TRIM(plate)) = LOWER($1) AND client_id = $2 LIMIT 1',
      [String(plate).trim(), clientId]
    );
    if (vehicleRes.rows.length === 0) {
      return res.json([]);
    }
    const vehicleId = vehicleRes.rows[0].id;

    const vdRes = await pool.query(
      'SELECT device_id FROM vehicle_devices WHERE vehicle_id = $1::uuid ORDER BY is_primary DESC',
      [vehicleId]
    );
    const deviceIds = vdRes.rows.map((r) => r.device_id).filter((id) => id != null);
    if (deviceIds.length === 0) {
      return res.json([]);
    }

    const auth = { username: traccarEmail, password: traccarPassword };
    const traccarRes = await axios.get(`${traccarApiUrl}/api/devices?all=true`, { auth });
    const allDevices = Array.isArray(traccarRes.data) ? traccarRes.data : [];
    const deviceIdSet = new Set(deviceIds);
    const linked = allDevices.filter((d) => d && d.id != null && deviceIdSet.has(d.id));
    res.json(linked);
  } catch (err) {
    console.error('GET /api/vehicles/linked-devices error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /client/:clientId – list vehicles by client ID for OS creation (Technician bypass) */
router.get('/client/:clientId', async (req, res) => {
  const { clientId } = req.params;

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT 
         v.*,
         c.name as client_name,
         COALESCE(
           (SELECT device_id FROM vehicle_devices vd WHERE vd.vehicle_id = v.id AND vd.is_primary = true LIMIT 1),
           (SELECT device_id FROM vehicle_devices vd WHERE vd.vehicle_id = v.id LIMIT 1)
         ) as device_id
       FROM vehicles v
       LEFT JOIN clients c ON v.client_id = c.id
       WHERE v.client_id = $1::uuid
       ORDER BY v.created_at DESC`,
      [clientId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vehicles by client_id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /upload – upload vehicle photo (same auth as vehicles CRUD) */
router.post('/upload', vehicleUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    res.status(200).json({ filePath: `/uploads/${req.file.filename}` });
  } catch (err) {
    console.error('POST /api/vehicles/upload error:', err?.message);
    res.status(500).json({ error: 'Erro ao fazer upload da foto.' });
  }
});

/** GET /image/:filename – serve vehicle photo */
router.get('/image/:filename', (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, safeFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Imagem não encontrada.' });
    }
    const ext = path.extname(safeFilename).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
    res.sendFile(filePath);
  } catch (err) {
    console.error('GET /api/vehicles/image/:filename error:', err?.message);
    res.status(500).json({ error: 'Erro ao carregar imagem.' });
  }
});

/** POST / – create vehicle */
router.post('/', async (req, res) => {
  const { client_id, plate, make, model, color, year, notes, nickname, installation_details, tank_capacity, initial_odometer, foto_veiculo, vehicle_type, deviceIds } = req.body ?? {};
  // Suporte retrocompatível: se receber device_id (singular), converter para array
  const device_id = req.body?.device_id;
  const deviceIdsArray = deviceIds || (device_id ? [device_id] : []);

  if (!client_id || !plate) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'client_id and plate are required.',
    });
  }

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Inserir o veículo (sem device_id na tabela principal)
    const { rows } = await client.query(
      `INSERT INTO vehicles (client_id, plate, make, model, color, year, notes, nickname, installation_details, tank_capacity, initial_odometer, foto_veiculo, vehicle_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        client_id,
        String(plate).trim(),
        make ?? null,
        model ?? null,
        color ?? null,
        year ?? null,
        notes ?? null,
        nickname != null ? String(nickname).trim() : null,
        installation_details != null ? String(installation_details).trim() : null,
        tank_capacity != null ? (typeof tank_capacity === 'string' ? parseFloat(tank_capacity) : tank_capacity) : null,
        initial_odometer != null ? (typeof initial_odometer === 'string' ? parseFloat(initial_odometer) : initial_odometer) : null,
        foto_veiculo != null ? String(foto_veiculo).trim().slice(0, 255) : null,
        vehicle_type != null ? String(vehicle_type).trim().slice(0, 50) : null,
      ],
    );

    const vehicleId = rows[0].id;

    // Inserir os dispositivos associados na tabela vehicle_devices
    if (deviceIdsArray && deviceIdsArray.length > 0) {
      for (let i = 0; i < deviceIdsArray.length; i++) {
        const deviceId = deviceIdsArray[i];
        if (deviceId) {
          await client.query(
            `INSERT INTO vehicle_devices (vehicle_id, device_id, is_primary)
             VALUES ($1, $2, $3)
             ON CONFLICT (vehicle_id, device_id) DO NOTHING`,
            [vehicleId, deviceId, i === 0], // Primeiro é primary
          );
        }
      }
    }

    // Buscar o veículo completo com devices
    const { rows: vehicleRows } = await client.query(
      `SELECT 
         v.id,
         v.client_id,
         v.plate,
         v.make,
         v.model,
         v.color,
         v.year,
         v.notes,
         v.nickname,
         v.installation_details,
         v.foto_veiculo,
         v.vehicle_type,
         v.device_id,
         v.created_at,
         COALESCE(
           ARRAY_AGG(vd.device_id ORDER BY vd.is_primary DESC, vd.device_id) FILTER (WHERE vd.device_id IS NOT NULL),
           ARRAY[]::INTEGER[]
         ) AS devices
       FROM vehicles v
       LEFT JOIN vehicle_devices vd ON v.id = vd.vehicle_id
       WHERE v.id = $1
       GROUP BY v.id, v.client_id, v.plate, v.make, v.model, v.color, v.year, v.notes, v.nickname, v.installation_details, v.foto_veiculo, v.vehicle_type, v.device_id, v.created_at`,
      [vehicleId],
    );

    await client.query('COMMIT');

    // Sincronizar permissões no Traccar após commit bem-sucedido
    if (client_id && deviceIdsArray && deviceIdsArray.length > 0) {
      syncTraccarPermissions(client_id, vehicleId, deviceIdsArray).catch((err) => {
        console.error('Erro ao sincronizar permissões (background):', err.message);
      });
    }

    // Sincronizar nome/categoria dos devices no Traccar com os dados do veículo
    if (deviceIdsArray && deviceIdsArray.length > 0) {
      const catToSync = vehicle_type ? String(vehicle_type).trim() : null;
      syncTraccarDeviceFields(deviceIdsArray, { plate, category: catToSync }).catch((err) => {
        console.error('Erro ao sincronizar campos dos devices (background):', err.message);
      });
    }

    res.status(201).json(vehicleRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    const code = err?.code;
    if (code === '23505') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Plate already exists.',
      });
    }
    if (code === '23503') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'client_id not found.',
      });
    }
    console.error('POST /api/vehicles DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/** GET /:id – get vehicle by ID with device IDs */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT 
         v.id,
         v.client_id,
         v.plate,
         v.make,
         v.model,
         v.color,
         v.year,
         v.notes,
         v.nickname,
         v.installation_details,
         v.tank_capacity,
         v.initial_odometer,
         v.foto_veiculo,
         v.device_id,
         v.created_at,
         c.name AS client_name,
         COALESCE(
           ARRAY_AGG(vd.device_id ORDER BY vd.is_primary DESC, vd.device_id) FILTER (WHERE vd.device_id IS NOT NULL),
           ARRAY[]::INTEGER[]
         ) AS devices
       FROM vehicles v
       LEFT JOIN clients c ON v.client_id = c.id
       LEFT JOIN vehicle_devices vd ON v.id = vd.vehicle_id
       WHERE v.id = $1::uuid
       GROUP BY v.id, v.client_id, v.plate, v.make, v.model, v.color, v.year, v.notes, v.nickname, v.installation_details, v.tank_capacity, v.initial_odometer, v.foto_veiculo, v.device_id, v.created_at, c.id, c.name`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Vehicle not found.',
      });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('GET /api/vehicles/:id DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /:id – update vehicle */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { client_id, plate, make, model, color, year, notes, nickname, installation_details, tank_capacity, initial_odometer, foto_veiculo, vehicle_type, deviceIds } = req.body ?? {};
  // Suporte retrocompatível: se receber device_id (singular), converter para array
  const device_id = req.body?.device_id;
  const deviceIdsArray = deviceIds || (device_id ? [device_id] : []);

  if (!plate) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'plate is required.',
    });
  }

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  const client = await pool.connect();
  try {
    // Verificar se o veículo existe
    const checkResult = await client.query('SELECT id FROM vehicles WHERE id = $1::uuid', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Vehicle not found.',
      });
    }

    await client.query('BEGIN');

    // Atualizar os dados básicos do veículo (sem device_id)
    await client.query(
      `UPDATE vehicles 
       SET client_id = $1, plate = $2, make = $3, model = $4, color = $5, year = $6, notes = $7, nickname = $8, installation_details = $9, tank_capacity = $10, initial_odometer = $11, foto_veiculo = $12, vehicle_type = $13
       WHERE id = $14::uuid`,
      [
        client_id ?? null,
        String(plate).trim(),
        make ?? null,
        model ?? null,
        color ?? null,
        year ?? null,
        notes ?? null,
        nickname != null ? String(nickname).trim() : null,
        installation_details != null ? String(installation_details).trim() : null,
        tank_capacity != null ? (typeof tank_capacity === 'string' ? parseFloat(tank_capacity) : tank_capacity) : null,
        initial_odometer != null ? (typeof initial_odometer === 'string' ? parseFloat(initial_odometer) : initial_odometer) : null,
        foto_veiculo != null ? String(foto_veiculo).trim().slice(0, 255) : null,
        vehicle_type != null ? String(vehicle_type).trim().slice(0, 50) : null,
        id,
      ],
    );

    // Limpar vínculos antigos de dispositivos
    await client.query('DELETE FROM vehicle_devices WHERE vehicle_id = $1::uuid', [id]);

    // Inserir os novos vínculos de dispositivos
    if (deviceIdsArray && deviceIdsArray.length > 0) {
      for (let i = 0; i < deviceIdsArray.length; i++) {
        const deviceId = deviceIdsArray[i];
        if (deviceId) {
          await client.query(
            `INSERT INTO vehicle_devices (vehicle_id, device_id, is_primary)
             VALUES ($1, $2, $3)
             ON CONFLICT (vehicle_id, device_id) DO NOTHING`,
            [id, deviceId, i === 0], // Primeiro é primary
          );
        }
      }
    }

    // Buscar o veículo completo com devices
    const { rows: vehicleRows } = await client.query(
      `SELECT 
         v.id,
         v.client_id,
         v.plate,
         v.make,
         v.model,
         v.color,
         v.year,
         v.notes,
         v.nickname,
         v.installation_details,
         v.tank_capacity,
         v.initial_odometer,
         v.foto_veiculo,
         v.vehicle_type,
         v.device_id,
         v.created_at,
         COALESCE(
           ARRAY_AGG(vd.device_id ORDER BY vd.is_primary DESC, vd.device_id) FILTER (WHERE vd.device_id IS NOT NULL),
           ARRAY[]::INTEGER[]
         ) AS devices
       FROM vehicles v
       LEFT JOIN vehicle_devices vd ON v.id = vd.vehicle_id
       WHERE v.id = $1::uuid
       GROUP BY v.id, v.client_id, v.plate, v.make, v.model, v.color, v.year, v.notes, v.nickname, v.installation_details, v.tank_capacity, v.initial_odometer, v.foto_veiculo, v.vehicle_type, v.device_id, v.created_at`,
      [id],
    );

    await client.query('COMMIT');

    // Sincronizar permissões no Traccar após commit bem-sucedido
    if (client_id && deviceIdsArray && deviceIdsArray.length > 0) {
      syncTraccarPermissions(client_id, id, deviceIdsArray).catch((err) => {
        console.error('Erro ao sincronizar permissões (background):', err.message);
      });
    }

    // Sincronizar nome/categoria dos devices no Traccar com os dados do veículo
    if (deviceIdsArray && deviceIdsArray.length > 0) {
      const catToSync = vehicle_type ? String(vehicle_type).trim() : null;
      syncTraccarDeviceFields(deviceIdsArray, { plate, category: catToSync }).catch((err) => {
        console.error('Erro ao sincronizar campos dos devices (background):', err.message);
      });
    }

    res.status(200).json(vehicleRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    const code = err?.code;
    if (code === '23505') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Plate already exists.',
      });
    }
    if (code === '23503') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'client_id not found.',
      });
    }
    console.error('PUT /api/vehicles/:id DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/** DELETE /:id – delete vehicle */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    // Verificar se o veículo existe
    const checkResult = await pool.query('SELECT id FROM vehicles WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Vehicle not found.',
      });
    }

    // Deletar o veículo (os vínculos em vehicle_devices serão removidos automaticamente pelo CASCADE)
    await pool.query('DELETE FROM vehicles WHERE id = $1::uuid', [id]);
    res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/vehicles/:id DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function syncVehicleAlertsToTraccar(vehicleId, alerts) {
  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;
  if (!traccarApiUrl || !traccarEmail || !traccarPassword || !vehicleId || !alerts) return;

  const auth = { username: traccarEmail, password: traccarPassword };
  const { rows } = await pool.query('SELECT device_id FROM vehicle_devices WHERE vehicle_id = $1::uuid', [vehicleId]);
  const deviceIds = rows.map((r) => r.device_id).filter(Boolean);
  if (!deviceIds.length) return;

  const typeMap = {
    ignitionOn: 'ignitionOn',
    ignitionOff: 'ignitionOff',
    deviceOffline: 'deviceOffline',
    geofenceEnter: 'geofenceEnter',
    geofenceExit: 'geofenceExit',
    deviceOverspeed: 'deviceOverspeed',
  };
  const alarmMap = {
    alarm_sos: 'sos',
    alarm_lock: 'lock',
    alarm_unlock: 'unlock',
  };

  const notificationsRes = await axios.get(`${traccarApiUrl}/api/notifications`, { auth });
  const allNotifications = Array.isArray(notificationsRes.data) ? notificationsRes.data : [];

  for (const [alertKey, value] of Object.entries(alerts)) {
    const enabled = !!value?.enabled;
    const config = value?.config || {};
    const existing = allNotifications.filter((n) => n?.name === `vehicle:${vehicleId}:${alertKey}`);

    if (!enabled) {
      for (const item of existing) {
        try {
          await axios.delete(`${traccarApiUrl}/api/notifications/${item.id}`, { auth });
        } catch (err) {
          console.error('Error deleting notification:', err?.message);
        }
      }
      continue;
    }

    let notificationId = existing[0]?.id;
    if (!notificationId) {
      const payload = {
        name: `vehicle:${vehicleId}:${alertKey}`,
        type: alarmMap[alertKey] ? 'alarm' : typeMap[alertKey],
        always: true,
        attributes: alarmMap[alertKey]
          ? { alarm: alarmMap[alertKey] }
          : (alertKey === 'deviceOverspeed' && config.speedLimit ? { speedLimit: Number(config.speedLimit) } : {}),
      };
      const createRes = await axios.post(`${traccarApiUrl}/api/notifications`, payload, { auth });
      notificationId = createRes?.data?.id;
    }

    if (notificationId) {
      for (const deviceId of deviceIds) {
        try {
          await axios.post(`${traccarApiUrl}/api/permissions`, { deviceId, notificationId }, { auth });
        } catch {
          // ignore existing link
        }
      }
    }
  }
}

async function ensureCommandResultNotificationToTraccar(vehicleId) {
  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;
  if (!traccarApiUrl || !traccarEmail || !traccarPassword || !vehicleId) return;

  const auth = { username: traccarEmail, password: traccarPassword };
  const { rows } = await pool.query('SELECT device_id FROM vehicle_devices WHERE vehicle_id = $1::uuid', [vehicleId]);
  const deviceIds = rows.map((row) => row.device_id).filter(Boolean);
  if (!deviceIds.length) return;

  const notificationName = `vehicle:${vehicleId}:commandResult`;
  const notificationsRes = await axios.get(`${traccarApiUrl}/api/notifications`, { auth });
  const allNotifications = Array.isArray(notificationsRes.data) ? notificationsRes.data : [];
  let notificationId = allNotifications.find((item) => item?.name === notificationName)?.id;

  if (!notificationId) {
    const createRes = await axios.post(`${traccarApiUrl}/api/notifications`, {
      name: notificationName,
      type: 'commandResult',
      always: true,
      attributes: {},
    }, { auth });
    notificationId = createRes?.data?.id;
  }

  if (!notificationId) return;

  for (const deviceId of deviceIds) {
    try {
      await axios.post(`${traccarApiUrl}/api/permissions`, { deviceId, notificationId }, { auth });
    } catch {
      // ignore existing link
    }
  }
}

router.get('/:id/alerts', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT FALSE,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(vehicle_id, alert_type)
      )
    `);
    const { rows } = await pool.query(
      'SELECT alert_type, enabled, config FROM vehicle_alerts WHERE vehicle_id = $1::uuid',
      [id],
    );
    const result = {};
    for (const row of rows) {
      result[row.alert_type] = { enabled: !!row.enabled, config: row.config || {} };
    }
    res.json(result);
  } catch (err) {
    console.error('GET /api/vehicles/:id/alerts error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/alerts', async (req, res) => {
  const { id } = req.params;
  const alerts = req.body || {};
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT FALSE,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(vehicle_id, alert_type)
      )
    `);
    await client.query('BEGIN');
    for (const [alertType, value] of Object.entries(alerts)) {
      await client.query(
        `INSERT INTO vehicle_alerts (vehicle_id, alert_type, enabled, config)
         VALUES ($1::uuid, $2, $3, $4)
         ON CONFLICT (vehicle_id, alert_type) DO UPDATE SET
           enabled = EXCLUDED.enabled,
           config = EXCLUDED.config,
           updated_at = NOW()`,
        [id, alertType, !!value?.enabled, JSON.stringify(value?.config || {})],
      );
    }
    await client.query('COMMIT');
    syncVehicleAlertsToTraccar(id, alerts).catch((err) => {
      console.error('Error syncing vehicle alerts:', err?.message);
    });
    res.json({ message: 'Alerts updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /api/vehicles/:id/alerts error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

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

async function ensureVehicleScheduledCommandHistoryTable(executor) {
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

async function ensureVehiclePendingCommandsTable(executor) {
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

async function ensureScheduledCommandRuntimeTables(executor) {
  await ensureVehicleScheduledCommandsTable(executor);
  await ensureVehicleScheduledCommandHistoryTable(executor);
  await ensureVehiclePendingCommandsTable(executor);
}

function formatTimeForApi(value) {
  if (value == null) return null;
  const s = typeof value === 'string' ? value : String(value);
  const t = s.trim();
  if (!t) return null;
  if (t.length >= 5) return t.slice(0, 5);
  return t;
}

function parseTimeInput(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':');
    return `${String(parseInt(h, 10)).padStart(2, '0')}:${String(parseInt(m, 10)).padStart(2, '0')}:00`;
  }
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return null;
}

function isSuperAdminUser(user) {
  return !!(user && (
    user.email === 'evangelista1908@gmail.com'
    || user.administrator === true
    || user.admin === true
  ));
}

async function getAllowedClientIds(executor, userId) {
  if (!userId) return [];

  let clientIds = [];
  try {
    const linkedRes = await executor.query(
      `SELECT cu.client_id
       FROM client_users cu
       JOIN clients c ON c.id = cu.client_id
       WHERE cu.traccar_user_id = $1
         AND COALESCE(c.active, TRUE) = TRUE
         AND COALESCE(c.billing_blocked, FALSE) = FALSE
         AND COALESCE(c.billing_status, 'ativo') <> 'inadimplente'`,
      [userId],
    );
    clientIds = linkedRes.rows.map((row) => row.client_id).filter(Boolean);
  } catch {
    // ignore missing linking table
  }

  if (clientIds.length === 0) {
    try {
      const legacyRes = await executor.query(
        `SELECT id
         FROM clients
         WHERE traccar_user_id = $1
           AND COALESCE(active, TRUE) = TRUE
           AND COALESCE(billing_blocked, FALSE) = FALSE
           AND COALESCE(billing_status, 'ativo') <> 'inadimplente'`,
        [userId],
      );
      clientIds = legacyRes.rows.map((row) => row.id).filter(Boolean);
    } catch {
      // ignore legacy mapping lookup errors
    }
  }

  return clientIds;
}

async function getVehicleAccess(executor, user, vehicleId) {
  const { rows } = await executor.query(
    'SELECT id, client_id FROM vehicles WHERE id = $1::uuid LIMIT 1',
    [vehicleId],
  );
  if (rows.length === 0) {
    return { exists: false, allowed: false, vehicle: null };
  }

  const vehicle = rows[0];
  if (isSuperAdminUser(user)) {
    return { exists: true, allowed: true, vehicle };
  }

  if (!user?.id) {
    return { exists: true, allowed: false, vehicle };
  }

  const clientIds = await getAllowedClientIds(executor, user.id);
  if (!clientIds.length || !clientIds.includes(vehicle.client_id)) {
    return { exists: true, allowed: false, vehicle };
  }

  try {
    const permissionRes = await executor.query(
      'SELECT 1 FROM user_vehicles WHERE traccar_user_id = $1 AND vehicle_id = $2::uuid LIMIT 1',
      [user.id, vehicleId],
    );
    if (permissionRes.rows.length > 0) {
      return { exists: true, allowed: true, vehicle };
    }
  } catch {
    // Fallback quando tabela user_vehicles ainda não está disponível
  }

  return { exists: true, allowed: true, vehicle };
}

/** GET /:id/scheduled-commands — horários de bloqueio/desbloqueio por dia da semana */
router.get('/:id/scheduled-commands', async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    const access = await getVehicleAccess(pool, req.user, id);
    if (!access.exists) {
      return res.status(404).json({ error: 'Not found', message: 'Vehicle not found.' });
    }
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied for this vehicle.' });
    }

    await ensureScheduledCommandRuntimeTables(pool);
    const { rows } = await pool.query(
      `SELECT day_of_week, lock_time, unlock_time, enabled
       FROM vehicle_scheduled_commands
       WHERE vehicle_id = $1::uuid`,
      [id],
    );
    const byDay = new Map(rows.map((r) => [Number(r.day_of_week), r]));
    const schedules = [];
    for (let d = 0; d <= 6; d += 1) {
      const r = byDay.get(d);
      schedules.push({
        day_of_week: d,
        lock_time: r?.lock_time != null ? formatTimeForApi(r.lock_time) : null,
        unlock_time: r?.unlock_time != null ? formatTimeForApi(r.unlock_time) : null,
        enabled: r?.enabled !== false,
      });
    }
    res.json({ schedules });
  } catch (err) {
    console.error('GET /api/vehicles/:id/scheduled-commands error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/scheduled-commands/history', async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    const access = await getVehicleAccess(pool, req.user, id);
    if (!access.exists) {
      return res.status(404).json({ error: 'Not found', message: 'Vehicle not found.' });
    }
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied for this vehicle.' });
    }

    await ensureScheduledCommandRuntimeTables(pool);
    const { rows } = await pool.query(
      `SELECT id, vehicle_id::text, device_id, command_type, scheduled_for, attempted_at,
              status, http_code, error_message, pending_id::text, created_at
       FROM vehicle_scheduled_command_history
       WHERE vehicle_id = $1::uuid
       ORDER BY attempted_at DESC
       LIMIT $2`,
      [id, limit],
    );
    res.json({ history: rows });
  } catch (err) {
    console.error('GET /api/vehicles/:id/scheduled-commands/history error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/scheduled-commands/pending', async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  try {
    const access = await getVehicleAccess(pool, req.user, id);
    if (!access.exists) {
      return res.status(404).json({ error: 'Not found', message: 'Vehicle not found.' });
    }
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied for this vehicle.' });
    }

    await ensureScheduledCommandRuntimeTables(pool);
    const { rows } = await pool.query(
      `SELECT id, vehicle_id::text, device_id, command_type, scheduled_for, expires_at,
              status, attempts, last_attempt_at, created_at, updated_at
       FROM vehicle_pending_commands
       WHERE vehicle_id = $1::uuid
         AND status = 'pending'
       ORDER BY created_at ASC`,
      [id],
    );
    res.json({ pending: rows });
  } catch (err) {
    console.error('GET /api/vehicles/:id/scheduled-commands/pending error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/scheduled-commands/pending/:pendingId/cancel', async (req, res) => {
  const { id, pendingId } = req.params;
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }
  const client = await pool.connect();
  try {
    const access = await getVehicleAccess(client, req.user, id);
    if (!access.exists) {
      return res.status(404).json({ error: 'Not found', message: 'Vehicle not found.' });
    }
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied for this vehicle.' });
    }

    await ensureScheduledCommandRuntimeTables(client);
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE vehicle_pending_commands
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1::uuid
         AND vehicle_id = $2::uuid
         AND status = 'pending'
       RETURNING id, vehicle_id::text, device_id, command_type, scheduled_for`,
      [pendingId, id],
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found', message: 'Pending command not found.' });
    }

    const pending = rows[0];
    await client.query(
      `INSERT INTO vehicle_scheduled_command_history
         (vehicle_id, device_id, command_type, scheduled_for, status, pending_id, error_message)
       VALUES ($1::uuid, $2, $3, $4, 'cancelled', $5::uuid, $6)`,
      [
        pending.vehicle_id,
        pending.device_id,
        pending.command_type,
        pending.scheduled_for,
        pending.id,
        req.user?.id ? `Cancelado pelo usuário ${req.user.id}.` : 'Cancelado pelo usuário.',
      ],
    );
    await client.query('COMMIT');
    res.json({ message: 'Pending command cancelled.' });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback secondary errors
    }
    console.error('POST /api/vehicles/:id/scheduled-commands/pending/:pendingId/cancel error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/** PUT /:id/scheduled-commands — body: { schedules: [{ day_of_week, lock_time, unlock_time, enabled }] } */
router.put('/:id/scheduled-commands', async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const schedules = Array.isArray(body.schedules) ? body.schedules : null;
  if (!schedules || schedules.length !== 7) {
    return res.status(400).json({ error: 'Validation error', message: 'schedules must be an array of 7 entries (day_of_week 0–6).' });
  }
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  const seen = new Set();
  for (const s of schedules) {
    const dow = Number(s.day_of_week);
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
      return res.status(400).json({ error: 'Validation error', message: 'day_of_week must be 0–6.' });
    }
    if (seen.has(dow)) {
      return res.status(400).json({ error: 'Validation error', message: 'Duplicate day_of_week.' });
    }
    seen.add(dow);
  }
  if (seen.size !== schedules.length || seen.size !== 7) {
    return res.status(400).json({ error: 'Validation error', message: 'Each day_of_week 0–6 must appear exactly once.' });
  }

  const client = await pool.connect();
  try {
    const access = await getVehicleAccess(client, req.user, id);
    if (!access.exists) {
      return res.status(404).json({ error: 'Not found', message: 'Vehicle not found.' });
    }
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied for this vehicle.' });
    }

    await ensureScheduledCommandRuntimeTables(client);
    await client.query('BEGIN');
    for (const s of schedules) {
      const dow = Number(s.day_of_week);
      const lockT = parseTimeInput(s.lock_time);
      const unlockT = parseTimeInput(s.unlock_time);
      const enabled = s.enabled !== false;
      await client.query(
        `INSERT INTO vehicle_scheduled_commands (vehicle_id, day_of_week, lock_time, unlock_time, enabled)
         VALUES ($1::uuid, $2, $3::time, $4::time, $5)
         ON CONFLICT (vehicle_id, day_of_week) DO UPDATE SET
           lock_time = EXCLUDED.lock_time,
           unlock_time = EXCLUDED.unlock_time,
           enabled = EXCLUDED.enabled,
           updated_at = NOW()`,
        [id, dow, lockT, unlockT, enabled],
      );
    }
    await client.query('COMMIT');
    ensureCommandResultNotificationToTraccar(id).catch((err) => {
      console.error('Error syncing commandResult notification:', err?.message);
    });
    res.json({ message: 'Scheduled commands updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /api/vehicles/:id/scheduled-commands error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/** POST /scheduled-commands/batch-copy — body: { source_vehicle_id, target_vehicle_ids } */
router.post('/scheduled-commands/batch-copy', async (req, res) => {
  const body = req.body || {};
  const sourceVehicleId = body.source_vehicle_id;
  const targetVehicleIds = Array.isArray(body.target_vehicle_ids) ? body.target_vehicle_ids : [];
  const maxTargets = 200;

  if (!sourceVehicleId || typeof sourceVehicleId !== 'string') {
    return res.status(400).json({ error: 'Validation error', message: 'source_vehicle_id is required.' });
  }
  if (!targetVehicleIds.length) {
    return res.status(400).json({ error: 'Validation error', message: 'target_vehicle_ids must contain at least one vehicle.' });
  }
  if (targetVehicleIds.length > maxTargets) {
    return res.status(400).json({ error: 'Validation error', message: `target_vehicle_ids limit is ${maxTargets}.` });
  }
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  const normalizedTargets = [...new Set(
    targetVehicleIds
      .filter((id) => typeof id === 'string' && id.trim())
      .map((id) => id.trim()),
  )];

  if (!normalizedTargets.length) {
    return res.status(400).json({ error: 'Validation error', message: 'target_vehicle_ids must contain valid UUID strings.' });
  }
  if (normalizedTargets.includes(sourceVehicleId)) {
    return res.status(400).json({ error: 'Validation error', message: 'source_vehicle_id cannot be part of target_vehicle_ids.' });
  }

  const client = await pool.connect();
  try {
    const sourceAccess = await getVehicleAccess(client, req.user, sourceVehicleId);
    if (!sourceAccess.exists) {
      return res.status(404).json({ error: 'Not found', message: 'Source vehicle not found.' });
    }
    if (!sourceAccess.allowed) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied for source vehicle.' });
    }

    await ensureVehicleScheduledCommandsTable(client);
    const sourceSchedulesRes = await client.query(
      `SELECT day_of_week, lock_time, unlock_time, enabled
       FROM vehicle_scheduled_commands
       WHERE vehicle_id = $1::uuid`,
      [sourceVehicleId],
    );
    if (sourceSchedulesRes.rows.length !== 7) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Source vehicle must have 7 scheduled entries (day_of_week 0–6).',
      });
    }

    const sourceByDay = new Map(sourceSchedulesRes.rows.map((row) => [Number(row.day_of_week), row]));
    if (sourceByDay.size !== 7) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Source vehicle has duplicate or invalid day_of_week values.',
      });
    }

    const targetsRes = await client.query(
      `SELECT id, client_id
       FROM vehicles
       WHERE id = ANY($1::uuid[])`,
      [normalizedTargets],
    );
    const targetMap = new Map(targetsRes.rows.map((row) => [row.id, row]));

    const results = [];
    const allowedTargets = [];
    const sourceClientId = sourceAccess.vehicle.client_id;

    for (const targetId of normalizedTargets) {
      const targetVehicle = targetMap.get(targetId);
      if (!targetVehicle) {
        results.push({ vehicle_id: targetId, status: 'not_found' });
        continue;
      }
      if (targetVehicle.client_id !== sourceClientId) {
        results.push({ vehicle_id: targetId, status: 'denied' });
        continue;
      }

      const targetAccess = await getVehicleAccess(client, req.user, targetId);
      if (!targetAccess.allowed) {
        results.push({ vehicle_id: targetId, status: 'denied' });
        continue;
      }
      allowedTargets.push(targetId);
    }

    if (!allowedTargets.length) {
      return res.status(200).json({
        message: 'No target vehicles eligible for copy.',
        source_vehicle_id: sourceVehicleId,
        results,
      });
    }

    await client.query('BEGIN');
    for (const targetId of allowedTargets) {
      for (let d = 0; d <= 6; d += 1) {
        const daySchedule = sourceByDay.get(d);
        await client.query(
          `INSERT INTO vehicle_scheduled_commands (vehicle_id, day_of_week, lock_time, unlock_time, enabled)
           VALUES ($1::uuid, $2, $3::time, $4::time, $5)
           ON CONFLICT (vehicle_id, day_of_week) DO UPDATE SET
             lock_time = EXCLUDED.lock_time,
             unlock_time = EXCLUDED.unlock_time,
             enabled = EXCLUDED.enabled,
             updated_at = NOW()`,
          [targetId, d, daySchedule?.lock_time || null, daySchedule?.unlock_time || null, daySchedule?.enabled !== false],
        );
      }
      results.push({ vehicle_id: targetId, status: 'updated' });
    }
    await client.query('COMMIT');

    res.status(200).json({
      message: 'Scheduled commands copied successfully.',
      source_vehicle_id: sourceVehicleId,
      copied_count: allowedTargets.length,
      results,
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback secondary errors
    }
    console.error('POST /api/vehicles/scheduled-commands/batch-copy error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
