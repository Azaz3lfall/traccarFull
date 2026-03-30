/**
 * EXEMPLO DE CORREÇÃO DAS ROTAS DE GESTÃO
 * 
 * Este arquivo mostra como as rotas de gestão devem ser implementadas
 * para corrigir os problemas de UUID vs Integer e colunas ausentes.
 * 
 * Aplicar essas correções no backend de gestão (porta 3666).
 */

import express from 'express';
import pool from './db/index.js'; // Ajustar o caminho conforme necessário

const router = express.Router();

/**
 * MIDDLEWARE: Popular req.userVehicleIds com UUIDs dos veículos do usuário
 * 
 * Este middleware deve ser aplicado ANTES das rotas de listagem
 * para garantir que req.userVehicleIds contenha um array de UUIDs.
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
      req.userVehicleIds = vehiclesResult.rows.map(r => r.id); // UUIDs
    } else {
      // Usuário comum: buscar veículos do cliente dele
      if (!req.user || !req.user.id) {
        req.userVehicleIds = [];
        return next();
      }

      const vehiclesResult = await pool.query(
        `SELECT v.id 
         FROM vehicles v
         INNER JOIN clients c ON v.client_id = c.id
         WHERE c.traccar_user_id = $1`,
        [req.user.id]
      );
      req.userVehicleIds = vehiclesResult.rows.map(r => r.id); // UUIDs (strings)
    }

    next();
  } catch (error) {
    console.error('Error populating userVehicleIds:', error);
    req.userVehicleIds = [];
    next();
  }
}

// Aplicar middleware em todas as rotas
router.use(populateUserVehicleIds);

/**
 * GET /gestao/vehicles
 * 
 * Lista todos os veículos com tank_capacity e initial_odometer explicitamente incluídos
 */
router.get('/vehicles', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available' });
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
        (SELECT json_agg(vd.device_id) FROM vehicle_devices vd WHERE vd.vehicle_id = v.id) as "deviceIds"
      FROM vehicles v
      LEFT JOIN clients c ON v.client_id = c.id
    `;
    
    const params = [];
    
    if (!isSuperAdmin) {
      if (req.userVehicleIds && req.userVehicleIds.length > 0) {
        query += ` WHERE v.id = ANY($1::uuid[])`;
        params.push(req.userVehicleIds);
      } else {
        // Usuário sem veículos = lista vazia
        return res.json([]);
      }
    }
    
    query += ` ORDER BY v.created_at DESC`;
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /gestao/abastecimentos/todos
 * 
 * Lista todos os abastecimentos filtrando por vehicle_id (UUID)
 * 
 * CORREÇÃO CRÍTICA:
 * - NÃO usar Number() ou parseInt() em vehicle_id
 * - Usar cast explícito ::uuid[] no SQL
 * - req.userVehicleIds já contém UUIDs (strings)
 */
router.get('/abastecimentos/todos', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const vehicleIds = req.userVehicleIds || [];

    if (vehicleIds.length === 0) {
      return res.json([]);
    }

    // CORRETO: Usar cast explícito ::uuid[] e vehicleIds já são UUIDs (strings)
    const result = await pool.query(
      `SELECT * 
       FROM abastecimentos 
       WHERE vehicle_id = ANY($1::uuid[])
       ORDER BY data DESC`,
      [vehicleIds] // Array de UUIDs (strings), NÃO converter para Number()
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching abastecimentos:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /gestao/trips
 * 
 * Lista todas as viagens filtrando por vehicle_id (UUID)
 * 
 * CORREÇÃO CRÍTICA:
 * - NÃO usar Number() ou parseInt() em vehicle_id
 * - Usar cast explícito ::uuid[] no SQL
 * - req.userVehicleIds já contém UUIDs (strings)
 */
router.get('/trips', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const vehicleIds = req.userVehicleIds || [];
    const { status } = req.query; // status opcional: 'open', 'closed', 'cancelled'

    if (vehicleIds.length === 0) {
      return res.json([]);
    }

    let query = `
      SELECT * 
      FROM trips 
      WHERE vehicle_id = ANY($1::uuid[])
    `;
    const params = [vehicleIds];

    // Adicionar filtro de status se fornecido
    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY start_date DESC`;

    // CORRETO: Usar cast explícito ::uuid[] e vehicleIds já são UUIDs (strings)
    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /gestao/maintenances
 * 
 * Lista todas as manutenções filtrando por vehicle_id (UUID)
 * 
 * CORREÇÃO CRÍTICA:
 * - NÃO usar Number() ou parseInt() em vehicle_id
 * - Usar cast explícito ::uuid[] no SQL
 * - req.userVehicleIds já contém UUIDs (strings)
 */
router.get('/maintenances', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const vehicleIds = req.userVehicleIds || [];

    if (vehicleIds.length === 0) {
      return res.json([]);
    }

    // CORRETO: Usar cast explícito ::uuid[] e vehicleIds já são UUIDs (strings)
    const result = await pool.query(
      `SELECT * 
       FROM maintenances 
       WHERE vehicle_id = ANY($1::uuid[])
       ORDER BY date DESC`,
      [vehicleIds] // Array de UUIDs (strings), NÃO converter para Number()
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching maintenances:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * EXEMPLOS DE CÓDIGO INCORRETO (NÃO FAZER):
 * 
 * ❌ ERRADO: Converter vehicle_id para Number
 * const vehicleId = Number(req.query.vehicle_id);
 * WHERE vehicle_id = $1  // PostgreSQL vai tentar comparar UUID com integer
 * 
 * ❌ ERRADO: Usar parseInt
 * const vehicleId = parseInt(req.query.vehicle_id, 10);
 * WHERE vehicle_id = $1
 * 
 * ❌ ERRADO: Sem cast explícito
 * WHERE vehicle_id = ANY($1)  // PostgreSQL pode inferir tipo errado
 * 
 * ❌ ERRADO: Comparar UUID com integer
 * if (req.userVehicleIds.includes(Number(id)))  // Quebra com UUID
 * 
 * ✅ CORRETO: Manter como string e usar cast explícito
 * const vehicleId = req.query.vehicle_id; // Já é string (UUID)
 * WHERE vehicle_id = $1::uuid
 * 
 * ✅ CORRETO: Array de UUIDs com cast explícito
 * WHERE vehicle_id = ANY($1::uuid[])
 * 
 * ✅ CORRETO: Comparação de strings
 * if (req.userVehicleIds.includes(id))  // id já é string (UUID)
 */

export default router;
