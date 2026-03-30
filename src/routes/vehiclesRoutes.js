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
 * Sincroniza a categoria do device no Traccar com o vehicle_type do veículo
 * @param {number[]} deviceIds - Array de IDs dos dispositivos
 * @param {string} category - Categoria (ex: car, truck, motorcycle)
 */
async function syncTraccarDeviceCategory(deviceIds, category) {
  if (!deviceIds || deviceIds.length === 0 || !category || typeof category !== 'string' || !category.trim()) {
    return;
  }

  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;

  if (!traccarApiUrl || !traccarEmail || !traccarPassword) {
    console.warn('⚠️ Traccar API credentials not configured. Skipping device category sync.');
    return;
  }

  const auth = { username: traccarEmail, password: traccarPassword };

  for (const deviceId of deviceIds) {
    if (!deviceId) continue;
    try {
      const getRes = await axios.get(`${traccarApiUrl}/api/devices/${deviceId}`, { auth });
      const device = getRes.data;
      if (!device) continue;

      const updatedDevice = { ...device, category: category.trim() };
      await axios.put(`${traccarApiUrl}/api/devices/${deviceId}`, updatedDevice, {
        auth,
        headers: { 'Content-Type': 'application/json' },
      });
      console.log(`✅ Categoria do device ${deviceId} atualizada para: ${category}`);
    } catch (err) {
      console.error(`❌ Erro ao atualizar categoria do device ${deviceId}:`, err.response?.data || err.message);
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
          'SELECT client_id FROM client_users WHERE traccar_user_id = $1',
          [req.user.id]
        );
        clientIds = cuResult.rows.map((r) => r.client_id);
      } catch (_) {}
      if (clientIds.length === 0) {
        const clientResult = await pool.query(
          'SELECT id FROM clients WHERE traccar_user_id = $1',
          [req.user.id]
        );
        clientIds = clientResult.rows.map((r) => r.id);
      }
      if (clientIds.length === 0) {
        console.log(`No client found for user ID ${req.user.id}, returning empty array`);
        return res.json([]);
      }
      query += ` WHERE v.client_id = ANY($1::uuid[]) AND
        EXISTS (SELECT 1 FROM user_vehicles uv WHERE uv.traccar_user_id = $2 AND uv.vehicle_id = v.id)`;
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
          'SELECT client_id FROM client_users WHERE traccar_user_id = $1',
          [req.user.id]
        );
        clientIds = cuResult.rows.map((r) => r.client_id);
      } catch (_) {}
      if (clientIds.length === 0) {
        const clientResult = await pool.query(
          'SELECT id FROM clients WHERE traccar_user_id = $1',
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

    // Sincronizar categoria dos devices no Traccar com o vehicle_type (não sincronizar se foto_veiculo definido)
    if (deviceIdsArray && deviceIdsArray.length > 0) {
      const catToSync = foto_veiculo ? null : (vehicle_type ? String(vehicle_type).trim() : null);
      if (catToSync) {
        syncTraccarDeviceCategory(deviceIdsArray, catToSync).catch((err) => {
          console.error('Erro ao sincronizar categoria dos devices (background):', err.message);
        });
      }
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

    // Sincronizar categoria dos devices no Traccar com o vehicle_type (não sincronizar se foto_veiculo definido)
    if (deviceIdsArray && deviceIdsArray.length > 0) {
      const catToSync = foto_veiculo ? null : (vehicle_type ? String(vehicle_type).trim() : null);
      if (catToSync) {
        syncTraccarDeviceCategory(deviceIdsArray, catToSync).catch((err) => {
          console.error('Erro ao sincronizar categoria dos devices (background):', err.message);
        });
      }
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

export default router;
