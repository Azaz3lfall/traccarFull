async function ensureRouteRulesTable(executor) {
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
}

export default function registerRouteRulesRoutes(app, { pool, requireAuthAndFilter }) {
    app.post('/api/route-rules', requireAuthAndFilter, async (req, res) => {
        const { vehicleId, geofenceId, blockOnExit = false, polylineDistance = 100 } = req.body || {};
        if (!vehicleId || !geofenceId) {
            return res.status(400).json({ error: 'Validation error', message: 'vehicleId and geofenceId are required' });
        }
        try {
            await ensureRouteRulesTable(pool);
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
            return res.status(200).json(result.rows[0]);
        } catch (error) {
            console.error('POST /api/route-rules error:', error?.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/route-rules', requireAuthAndFilter, async (req, res) => {
        const { vehicleId } = req.query;
        try {
            await ensureRouteRulesTable(pool);
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

    app.delete('/api/route-rules/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        try {
            await ensureRouteRulesTable(pool);
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
}
