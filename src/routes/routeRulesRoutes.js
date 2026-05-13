import { Router } from 'express';
import pool from '../addons/traccar_wrapper/db/index.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

async function ensureRouteRulesTable(executor = pool) {
  await executor.query(`
    CREATE TABLE IF NOT EXISTS vehicle_route_rules (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      geofence_id BIGINT NOT NULL,
      block_on_exit BOOLEAN NOT NULL DEFAULT FALSE,
      polyline_distance INTEGER DEFAULT 100,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(vehicle_id, geofence_id)
    )
  `);
  await executor.query(
    'CREATE INDEX IF NOT EXISTS idx_vehicle_route_rules_vehicle ON vehicle_route_rules(vehicle_id)',
  );
  await executor.query(
    'CREATE INDEX IF NOT EXISTS idx_vehicle_route_rules_geofence ON vehicle_route_rules(geofence_id)',
  );
}

router.post('/', async (req, res) => {
  const { vehicleId, geofenceId, blockOnExit = false, polylineDistance = 100 } = req.body || {};
  if (!vehicleId || !geofenceId) {
    return res.status(400).json({ error: 'Validation error', message: 'vehicleId and geofenceId are required' });
  }
  try {
    await ensureRouteRulesTable();
    const result = await pool.query(
      `INSERT INTO vehicle_route_rules (vehicle_id, geofence_id, block_on_exit, polyline_distance, enabled)
       VALUES ($1::uuid, $2, $3, $4, true)
       ON CONFLICT (vehicle_id, geofence_id) DO UPDATE SET
         block_on_exit = EXCLUDED.block_on_exit,
         polyline_distance = EXCLUDED.polyline_distance,
         enabled = true
       RETURNING *`,
      [vehicleId, geofenceId, !!blockOnExit, Number(polylineDistance) || 100],
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/route-rules error:', error?.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  const { vehicleId } = req.query;
  try {
    await ensureRouteRulesTable();
    if (vehicleId) {
      const result = await pool.query(
        `SELECT id, vehicle_id AS "vehicleId", geofence_id AS "geofenceId",
                block_on_exit AS "blockOnExit", polyline_distance AS "polylineDistance",
                enabled, created_at AS "createdAt"
         FROM vehicle_route_rules
         WHERE vehicle_id = $1::uuid
         ORDER BY created_at DESC`,
        [vehicleId],
      );
      return res.json(result.rows);
    }

    const result = await pool.query(
      `SELECT id, vehicle_id AS "vehicleId", geofence_id AS "geofenceId",
              block_on_exit AS "blockOnExit", polyline_distance AS "polylineDistance",
              enabled, created_at AS "createdAt"
       FROM vehicle_route_rules
       ORDER BY created_at DESC`,
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('GET /api/route-rules error:', error?.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await ensureRouteRulesTable();
    const result = await pool.query(
      'DELETE FROM vehicle_route_rules WHERE id = $1::uuid RETURNING id',
      [id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({ message: 'Route rule deleted' });
  } catch (error) {
    console.error('DELETE /api/route-rules/:id error:', error?.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { ensureRouteRulesTable };
export default router;
