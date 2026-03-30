import { send500 } from '../utils/errorResponse.js';

export default function registerMaintenanceRoutes(app, { pool, requireAuthAndFilter }) {
    app.get('/gestao/maintenances', requireAuthAndFilter, async (req, res) => {
        const { vehicle_id } = req.query;
        try {
            let query = `
                SELECT m.id, m.vehicle_id, m.maintenance_date, m.description, m.cost, m.odometer, m.provider_name, m.foto_path, COALESCE(v.nickname, v.plate, v.model, 'Veículo') as vehicle_name
                FROM maintenances m
                LEFT JOIN vehicles v ON m.vehicle_id = v.id
                WHERE 1=1
            `;
            const params = [];
            if (vehicle_id) {
                params.push(vehicle_id);
                query += ` AND m.vehicle_id = $${params.length}::uuid`;
            }
            if (
                !req.userIsAdmin &&
                Array.isArray(req.userVehicleIds) &&
                req.userVehicleIds.length > 0
            ) {
                params.push(req.userVehicleIds);
                query += ` AND m.vehicle_id = ANY($${params.length}::uuid[])`;
            }
            query += ` ORDER BY m.maintenance_date DESC`;
            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar manutenções:', error);
            send500(res, 'Erro interno ao buscar manutenções.', error);
        }
    });

    app.post('/gestao/maintenances', requireAuthAndFilter, async (req, res) => {
        const { vehicle_id, maintenance_date, description, cost, odometer, provider_name, foto_path } = req.body;
        if (
            !req.userIsAdmin &&
            !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(vehicle_id)))
        ) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        if (!vehicle_id || !maintenance_date || !description || !cost) {
            return res.status(400).json({
                error: 'Campos obrigatórios: vehicle_id, maintenance_date, description, cost.'
            });
        }
        try {
            const result = await pool.query(
                `INSERT INTO maintenances (vehicle_id, maintenance_date, description, cost, odometer, provider_name, foto_path)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [vehicle_id, maintenance_date, description, cost, odometer || null, provider_name || null, foto_path || null]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao registrar manutenção:', error);
            send500(res, 'Erro interno ao registrar manutenção.', error);
        }
    });

    app.put('/gestao/maintenances/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { vehicle_id, maintenance_date, description, cost, odometer, provider_name, foto_path } = req.body;
        try {
            const checkQuery = await pool.query('SELECT vehicle_id FROM maintenances WHERE id = $1', [id]);
            if (checkQuery.rowCount === 0) return res.status(404).json({ error: 'Manutenção não encontrada.' });
            const existing = checkQuery.rows[0];
            if (
                !req.userIsAdmin &&
                !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(existing.vehicle_id)))
            ) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            if (
                vehicle_id &&
                !req.userIsAdmin &&
                !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(vehicle_id)))
            ) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            if (!maintenance_date || !description || !cost) {
                return res.status(400).json({ error: 'Campos obrigatórios: maintenance_date, description, cost.' });
            }
            const result = await pool.query(
                `UPDATE maintenances SET vehicle_id = COALESCE($1, vehicle_id), maintenance_date = $2, description = $3,
                    cost = $4, odometer = $5, provider_name = $6, foto_path = $7 WHERE id = $8 RETURNING *`,
                [vehicle_id || null, maintenance_date, description, cost, odometer || null, provider_name || null, foto_path || null, id]
            );
            res.status(200).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao atualizar manutenção:', error);
            send500(res, 'Erro interno ao atualizar manutenção.', error);
        }
    });

    app.delete('/gestao/maintenances/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        try {
            const checkQuery = await pool.query('SELECT vehicle_id FROM maintenances WHERE id = $1', [id]);
            if (checkQuery.rowCount === 0) return res.status(404).json({ error: 'Manutenção não encontrada.' });
            const existing = checkQuery.rows[0];
            if (
                !req.userIsAdmin &&
                !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(existing.vehicle_id)))
            ) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            await pool.query('DELETE FROM maintenances WHERE id = $1', [id]);
            res.status(200).json({ message: 'Manutenção excluída com sucesso.' });
        } catch (error) {
            console.error('Erro ao excluir manutenção:', error);
            send500(res, 'Erro interno ao excluir manutenção.', error);
        }
    });
}
