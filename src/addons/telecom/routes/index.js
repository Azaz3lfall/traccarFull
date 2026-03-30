import axios from 'axios';
import registerChipRoutes from './chips.js';
import registerTemplateRoutes from './templates.js';
import registerBatchTemplateRoutes from './batchTemplates.js';
import registerSmsRoutes from './sms.js';
import registerVoxterRoutes from './voxter.js';

export default function registerTelecomRoutes(app, { pool, requireAuthAndFilter }) {
  registerVoxterRoutes(app, { pool, requireAuthAndFilter });

  if (!pool) {
    console.warn('⚠️ Telecom: DB pool not available, registering stub routes that return 503');
    // Stub routes para evitar 404 "Cannot POST" - retornam 503 com mensagem clara
    app.get('/gestao/telecom/sms/gateway-config', requireAuthAndFilter, (req, res) => {
      res.status(503).json({ error: 'Módulo Telecom não configurado. Verifique DATABASE_TELECOM_URL no servidor.' });
    });
    app.put('/gestao/telecom/sms/gateway-config', requireAuthAndFilter, (req, res) => {
      res.status(503).json({ error: 'Módulo Telecom não configurado. Verifique DATABASE_TELECOM_URL no servidor.' });
    });
    app.post('/gestao/telecom/sms/send', requireAuthAndFilter, (req, res) => {
      res.status(503).json({ error: 'Módulo Telecom não configurado. Verifique DATABASE_TELECOM_URL no servidor.' });
    });
    app.post('/gestao/telecom/sms/reset', requireAuthAndFilter, (req, res) => {
      res.status(503).json({ error: 'Módulo Telecom não configurado. Verifique DATABASE_TELECOM_URL no servidor.' });
    });
    app.get('/gestao/telecom/sms/history', requireAuthAndFilter, (req, res) => {
      res.status(503).json({ error: 'Módulo Telecom não configurado. Verifique DATABASE_TELECOM_URL no servidor.' });
    });
    app.get('/gestao/telecom/batch-templates', requireAuthAndFilter, (req, res) => {
      res.status(503).json({ error: 'Módulo Telecom não configurado. Verifique DATABASE_TELECOM_URL no servidor.' });
    });
    app.post('/gestao/telecom/sms/send-batch', requireAuthAndFilter, (req, res) => {
      res.status(503).json({ error: 'Módulo Telecom não configurado. Verifique DATABASE_TELECOM_URL no servidor.' });
    });
    return;
  }
  registerChipRoutes(app, { pool, requireAuthAndFilter });
  registerTemplateRoutes(app, { pool, requireAuthAndFilter });
  registerBatchTemplateRoutes(app, { pool, requireAuthAndFilter });
  registerSmsRoutes(app, { pool, requireAuthAndFilter });

  // POST /gestao/telecom/sync/devices-to-chips - sync Traccar devices (with phone) to chips
  app.post('/gestao/telecom/sync/devices-to-chips', requireAuthAndFilter, async (req, res) => {
    try {
      const authCookie = req.headers.cookie;
      const traccarUrl = process.env.TRACCAR_API_URL;
      if (!traccarUrl) {
        return res.status(503).json({ error: 'TRACCAR_API_URL não configurado.' });
      }
      const devRes = await axios.get(`${traccarUrl}/api/devices?all=true`, {
        headers: { Cookie: authCookie },
      });
      const devices = devRes.data || [];
      let created = 0;
      let updated = 0;
      for (const d of devices) {
        const phone = d.phone ? String(d.phone).trim().replace(/\D/g, '') : null;
        if (!phone || phone.length < 10) continue;
        const fullNum = phone.length >= 12 ? phone : `55${phone}`;
        const deviceId = parseInt(d.id, 10);
        const existing = await pool.query(
          'SELECT id, traccar_device_id FROM chips WHERE numero = $1 OR traccar_device_id = $2 LIMIT 1',
          [fullNum, deviceId]
        );
        if (existing.rows[0]) {
          if (existing.rows[0].traccar_device_id !== deviceId) {
            await pool.query('UPDATE chips SET traccar_device_id = $1 WHERE id = $2', [deviceId, existing.rows[0].id]);
            updated++;
          }
        } else {
          await pool.query(
            `INSERT INTO chips (numero, operadora, iccid, traccar_device_id) VALUES ($1, 'N/A', $2, $3)`,
            [fullNum, `NA-${fullNum}-${Date.now()}`, deviceId]
          );
          created++;
        }
      }
      res.json({ created, updated, total: devices.length });
    } catch (err) {
      console.error('POST /gestao/telecom/sync/devices-to-chips error:', err);
      res.status(500).json({ error: err.response?.data?.message || err.message || 'Erro na sincronização.' });
    }
  });
}
