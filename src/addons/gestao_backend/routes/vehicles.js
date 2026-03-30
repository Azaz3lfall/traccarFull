import axios from 'axios';

export default function registerVehicleRoutes(app, { pool, requireAuthAndFilter }) {
    app.get('/gestao/vehicles/sync', requireAuthAndFilter, async (req, res) => {
        res.status(200).json({
            message: 'Veículos são gerenciados no fleet_core. Nenhuma sincronização necessária.',
            new_vehicles: 0,
            updated_vehicles: 0,
            total_traccar: 0
        });
    });

    app.get('/gestao/vehicles', requireAuthAndFilter, async (req, res) => {
        try {
            const baseSelect = `
                SELECT v.id, v.plate, v.model, v.make, v.nickname, v.color, v.year, v.tank_capacity, v.initial_odometer,
                    v.installation_details,
                    COALESCE(NULLIF(TRIM(v.nickname), ''), NULLIF(TRIM(v.plate), ''), NULLIF(TRIM(v.model), ''), 'Veículo sem Nome') as name,
                    v.id as "uniqueId"
                FROM vehicles v
            `;
            let vehicleRows;
            if (req.userVehicleIds === 'ALL') {
                const result = await pool.query(`${baseSelect} ORDER BY v.plate ASC`);
                vehicleRows = result.rows;
            } else {
                const vehicleIds = Array.isArray(req.userVehicleIds) ? req.userVehicleIds : [];
                if (vehicleIds.length === 0) return res.json([]);
                const result = await pool.query(
                    `${baseSelect} WHERE v.id = ANY($1::uuid[]) ORDER BY v.plate ASC`,
                    [vehicleIds]
                );
                vehicleRows = result.rows;
            }
            const driverMap = new Map();
            if (vehicleRows.length > 0) {
                const vehicleIds = vehicleRows.map((r) => r.id);
                const driverResult = await pool.query(
                    `SELECT dv.vehicle_id, d.name FROM driver_vehicles dv JOIN drivers d ON dv.driver_id = d.id WHERE dv.vehicle_id = ANY($1::uuid[])`,
                    [vehicleIds]
                );
                for (const row of driverResult.rows) {
                    driverMap.set(row.vehicle_id, row.name);
                }
            }
            const enriched = vehicleRows.map((v) => ({
                ...v,
                associated_driver: driverMap.get(v.id) || 'Nenhum'
            }));
            res.json(enriched);
        } catch (error) {
            console.error('Erro ao buscar veículos:', error);
            res.status(500).json({ error: 'Erro interno ao buscar veículos.' });
        }
    });

    app.put('/gestao/vehicles/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { tank_capacity, initial_odometer } = req.body;
        const allowed =
            req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(id));
        if (!allowed) {
            return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para editar este veículo.' });
        }
        if (tank_capacity != null && isNaN(tank_capacity)) {
            return res.status(400).json({ error: 'A capacidade do tanque deve ser um número.' });
        }
        if (initial_odometer != null && isNaN(initial_odometer)) {
            return res.status(400).json({ error: 'O odômetro inicial deve ser um número.' });
        }
        try {
            const result = await pool.query(
                `UPDATE vehicles SET tank_capacity = $1, initial_odometer = $2 WHERE id = $3::uuid RETURNING *`,
                [tank_capacity, initial_odometer, id]
            );
            if (result.rowCount === 0) return res.status(404).json({ error: 'Veículo não encontrado.' });
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao atualizar veículo:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar veículo.' });
        }
    });
}
