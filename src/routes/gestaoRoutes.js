/**
 * ROTAS DE GESTÃO - CORRIGIDAS PARA UUID
 * 
 * Este arquivo contém as rotas de gestão corrigidas para trabalhar com UUIDs.
 * 
 * CORREÇÕES APLICADAS:
 * 1. Removido Number() e parseInt() de vehicle_id
 * 2. Adicionado cast explícito ::uuid[] nas queries SQL
 * 3. Middleware para popular req.userVehicleIds com UUIDs (strings)
 * 4. Garantido que vehicle_id seja sempre tratado como string UUID
 */

import { Router } from 'express';
import pool from '../addons/traccar_wrapper/db/index.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

/** Helper: obtém client_ids e vehicle_ids permitidos para um usuário (client_users + user_vehicles) */
async function getUserClientAndVehicleIds(pool, userId) {
  let clientIds = [];
  try {
    const cuResult = await pool.query(
      'SELECT client_id FROM client_users WHERE traccar_user_id = $1',
      [userId]
    );
    clientIds = cuResult.rows.map((r) => r.client_id);
  } catch (_) {}
  if (clientIds.length === 0) {
    const clientResult = await pool.query(
      'SELECT id FROM clients WHERE traccar_user_id = $1',
      [userId]
    );
    clientIds = clientResult.rows.map((r) => r.id);
  }
  if (clientIds.length === 0) return { clientIds: [], vehicleIds: [] };
  try {
    const vResult = await pool.query(
      `SELECT v.id FROM vehicles v
       WHERE v.client_id = ANY($1::uuid[])
       AND EXISTS (SELECT 1 FROM user_vehicles uv WHERE uv.traccar_user_id = $2 AND uv.vehicle_id = v.id)`,
      [clientIds, userId]
    );
    return { clientIds, vehicleIds: vResult.rows.map((r) => String(r.id)) };
  } catch (_) {
    const vResult = await pool.query(
      'SELECT id FROM vehicles WHERE client_id = ANY($1::uuid[])',
      [clientIds]
    );
    return { clientIds, vehicleIds: vResult.rows.map((r) => String(r.id)) };
  }
}

/** Helper: verifica se usuário tem acesso ao veículo */
async function userCanAccessVehicle(pool, userId, vehicleId) {
  const { vehicleIds } = await getUserClientAndVehicleIds(pool, userId);
  return vehicleIds.includes(String(vehicleId));
}

// Aplicar middleware de autenticação em todas as rotas
router.use(authenticate);

// =============================================================================
// ROTAS DE VEÍCULOS (fonte: fleet_core / traccar_wrapper) – antes de populateUserVehicleIds
// =============================================================================

/**
 * GET /gestao/vehicles/sync
 * Compatibilidade com frontend. Veículos vêm do fleet_core; não há sincronização por devices.
 */
router.get('/vehicles/sync', async (req, res) => {
  try {
    res.status(200).json({
      message: 'Veículos são gerenciados no fleet_core. Nenhuma sincronização de criação por devices necessária.',
      new_vehicles: 0,
      updated_vehicles: 0,
      total_traccar: 0
    });
  } catch (error) {
    console.error('Erro em /gestao/vehicles/sync:', error.message);
    res.status(500).json({ error: 'Erro interno ao sincronizar veículos.' });
  }
});

/**
 * GET /gestao/vehicles
 * Lista veículos do fleet_core (mesma lógica que vehiclesRoutes). Retorna name e uniqueId para compatibilidade com frontend/SGF.
 */
router.get('/vehicles', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    const isSuperAdmin = req.user && (
      req.user.email === 'evangelista1908@gmail.com' ||
      req.user.administrator === true ||
      req.user.admin === true
    );

    let query = `
      SELECT
        v.*,
        v.tank_capacity,
        v.initial_odometer,
        c.name as client_name,
        COALESCE(
          (SELECT device_id FROM vehicle_devices vd WHERE vd.vehicle_id = v.id AND vd.is_primary = true LIMIT 1),
          (SELECT device_id FROM vehicle_devices vd WHERE vd.vehicle_id = v.id LIMIT 1)
        ) as device_id,
        (SELECT json_agg(vd.device_id) FROM vehicle_devices vd WHERE vd.vehicle_id = v.id) as "deviceIds",
        COALESCE(NULLIF(TRIM(v.nickname), ''), NULLIF(TRIM(v.plate), ''), NULLIF(TRIM(v.model), ''), 'Veículo sem Nome') as name,
        v.id as "uniqueId"
      FROM vehicles v
      LEFT JOIN clients c ON v.client_id = c.id
    `;
    const params = [];

    if (!isSuperAdmin) {
      if (!req.user || !req.user.id) {
        return res.json([]);
      }
      const { vehicleIds } = await getUserClientAndVehicleIds(pool, req.user.id);
      if (vehicleIds.length === 0) {
        return res.json([]);
      }
      query += ` WHERE v.id = ANY($1::uuid[])`;
      params.push(vehicleIds);
    }

    query += ` ORDER BY v.plate ASC`;
    const { rows } = await pool.query(query, params);
    console.log(`GET /gestao/vehicles: returning ${rows.length} vehicles`);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vehicles (gestao):', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /gestao/vehicles/:id
 * Detalhe de um veículo (fleet_core). Acesso: super admin ou veículo do cliente do usuário.
 */
router.get('/vehicles/:id', async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    const isSuperAdmin = req.user && (
      req.user.email === 'evangelista1908@gmail.com' ||
      req.user.administrator === true ||
      req.user.admin === true
    );

    if (!isSuperAdmin && req.user?.id) {
      const allowed = await userCanAccessVehicle(pool, req.user.id, id);
      if (!allowed) {
        return res.status(404).json({ error: 'Not found', message: 'Vehicle not found.' });
      }
    }

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
       GROUP BY v.id, v.client_id, v.plate, v.make, v.model, v.color, v.year, v.notes, v.nickname, v.installation_details, v.tank_capacity, v.initial_odometer, v.device_id, v.created_at, c.id, c.name`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Vehicle not found.' });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('GET /gestao/vehicles/:id DB error:', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /gestao/vehicles/:id
 * Atualiza campos de gestão (tank_capacity, initial_odometer) no fleet_core. Compatível com SGF var/www.
 */
router.put('/vehicles/:id', async (req, res) => {
  const { id } = req.params;
  const { tank_capacity, initial_odometer } = req.body ?? {};

  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  const isSuperAdmin = req.user && (
    req.user.email === 'evangelista1908@gmail.com' ||
    req.user.administrator === true ||
    req.user.admin === true
  );

  if (!isSuperAdmin && req.user?.id) {
    const allowed = await userCanAccessVehicle(pool, req.user.id, id);
    if (!allowed) {
      return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para editar este veículo.' });
    }
  }

  if (tank_capacity != null && isNaN(parseFloat(tank_capacity))) {
    return res.status(400).json({ error: 'A capacidade do tanque deve ser um número.' });
  }
  if (initial_odometer != null && isNaN(parseFloat(initial_odometer))) {
    return res.status(400).json({ error: 'O odômetro inicial deve ser um número.' });
  }

  try {
    const result = await pool.query(
      `UPDATE vehicles
       SET tank_capacity = $1, initial_odometer = $2
       WHERE id = $3::uuid
       RETURNING *`,
      [
        tank_capacity != null ? (typeof tank_capacity === 'string' ? parseFloat(tank_capacity) : tank_capacity) : null,
        initial_odometer != null ? (typeof initial_odometer === 'string' ? parseFloat(initial_odometer) : initial_odometer) : null,
        id
      ]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not found', message: 'Veículo não encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating vehicle (gestao):', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// =============================================================================

/**
 * MIDDLEWARE: Popular req.userVehicleIds com UUIDs dos veículos do usuário
 * 
 * Este middleware deve ser aplicado ANTES das rotas de listagem
 * para garantir que req.userVehicleIds contenha um array de UUIDs (strings).
 */
async function populateUserVehicleIds(req, res, next) {
  try {
    // Identificar se é super admin
    const isSuperAdmin = req.user && (
      req.user.email === 'evangelista1908@gmail.com' || 
      req.user.administrator === true || 
      req.user.admin === true
    );

    if (isSuperAdmin) {
      // Super admin vê todos os veículos
      const vehiclesResult = await pool.query(
        `SELECT id FROM vehicles ORDER BY created_at DESC`
      );
      // IMPORTANTE: Manter como strings (UUIDs), NÃO converter para Number()
      req.userVehicleIds = vehiclesResult.rows.map(r => String(r.id));
    } else {
      // Usuário comum: buscar veículos via client_users + user_vehicles
      if (!req.user || !req.user.id) {
        req.userVehicleIds = [];
        return next();
      }

      const { vehicleIds } = await getUserClientAndVehicleIds(pool, req.user.id);
      req.userVehicleIds = vehicleIds;
    }

    console.log(`🔍 UserVehicleIds populated: ${req.userVehicleIds.length} vehicles (UUIDs as strings)`);
    next();
  } catch (error) {
    console.error('❌ Error populating userVehicleIds:', error);
    req.userVehicleIds = [];
    next();
  }
}

// Aplicar middleware em todas as rotas deste router
router.use(populateUserVehicleIds);

/**
 * GET /gestao/abastecimentos/todos
 * 
 * Lista todos os abastecimentos. Tabela legada refuelings usa vehicle_id INTEGER;
 * req.userVehicleIds contém UUIDs: traduzimos via vehicles.unique_id -> vehicles.id.
 */
router.get('/abastecimentos/todos', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    const vehicleIds = req.userVehicleIds || [];

    if (vehicleIds.length === 0) {
      console.log('⚠️ No vehicles found for user, returning empty array');
      return res.json([]);
    }

    console.log(`🔍 Fetching abastecimentos for ${vehicleIds.length} vehicles (UUIDs -> integer ids)`);

    // Tabela legada refuelings: vehicle_id INTEGER, refuel_date. Traduzir UUID -> id via vehicles.unique_id
    const result = await pool.query(
      `SELECT r.* 
       FROM refuelings r 
       WHERE r.vehicle_id IN (SELECT id FROM vehicles WHERE unique_id::text = ANY($1::text[]))
       ORDER BY r.refuel_date DESC`,
      [vehicleIds]
    );

    console.log(`✅ Found ${result.rows.length} abastecimentos`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching abastecimentos:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      code: error.code
    });
  }
});

/**
 * GET /gestao/trips
 * 
 * Lista todas as viagens. Tabela legada trips usa vehicle_id INTEGER;
 * req.userVehicleIds contém UUIDs: traduzimos via vehicles.unique_id -> vehicles.id.
 * 
 * Query Parameters:
 * - status (opcional): Filtrar por status ('open', 'closed', 'cancelled')
 */
router.get('/trips', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    const vehicleIds = req.userVehicleIds || [];
    const { status } = req.query;

    if (vehicleIds.length === 0) {
      console.log('⚠️ No vehicles found for user, returning empty array');
      return res.json([]);
    }

    console.log(`🔍 Fetching trips for ${vehicleIds.length} vehicles (UUIDs -> integer ids)${status ? ` with status: ${status}` : ''}`);

    // Tabela legada trips: vehicle_id INTEGER. Traduzir UUID -> id via vehicles.unique_id
    let query = `
      SELECT t.* 
      FROM trips t 
      WHERE t.vehicle_id IN (SELECT id FROM vehicles WHERE unique_id::text = ANY($1::text[]))
    `;
    const params = [vehicleIds];

    if (status) {
      query += ` AND t.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY t.start_date DESC`;

    const result = await pool.query(query, params);

    console.log(`✅ Found ${result.rows.length} trips`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching trips:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      code: error.code
    });
  }
});

/**
 * GET /gestao/maintenances
 * 
 * Lista manutenções. Tabela legada maintenances usa vehicle_id INTEGER, maintenance_date.
 * Query: vehicle_id (opcional) – filtra por um veículo (UUID); deve estar em userVehicleIds.
 */
router.get('/maintenances', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    let vehicleIds = req.userVehicleIds || [];
    const { vehicle_id: queryVehicleId } = req.query;

    if (vehicleIds.length === 0) {
      console.log('⚠️ No vehicles found for user, returning empty array');
      return res.json([]);
    }

    if (queryVehicleId) {
      if (!vehicleIds.includes(queryVehicleId)) {
        return res.json([]);
      }
      vehicleIds = [queryVehicleId];
    }

    console.log(`🔍 Fetching maintenances for ${vehicleIds.length} vehicles (UUIDs -> integer ids)`);

    // Tabela legada maintenances: vehicle_id INTEGER, maintenance_date. Traduzir UUID -> id via vehicles.unique_id
    const result = await pool.query(
      `SELECT m.* 
       FROM maintenances m 
       WHERE m.vehicle_id IN (SELECT id FROM vehicles WHERE unique_id::text = ANY($1::text[]))
       ORDER BY m.maintenance_date DESC`,
      [vehicleIds]
    );

    console.log(`✅ Found ${result.rows.length} maintenances`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching maintenances:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      code: error.code
    });
  }
});

/**
 * GET /gestao/custos
 * 
 * Lista todos os custos extras. Tabela legada custos usa vehicle_id INTEGER;
 * req.userVehicleIds contém UUIDs: traduzimos via vehicles.unique_id -> vehicles.id.
 */
router.get('/custos', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    const vehicleIds = req.userVehicleIds || [];

    if (vehicleIds.length === 0) {
      console.log('⚠️ No vehicles found for user, returning empty array');
      return res.json([]);
    }

    console.log(`🔍 Fetching custos for ${vehicleIds.length} vehicles (UUIDs -> integer ids)`);

    // Tabela legada custos: vehicle_id INTEGER, data_custo. Traduzir UUID -> id via vehicles.unique_id
    const result = await pool.query(
      `SELECT c.* 
       FROM custos c 
       WHERE c.vehicle_id IN (SELECT id FROM vehicles WHERE unique_id::text = ANY($1::text[]))
       ORDER BY c.data_custo DESC`,
      [vehicleIds]
    );

    console.log(`✅ Found ${result.rows.length} custos`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching custos:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      code: error.code
    });
  }
});

// =============================================================================
// RELATÓRIOS – implementação real (mesmo pool: refuelings, custos, trips).
// req.userVehicleIds já vem populado (UUIDs); admin tem array com todos os veículos.
// =============================================================================

function setReportNoCache(res) {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

/** GET /gestao/relatorios/distancia-abastecimentos */
router.get('/relatorios/distancia-abastecimentos', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const vehicleIds = req.userVehicleIds || [];
    if (vehicleIds.length === 0) {
      setReportNoCache(res);
      return res.json([]);
    }
    const { periodo, startDate, endDate } = req.query;
    let dateClause = '';
    const values = [vehicleIds];
    let paramOffset = 1;
    if (periodo === 'mensal') dateClause = `AND r.refuel_date >= NOW() - INTERVAL '30 days'`;
    else if (periodo === 'semanal') dateClause = `AND r.refuel_date >= NOW() - INTERVAL '7 days'`;
    else if (periodo === 'personalizado' && startDate && endDate) {
      dateClause = `AND r.refuel_date BETWEEN $${paramOffset + 1} AND $${paramOffset + 2}`;
      values.push(startDate, endDate);
    }
    const vehicleFilter = ` WHERE r.vehicle_id IN (SELECT id FROM vehicles WHERE unique_id::text = ANY($1::text[]))`;
    const query = `
      WITH RankedRefuelings AS (
        SELECT r.id, r.vehicle_id, r.odometer, r.refuel_date, r.liters_filled, r.total_cost,
               r.posto_nome, r.cidade, r.viagem_id,
               LAG(r.odometer) OVER (PARTITION BY r.vehicle_id ORDER BY r.refuel_date) AS odometer_anterior,
               r.foto_bomba, r.foto_odometro, v.name as vehicle_name
        FROM refuelings r
        LEFT JOIN vehicles v ON r.vehicle_id = v.id
        ${vehicleFilter}
      )
      SELECT id, vehicle_id, vehicle_name, refuel_date, odometer as odometer_atual, liters_filled,
             total_cost, posto_nome, cidade, viagem_id, odometer_anterior,
             (odometer - odometer_anterior) AS distancia_percorrida,
             CASE WHEN liters_filled > 0 AND odometer_anterior IS NOT NULL
                  THEN ((odometer - odometer_anterior) / liters_filled) ELSE 0 END AS consumo_por_trecho,
             foto_bomba, foto_odometro
      FROM RankedRefuelings r
      WHERE r.odometer_anterior IS NOT NULL ${dateClause}
      ORDER BY vehicle_name, refuel_date DESC;
    `;
    const result = await pool.query(query, values);
    setReportNoCache(res);
    res.json(result.rows);
  } catch (err) {
    console.error('relatorios/distancia-abastecimentos:', err);
    setReportNoCache(res);
    res.status(500).json({ error: err.message || 'Erro ao buscar relatório.' });
  }
});

/** GET /gestao/relatorios/custo-abastecimento-total */
router.get('/relatorios/custo-abastecimento-total', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const vehicleIds = req.userVehicleIds || [];
    if (vehicleIds.length === 0) {
      setReportNoCache(res);
      return res.json({ total: 0 });
    }
    const { periodo, startDate, endDate } = req.query;
    let dateClause = '';
    const values = [vehicleIds];
    let paramOffset = 1;
    if (periodo === 'mensal') dateClause = "AND refuel_date >= NOW() - INTERVAL '30 days'";
    else if (periodo === 'semanal') dateClause = "AND refuel_date >= NOW() - INTERVAL '7 days'";
    else if (periodo === 'personalizado' && startDate && endDate) {
      dateClause = `AND refuel_date BETWEEN $${paramOffset + 1} AND $${paramOffset + 2}`;
      values.push(startDate, endDate);
    }
    const vehicleFilter = 'WHERE vehicle_id IN (SELECT id FROM vehicles WHERE unique_id::text = ANY($1::text[]))';
    const query = `SELECT SUM(total_cost) as total FROM refuelings ${vehicleFilter} ${dateClause};`;
    const result = await pool.query(query, values);
    const total = Number(result.rows[0]?.total) || 0;
    setReportNoCache(res);
    res.json({ total });
  } catch (err) {
    console.error('relatorios/custo-abastecimento-total:', err);
    setReportNoCache(res);
    res.status(500).json({ error: err.message || 'Erro ao buscar relatório.' });
  }
});

/** GET /gestao/relatorios/custos-extras */
router.get('/relatorios/custos-extras', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const vehicleIds = req.userVehicleIds || [];
    if (vehicleIds.length === 0) {
      setReportNoCache(res);
      return res.json([]);
    }
    const { periodo } = req.query;
    let dateClause = periodo === 'mensal' ? "AND data_custo >= NOW() - INTERVAL '30 days'" : (periodo === 'semanal' ? "AND data_custo >= NOW() - INTERVAL '7 days'" : '');
    const query = `
      SELECT id, vehicle_id, data_custo, tipo_custo, descricao, valor, foto_path
      FROM custos
      WHERE viagem_id IS NULL AND vehicle_id IN (SELECT id FROM vehicles WHERE unique_id::text = ANY($1::text[])) ${dateClause}
      ORDER BY data_custo DESC;
    `;
    const result = await pool.query(query, [vehicleIds]);
    setReportNoCache(res);
    res.json(result.rows);
  } catch (err) {
    console.error('relatorios/custos-extras:', err);
    setReportNoCache(res);
    res.status(500).json({ error: err.message || 'Erro ao buscar relatório.' });
  }
});

/** GET /gestao/relatorios/custos-por-viagem */
router.get('/relatorios/custos-por-viagem', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const vehicleIds = req.userVehicleIds || [];
    if (vehicleIds.length === 0) {
      setReportNoCache(res);
      return res.json([]);
    }
    const { periodo } = req.query;
    let dateClause = periodo === 'mensal' ? "AND t.end_date >= NOW() - INTERVAL '30 days'" : (periodo === 'semanal' ? "AND t.end_date >= NOW() - INTERVAL '7 days'" : '');
    const query = `
      SELECT t.id, t.vehicle_id, t.start_city, t.end_city, t.is_round_trip, t.end_date, t.distancia_total,
             (SELECT SUM(valor) FROM custos WHERE viagem_id = t.id) as custo_total,
             (SELECT SUM(liters_filled) FROM refuelings WHERE viagem_id = t.id) as litros_abastecidos,
             (t.distancia_total / NULLIF((SELECT SUM(liters_filled) FROM refuelings WHERE viagem_id = t.id), 0)) as consumo_medio_viagem
      FROM trips t
      WHERE t.status = 'FINALIZADA' AND t.vehicle_id IN (SELECT id FROM vehicles WHERE unique_id::text = ANY($1::text[])) ${dateClause}
      ORDER BY t.end_date DESC;
    `;
    const result = await pool.query(query, [vehicleIds]);
    setReportNoCache(res);
    res.json(result.rows);
  } catch (err) {
    console.error('relatorios/custos-por-viagem:', err);
    setReportNoCache(res);
    res.status(500).json({ error: err.message || 'Erro ao buscar relatório.' });
  }
});

/** GET /gestao/relatorios/custos-por-categoria */
router.get('/relatorios/custos-por-categoria', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const vehicleIds = req.userVehicleIds || [];
    if (vehicleIds.length === 0) {
      setReportNoCache(res);
      return res.json([]);
    }
    const { periodo } = req.query;
    let dateClause = periodo === 'mensal' ? "AND data_custo >= NOW() - INTERVAL '30 days'" : (periodo === 'semanal' ? "AND data_custo >= NOW() - INTERVAL '7 days'" : '');
    const query = `
      SELECT tipo_custo, SUM(valor) as total
      FROM custos
      WHERE vehicle_id IN (SELECT id FROM vehicles WHERE unique_id::text = ANY($1::text[])) ${dateClause}
      GROUP BY tipo_custo
      ORDER BY tipo_custo ASC;
    `;
    const result = await pool.query(query, [vehicleIds]);
    setReportNoCache(res);
    res.json(result.rows);
  } catch (err) {
    console.error('relatorios/custos-por-categoria:', err);
    setReportNoCache(res);
    res.status(500).json({ error: err.message || 'Erro ao buscar relatório.' });
  }
});

/** GET /gestao/relatorios/consumo-medio */
router.get('/relatorios/consumo-medio', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    const vehicleIds = req.userVehicleIds || [];
    if (vehicleIds.length === 0) {
      setReportNoCache(res);
      return res.json({ average: 0 });
    }
    const query = `
      SELECT SUM(distancia_total) as total_km, SUM(litros_abastecidos) as total_litros
      FROM (
        SELECT t.distancia_total,
               (SELECT SUM(liters_filled) FROM refuelings WHERE viagem_id = t.id) as litros_abastecidos
        FROM trips t
        WHERE t.status = 'FINALIZADA' AND t.vehicle_id IN (SELECT id FROM vehicles WHERE unique_id::text = ANY($1::text[]))
      ) AS subquery;
    `;
    const result = await pool.query(query, [vehicleIds]);
    const data = result.rows[0];
    const totalLitros = data?.total_litros && Number(data.total_litros) > 0;
    const average = totalLitros ? Number(data.total_km) / Number(data.total_litros) : 0;
    setReportNoCache(res);
    res.json({ average });
  } catch (err) {
    console.error('relatorios/consumo-medio:', err);
    setReportNoCache(res);
    res.status(500).json({ error: err.message || 'Erro ao buscar relatório.' });
  }
});

export default router;
