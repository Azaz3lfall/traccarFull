export default function registerSyncRoutes(app, { pool, requireAuthAndFilter }) {
    app.get('/gestao/drivers/:id/history', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        try {
            const result = await pool.query(
                `SELECT * FROM association_history WHERE driver_id = $1 ORDER BY changed_at DESC LIMIT $2 OFFSET $3`,
                [id, limit, offset]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            res.status(500).json({ error: 'Erro ao buscar histórico.' });
        }
    });

    app.get('/gestao/association-history', requireAuthAndFilter, async (req, res) => {
        const { driver_id, vehicle_id, action, days = 30, limit = 100, offset = 0 } = req.query;
        try {
            const params = [];
            let paramCount = 0;
            let query = `SELECT * FROM association_history WHERE changed_at >= NOW() - INTERVAL '${parseInt(days)} days'`;
            if (driver_id) {
                paramCount++;
                query += ` AND driver_id = $${paramCount}`;
                params.push(driver_id);
            }
            if (vehicle_id) {
                paramCount++;
                query += ` AND vehicle_id = $${paramCount}`;
                params.push(vehicle_id);
            }
            if (action) {
                paramCount++;
                query += ` AND action = $${paramCount}`;
                params.push(action);
            }
            paramCount++;
            query += ` ORDER BY changed_at DESC LIMIT $${paramCount}`;
            params.push(limit);
            paramCount++;
            query += ` OFFSET $${paramCount}`;
            params.push(offset);
            const result = await pool.query(query, params);
            const countResult = await pool.query(
                `SELECT COUNT(*) as total FROM association_history WHERE changed_at >= NOW() - INTERVAL '${parseInt(days)} days'`
            );
            res.json({
                history: result.rows,
                total: parseInt(countResult.rows[0]?.total) || 0,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            res.status(500).json({ error: 'Erro ao buscar histórico.' });
        }
    });

    app.get('/gestao/sync-schedule', requireAuthAndFilter, async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM sync_schedule WHERE id = 1');
            res.json(result.rows[0] || {});
        } catch (error) {
            console.error('Erro ao buscar configuração:', error);
            res.status(500).json({ error: 'Erro ao buscar configuração.' });
        }
    });

    app.put('/gestao/sync-schedule', requireAuthAndFilter, async (req, res) => {
        const { enabled, interval_minutes } = req.body;
        if (interval_minutes < 5 || interval_minutes > 1440) {
            return res.status(400).json({
                error: 'Intervalo deve estar entre 5 e 1440 minutos.'
            });
        }
        const next_run = enabled ? new Date(Date.now() + interval_minutes * 60 * 1000) : null;
        try {
            const result = await pool.query(
                `UPDATE sync_schedule SET enabled = $1, interval_minutes = $2, next_run = $3, updated_at = NOW() WHERE id = 1 RETURNING *`,
                [enabled, interval_minutes, next_run]
            );
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao atualizar configuração:', error);
            res.status(500).json({ error: 'Erro ao atualizar configuração.' });
        }
    });

    app.post('/gestao/sync-schedule/run-now', requireAuthAndFilter, async (req, res) => {
        res.status(200).json({ message: 'Execução manual não implementada neste momento.' });
    });

    app.get('/gestao/scheduled-sync-logs', requireAuthAndFilter, async (req, res) => {
        const { limit = 20, offset = 0 } = req.query;
        try {
            const result = await pool.query(
                'SELECT * FROM scheduled_sync_logs ORDER BY started_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
            res.status(500).json({ error: 'Erro ao buscar logs.' });
        }
    });
}
