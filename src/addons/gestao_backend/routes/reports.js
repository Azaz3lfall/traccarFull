import axios from 'axios';

async function getVehicleIdsForReport(req, deviceIdParam) {
    const isAdmin = req.userIsAdmin;
    if (isAdmin && (!deviceIdParam || deviceIdParam === 'all')) return null;
    if (!deviceIdParam || deviceIdParam === 'all') {
        return Array.isArray(req.userVehicleIds) ? req.userVehicleIds : [];
    }
    if (
        !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(deviceIdParam)))
    ) {
        throw new Error('Acesso negado. Você não tem permissão para acessar este veículo.');
    }
    return [deviceIdParam];
}

function setReportNoCache(res) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
}

export default function registerReportRoutes(app, { pool, requireAuthAndFilter }) {
    app.get('/gestao/relatorios/custos-extras', requireAuthAndFilter, async (req, res) => {
        try {
            const { periodo, deviceId } = req.query;
            const vehicleIds = await getVehicleIdsForReport(req, deviceId);
            let dateClause = '';
            if (periodo === 'mensal') dateClause = "AND data_custo >= NOW() - INTERVAL '30 days'";
            else if (periodo === 'semanal') dateClause = "AND data_custo >= NOW() - INTERVAL '7 days'";
            else if (periodo === 'anual') dateClause = "AND data_custo >= NOW() - INTERVAL '365 days'";
            else if (periodo === 'mes_anterior') dateClause = "AND data_custo >= date_trunc('month', NOW() - INTERVAL '1 month') AND data_custo < date_trunc('month', NOW())";
            const query =
                vehicleIds === null
                    ? `SELECT id, vehicle_id, data_custo, tipo_custo, descricao, valor, foto_path FROM custos WHERE viagem_id IS NULL ${dateClause} ORDER BY data_custo DESC`
                    : `SELECT id, vehicle_id, data_custo, tipo_custo, descricao, valor, foto_path FROM custos WHERE viagem_id IS NULL AND vehicle_id = ANY($1::uuid[]) ${dateClause} ORDER BY data_custo DESC`;
            const result = vehicleIds === null ? await pool.query(query) : await pool.query(query, [vehicleIds]);
            setReportNoCache(res);
            res.json(result.rows);
        } catch (error) {
            if (error.message?.includes('Acesso negado')) return res.status(403).json({ error: error.message });
            setReportNoCache(res);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    app.get('/gestao/relatorios/custos-por-viagem', requireAuthAndFilter, async (req, res) => {
        try {
            const { periodo, deviceId } = req.query;
            const vehicleIds = await getVehicleIdsForReport(req, deviceId);
            let dateClause = '';
            if (periodo === 'mensal') dateClause = "AND t.end_date >= NOW() - INTERVAL '30 days'";
            else if (periodo === 'semanal') dateClause = "AND t.end_date >= NOW() - INTERVAL '7 days'";
            else if (periodo === 'anual') dateClause = "AND t.end_date >= NOW() - INTERVAL '365 days'";
            else if (periodo === 'mes_anterior') dateClause = "AND t.end_date >= date_trunc('month', NOW() - INTERVAL '1 month') AND t.end_date < date_trunc('month', NOW())";
            const query =
                vehicleIds === null
                    ? `SELECT t.id, t.vehicle_id, t.start_city, t.end_city, t.is_round_trip, t.end_date, t.distancia_total,
                        (SELECT SUM(valor) FROM custos WHERE viagem_id = t.id) as custo_total,
                        (SELECT SUM(liters_filled) FROM refuelings WHERE viagem_id = t.id) as litros_abastecidos,
                        (t.distancia_total / NULLIF((SELECT SUM(liters_filled) FROM refuelings WHERE viagem_id = t.id), 0)) as consumo_medio_viagem
                        FROM trips t WHERE t.status = 'FINALIZADA' ${dateClause} ORDER BY t.end_date DESC`
                    : `SELECT t.id, t.vehicle_id, t.start_city, t.end_city, t.is_round_trip, t.end_date, t.distancia_total,
                        (SELECT SUM(valor) FROM custos WHERE viagem_id = t.id) as custo_total,
                        (SELECT SUM(liters_filled) FROM refuelings WHERE viagem_id = t.id) as litros_abastecidos,
                        (t.distancia_total / NULLIF((SELECT SUM(liters_filled) FROM refuelings WHERE viagem_id = t.id), 0)) as consumo_medio_viagem
                        FROM trips t WHERE t.status = 'FINALIZADA' AND t.vehicle_id = ANY($1::uuid[]) ${dateClause} ORDER BY t.end_date DESC`;
            const result = vehicleIds === null ? await pool.query(query) : await pool.query(query, [vehicleIds]);
            setReportNoCache(res);
            res.json(result.rows);
        } catch (error) {
            if (error.message?.includes('Acesso negado')) return res.status(403).json({ error: error.message });
            setReportNoCache(res);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    app.get('/gestao/relatorios/custos-por-categoria', requireAuthAndFilter, async (req, res) => {
        try {
            const { periodo, deviceId } = req.query;
            const vehicleIds = await getVehicleIdsForReport(req, deviceId);
            let dateClause = '';
            if (periodo === 'mensal') dateClause = "AND data_custo >= NOW() - INTERVAL '30 days'";
            else if (periodo === 'semanal') dateClause = "AND data_custo >= NOW() - INTERVAL '7 days'";
            else if (periodo === 'anual') dateClause = "AND data_custo >= NOW() - INTERVAL '365 days'";
            else if (periodo === 'mes_anterior') dateClause = "AND data_custo >= date_trunc('month', NOW() - INTERVAL '1 month') AND data_custo < date_trunc('month', NOW())";
            const query =
                vehicleIds === null
                    ? `SELECT tipo_custo, SUM(valor) as total FROM custos WHERE 1=1 ${dateClause} GROUP BY tipo_custo ORDER BY tipo_custo`
                    : `SELECT tipo_custo, SUM(valor) as total FROM custos WHERE vehicle_id = ANY($1::uuid[]) ${dateClause} GROUP BY tipo_custo ORDER BY tipo_custo`;
            const result = vehicleIds === null ? await pool.query(query) : await pool.query(query, [vehicleIds]);
            setReportNoCache(res);
            res.json(result.rows);
        } catch (error) {
            if (error.message?.includes('Acesso negado')) return res.status(403).json({ error: error.message });
            setReportNoCache(res);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    app.get('/gestao/relatorios/consumo-medio', requireAuthAndFilter, async (req, res) => {
        try {
            const { deviceId } = req.query;
            const vehicleIds = await getVehicleIdsForReport(req, deviceId);
            const query =
                vehicleIds === null
                    ? `SELECT SUM(distancia_total) as total_km, SUM(litros_abastecidos) as total_litros FROM (
                        SELECT t.distancia_total, (SELECT SUM(liters_filled) FROM refuelings WHERE viagem_id = t.id) as litros_abastecidos
                        FROM trips t WHERE t.status = 'FINALIZADA'
                    ) AS subquery`
                    : `SELECT SUM(distancia_total) as total_km, SUM(litros_abastecidos) as total_litros FROM (
                        SELECT t.distancia_total, (SELECT SUM(liters_filled) FROM refuelings WHERE viagem_id = t.id) as litros_abastecidos
                        FROM trips t WHERE t.status = 'FINALIZADA' AND t.vehicle_id = ANY($1::uuid[])
                    ) AS subquery`;
            const result = vehicleIds === null ? await pool.query(query) : await pool.query(query, [vehicleIds]);
            const data = result.rows[0];
            const consumo = data?.total_litros > 0 ? Number(data.total_km) / Number(data.total_litros) : 0;
            setReportNoCache(res);
            res.json({ total: consumo });
        } catch (error) {
            if (error.message?.includes('Acesso negado')) return res.status(403).json({ error: error.message });
            setReportNoCache(res);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    app.get('/gestao/relatorios/distancia-abastecimentos', requireAuthAndFilter, async (req, res) => {
        try {
            const { periodo, startDate, endDate } = req.query;
            const reportVehicleIds =
                req.userVehicleIds === 'ALL' ? null : Array.isArray(req.userVehicleIds) ? req.userVehicleIds : [];
            if (reportVehicleIds !== null && reportVehicleIds.length === 0) return res.json([]);
            let dateClause = '';
            const values = reportVehicleIds === null ? [] : [reportVehicleIds];
            if (periodo === 'mensal') dateClause = "AND r.refuel_date >= NOW() - INTERVAL '30 days'";
            else if (periodo === 'semanal') dateClause = "AND r.refuel_date >= NOW() - INTERVAL '7 days'";
            else if (periodo === 'anual') dateClause = "AND r.refuel_date >= NOW() - INTERVAL '365 days'";
            else if (periodo === 'mes_anterior') dateClause = "AND r.refuel_date >= date_trunc('month', NOW() - INTERVAL '1 month') AND r.refuel_date < date_trunc('month', NOW())";
            else if (periodo === 'personalizado' && startDate && endDate) {
                dateClause = `AND r.refuel_date BETWEEN $${values.length + 1} AND $${values.length + 2}`;
                values.push(startDate, endDate);
            }
            const vehicleFilter =
                reportVehicleIds === null ? '' : ` WHERE r.vehicle_id = ANY($1::uuid[])`;
            const query = `
                WITH RankedRefuelings AS (
                    SELECT r.id, r.vehicle_id, r.odometer, r.refuel_date, r.liters_filled, r.total_cost, r.posto_nome, r.cidade, r.viagem_id,
                        LAG(r.odometer) OVER (PARTITION BY r.vehicle_id ORDER BY r.refuel_date) AS odometer_anterior,
                        r.foto_bomba, r.foto_odometro, COALESCE(v.nickname, v.plate, v.model, 'Veículo') as vehicle_name
                    FROM refuelings r LEFT JOIN vehicles v ON r.vehicle_id = v.id
                    ${vehicleFilter}
                )
                SELECT id, vehicle_id, vehicle_name, refuel_date, odometer as odometer_atual, liters_filled, total_cost,
                    posto_nome, cidade, viagem_id, odometer_anterior,
                    (odometer - odometer_anterior) AS distancia_percorrida,
                    CASE WHEN liters_filled > 0 AND odometer_anterior IS NOT NULL THEN ((odometer - odometer_anterior) / liters_filled) ELSE 0 END AS consumo_por_trecho,
                    foto_bomba, foto_odometro
                FROM RankedRefuelings r WHERE r.odometer_anterior IS NOT NULL ${dateClause}
                ORDER BY vehicle_name, refuel_date DESC
            `;
            const result = values.length ? await pool.query(query, values) : await pool.query(query);
            setReportNoCache(res);
            res.json(result.rows);
        } catch (error) {
            setReportNoCache(res);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    app.get('/gestao/relatorios/custo-abastecimento-total', requireAuthAndFilter, async (req, res) => {
        try {
            const { periodo, startDate, endDate } = req.query;
            const reportVehicleIds =
                req.userVehicleIds === 'ALL' ? null : Array.isArray(req.userVehicleIds) ? req.userVehicleIds : [];
            if (reportVehicleIds !== null && reportVehicleIds.length === 0) return res.json({ total: 0 });
            let dateClause = '';
            const values = reportVehicleIds === null ? [] : [reportVehicleIds];
            if (periodo === 'mensal') dateClause = "AND refuel_date >= NOW() - INTERVAL '30 days'";
            else if (periodo === 'semanal') dateClause = "AND refuel_date >= NOW() - INTERVAL '7 days'";
            else if (periodo === 'anual') dateClause = "AND refuel_date >= NOW() - INTERVAL '365 days'";
            else if (periodo === 'mes_anterior') dateClause = "AND refuel_date >= date_trunc('month', NOW() - INTERVAL '1 month') AND refuel_date < date_trunc('month', NOW())";
            else if (periodo === 'personalizado' && startDate && endDate) {
                dateClause = `AND refuel_date BETWEEN $${values.length + 1} AND $${values.length + 2}`;
                values.push(startDate, endDate);
            }
            const vehicleFilter =
                reportVehicleIds === null ? 'WHERE 1=1' : 'WHERE vehicle_id = ANY($1::uuid[])';
            const query = `SELECT SUM(total_cost) as total FROM refuelings ${vehicleFilter} ${dateClause}`;
            const result = values.length ? await pool.query(query, values) : await pool.query(query);
            setReportNoCache(res);
            res.json({ total: Number(result.rows[0]?.total) || 0 });
        } catch (error) {
            setReportNoCache(res);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });
}
