export default function registerTripRoutes(app, { pool, requireAuthAndFilter }) {
    app.post('/gestao/trips/iniciar', requireAuthAndFilter, async (req, res) => {
        const { vehicle_id, driver_id, start_city, end_city, is_round_trip } = req.body;
        if (
            !req.userIsAdmin &&
            !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(vehicle_id)))
        ) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        if (!vehicle_id || !driver_id || !start_city || !end_city) {
            return res.status(400).json({
                error: 'Campos obrigatórios: vehicle_id, driver_id, start_city, end_city.'
            });
        }
        try {
            const result = await pool.query(
                `INSERT INTO trips (vehicle_id, driver_id, start_city, end_city, is_round_trip) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [vehicle_id, driver_id, start_city, end_city, is_round_trip || false]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao iniciar viagem:', error);
            res.status(500).json({ error: 'Erro interno ao iniciar viagem.' });
        }
    });

    app.get('/gestao/trips', requireAuthAndFilter, async (req, res) => {
        const { status } = req.query;
        try {
            const vehicleIdsTrips =
                req.userVehicleIds === 'ALL' ? null : Array.isArray(req.userVehicleIds) ? req.userVehicleIds : [];
            if (vehicleIdsTrips !== null && vehicleIdsTrips.length === 0) return res.json([]);
            let query = `
                SELECT t.id, t.vehicle_id, t.driver_id, t.start_city, t.end_city, t.is_round_trip,
                    t.start_date, t.end_date, t.status, t.distancia_total,
                    COALESCE(v.nickname, v.plate, v.model, 'Veículo') as vehicle_name, d.name as driver_name
                FROM trips t
                LEFT JOIN vehicles v ON t.vehicle_id = v.id
                LEFT JOIN drivers d ON t.driver_id = d.id
            `;
            const values = [];
            if (vehicleIdsTrips !== null) {
                values.push(vehicleIdsTrips);
                query += ` WHERE t.vehicle_id = ANY($1::uuid[])`;
            } else {
                query += ` WHERE 1=1`;
            }
            if (status) {
                values.push(status);
                query += ` AND t.status = $${values.length}`;
            }
            query += ` ORDER BY t.start_date DESC`;
            const result = values.length ? await pool.query(query, values) : await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar viagens:', error);
            res.status(500).json({ error: 'Erro interno ao buscar viagens.' });
        }
    });

    app.put('/gestao/trips/:id/finalizar', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { distancia_total } = req.body;
        const permVehicleIds =
            req.userVehicleIds === 'ALL' ? null : Array.isArray(req.userVehicleIds) ? req.userVehicleIds : [];
        if (permVehicleIds && permVehicleIds.length > 0) {
            const permissionResult = await pool.query(
                `SELECT vehicle_id FROM trips WHERE id = $1 AND vehicle_id = ANY($2::uuid[])`,
                [id, permVehicleIds]
            );
            if (permissionResult.rowCount === 0) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
        }
        if (!distancia_total) {
            return res.status(400).json({ error: 'A distância total é obrigatória para finalizar a viagem.' });
        }
        try {
            const result = await pool.query(
                `UPDATE trips SET status = 'FINALIZADA', end_date = CURRENT_TIMESTAMP, distancia_total = $1 WHERE id = $2 RETURNING *`,
                [distancia_total, id]
            );
            if (result.rowCount === 0) return res.status(404).json({ error: 'Viagem não encontrada.' });
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao finalizar viagem:', error);
            res.status(500).json({ error: 'Erro interno ao finalizar viagem.' });
        }
    });

    app.put('/gestao/trips/:id/cancelar', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const permVehicleIds =
            req.userVehicleIds === 'ALL' ? null : Array.isArray(req.userVehicleIds) ? req.userVehicleIds : [];
        if (permVehicleIds && permVehicleIds.length > 0) {
            const permissionResult = await pool.query(
                `SELECT vehicle_id FROM trips WHERE id = $1 AND vehicle_id = ANY($2::uuid[])`,
                [id, permVehicleIds]
            );
            if (permissionResult.rowCount === 0) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
        }
        try {
            const result = await pool.query(
                `UPDATE trips SET status = 'CANCELADA', end_date = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
                [id]
            );
            if (result.rowCount === 0) return res.status(404).json({ error: 'Viagem não encontrada.' });
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao cancelar viagem:', error);
            res.status(500).json({ error: 'Erro interno ao cancelar viagem.' });
        }
    });
}
