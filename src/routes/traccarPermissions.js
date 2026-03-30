/**
 * Utilitários para sincronização de permissões no Traccar (userId <-> deviceId)
 */
import axios from 'axios';
import pool from '../addons/traccar_wrapper/db/index.js';

/**
 * Sincroniza permissões no Traccar para um usuário e os dispositivos de um veículo
 * @param {number} traccarUserId - ID do usuário no Traccar
 * @param {string} vehicleId - UUID do veículo
 */
export async function syncUserVehiclePermissions(traccarUserId, vehicleId) {
  if (!traccarUserId || !vehicleId) return;

  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;

  if (!traccarApiUrl || !traccarEmail || !traccarPassword) {
    console.warn('⚠️ Traccar API credentials not configured. Skipping permission sync.');
    return;
  }

  if (!pool) return;

  try {
    const vdRes = await pool.query(
      'SELECT device_id FROM vehicle_devices WHERE vehicle_id = $1::uuid ORDER BY is_primary DESC',
      [vehicleId]
    );
    const deviceIds = vdRes.rows.map((r) => r.device_id).filter((id) => id != null);
    if (deviceIds.length === 0) return;

    const auth = { username: traccarEmail, password: traccarPassword };
    for (const deviceId of deviceIds) {
      try {
        await axios.post(
          `${traccarApiUrl}/api/permissions`,
          { userId: traccarUserId, deviceId },
          { auth }
        );
        console.log(`✅ Permissão criada: userId=${traccarUserId}, deviceId=${deviceId}`);
      } catch (err) {
        if (err.response?.status === 409) {
          console.log(`ℹ️ Permissão já existe: userId=${traccarUserId}, deviceId=${deviceId}`);
        } else {
          console.error(`❌ Erro ao criar permissão:`, err.response?.data || err.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro ao sincronizar permissões do Traccar:', err.message);
  }
}

/**
 * Remove permissão no Traccar para um usuário e dispositivo
 * @param {number} traccarUserId - ID do usuário no Traccar
 * @param {number} deviceId - ID do dispositivo no Traccar
 */
export async function removeTraccarPermission(traccarUserId, deviceId) {
  if (!traccarUserId || !deviceId) return;

  const traccarApiUrl = process.env.TRACCAR_API_URL;
  const traccarEmail = process.env.TRACCAR_EMAIL;
  const traccarPassword = process.env.TRACCAR_PASSWORD;

  if (!traccarApiUrl || !traccarEmail || !traccarPassword) return;

  try {
    await axios.delete(`${traccarApiUrl}/api/permissions`, {
      auth: { username: traccarEmail, password: traccarPassword },
      data: { userId: traccarUserId, deviceId },
    });
    console.log(`✅ Permissão removida: userId=${traccarUserId}, deviceId=${deviceId}`);
  } catch (err) {
    if (err.response?.status !== 404) {
      console.error(`❌ Erro ao remover permissão:`, err.response?.data || err.message);
    }
  }
}
