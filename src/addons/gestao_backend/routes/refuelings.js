import { send500 } from '../utils/errorResponse.js';

export default function registerRefuelingRoutes(app, { pool, requireAuthAndFilter }) {
    const vehicleFilter = (vehicleIds) =>
        vehicleIds === null ? '' : ` WHERE r.vehicle_id = ANY($1::uuid[])`;

    app.post('/gestao/refuelings', requireAuthAndFilter, async (req, res) => {
        const {
            vehicle_id,
            driver_id,
            refuel_date,
            odometer,
            liters_filled,
            total_cost,
            is_full_tank,
            foto_bomba,
            foto_odometro,
            posto_nome,
            cidade,
            viagem_id
        } = req.body;

        if (
            !req.userIsAdmin &&
            !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(vehicle_id)))
        ) {
            return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para este veículo.' });
        }
        if (!vehicle_id || !refuel_date || !odometer || !liters_filled || is_full_tank === undefined) {
            return res.status(400).json({
                error: 'Campos obrigatórios: vehicle_id, refuel_date, odometer, liters_filled, is_full_tank.'
            });
        }
        const truncate = (v, max) => (typeof v === 'string' && v.length > max ? v.slice(0, max) : v);
        const safePosto = truncate(posto_nome, 255) ?? null;
        const safeCidade = truncate(cidade, 100) ?? null;
        const parseNum = (v) => (v === '' || v == null ? null : Number(v));
        const odometerNum = parseNum(odometer);
        const litersNum = parseNum(liters_filled);
        const totalCostNum = parseNum(total_cost);
        if (odometerNum == null || isNaN(odometerNum) || litersNum == null || isNaN(litersNum)) {
            return res.status(400).json({
                error: 'Campos obrigatórios: vehicle_id, refuel_date, odometer, liters_filled, is_full_tank.'
            });
        }
        try {
            const result = await pool.query(
                `INSERT INTO refuelings (vehicle_id, driver_id, refuel_date, odometer, liters_filled, total_cost, is_full_tank,
                    foto_bomba, foto_odometro, posto_nome, cidade, viagem_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
                [
                    vehicle_id,
                    driver_id || null,
                    refuel_date,
                    odometerNum,
                    litersNum,
                    totalCostNum ?? null,
                    is_full_tank,
                    foto_bomba || null,
                    foto_odometro || null,
                    safePosto ?? null,
                    safeCidade ?? null,
                    viagem_id || null
                ]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao registrar abastecimento:', error);
            const code = error?.code || '';
            const msg = (error?.message || '').toLowerCase();
            if (code === '22001' || msg.includes('value too long') || msg.includes('string too long')) {
                return res.status(400).json({
                    error: 'Fotos muito grandes. Use imagens menores ou envie via upload em vez de base64.'
                });
            }
            if (code === '22P02' || msg.includes('invalid input syntax')) {
                return res.status(400).json({
                    error: 'Dados inválidos. Verifique vehicle_id, odometer e liters_filled.'
                });
            }
            res.status(500).json({ error: 'Erro interno ao registrar abastecimento.' });
        }
    });

    app.put('/gestao/abastecimentos/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { refuel_date, odometer, liters_filled, total_cost, is_full_tank, posto_nome, cidade, foto_bomba, foto_odometro } =
            req.body;
        const truncate = (v, max) => (typeof v === 'string' && v.length > max ? v.slice(0, max) : v);
        const safePosto = truncate(posto_nome, 255) ?? null;
        const safeCidade = truncate(cidade, 100) ?? null;
        try {
            const permissionResult = await pool.query('SELECT vehicle_id FROM refuelings WHERE id = $1', [id]);
            if (permissionResult.rowCount === 0) return res.status(404).json({ error: 'Abastecimento não encontrado.' });
            const vehicleId = permissionResult.rows[0].vehicle_id;
            if (
                !req.userIsAdmin &&
                !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(vehicleId)))
            ) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            const result = await pool.query(
                `UPDATE refuelings SET refuel_date = $1, odometer = $2, liters_filled = $3, total_cost = $4, is_full_tank = $5,
                    posto_nome = $6, cidade = $7, foto_bomba = $8, foto_odometro = $9 WHERE id = $10 RETURNING *`,
                [
                    refuel_date,
                    odometer,
                    liters_filled,
                    total_cost,
                    is_full_tank,
                    safePosto ?? null,
                    safeCidade ?? null,
                    foto_bomba || null,
                    foto_odometro || null,
                    id
                ]
            );
            if (result.rowCount === 0) return res.status(404).json({ error: 'Abastecimento não encontrado.' });
            res.status(200).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao editar abastecimento:', error);
            res.status(500).json({ error: 'Erro interno ao editar abastecimento.' });
        }
    });

    app.get('/gestao/abastecimentos/todos', requireAuthAndFilter, async (req, res) => {
        try {
            const vehicleIds =
                req.userVehicleIds === 'ALL' ? null : Array.isArray(req.userVehicleIds) ? req.userVehicleIds : [];
            if (vehicleIds !== null && vehicleIds.length === 0) return res.json([]);
            const filter = vehicleFilter(vehicleIds);
            const query = `
                SELECT r.id, r.vehicle_id, r.driver_id, r.refuel_date, r.odometer, r.liters_filled, r.price_per_liter,
                    r.total_cost, r.is_full_tank, r.foto_bomba, r.foto_odometro, r.posto_nome, r.cidade,
                    d.name as driver_name, COALESCE(v.nickname, v.plate, v.model, 'Veículo') as vehicle_name
                FROM refuelings r
                LEFT JOIN drivers d ON r.driver_id = d.id
                LEFT JOIN vehicles v ON r.vehicle_id = v.id
                ${filter}
                ORDER BY r.refuel_date DESC;
            `;
            const result =
                vehicleIds === null ? await pool.query(query) : await pool.query(query, [vehicleIds]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar abastecimentos:', error);
            send500(res, 'Erro ao buscar abastecimentos.', error);
        }
    });

    app.delete('/gestao/abastecimentos/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        try {
            const checkResult = await pool.query('SELECT vehicle_id FROM refuelings WHERE id = $1', [id]);
            if (checkResult.rowCount === 0) return res.status(404).json({ error: 'Abastecimento não encontrado.' });
            const vehicleId = checkResult.rows[0].vehicle_id;
            if (
                vehicleId &&
                !req.userIsAdmin &&
                !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(vehicleId)))
            ) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            await pool.query('DELETE FROM refuelings WHERE id = $1', [id]);
            res.status(200).json({ message: 'Abastecimento excluído com sucesso.' });
        } catch (error) {
            console.error('Erro ao excluir abastecimento:', error);
            res.status(500).json({ error: 'Erro interno ao excluir abastecimento.' });
        }
    });

    app.get('/gestao/refuelings/vehicle/:vehicleId', requireAuthAndFilter, async (req, res) => {
        const { vehicleId } = req.params;
        if (
            !req.userIsAdmin &&
            !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(vehicleId)))
        ) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        try {
            const result = await pool.query(
                `SELECT r.*, d.name as driver_name FROM refuelings r LEFT JOIN drivers d ON r.driver_id = d.id
                 WHERE r.vehicle_id = $1::uuid ORDER BY r.refuel_date DESC`,
                [vehicleId]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar abastecimentos:', error);
            res.status(500).json({ error: 'Erro interno ao buscar abastecimentos.' });
        }
    });
}
