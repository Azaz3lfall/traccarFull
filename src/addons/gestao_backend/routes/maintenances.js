import { send500 } from '../utils/errorResponse.js';
import {
    buildTraccarMaintenancePayload,
    createTraccarMaintenance,
    updateTraccarMaintenance,
    deleteTraccarMaintenance,
    linkMaintenanceToDevices
} from '../utils/traccarMaintenance.js';

const MAINTENANCE_TYPE_LABELS = {
    oil: 'Troca de Óleo',
    tire: 'Troca de Pneu',
    belt: 'Troca de Correia',
    battery: 'Troca de Bateria',
    filter: 'Troca de Filtro',
    brake: 'Freio',
    revision: 'Revisão',
    other: 'Outros'
};

const parseNullableNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

export default function registerMaintenanceRoutes(app, { pool, requireAuthAndFilter }) {
    const ensureMaintenancesColumns = async () => {
        await pool.query(`ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS maintenance_type VARCHAR(32)`);
        await pool.query(`ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS durability_value NUMERIC(12,2)`);
        await pool.query(`ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS durability_unit VARCHAR(8)`);
        await pool.query(`ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS engine_hours NUMERIC(12,2)`);
        await pool.query(`ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS traccar_maintenance_id INTEGER`);
    };

    const getVehicleDeviceIds = async (vehicleId) => {
        const devicesRes = await pool.query(
            `SELECT device_id FROM vehicle_devices WHERE vehicle_id = $1::uuid AND device_id IS NOT NULL`,
            [vehicleId]
        );
        return devicesRes.rows.map((row) => row.device_id).filter((id) => id != null);
    };

    const syncMaintenanceToTraccar = async (cookie, maintenanceRow) => {
        const payload = buildTraccarMaintenancePayload({
            maintenanceTypeLabel: MAINTENANCE_TYPE_LABELS[maintenanceRow.maintenance_type],
            description: maintenanceRow.description,
            maintenanceDate: maintenanceRow.maintenance_date,
            odometer: maintenanceRow.odometer,
            engineHours: maintenanceRow.engine_hours,
            durabilityValue: maintenanceRow.durability_value,
            durabilityUnit: maintenanceRow.durability_unit
        });

        if (!payload) {
            return { traccarMaintenanceId: null };
        }

        const deviceIds = await getVehicleDeviceIds(maintenanceRow.vehicle_id);
        if (deviceIds.length === 0) {
            return { warning: 'Veículo sem device vinculado em vehicle_devices. Manutenção criada apenas localmente.' };
        }

        if (maintenanceRow.traccar_maintenance_id) {
            await updateTraccarMaintenance(cookie, maintenanceRow.traccar_maintenance_id, payload);
            return { traccarMaintenanceId: maintenanceRow.traccar_maintenance_id };
        }

        const created = await createTraccarMaintenance(cookie, payload);
        await linkMaintenanceToDevices(cookie, created.id, deviceIds);
        return { traccarMaintenanceId: created.id };
    };

    ensureMaintenancesColumns().catch((error) => {
        console.error('Erro ao garantir colunas de maintenances:', error);
    });

    app.get('/gestao/maintenances', requireAuthAndFilter, async (req, res) => {
        const { vehicle_id } = req.query;
        try {
            let query = `
                SELECT m.id, m.vehicle_id, m.maintenance_date, m.description, m.cost, m.maintenance_type, m.durability_value, m.durability_unit, m.odometer, m.engine_hours, m.provider_name, m.foto_path, m.traccar_maintenance_id, COALESCE(v.nickname, v.plate, v.model, 'Veículo') as vehicle_name
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
        const {
            vehicle_id,
            maintenance_date,
            description,
            cost,
            maintenance_type,
            durability_value,
            durability_unit,
            odometer,
            engine_hours,
            provider_name,
            foto_path
        } = req.body;
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

        const warnings = [];
        try {
            const result = await pool.query(
                `INSERT INTO maintenances (
                    vehicle_id, maintenance_date, description, cost, maintenance_type, durability_value,
                    durability_unit, odometer, engine_hours, provider_name, foto_path
                )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [
                    vehicle_id,
                    maintenance_date,
                    description,
                    cost,
                    maintenance_type || 'other',
                    parseNullableNumber(durability_value),
                    durability_unit || null,
                    parseNullableNumber(odometer),
                    parseNullableNumber(engine_hours),
                    provider_name || null,
                    foto_path || null
                ]
            );

            let createdRow = result.rows[0];

            try {
                const syncResult = await syncMaintenanceToTraccar(req.headers.cookie, createdRow);
                if (syncResult.warning) {
                    warnings.push(syncResult.warning);
                } else if (syncResult.traccarMaintenanceId) {
                    const updated = await pool.query(
                        `UPDATE maintenances SET traccar_maintenance_id = $1 WHERE id = $2 RETURNING *`,
                        [syncResult.traccarMaintenanceId, createdRow.id]
                    );
                    createdRow = updated.rows[0];
                }
            } catch (syncError) {
                warnings.push(`Falha ao sincronizar manutenção no Traccar: ${syncError.message}`);
            }

            const payload = warnings.length > 0 ? { ...createdRow, warnings } : createdRow;
            res.status(201).json(payload);
        } catch (error) {
            console.error('Erro ao registrar manutenção:', error);
            send500(res, 'Erro interno ao registrar manutenção.', error);
        }
    });

    app.put('/gestao/maintenances/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        const {
            vehicle_id,
            maintenance_date,
            description,
            cost,
            maintenance_type,
            durability_value,
            durability_unit,
            odometer,
            engine_hours,
            provider_name,
            foto_path
        } = req.body;
        const warnings = [];
        try {
            const checkQuery = await pool.query('SELECT * FROM maintenances WHERE id = $1', [id]);
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
                    cost = $4, maintenance_type = COALESCE($5, maintenance_type), durability_value = $6, durability_unit = $7,
                    odometer = $8, engine_hours = $9, provider_name = $10, foto_path = $11 WHERE id = $12 RETURNING *`,
                [
                    vehicle_id || null,
                    maintenance_date,
                    description,
                    cost,
                    maintenance_type || null,
                    parseNullableNumber(durability_value),
                    durability_unit || null,
                    parseNullableNumber(odometer),
                    parseNullableNumber(engine_hours),
                    provider_name || null,
                    foto_path || null,
                    id
                ]
            );
            let updatedRow = result.rows[0];

            try {
                const syncResult = await syncMaintenanceToTraccar(req.headers.cookie, updatedRow);
                if (syncResult.warning) {
                    warnings.push(syncResult.warning);
                } else if (
                    syncResult.traccarMaintenanceId &&
                    syncResult.traccarMaintenanceId !== updatedRow.traccar_maintenance_id
                ) {
                    const stored = await pool.query(
                        `UPDATE maintenances SET traccar_maintenance_id = $1 WHERE id = $2 RETURNING *`,
                        [syncResult.traccarMaintenanceId, updatedRow.id]
                    );
                    updatedRow = stored.rows[0];
                }
            } catch (syncError) {
                warnings.push(`Falha ao sincronizar manutenção no Traccar: ${syncError.message}`);
            }

            const payload = warnings.length > 0 ? { ...updatedRow, warnings } : updatedRow;
            res.status(200).json(payload);
        } catch (error) {
            console.error('Erro ao atualizar manutenção:', error);
            send500(res, 'Erro interno ao atualizar manutenção.', error);
        }
    });

    app.delete('/gestao/maintenances/:id', requireAuthAndFilter, async (req, res) => {
        const { id } = req.params;
        try {
            const checkQuery = await pool.query('SELECT vehicle_id, traccar_maintenance_id FROM maintenances WHERE id = $1', [id]);
            if (checkQuery.rowCount === 0) return res.status(404).json({ error: 'Manutenção não encontrada.' });
            const existing = checkQuery.rows[0];
            if (
                !req.userIsAdmin &&
                !(req.userVehicleIds === 'ALL' || (Array.isArray(req.userVehicleIds) && req.userVehicleIds.includes(existing.vehicle_id)))
            ) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }

            if (existing.traccar_maintenance_id) {
                try {
                    await deleteTraccarMaintenance(req.headers.cookie, existing.traccar_maintenance_id);
                } catch (syncError) {
                    console.warn(`Falha ao excluir manutenção ${existing.traccar_maintenance_id} no Traccar:`, syncError.message);
                }
            }

            await pool.query('DELETE FROM maintenances WHERE id = $1', [id]);
            res.status(200).json({ message: 'Manutenção excluída com sucesso.' });
        } catch (error) {
            console.error('Erro ao excluir manutenção:', error);
            send500(res, 'Erro interno ao excluir manutenção.', error);
        }
    });
}
