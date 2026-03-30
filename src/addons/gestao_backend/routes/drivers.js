import axios from 'axios';
import bcrypt from 'bcrypt';
import { send500 } from '../utils/errorResponse.js';

export default function registerDriverRoutes(app, { pool, requireAuthAndFilter }) {
    app.get('/gestao/drivers/association-stats', requireAuthAndFilter, async (req, res) => {
        const traccarCookie = req.headers.cookie;
        const isAdmin = req.userIsAdmin;
        try {
            let permittedDriverIds = [];
            if (!isAdmin) {
                try {
                    const traccarResponse = await axios.get(`${process.env.TRACCAR_API_URL}/api/drivers`, {
                        headers: { Cookie: traccarCookie }
                    });
                    permittedDriverIds = traccarResponse.data.map((d) => d.id);
                } catch (traccarErr) {
                    return res.json({
                        totalDrivers: 0,
                        autoAssociationDrivers: 0,
                        manualAssociationDrivers: 0,
                        pendingSync: 0,
                        lastGlobalSync: null
                    });
                }
            }
            let statsQuery = `
                SELECT COUNT(*) as total_drivers,
                    COUNT(CASE WHEN association_type = 'auto' THEN 1 END) as auto_association_drivers,
                    COUNT(CASE WHEN association_type = 'manual' THEN 1 END) as manual_association_drivers,
                    COUNT(CASE WHEN association_type = 'auto' AND (last_sync IS NULL OR last_sync < NOW() - INTERVAL '1 hour') THEN 1 END) as pending_sync,
                    MAX(last_sync) as last_global_sync
                FROM drivers
            `;
            const params = [];
            if (!isAdmin && permittedDriverIds.length > 0) {
                statsQuery += ` WHERE id = ANY($1)`;
                params.push(permittedDriverIds);
            } else if (!isAdmin) {
                return res.json({
                    totalDrivers: 0,
                    autoAssociationDrivers: 0,
                    manualAssociationDrivers: 0,
                    pendingSync: 0,
                    lastGlobalSync: null
                });
            }
            const result = await pool.query(statsQuery, params);
            const stats = result.rows[0];
            res.json({
                totalDrivers: parseInt(stats.total_drivers) || 0,
                autoAssociationDrivers: parseInt(stats.auto_association_drivers) || 0,
                manualAssociationDrivers: parseInt(stats.manual_association_drivers) || 0,
                pendingSync: parseInt(stats.pending_sync) || 0,
                lastGlobalSync: stats.last_global_sync
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: 'Erro interno ao buscar estatísticas.' });
        }
    });

    app.get('/gestao/drivers/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        try {
            const query = `
                SELECT d.id, d.name, d.cpf, d.cnh_number, d.cnh_category, d.cnh_validity, d.phone, du.username, d.unique_id AS "uniqueId",
                    d.traccar_user_id, d.association_type, d.last_sync
                FROM drivers d
                LEFT JOIN driver_users du ON d.id = du.driver_id
                WHERE d.id = $1;
            `;
            const result = await pool.query(query, [id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Motorista não encontrado.' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar motorista:', error);
            res.status(500).json({ error: 'Erro interno ao buscar motorista.' });
        }
    });

    app.get('/gestao/drivers', requireAuthAndFilter, async (req, res) => {
        const traccarCookie = req.headers.cookie;
        const isAdmin = req.userIsAdmin;
        try {
            let permittedDriverIds = [];
            if (!isAdmin) {
                try {
                    const traccarResponse = await axios.get(`${process.env.TRACCAR_API_URL}/api/drivers`, {
                        headers: { Cookie: traccarCookie }
                    });
                    permittedDriverIds = traccarResponse.data.map((d) => d.id);
                } catch (traccarErr) {
                    return res.json([]);
                }
            }
            let query = `
                SELECT d.id, d.name, d.cpf, d.cnh_number, d.cnh_category, d.cnh_validity, d.phone, du.username,
                    d.unique_id AS "uniqueId", d.traccar_user_id, d.association_type, d.last_sync, d.status,
                    (SELECT COUNT(*) FROM driver_vehicles dv WHERE dv.driver_id = d.id) as vehicle_count
                FROM drivers d
                LEFT JOIN driver_users du ON d.id = du.driver_id
            `;
            const params = [];
            if (!isAdmin && permittedDriverIds.length > 0) {
                query += ` WHERE d.unique_id = ANY($1::int[])`;
                params.push(permittedDriverIds);
            } else if (!isAdmin) {
                return res.json([]);
            }
            query += ` ORDER BY d.name ASC;`;
            const result = await pool.query(query, params);
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar motoristas:', error);
            send500(res, 'Erro interno ao buscar motoristas.', error);
        }
    });

    app.delete('/api/drivers/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE refuelings SET driver_id = NULL WHERE driver_id = $1', [id]);
            await client.query('DELETE FROM driver_users WHERE driver_id = $1', [id]);
            await client.query('DELETE FROM driver_vehicles WHERE driver_id = $1', [id]);
            const result = await client.query('DELETE FROM drivers WHERE id = $1 RETURNING *', [id]);
            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Motorista não encontrado no SGF.' });
            }
            if (req.headers.cookie) {
                try {
                    await axios.delete(`${process.env.TRACCAR_API_URL}/api/drivers/${id}`, {
                        headers: { Cookie: req.headers.cookie }
                    });
                } catch (traccarError) {
                    console.warn('Falha ao excluir motorista do Traccar:', traccarError.message);
                }
            }
            await client.query('COMMIT');
            res.status(204).json({ message: 'Motorista excluído com sucesso.' });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao excluir motorista:', error);
            res.status(500).json({ error: 'Erro interno ao excluir motorista.' });
        } finally {
            client.release();
        }
    });

    app.delete('/gestao/drivers/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE refuelings SET driver_id = NULL WHERE driver_id = $1', [id]);
            await client.query('DELETE FROM driver_users WHERE driver_id = $1', [id]);
            await client.query('DELETE FROM driver_vehicles WHERE driver_id = $1', [id]);
            const result = await client.query('DELETE FROM drivers WHERE id = $1 RETURNING *', [id]);
            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Motorista não encontrado no SGF.' });
            }
            if (req.headers.cookie) {
                try {
                    await axios.delete(`${process.env.TRACCAR_API_URL}/api/drivers/${id}`, {
                        headers: { Cookie: req.headers.cookie }
                    });
                } catch (traccarError) {
                    console.warn('Falha ao excluir motorista do Traccar:', traccarError.message);
                }
            }
            await client.query('COMMIT');
            res.status(204).json({ message: 'Motorista excluído com sucesso.' });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao excluir motorista:', error);
            res.status(500).json({ error: 'Erro interno ao excluir motorista.' });
        } finally {
            client.release();
        }
    });

    app.get('/gestao/auth/user', requireAuthAndFilter, (req, res) => {
        const currentUser = req.currentUser;
        if (currentUser) {
            return res.json({
                user: {
                    id: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                    administrator: currentUser.administrator
                }
            });
        }
        res.status(401).json({ user: null });
    });

    const syncAssociations = async (req, res) => {
        const traccarCookie = req.headers.cookie;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const driversResult = await client.query(`
                SELECT d.id, d.traccar_user_id, d.association_type FROM drivers d
                WHERE d.association_type = 'auto' AND d.traccar_user_id IS NOT NULL
            `);
            let syncedAssociations = 0;
            let createdAssociations = 0;
            let removedAssociations = 0;
            for (const driver of driversResult.rows) {
                try {
                    let traccarVehicleIds = [];
                    try {
                        const devicesByDriverResponse = await axios.get(
                            `${process.env.TRACCAR_API_URL}/api/devices`,
                            { headers: { Cookie: traccarCookie }, params: { driverId: driver.traccar_user_id } }
                        );
                        traccarVehicleIds = [...new Set((devicesByDriverResponse.data || []).map((v) => v.id))];
                        const devicesByUserResponse = await axios.get(
                            `${process.env.TRACCAR_API_URL}/api/devices`,
                            { headers: { Cookie: traccarCookie }, params: { userId: driver.traccar_user_id } }
                        );
                        traccarVehicleIds = [...new Set([...traccarVehicleIds, ...(devicesByUserResponse.data || []).map((v) => v.id)])];
                    } catch (traccarErr) {
                        throw traccarErr;
                    }
                    const currentAssociations = await client.query(
                        'SELECT vehicle_id FROM driver_vehicles WHERE driver_id = $1',
                        [driver.id]
                    );
                    const currentVehicleIds = currentAssociations.rows.map((r) => r.vehicle_id);
                    const toAdd = traccarVehicleIds.filter((id) => !currentVehicleIds.includes(id));
                    const toRemove = currentVehicleIds.filter((id) => !traccarVehicleIds.includes(id));
                    for (const vehicleId of toAdd) {
                        await client.query(
                            'INSERT INTO driver_vehicles (driver_id, vehicle_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                            [driver.id, vehicleId]
                        );
                        await client.query(
                            `INSERT INTO sync_logs (entity_type, entity_id, action, details) VALUES ('association', $1, 'create', $2)`,
                            [driver.id, JSON.stringify({ driver_id: driver.id, vehicle_id: vehicleId })]
                        );
                        createdAssociations++;
                    }
                    for (const vehicleId of toRemove) {
                        await client.query('DELETE FROM driver_vehicles WHERE driver_id = $1 AND vehicle_id = $2', [
                            driver.id,
                            vehicleId
                        ]);
                        await client.query(
                            `INSERT INTO sync_logs (entity_type, entity_id, action, details) VALUES ('association', $1, 'delete', $2)`,
                            [driver.id, JSON.stringify({ driver_id: driver.id, vehicle_id: vehicleId })]
                        );
                        removedAssociations++;
                    }
                    await client.query('UPDATE drivers SET last_sync = NOW() WHERE id = $1', [driver.id]);
                    syncedAssociations++;
                } catch (driverError) {
                    await client.query(
                        `INSERT INTO sync_logs (entity_type, entity_id, action, success, error_message) VALUES ('association', $1, 'sync', FALSE, $2)`,
                        [driver.id, driverError.message]
                    );
                }
            }
            await client.query('COMMIT');
            res.json({
                message: 'Sincronização de associações concluída',
                synced_drivers: syncedAssociations,
                created_associations: createdAssociations,
                removed_associations: removedAssociations
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao sincronizar associações:', error);
            res.status(500).json({ error: 'Erro interno ao sincronizar associações.' });
        } finally {
            client.release();
        }
    };

    app.post('/gestao/drivers/sync-associations', requireAuthAndFilter, syncAssociations);

    app.put('/gestao/drivers/:id/association-type', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { association_type, traccar_user_id } = req.body;
        if (!association_type || !['auto', 'manual'].includes(association_type)) {
            return res.status(400).json({ error: 'Tipo de associação deve ser "auto" ou "manual".' });
        }
        if (association_type === 'auto' && !traccar_user_id) {
            return res.status(400).json({ error: 'traccar_user_id é obrigatório para associação automática.' });
        }
        try {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const result = await client.query(
                    `UPDATE drivers SET association_type = $1, traccar_user_id = $2,
                        last_sync = CASE WHEN $1 = 'auto' THEN NULL ELSE last_sync END
                    WHERE id = $3 RETURNING *`,
                    [association_type, traccar_user_id || null, id]
                );
                if (result.rowCount === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: 'Motorista não encontrado.' });
                }
                await client.query(
                    `INSERT INTO sync_logs (entity_type, entity_id, action, details) VALUES ('driver', $1, 'update', $2)`,
                    [id, JSON.stringify({ association_type, traccar_user_id })]
                );
                await client.query('COMMIT');
                res.json({ message: 'Tipo de associação atualizado com sucesso.', driver: result.rows[0] });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Erro ao alterar tipo de associação:', error);
            res.status(500).json({ error: 'Erro interno ao alterar tipo de associação.' });
        }
    });

    app.post('/gestao/drivers/:id/sync', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const traccarCookie = req.headers.cookie;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const driverResult = await client.query(
                'SELECT id, traccar_user_id, association_type FROM drivers WHERE id = $1',
                [id]
            );
            if (driverResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Motorista não encontrado.' });
            }
            const driver = driverResult.rows[0];
            if (driver.association_type !== 'auto' || !driver.traccar_user_id) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Motorista não está configurado para sincronização automática.' });
            }
            let traccarVehicleIds = [];
            try {
                const devicesByDriverResponse = await axios.get(
                    `${process.env.TRACCAR_API_URL}/api/devices`,
                    { headers: { Cookie: traccarCookie }, params: { driverId: driver.traccar_user_id } }
                );
                traccarVehicleIds = [...new Set((devicesByDriverResponse.data || []).map((v) => v.id))];
                const devicesByUserResponse = await axios.get(
                    `${process.env.TRACCAR_API_URL}/api/devices`,
                    { headers: { Cookie: traccarCookie }, params: { userId: driver.traccar_user_id } }
                );
                traccarVehicleIds = [...new Set([...traccarVehicleIds, ...(devicesByUserResponse.data || []).map((v) => v.id)])];
            } catch (traccarErr) {
                await client.query('ROLLBACK');
                throw new Error('Falha ao comunicar com a API do Traccar');
            }
            const currentAssociations = await client.query(
                'SELECT vehicle_id FROM driver_vehicles WHERE driver_id = $1',
                [driver.id]
            );
            const currentVehicleIds = currentAssociations.rows.map((r) => r.vehicle_id);
            const toAdd = traccarVehicleIds.filter((vid) => !currentVehicleIds.includes(vid));
            const toRemove = currentVehicleIds.filter((vid) => !traccarVehicleIds.includes(vid));
            let createdAssociations = 0;
            let removedAssociations = 0;
            for (const vehicleId of toAdd) {
                await client.query(
                    'INSERT INTO driver_vehicles (driver_id, vehicle_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [driver.id, vehicleId]
                );
                createdAssociations++;
            }
            for (const vehicleId of toRemove) {
                await client.query('DELETE FROM driver_vehicles WHERE driver_id = $1 AND vehicle_id = $2', [
                    driver.id,
                    vehicleId
                ]);
                removedAssociations++;
            }
            await client.query('UPDATE drivers SET last_sync = NOW() WHERE id = $1', [driver.id]);
            await client.query(
                `INSERT INTO sync_logs (entity_type, entity_id, action, details) VALUES ('driver', $1, 'sync', $2)`,
                [id, JSON.stringify({ created: createdAssociations, removed: removedAssociations, traccar_vehicles: traccarVehicleIds })]
            );
            await client.query('COMMIT');
            res.json({
                message: 'Sincronização concluída',
                created_associations: createdAssociations,
                removed_associations: removedAssociations
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao sincronizar motorista:', error);
            res.status(500).json({ error: 'Erro interno ao sincronizar motorista.' });
        } finally {
            client.release();
        }
    });

    app.post('/gestao/drivers', requireAuthAndFilter, async (req, res) => {
        const {
            name,
            uniqueId,
            cpf,
            cnh_number,
            cnh_category,
            cnh_validity,
            phone,
            username,
            password,
            traccar_id
        } = req.body;
        if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });
        if (!username || !password) return res.status(400).json({ error: 'Username e senha são obrigatórios.' });
        const traccarCookie = req.headers.cookie;
        let driverId = traccar_id;
        let driverStatus = 'active';
        let traccarError = null;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            if (!driverId) {
                try {
                    const traccarResponse = await axios.post(
                        `${process.env.TRACCAR_API_URL}/api/drivers`,
                        { name, uniqueId: uniqueId || `driver_${Date.now()}` },
                        { headers: { Cookie: traccarCookie, 'Content-Type': 'application/json' } }
                    );
                    driverId = traccarResponse.data.id;
                } catch (traccarErr) {
                    traccarError = traccarErr;
                    const maxIdResult = await client.query(
                        'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM drivers'
                    );
                    driverId = (maxIdResult.rows[0]?.next_id || 1) + 1000000;
                    driverStatus = 'pending_traccar_error';
                }
            }
            if (cpf) {
                const cpfCheck = await client.query('SELECT id FROM drivers WHERE cpf = $1 AND id != $2', [cpf, driverId]);
                if (cpfCheck.rowCount > 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'CPF já cadastrado para outro motorista.' });
                }
            }
            if (cnh_number) {
                const cnhCheck = await client.query(
                    'SELECT id FROM drivers WHERE cnh_number = $1 AND id != $2',
                    [cnh_number, driverId]
                );
                if (cnhCheck.rowCount > 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'CNH já cadastrada para outro motorista.' });
                }
            }
            const usernameCheck = await client.query('SELECT driver_id FROM driver_users WHERE username = $1', [username]);
            if (usernameCheck.rowCount > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Nome de usuário já existe.' });
            }
            const driverQuery = `
                INSERT INTO drivers (id, name, cpf, cnh_number, cnh_category, cnh_validity, phone, unique_id, association_type, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual', $9)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, cpf = EXCLUDED.cpf, cnh_number = EXCLUDED.cnh_number,
                    cnh_category = EXCLUDED.cnh_category, cnh_validity = EXCLUDED.cnh_validity, phone = EXCLUDED.phone,
                    unique_id = EXCLUDED.unique_id, status = EXCLUDED.status
                RETURNING id, name, cpf, cnh_number, cnh_category, cnh_validity, phone, unique_id, association_type, status;
            `;
            const driverResult = await client.query(driverQuery, [
                driverId,
                name,
                cpf || null,
                cnh_number || null,
                cnh_category || null,
                cnh_validity || null,
                phone || null,
                uniqueId || null,
                driverStatus
            ]);
            const passwordHash = await bcrypt.hash(password, 10);
            await client.query(
                `INSERT INTO driver_users (username, password_hash, driver_id, is_active)
                 VALUES ($1, $2, $3, TRUE)
                 ON CONFLICT (driver_id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, is_active = TRUE`,
                [username, passwordHash, driverId]
            );
            await client.query('COMMIT');
            const createdDriver = driverResult.rows[0];
            const driverData = {
                id: createdDriver.id,
                name: createdDriver.name,
                cpf: createdDriver.cpf,
                cnh_number: createdDriver.cnh_number,
                cnh_category: createdDriver.cnh_category,
                cnh_validity: createdDriver.cnh_validity,
                phone: createdDriver.phone,
                unique_id: createdDriver.unique_id,
                association_type: createdDriver.association_type,
                status: createdDriver.status,
                username,
                traccar_id: driverStatus === 'active' ? driverId : null
            };
            if (driverStatus === 'pending_traccar_error') {
                res.status(201).json({
                    ...driverData,
                    warning: 'Motorista criado no SGF, mas houve erro ao criar no Traccar.'
                });
            } else {
                res.status(201).json(driverData);
            }
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao cadastrar motorista:', error);
            if (error.code === '23505') {
                if (error.constraint === 'drivers_cpf_key') return res.status(400).json({ error: 'CPF já cadastrado.' });
                if (error.constraint === 'drivers_cnh_number_key')
                    return res.status(400).json({ error: 'CNH já cadastrada.' });
                if (error.constraint === 'driver_users_username_key')
                    return res.status(400).json({ error: 'Nome de usuário já existe.' });
            }
            res.status(500).json({ error: 'Erro interno ao cadastrar motorista: ' + error.message });
        } finally {
            client.release();
        }
    });

    app.put('/gestao/drivers/:id/complete', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { cpf, cnh_number, cnh_category, username, password } = req.body;
        if (!cpf || !cnh_number || !cnh_category || !username || !password || password.length < 6) {
            return res.status(400).json({ error: 'Campos obrigatórios: cpf, cnh_number, cnh_category, username, password (min 6 caracteres).' });
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const driverCheck = await client.query('SELECT id, status FROM drivers WHERE id = $1', [id]);
            if (driverCheck.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Motorista não encontrado.' });
            }
            const driver = driverCheck.rows[0];
            if (driver.status !== 'pending' && driver.status !== 'pending_traccar_error') {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Este motorista já está com cadastro completo.' });
            }
            const cpfCheck = await client.query('SELECT id FROM drivers WHERE cpf = $1 AND id != $2', [cpf, id]);
            if (cpfCheck.rowCount > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'CPF já cadastrado para outro motorista.' });
            }
            const cnhCheck = await client.query(
                'SELECT id FROM drivers WHERE cnh_number = $1 AND id != $2',
                [cnh_number, id]
            );
            if (cnhCheck.rowCount > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'CNH já cadastrada para outro motorista.' });
            }
            const usernameCheck = await client.query(
                'SELECT driver_id FROM driver_users WHERE username = $1 AND driver_id != $2',
                [username, id]
            );
            if (usernameCheck.rowCount > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Nome de usuário já existe.' });
            }
            await client.query(
                `UPDATE drivers SET cpf = $1, cnh_number = $2, cnh_category = $3, status = 'active' WHERE id = $4 RETURNING *`,
                [cpf, cnh_number, cnh_category, id]
            );
            const passwordHash = await bcrypt.hash(password, 10);
            await client.query(
                `INSERT INTO driver_users (username, password_hash, driver_id, is_active)
                 VALUES ($1, $2, $3, TRUE)
                 ON CONFLICT (driver_id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, is_active = TRUE`,
                [username, passwordHash, id]
            );
            await client.query('COMMIT');
            const driverResult = await client.query(
                'SELECT d.*, du.username FROM drivers d LEFT JOIN driver_users du ON d.id = du.driver_id WHERE d.id = $1',
                [id]
            );
            res.status(200).json(driverResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao completar cadastro:', error);
            res.status(500).json({ error: 'Erro interno ao completar cadastro: ' + error.message });
        } finally {
            client.release();
        }
    });

    app.post('/gestao/drivers/:id/create-user', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
        }
        try {
            const driverExists = await pool.query('SELECT id FROM drivers WHERE id = $1', [id]);
            if (driverExists.rowCount === 0) return res.status(404).json({ error: 'Motorista não encontrado.' });
            const userExists = await pool.query('SELECT driver_id FROM driver_users WHERE driver_id = $1', [id]);
            if (userExists.rowCount > 0) return res.status(409).json({ error: 'Já existe uma conta de usuário para este motorista.' });
            const passwordHash = await bcrypt.hash(password, 10);
            await pool.query(
                'INSERT INTO driver_users (username, password_hash, driver_id) VALUES ($1, $2, $3)',
                [username, passwordHash, id]
            );
            res.status(201).json({ message: 'Conta de usuário criada com sucesso!' });
        } catch (error) {
            console.error('Erro ao criar conta:', error);
            if (error.code === '23505' && error.constraint === 'driver_users_username_key') {
                return res.status(400).json({ error: 'Nome de usuário já existe.' });
            }
            res.status(500).json({ error: 'Erro interno ao criar conta de usuário.' });
        }
    });

    app.put('/gestao/drivers/:id/vehicles', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { vehicle_ids } = req.body;
        if (!Array.isArray(vehicle_ids)) return res.status(400).json({ error: 'vehicle_ids deve ser um array.' });
        const isAdmin = req.userIsAdmin;
        if (!isAdmin && req.userVehicleIds !== 'ALL') {
            const allowed = Array.isArray(req.userVehicleIds) ? req.userVehicleIds : [];
            const invalid = vehicle_ids.filter((uuid) => !allowed.includes(uuid));
            if (invalid.length > 0) {
                return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para associar um ou mais desses veículos.' });
            }
        }
        try {
            const client = await pool.connect();
            await client.query('BEGIN');
            await client.query('DELETE FROM driver_vehicles WHERE driver_id = $1', [id]);
            for (const vehicleId of vehicle_ids) {
                await client.query(
                    'INSERT INTO driver_vehicles (driver_id, vehicle_id) VALUES ($1, $2::uuid) ON CONFLICT DO NOTHING',
                    [id, vehicleId]
                );
            }
            await client.query('COMMIT');
            res.status(200).json({ message: 'Associações de veículos atualizadas com sucesso.' });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao associar veículos:', error);
            res.status(500).json({ error: 'Erro interno ao associar veículos.' });
        } finally {
            client.release();
        }
    });

    app.get('/gestao/drivers/:id/vehicles', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(
                `SELECT v.id, v.name FROM vehicles v
                 JOIN driver_vehicles dv ON v.id = dv.vehicle_id
                 WHERE dv.driver_id = $1 ORDER BY v.name ASC`,
                [id]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar veículos do motorista:', error);
            res.status(500).json({ error: 'Erro interno ao buscar veículos do motorista.' });
        }
    });

    app.put('/gestao/drivers/:id/password', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { new_password } = req.body;
        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
        }
        try {
            const userResult = await pool.query('SELECT driver_id FROM driver_users WHERE driver_id = $1', [id]);
            if (userResult.rowCount === 0) {
                return res.status(404).json({ error: 'Motorista não encontrado ou sem credenciais de login.' });
            }
            const passwordHash = await bcrypt.hash(new_password, 10);
            await pool.query('UPDATE driver_users SET password_hash = $1 WHERE driver_id = $2', [passwordHash, id]);
            res.status(200).json({ message: 'Senha atualizada com sucesso.' });
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar senha.' });
        }
    });

    app.put('/gestao/drivers/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const { name, cpf, cnh_number, cnh_category, cnh_validity, phone, username, password } = req.body;
        if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const driverResult = await client.query(
                `UPDATE drivers SET name = $1, cpf = $2, cnh_number = $3, cnh_category = $4, cnh_validity = $5, phone = $6 WHERE id = $7 RETURNING *`,
                [name, cpf, cnh_number, cnh_category, cnh_validity, phone, id]
            );
            if (driverResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Motorista não encontrado.' });
            }
            if (username) {
                try {
                    await client.query('UPDATE driver_users SET username = $1 WHERE driver_id = $2', [username, id]);
                } catch (err) {
                    if (err.code === '23505' && err.constraint === 'driver_users_username_key') {
                        await client.query('ROLLBACK');
                        return res.status(400).json({ error: 'Nome de usuário já existe.' });
                    }
                    throw err;
                }
            }
            if (password) {
                const passwordHash = await bcrypt.hash(password, 10);
                await client.query('UPDATE driver_users SET password_hash = $1 WHERE driver_id = $2', [
                    passwordHash,
                    id
                ]);
            }
            await client.query('COMMIT');
            const updated = await pool.query(
                `SELECT d.id, d.name, d.cpf, d.cnh_number, d.cnh_category, d.cnh_validity, d.phone, du.username, d.unique_id AS "uniqueId"
                 FROM drivers d LEFT JOIN driver_users du ON d.id = du.driver_id WHERE d.id = $1`,
                [id]
            );
            res.status(200).json(updated.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao atualizar motorista:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar motorista.' });
        } finally {
            client.release();
        }
    });

    app.post('/gestao/drivers/sync', requireAuthAndFilter, async (req, res) => {
        const traccarCookie = req.headers.cookie;
        let client;
        try {
            const traccarResponse = await axios.get(`${process.env.TRACCAR_API_URL}/api/drivers`, {
                headers: { Cookie: traccarCookie }
            });
            const traccarDrivers = traccarResponse.data;
            const traccarDriverIds = traccarDrivers.map((d) => d.id);
            client = await pool.connect();
            await client.query('BEGIN');
            let newDriversCount = 0;
            let updatedDriversCount = 0;
            let removedDriversCount = 0;
            for (const driver of traccarDrivers) {
                const checkResult = await client.query('SELECT id FROM drivers WHERE id = $1', [driver.id]);
                if (checkResult.rowCount === 0) {
                    await client.query(
                        `INSERT INTO drivers (id, name, unique_id, status) VALUES ($1, $2, $3, 'pending')`,
                        [driver.id, driver.name, driver.uniqueId]
                    );
                    newDriversCount++;
                } else {
                    await client.query('UPDATE drivers SET name = $1, unique_id = $2 WHERE id = $3', [
                        driver.name,
                        driver.uniqueId,
                        driver.id
                    ]);
                    updatedDriversCount++;
                }
            }
            if (req.userIsAdmin) {
                const existingResult = await client.query('SELECT id FROM drivers');
                const existingDriverIds = existingResult.rows.map((r) => r.id);
                const driversToRemove = existingDriverIds.filter((id) => !traccarDriverIds.includes(id));
                for (const driverIdToRemove of driversToRemove) {
                    await client.query('UPDATE refuelings SET driver_id = NULL WHERE driver_id = $1', [driverIdToRemove]);
                    await client.query('DELETE FROM driver_users WHERE driver_id = $1', [driverIdToRemove]);
                    await client.query('DELETE FROM driver_vehicles WHERE driver_id = $1', [driverIdToRemove]);
                    await client.query('DELETE FROM drivers WHERE id = $1', [driverIdToRemove]);
                    removedDriversCount++;
                }
            }
            await client.query('COMMIT');
            res.status(200).json({
                message: 'Sincronização de motoristas concluída!',
                new_drivers: newDriversCount,
                updated_drivers: updatedDriversCount,
                removed_drivers: removedDriversCount,
                total_traccar: traccarDrivers.length
            });
        } catch (error) {
            if (client) await client.query('ROLLBACK');
            console.error('Erro ao sincronizar motoristas:', error);
            res.status(500).json({ error: 'Erro interno ao sincronizar motoristas do Traccar.' });
        } finally {
            if (client) client.release();
        }
    });
}
