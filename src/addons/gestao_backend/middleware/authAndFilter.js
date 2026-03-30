import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../../traccar_wrapper/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const requireAuthAndFilter = async (req, res, next) => {
    const traccarCookieFromSession = req.session?.traccarCookie;
    const headerCookie = req.headers.cookie;

    let authCookie = traccarCookieFromSession || headerCookie;

    if (!authCookie) {
        return res.status(401).json({ error: 'Não autenticado. Faça login na plataforma de rastreamento.' });
    }

    try {
        let isAuthenticated = false;
        let userResponse;

        try {
            userResponse = await axios.get(`${process.env.TRACCAR_API_URL}/api/session`, {
                headers: { Cookie: authCookie }
            });
            isAuthenticated = true;
        } catch (cookieError) {
            if (req.session?.userEmail && req.session?.userPassword) {
                try {
                    const reAuth = await axios.post(
                        `${process.env.TRACCAR_API_URL}/api/session`,
                        new URLSearchParams({
                            email: req.session.userEmail,
                            password: req.session.userPassword
                        }),
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                    );

                    authCookie = reAuth.headers['set-cookie'];
                    req.session.traccarCookie = authCookie;

                    userResponse = await axios.get(`${process.env.TRACCAR_API_URL}/api/session`, {
                        headers: { Cookie: authCookie }
                    });
                    isAuthenticated = true;
                } catch (reauthError) {
                    // fall through
                }
            }
        }

        if (!isAuthenticated) {
            return res.status(401).json({ error: 'Sessão expirada. Por favor, faça login novamente na plataforma de rastreamento.' });
        }

        const currentUser = userResponse.data;

        req.userIsAdmin = currentUser?.administrator === true;
        req.currentUser = currentUser;
        req.headers.cookie = authCookie;

        const response = await axios.get(`${process.env.TRACCAR_API_URL}/api/devices`, {
            headers: { Cookie: authCookie }
        });
        req.traccarDevices = response.data;
        const userDeviceIds = response.data.map((device) => device.id);

        if (!pool) {
            return res.status(503).json({ error: 'Database not available.' });
        }

        if (req.userIsAdmin) {
            req.userVehicleIds = 'ALL';
            req.userDeviceIds = userDeviceIds;
        } else {
            if (!userDeviceIds || userDeviceIds.length === 0) {
                return res.status(403).json({ error: 'Nenhum veículo associado a este usuário. Contate o administrador.' });
            }

            try {
                const coreResult = await pool.query(
                    `SELECT DISTINCT vehicle_id FROM vehicle_devices WHERE device_id = ANY($1::int[])`,
                    [userDeviceIds]
                );
                const vehicleUuids = coreResult.rows.map((row) => row.vehicle_id);

                req.userVehicleIds = vehicleUuids;
                req.userDeviceIds = userDeviceIds;

                if (vehicleUuids.length === 0) {
                    return res.status(403).json({ error: 'Nenhum veículo associado a este usuário no fleet_core. Contate o administrador.' });
                }
            } catch (dbError) {
                console.error('Erro ao buscar vehicle_ids:', dbError.message);
                return res.status(503).json({ error: 'Falha ao consultar banco de veículos. Tente novamente.' });
            }
        }

        const configPath = path.resolve(__dirname, '../../../../config/user-vehicles.json');
        if (fs.existsSync(configPath)) {
            try {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const userVehicleMappings = configData.userVehicleMappings;

                if (userVehicleMappings?.[currentUser.id.toString()]) {
                    const customDeviceIds = userVehicleMappings[currentUser.id.toString()];
                    if (Array.isArray(customDeviceIds) && customDeviceIds.length > 0) {
                        try {
                            const customResult = await pool.query(
                                `SELECT DISTINCT vehicle_id FROM vehicle_devices WHERE device_id = ANY($1::int[])`,
                                [customDeviceIds]
                            );
                            const customUuids = customResult.rows.map((row) => row.vehicle_id);

                            if (req.userVehicleIds === 'ALL') {
                                req.userDeviceIds = [...new Set([...req.userDeviceIds, ...customDeviceIds])];
                            } else {
                                req.userVehicleIds = [...new Set([...req.userVehicleIds, ...customUuids])];
                                req.userDeviceIds = [...new Set([...req.userDeviceIds, ...customDeviceIds])];
                            }
                        } catch (e) {
                            console.warn('Erro ao resolver mapeamento customizado:', e.message);
                        }
                    }
                }
            } catch (configError) {
                if (!configError.message.includes('no such file')) {
                    console.warn('Erro ao carregar user-vehicles.json:', configError.message);
                }
            }
        }

        if (req.userVehicleIds !== 'ALL' && req.userVehicleIds.length === 0) {
            return res.status(403).json({ error: 'Nenhum veículo associado a este usuário. Contate o administrador.' });
        }

        next();
    } catch (error) {
        console.error('Erro no middleware authAndFilter:', error.message);
        return res.status(401).json({ error: 'Falha na sessão ou na comunicação com o Traccar. Faça login novamente.' });
    }
};
