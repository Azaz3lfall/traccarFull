import { Router } from 'express';
import pool from '../addons/traccar_wrapper/db/index.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/map', authenticate, async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available', message: 'DATABASE_URL not configured' });
  }

  try {
    // 1. Identificar Super Admin
    const isSuperAdmin = req.user && (
      req.user.email === 'evangelista1908@gmail.com' || 
      req.user.administrator === true || 
      req.user.admin === true
    );

    console.log('User requesting fleet map:', {
      id: req.user?.id,
      email: req.user?.email,
      administrator: req.user?.administrator,
      isSuperAdmin
    });

    // 2. Construir Query Base
    // O "device_id" retornado aqui DEVE ser o ID do rastreador principal (da tabela vehicle_devices)
    // Isso engana o frontend para ele achar que é um veículo simples 1:1
    let query = `
      SELECT 
        v.id, v.plate, v.nickname, v.make, v.model, v.color, v.year,
        v.foto_veiculo, v.vehicle_type,
        c.name as client_name,
        COALESCE(
          (SELECT device_id FROM vehicle_devices vd WHERE vd.vehicle_id = v.id AND vd.is_primary = true LIMIT 1),
          (SELECT device_id FROM vehicle_devices vd WHERE vd.vehicle_id = v.id LIMIT 1)
        ) as device_id,
        -- Array de dispositivos com id e is_primary para o carrossel
        (
          SELECT json_agg(json_build_object(
            'id', vd.device_id,
            'is_primary', vd.is_primary
          ))
          FROM vehicle_devices vd
          WHERE vd.vehicle_id = v.id
        ) as devices
      FROM vehicles v
      LEFT JOIN clients c ON v.client_id = c.id
    `;
    
    const params = [];

    // 3. Aplicar Filtro de Segurança
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
        if (clientResult.rows.length > 0) {
          clientIds = clientResult.rows.map((r) => r.id);
        }
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

    // 4. Filtrar apenas veículos que tenham algum rastreador (opcional, mas bom pra limpar o mapa)
    // query += isSuperAdmin ? " WHERE " : " AND ";
    // query += " (SELECT count(*) FROM vehicle_devices vd WHERE vd.vehicle_id = v.id) > 0 ";

    const { rows } = await pool.query(query, params);
    
    // Retorna apenas veículos que possuem um device_id válido (para o mapa funcionar)
    const validVehicles = rows.filter(v => v.device_id != null);
    
    console.log(`Query executed successfully, returning ${validVehicles.length} valid vehicles (from ${rows.length} total)`);
    res.json(validVehicles);
  } catch (error) {
    console.error('Error fetching fleet map:', error);
    console.error('Error stack:', error?.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
