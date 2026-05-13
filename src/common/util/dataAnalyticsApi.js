/**
 * Data Analytics: entity metadata, FK resolution, and report template persistence.
 * Templates are stored in localStorage per user (no dedicated Traccar API).
 */

const templatesStorageKey = (userId) => `dataAnalyticsTemplates:${userId}`;

const readStoredTemplates = (userId) => {
    if (userId == null) return [];
    try {
        const raw = localStorage.getItem(templatesStorageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeStoredTemplates = (userId, list) => {
    localStorage.setItem(templatesStorageKey(userId), JSON.stringify(list));
};

export async function fetchTemplates(userId) {
    const list = readStoredTemplates(userId);
    return [...list].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

export async function createTemplate(payload) {
    const userId = payload.userId;
    if (userId == null) throw new Error('createTemplate: userId is required');
    const list = readStoredTemplates(userId);
    const now = new Date().toISOString();
    const tpl = {
        ...payload,
        id: payload.id || `da_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        userId,
        updatedAt: now,
    };
    list.unshift(tpl);
    writeStoredTemplates(userId, list);
    return tpl;
}

export async function updateTemplate(userId, templateId, updates) {
    const list = readStoredTemplates(userId);
    const idx = list.findIndex((t) => String(t.id) === String(templateId));
    if (idx === -1) throw new Error('Template not found');
    const updated = {
        ...list[idx],
        ...updates,
        id: list[idx].id,
        userId: list[idx].userId ?? userId,
        updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    writeStoredTemplates(userId, list);
    return updated;
}

export async function deleteTemplate(userId, templateId) {
    const list = readStoredTemplates(userId).filter((t) => String(t.id) !== String(templateId));
    writeStoredTemplates(userId, list);
}

const f = (pairs) => pairs.map(([key, label]) => ({ key, label }));

/** Maps analytics entity type → selectable fields (key + display label). */
export const entityFieldDefinitions = {
    Devices: f([
        ['id', 'ID'], ['name', 'Name'], ['uniqueId', 'Identifier'], ['status', 'Status'],
        ['lastUpdate', 'Last update'], ['groupId', 'Group'], ['phone', 'Phone'], ['model', 'Model'],
        ['category', 'Category'], ['disabled', 'Disabled'], ['expirationTime', 'Expiration'],
    ]),
    Groups: f([
        ['id', 'ID'], ['name', 'Name'], ['attributes', 'Attributes'],
    ]),
    Users: f([
        ['id', 'ID'], ['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['readonly', 'Read only'],
        ['administrator', 'Administrator'], ['disabled', 'Disabled'],
    ]),
    Geofences: f([
        ['id', 'ID'], ['name', 'Name'], ['description', 'Description'], ['area', 'Area'], ['calendarId', 'Calendar'],
    ]),
    Commands: f([
        ['id', 'ID'], ['description', 'Description'], ['type', 'Type'], ['textChannel', 'SMS'], ['attributes', 'Attributes'],
    ]),
    Drivers: f([
        ['id', 'ID'], ['name', 'Name'], ['uniqueId', 'Unique ID'], ['attributes', 'Attributes'],
    ]),
    Maintenance: f([
        ['id', 'ID'], ['name', 'Name'], ['type', 'Type'], ['start', 'Start'], ['period', 'Period'],
    ]),
    Calendars: f([
        ['id', 'ID'], ['name', 'Name'], ['data', 'Data'],
    ]),
    Positions: f([
        ['id', 'ID'], ['deviceId', 'Device'], ['fixTime', 'Fix time'], ['serverTime', 'Server time'],
        ['latitude', 'Latitude'], ['longitude', 'Longitude'], ['altitude', 'Altitude'], ['speed', 'Speed'],
        ['course', 'Course'], ['accuracy', 'Accuracy'], ['valid', 'Valid'], ['protocol', 'Protocol'],
        ['address', 'Address'], ['type', 'Type'], ['alarm', 'Alarm'], ['distance', 'Distance'],
        ['totalDistance', 'Total distance'], ['motion', 'Motion'], ['ignition', 'Ignition'],
    ]),
    Events: f([
        ['id', 'ID'], ['deviceId', 'Device'], ['type', 'Type'], ['eventTime', 'Event time'],
        ['positionId', 'Position'], ['geofenceId', 'Geofence'], ['maintenanceId', 'Maintenance'],
        ['attributes', 'Attributes'],
    ]),
    Trips: f([
        ['deviceId', 'Device'], ['driverName', 'Driver'], ['startTime', 'Start time'], ['startAddress', 'Start address'],
        ['startLat', 'Start latitude'], ['startLon', 'Start longitude'], ['startOdometer', 'Start odometer'],
        ['endTime', 'End time'], ['endAddress', 'End address'], ['endLat', 'End latitude'], ['endLon', 'End longitude'],
        ['endOdometer', 'End odometer'], ['distance', 'Distance'], ['averageSpeed', 'Average speed'],
        ['maxSpeed', 'Max speed'], ['duration', 'Duration'], ['spentFuel', 'Spent fuel'],
    ]),
    Stops: f([
        ['deviceId', 'Device'], ['startTime', 'Start time'], ['endTime', 'End time'], ['startOdometer', 'Start odometer'],
        ['address', 'Address'], ['startLat', 'Start latitude'], ['startLon', 'Start longitude'],
        ['duration', 'Duration'], ['engineHours', 'Engine hours'], ['spentFuel', 'Spent fuel'],
    ]),
    Summary: f([
        ['deviceId', 'Device'], ['startTime', 'Start time'], ['distance', 'Distance'],
        ['startOdometer', 'Start odometer'], ['endOdometer', 'End odometer'], ['averageSpeed', 'Average speed'],
        ['maxSpeed', 'Max speed'], ['engineHours', 'Engine hours'], ['spentFuel', 'Spent fuel'],
    ]),
    Chart: f([
        ['fixTime', 'Fix time'], ['latitude', 'Latitude'], ['longitude', 'Longitude'], ['speed', 'Speed'],
        ['altitude', 'Altitude'], ['course', 'Course'], ['accuracy', 'Accuracy'], ['address', 'Address'],
    ]),
    Statistics: f([
        ['captureTime', 'Capture time'], ['activeUsers', 'Active users'], ['activeDevices', 'Active devices'],
        ['requests', 'Requests'], ['messagesReceived', 'Messages received'], ['messagesStored', 'Messages stored'],
        ['mailSent', 'Mail sent'], ['smsSent', 'SMS sent'], ['geocoderRequests', 'Geocoder requests'],
        ['geolocationRequests', 'Geolocation requests'],
    ]),
    Audit: f([
        ['actionTime', 'Action time'], ['address', 'Address'], ['userId', 'User'], ['actionType', 'Action type'],
        ['objectType', 'Object type'], ['objectId', 'Object ID'],
    ]),
    Combined: f([
        ['deviceId', 'Device'], ['fixTime', 'Fix time'], ['latitude', 'Latitude'], ['longitude', 'Longitude'],
        ['speed', 'Speed'], ['type', 'Type'], ['distance', 'Distance'], ['duration', 'Duration'],
        ['address', 'Address'], ['alarm', 'Alarm'],
    ]),
    Logs: f([
        ['time', 'Time'], ['message', 'Message'],
    ]),
    'Scheduled Reports': f([
        ['id', 'ID'], ['description', 'Description'], ['type', 'Type'], ['calendarId', 'Calendar'], ['attributes', 'Attributes'],
    ]),
};

export const entityTypeOptions = [
    'Devices', 'Groups', 'Users', 'Geofences', 'Commands', 'Drivers', 'Maintenance', 'Calendars',
    'Combined', 'Events', 'Trips', 'Stops', 'Summary', 'Chart', 'Positions', 'Statistics', 'Audit',
    'Logs', 'Scheduled Reports',
];

const FK_FIELD_TO_ENTITY = {
    deviceId: 'Devices',
    groupId: 'Groups',
    userId: 'Users',
    geofenceId: 'Geofences',
    calendarId: 'Calendars',
    driverId: 'Drivers',
    maintenanceId: 'Maintenance',
    commandId: 'Commands',
    positionId: 'Positions',
};

/**
 * @param {string|{ key?: string }} field Field key or field definition object
 * @returns {string|null} Cached entity list key used for FK label resolution, or null
 */
export function resolveFKEntityType(field) {
    const key = typeof field === 'string' ? field : field?.key;
    if (!key) return null;
    return FK_FIELD_TO_ENTITY[key] || null;
}
