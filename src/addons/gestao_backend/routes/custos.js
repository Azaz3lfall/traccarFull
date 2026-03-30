export default function registerCustosRoutes(app, { pool, requireAuthAndFilter }) {
    app.delete('/gestao/custos/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        try {
            const checkResult = await pool.query('SELECT vehicle_id FROM custos WHERE id = $1', [id]);
            if (checkResult.rowCount === 0) return res.status(404).json({ error: 'Custo não encontrado.' });
            const vehicleId = checkResult.rows[0].vehicle_id;
            if (
                vehicleId &&
                !req.userIsAdmin &&
                !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(vehicleId)))
            ) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            await pool.query('DELETE FROM custos WHERE id = $1', [id]);
            res.status(200).json({ message: 'Custo excluído com sucesso.' });
        } catch (error) {
            console.error('Erro ao excluir custo:', error);
            res.status(500).json({ error: 'Erro interno ao excluir custo.' });
        }
    });

    app.put('/gestao/custos/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { vehicle_id, driver_id, viagem_id, tipo_custo, descricao, valor } = req.body;
        if (
            vehicle_id &&
            !req.userIsAdmin &&
            !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(vehicle_id)))
        ) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        if (tipo_custo && ['Salário', 'Comissão'].includes(tipo_custo) && !driver_id) {
            return res.status(400).json({ error: 'Motorista é obrigatório para custos do tipo Salário ou Comissão.' });
        }
        try {
            const result = await pool.query(
                `UPDATE custos SET vehicle_id = $1, driver_id = $2, viagem_id = $3, tipo_custo = $4, descricao = $5, valor = $6
                 WHERE id = $7 RETURNING *`,
                [vehicle_id || null, driver_id || null, viagem_id || null, tipo_custo, descricao, valor, id]
            );
            if (result.rowCount === 0) return res.status(404).json({ error: 'Custo não encontrado.' });
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao editar custo:', error);
            res.status(500).json({ error: 'Erro interno ao editar custo.' });
        }
    });

    app.post('/gestao/custos', requireAuthAndFilter, async (req, res) => {
        const { vehicle_id, driver_id, viagem_id, tipo_custo, descricao, valor, foto_path } = req.body;
        if (
            vehicle_id &&
            !req.userIsAdmin &&
            !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(vehicle_id)))
        ) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        if (!tipo_custo || !descricao || !valor) {
            return res.status(400).json({ error: 'Campos obrigatórios: tipo_custo, descricao, valor.' });
        }
        if (['Salário', 'Comissão'].includes(tipo_custo) && !driver_id) {
            return res.status(400).json({ error: 'Motorista é obrigatório para custos do tipo Salário ou Comissão.' });
        }
        try {
            const result = await pool.query(
                `INSERT INTO custos (vehicle_id, driver_id, viagem_id, tipo_custo, descricao, valor, data_custo, foto_path)
                 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7) RETURNING *`,
                [
                    vehicle_id || null,
                    driver_id || null,
                    viagem_id || null,
                    tipo_custo,
                    descricao,
                    valor,
                    foto_path || null
                ]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao registrar custo:', error);
            res.status(500).json({ error: 'Erro interno ao registrar custo.' });
        }
    });

    app.get('/gestao/custos', requireAuthAndFilter, async (req, res) => {
        try {
            const vehicleIdsCustos =
                req.userVehicleIds === 'ALL' ? null : Array.isArray(req.userVehicleIds) ? req.userVehicleIds : [];
            if (vehicleIdsCustos !== null && vehicleIdsCustos.length === 0) return res.json([]);
            const baseSelect = `
                SELECT c.id, c.vehicle_id, c.driver_id, c.viagem_id, c.tipo_custo, c.descricao, c.valor, c.data_custo, c.foto_path,
                    COALESCE(v.nickname, v.plate, v.model, 'Veículo') as vehicle_name, d.name as driver_name, t.start_city, t.end_city,
                    CASE WHEN c.viagem_id IS NULL THEN 'Custo Avulso' ELSE 'Custo de Viagem' END as tipo_origem
                FROM custos c
                LEFT JOIN vehicles v ON c.vehicle_id = v.id
                LEFT JOIN drivers d ON c.driver_id = d.id
                LEFT JOIN trips t ON c.viagem_id = t.id
            `;
            const query =
                vehicleIdsCustos === null
                    ? baseSelect + ` ORDER BY c.data_custo DESC`
                    : baseSelect +
                        ` WHERE (c.vehicle_id = ANY($1::uuid[]) OR c.vehicle_id IS NULL) ORDER BY c.data_custo DESC`;
            const result =
                vehicleIdsCustos === null
                    ? await pool.query(query)
                    : await pool.query(query, [vehicleIdsCustos]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar custos:', error);
            res.status(500).json({ error: 'Erro interno ao buscar custos.' });
        }
    });
}
