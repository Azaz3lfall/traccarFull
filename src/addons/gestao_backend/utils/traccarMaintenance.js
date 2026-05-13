import axios from 'axios';

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const KM_TO_METERS = 1000;

const getCookieHeader = (cookie) => {
    if (!cookie) return '';
    return Array.isArray(cookie) ? cookie.join('; ') : cookie;
};

const getClient = (cookie) => {
    const baseURL = process.env.TRACCAR_API_URL;
    if (!baseURL) {
        throw new Error('TRACCAR_API_URL não configurada.');
    }

    return axios.create({
        baseURL,
        headers: {
            Cookie: getCookieHeader(cookie)
        }
    });
};

export const buildTraccarMaintenancePayload = ({
    maintenanceTypeLabel,
    description,
    maintenanceDate,
    odometer,
    engineHours,
    durabilityValue,
    durabilityUnit
}) => {
    const parsedDurability = Number(durabilityValue);
    if (!Number.isFinite(parsedDurability) || parsedDurability <= 0) {
        return null;
    }

    const name = maintenanceTypeLabel || description || 'Manutenção';

    if (durabilityUnit === 'km') {
        const parsedOdometer = Number(odometer);
        if (!Number.isFinite(parsedOdometer) || parsedOdometer < 0) {
            throw new Error('Odômetro inválido para manutenção por km.');
        }

        return {
            name,
            type: 'totalDistance',
            start: Math.round(parsedOdometer * KM_TO_METERS),
            period: Math.round(parsedDurability * KM_TO_METERS),
            attributes: {}
        };
    }

    if (durabilityUnit === 'hours') {
        const parsedEngineHours = Number(engineHours);
        if (!Number.isFinite(parsedEngineHours) || parsedEngineHours < 0) {
            throw new Error('Horas de motor inválidas para manutenção por horas.');
        }

        return {
            name,
            type: 'hours',
            start: Math.round(parsedEngineHours * HOUR_MS),
            period: Math.round(parsedDurability * HOUR_MS),
            attributes: {}
        };
    }

    if (durabilityUnit === 'days') {
        const startTimestamp = Date.parse(maintenanceDate);
        if (!Number.isFinite(startTimestamp)) {
            throw new Error('Data da manutenção inválida para manutenção por dias.');
        }

        return {
            name,
            type: 'deviceTime',
            start: startTimestamp,
            period: Math.round(parsedDurability * DAY_MS),
            attributes: {}
        };
    }

    return null;
};

export const createTraccarMaintenance = async (cookie, payload) => {
    const client = getClient(cookie);
    const response = await client.post('/api/maintenance', payload);
    return response.data;
};

export const updateTraccarMaintenance = async (cookie, maintenanceId, payload) => {
    const client = getClient(cookie);
    const response = await client.put(`/api/maintenance/${maintenanceId}`, payload);
    return response.data;
};

export const deleteTraccarMaintenance = async (cookie, maintenanceId) => {
    const client = getClient(cookie);
    await client.delete(`/api/maintenance/${maintenanceId}`);
};

export const linkMaintenanceToDevices = async (cookie, maintenanceId, deviceIds = []) => {
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
        return;
    }

    const client = getClient(cookie);
    await Promise.all(
        deviceIds.map((deviceId) => client.post('/api/permissions', { deviceId, maintenanceId }))
    );
};
