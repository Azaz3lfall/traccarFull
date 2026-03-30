export default function registerMotoristaRoutes(app, { pool, requireJwtAuth, upload }) {
    app.get('/app/motorista/trips', requireJwtAuth, async (req, res) => {
        try {
            const { status } = req.query;
            let query = `SELECT t.*, COALESCE(v.nickname, v.plate, v.model, 'Veículo') as vehicle_name
                FROM trips t
                LEFT JOIN vehicles v ON t.vehicle_id = v.id
                WHERE t.driver_id = $1`;
            const params = [req.driverId];
            if (status) {
                params.push(status);
                query += ` AND t.status = $${params.length}`;
            }
            query += ' ORDER BY t.start_date DESC';
            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar viagens:', error);
            res.status(500).json({ error: 'Erro interno ao buscar viagens.' });
        }
    });

    app.post('/app/motorista/custos', requireJwtAuth, async (req, res) => {
        const { vehicle_id, viagem_id, tipo_custo, descricao, valor, foto_path } = req.body;
        const driverId = req.driverId;
        if (!tipo_custo || !descricao || !valor || !viagem_id) {
            return res.status(400).json({ error: 'Campos obrigatórios: viagem_id, tipo_custo, descricao, valor.' });
        }
        try {
            const permissionResult = await pool.query('SELECT driver_id FROM trips WHERE id = $1', [viagem_id]);
            if (permissionResult.rowCount === 0 || permissionResult.rows[0].driver_id !== driverId) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            const result = await pool.query(
                `INSERT INTO custos (vehicle_id, viagem_id, tipo_custo, descricao, valor, foto_path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [vehicle_id, viagem_id, tipo_custo, descricao, valor, foto_path || null]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao registrar custo:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    app.post('/app/motorista/custos-avulsos', requireJwtAuth, async (req, res) => {
        const { vehicle_id, tipo_custo, descricao, valor, foto_path } = req.body;
        const driverId = req.driverId;
        if (!tipo_custo || !descricao || !valor) {
            return res.status(400).json({ error: 'Campos obrigatórios: tipo_custo, descricao, valor.' });
        }
        try {
            const permissionResult = await pool.query(
                'SELECT driver_id FROM driver_vehicles WHERE driver_id = $1 AND vehicle_id = $2',
                [driverId, vehicle_id]
            );
            if (permissionResult.rowCount === 0) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            const result = await pool.query(
                `INSERT INTO custos (vehicle_id, viagem_id, tipo_custo, descricao, valor, data_custo, foto_path)
                 VALUES ($1, NULL, $2, $3, $4, CURRENT_TIMESTAMP, $5) RETURNING *`,
                [vehicle_id, tipo_custo, descricao, valor, foto_path || null]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao registrar custo avulso:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    app.put('/app/motorista/trips/:id/finalizar', requireJwtAuth, async (req, res) => {
        const { id } = req.params;
        const { distancia_total } = req.body;
        const driverId = req.driverId;
        if (!distancia_total) {
            return res.status(400).json({ error: 'A distância total é obrigatória.' });
        }
        try {
            const permissionResult = await pool.query('SELECT driver_id FROM trips WHERE id = $1', [id]);
            if (permissionResult.rowCount === 0 || permissionResult.rows[0].driver_id !== driverId) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            const result = await pool.query(
                `UPDATE trips SET status = 'FINALIZADA', end_date = CURRENT_TIMESTAMP, distancia_total = $1 WHERE id = $2 RETURNING *`,
                [distancia_total, id]
            );
            if (result.rowCount === 0) return res.status(404).json({ error: 'Viagem não encontrada.' });
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao finalizar viagem:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    app.post('/app/motorista/refuelings', requireJwtAuth, async (req, res) => {
        const { vehicle_id, refuel_date, odometer, liters_filled, total_cost, is_full_tank, posto_nome, cidade, foto_bomba, foto_odometro, viagem_id } =
            req.body;
        const driverId = req.driverId;
        if (!vehicle_id || !refuel_date || !odometer || !liters_filled || is_full_tank === undefined) {
            return res.status(400).json({
                error: 'Campos obrigatórios: vehicle_id, refuel_date, odometer, liters_filled, is_full_tank.'
            });
        }
        const truncate = (v, max) => (typeof v === 'string' && v.length > max ? v.slice(0, max) : v);
        const safePosto = truncate(posto_nome, 255) ?? null;
        const safeCidade = truncate(cidade, 100) ?? null;
        try {
            const permissionResult = await pool.query(
                'SELECT driver_id FROM driver_vehicles WHERE driver_id = $1 AND vehicle_id = $2',
                [driverId, vehicle_id]
            );
            if (permissionResult.rowCount === 0) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            const result = await pool.query(
                `INSERT INTO refuelings (vehicle_id, driver_id, refuel_date, odometer, liters_filled, total_cost, is_full_tank,
                    posto_nome, cidade, foto_bomba, foto_odometro, viagem_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
                [
                    vehicle_id,
                    driverId,
                    refuel_date,
                    odometer,
                    liters_filled,
                    total_cost || null,
                    is_full_tank,
                    safePosto ?? null,
                    safeCidade ?? null,
                    foto_bomba || null,
                    foto_odometro || null,
                    viagem_id || null
                ]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao registrar abastecimento:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    app.get('/app/motorista/profile', requireJwtAuth, async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT d.id, d.name,
                    COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id', v.id, 'name', v.plate)) FROM driver_vehicles dv JOIN vehicles v ON dv.vehicle_id = v.id WHERE dv.driver_id = d.id), '[]'::json) as associated_vehicles
                 FROM drivers d WHERE d.id = $1`,
                [req.driverId]
            );
            if (result.rowCount === 0) return res.status(404).json({ error: 'Motorista não encontrado.' });
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    app.post('/app/motorista/upload', requireJwtAuth, upload.single('file'), (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        res.status(200).json({ filePath: `/uploads/${req.file.filename}` });
    });
}
