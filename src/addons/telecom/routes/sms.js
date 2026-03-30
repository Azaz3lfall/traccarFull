import { sendSms as sendSmsContele } from '../services/comteleSms.js';
import { sendSms as sendSmsVoxter, listSimcards, resetSimcard } from '../services/voxterApi.js';
import { getGatewayConfig, maskSecret } from '../services/gatewayConfig.js';

/**
 * Voxter envia SMS apenas para chips Claro e Emnify (conforme doc da API).
 * Comtele envia SMS para as demais operadoras (Algar, Vivo, etc.).
 */
function isVoxterSmsSupported(operadora) {
  if (!operadora) return false;
  const op = String(operadora).toLowerCase();
  return op.includes('emnify') || op.includes('claro');
}

/**
 * Verifica se o simcard da Voxter (objeto com company/company_connected) suporta SMS.
 * A API Voxter aceita SMS apenas para operadoras Claro e Emnify.
 */
function isVoxterSimcardSmsSupported(simcard) {
  if (!simcard) return false;
  const company = String(simcard.company || '').toLowerCase();
  const companyConnected = String(simcard.company_connected || '').toLowerCase();
  return company.includes('emnify') || company.includes('claro')
    || companyConnected.includes('emnify') || companyConnected.includes('claro');
}

/**
 * Fallback: quando operadora é N/A ou chip não encontrado, consulta Voxter.
 * Retorna o simcard match se existir e suportar SMS (Claro/Emnify), ou null.
 */
async function getVoxterSimcardForSms(fullNum, voxterCreds = null) {
  try {
    const searchNum = fullNum.replace(/\D/g, '');
    const result = await listSimcards(1, searchNum, voxterCreds);
    const match = (result.data || []).find(
      (s) => String(s.line || '').replace(/\D/g, '') === searchNum
        || String(s.iccid || '').includes(searchNum)
    );
    if (!match || !isVoxterSimcardSmsSupported(match)) return null;
    return match;
  } catch {
    return null;
  }
}

function isVoxterResetSupported(operadora) {
  if (!operadora) return false;
  const op = String(operadora).toLowerCase();
  return op.includes('emnify') || op.includes('algar') || op.includes('claro') || op.includes('vivo') || op.includes('nlt') || op.includes('links');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendSingleSms(pool, fullNum, msg, deviceId, gatewayConfig = null) {
  const config = gatewayConfig || (pool ? await getGatewayConfig(pool) : null);
  const comteleApiKey = config?.comtele?.apiKey || process.env.COMTELE_API_KEY;
  const voxterCreds = config?.voxter;

  let chipId = null;
  let operadora = null;
  if (pool) {
    if (deviceId) {
      const chipRes = await pool.query(
        'SELECT id, operadora FROM chips WHERE traccar_device_id = $1 LIMIT 1',
        [parseInt(deviceId, 10)]
      );
      if (chipRes.rows[0]) {
        chipId = chipRes.rows[0].id;
        operadora = chipRes.rows[0].operadora;
      }
    }
    if (!operadora) {
      const chipRes = await pool.query(
        'SELECT id, operadora FROM chips WHERE numero = $1 LIMIT 1',
        [fullNum]
      );
      if (chipRes.rows[0]) {
        chipId = chipRes.rows[0].id;
        operadora = chipRes.rows[0].operadora;
      }
    }
  }

  let useVoxter = isVoxterSmsSupported(operadora);
  if (!useVoxter && (!operadora || String(operadora).toLowerCase() === 'n/a')) {
    const voxterSim = await getVoxterSimcardForSms(fullNum, voxterCreds);
    if (voxterSim) {
      useVoxter = true;
      if (pool && chipId) {
        const op = (voxterSim.company || voxterSim.company_connected || 'Emnify').split('-')[0].trim();
        await pool.query('UPDATE chips SET operadora = $1 WHERE id = $2', [op || 'Emnify', chipId]);
      }
    }
  }
  let result;

  if (useVoxter) {
    const hasVoxter = (voxterCreds?.email && voxterCreds?.password && voxterCreds?.accessToken)
      || (process.env.VOXTER_EMAIL && process.env.VOXTER_PASSWORD && process.env.VOXTER_ACCESS_TOKEN);
    if (!hasVoxter) {
      throw new Error('API Voxter não configurada. Configure no painel ou em VOXTER_EMAIL, VOXTER_PASSWORD e VOXTER_ACCESS_TOKEN.');
    }
    result = await sendSmsVoxter(fullNum, msg, voxterCreds);
    result.requestUniqueId = null;
  } else {
    if (!comteleApiKey) {
      throw new Error('API Comtele não configurada. Configure no painel ou defina COMTELE_API_KEY no servidor.');
    }
    result = await sendSmsContele(fullNum, msg, comteleApiKey);
  }

  const statusEntrega = result.success ? 'SUCESSO' : 'ERRO';
  const gateway = useVoxter ? 'Voxter' : 'Comtele';

  if (pool) {
    await pool.query(
      `INSERT INTO sms_logs (usuario_id, chip_id, numero_destino, mensagem_corpo, status_entrega, gateway, referencia_externa_id, erro_mensagem)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [null, chipId, fullNum, msg, statusEntrega, gateway, result.requestUniqueId, result.success ? null : (result.message || 'Erro desconhecido')]
    );
  }

  return { success: result.success, message: result.message };
}

export default function registerSmsRoutes(app, { pool, requireAuthAndFilter }) {
  const base = '/gestao/telecom/sms';

  const requireAdmin = (req, res, next) => {
    if (!req.userIsAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem alterar as credenciais dos gateways.' });
    }
    next();
  };

  // GET /gestao/telecom/sms/gateway-config - Credenciais mascaradas (admin)
  app.get(`${base}/gateway-config`, requireAuthAndFilter, requireAdmin, async (req, res) => {
    try {
      const config = await getGatewayConfig(pool);
      res.json({
        comtele: {
          apiKeyMasked: maskSecret(config.comtele.apiKey),
          configured: !!(config.comtele.apiKey && config.comtele.apiKey.trim()),
        },
        voxter: {
          email: config.voxter.email ? maskSecret(config.voxter.email) : '',
          passwordMasked: maskSecret(config.voxter.password),
          accessTokenMasked: maskSecret(config.voxter.accessToken),
          baseUrl: config.voxter.baseUrl || '',
          configured: !!(config.voxter.email && config.voxter.password && config.voxter.accessToken),
        },
      });
    } catch (err) {
      console.error('GET /gestao/telecom/sms/gateway-config error:', err);
      res.status(500).json({ error: err.message || 'Erro ao carregar configuração.' });
    }
  });

  // PUT /gestao/telecom/sms/gateway-config - Salva credenciais (admin)
  app.put(`${base}/gateway-config`, requireAuthAndFilter, requireAdmin, async (req, res) => {
    try {
      const {
        comteleApiKey,
        voxterEmail,
        voxterPassword,
        voxterAccessToken,
        voxterBaseUrl,
      } = req.body || {};

      await pool.query(
        `INSERT INTO sms_gateway_config (id, comtele_api_key, voxter_email, voxter_password, voxter_access_token, voxter_base_url, updated_at)
         VALUES (1, $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           comtele_api_key = COALESCE(NULLIF(TRIM($1), ''), sms_gateway_config.comtele_api_key),
           voxter_email = COALESCE(NULLIF(TRIM($2), ''), sms_gateway_config.voxter_email),
           voxter_password = COALESCE(NULLIF(TRIM($3), ''), sms_gateway_config.voxter_password),
           voxter_access_token = COALESCE(NULLIF(TRIM($4), ''), sms_gateway_config.voxter_access_token),
           voxter_base_url = COALESCE(NULLIF(TRIM($5), ''), sms_gateway_config.voxter_base_url),
           updated_at = CURRENT_TIMESTAMP`,
        [
          comteleApiKey != null ? String(comteleApiKey) : null,
          voxterEmail != null ? String(voxterEmail) : null,
          voxterPassword != null ? String(voxterPassword) : null,
          voxterAccessToken != null ? String(voxterAccessToken) : null,
          voxterBaseUrl != null ? String(voxterBaseUrl).trim() : null,
        ]
      );

      res.json({ success: true, message: 'Credenciais atualizadas. As alterações já estão em vigor.' });
    } catch (err) {
      console.error('PUT /gestao/telecom/sms/gateway-config error:', err);
      if (err.message?.includes('sms_gateway_config')) {
        return res.status(503).json({
          error: 'Tabela sms_gateway_config não existe. Execute: psql -d gestao_telecom -f scripts/gestao_telecom_gateway_config.sql',
        });
      }
      res.status(500).json({ error: err.message || 'Erro ao salvar configuração.' });
    }
  });

  // POST /gestao/telecom/sms/send
  app.post(`${base}/send`, requireAuthAndFilter, async (req, res) => {
    try {
      const { numero, mensagem, deviceId } = req.body;
      const num = numero ? String(numero).trim().replace(/\D/g, '') : '';
      if (!num || num.length < 10) {
        return res.status(400).json({ error: 'Número de destino inválido.' });
      }
      const msg = mensagem ? String(mensagem).trim() : '';
      if (!msg) {
        return res.status(400).json({ error: 'A mensagem é obrigatória.' });
      }
      const fullNum = num.length >= 12 ? num : `55${num}`;
      const gatewayConfig = await getGatewayConfig(pool);

      const result = await sendSingleSms(pool, fullNum, msg, deviceId ? parseInt(deviceId, 10) : null, gatewayConfig);
      res.json({
        success: result.success,
        message: result.message,
      });
    } catch (err) {
      const msg = err.message || 'Erro ao enviar SMS.';
      console.error('POST /gestao/telecom/sms/send error:', msg, err.stack || '');
      res.status(500).json({
        error: msg,
        hint: !process.env.COMTELE_API_KEY && !process.env.VOXTER_ACCESS_TOKEN
          ? 'Configure COMTELE_API_KEY ou VOXTER_* no .env do servidor e reinicie o backend.'
          : undefined,
      });
    }
  });

  // POST /gestao/telecom/sms/send-batch - Envia sequência de SMS de uma configuração em lote
  app.post(`${base}/send-batch`, requireAuthAndFilter, async (req, res) => {
    try {
      const { numero, deviceId, batchTemplateId } = req.body;
      const num = numero ? String(numero).trim().replace(/\D/g, '') : '';
      const devId = deviceId != null ? parseInt(deviceId, 10) : null;

      let fullNum = num;
      if (!fullNum && devId && pool) {
        const chipRes = await pool.query(
          'SELECT numero FROM chips WHERE traccar_device_id = $1 LIMIT 1',
          [devId]
        );
        if (chipRes.rows[0]?.numero) {
          fullNum = String(chipRes.rows[0].numero).replace(/\D/g, '');
          if (fullNum.length < 12) fullNum = `55${fullNum}`;
        }
      }
      if (!fullNum || fullNum.length < 10) {
        return res.status(400).json({ error: 'Número de destino inválido. Informe numero ou deviceId com chip associado.' });
      }
      if (fullNum.length < 12) fullNum = `55${fullNum}`;

      const batchId = parseInt(batchTemplateId, 10);
      if (Number.isNaN(batchId) || batchId < 1) {
        return res.status(400).json({ error: 'Configuração em lote inválida.' });
      }

      const batchRes = await pool.query(
        'SELECT id, nome, template_ids, delay_entre_sms FROM sms_batch_templates WHERE id = $1',
        [batchId]
      );
      const batch = batchRes.rows[0];
      if (!batch) {
        return res.status(404).json({ error: 'Configuração em lote não encontrada.' });
      }

      const templateIds = Array.isArray(batch.template_ids) ? batch.template_ids : [];
      if (templateIds.length === 0) {
        return res.status(400).json({ error: 'Configuração em lote vazia.' });
      }

      const templatesRes = await pool.query(
        'SELECT id, titulo, mensagem FROM sms_templates WHERE id = ANY($1::int[])',
        [templateIds]
      );
      const templatesMap = {};
      templatesRes.rows.forEach((t) => { templatesMap[t.id] = t; });

      const messages = [];
      for (const tid of templateIds) {
        const t = templatesMap[tid];
        if (t?.mensagem) messages.push({ titulo: t.titulo, mensagem: t.mensagem });
      }

      if (messages.length === 0) {
        return res.status(400).json({ error: 'Nenhum template válido na configuração.' });
      }

      const delayMs = (batch.delay_entre_sms || 0) * 1000;
      const gatewayConfig = await getGatewayConfig(pool);
      const results = [];

      for (let i = 0; i < messages.length; i++) {
        const { titulo, mensagem } = messages[i];
        try {
          const r = await sendSingleSms(pool, fullNum, mensagem, devId, gatewayConfig);
          results.push({ index: i + 1, titulo, success: r.success, message: r.message });
        } catch (err) {
          results.push({ index: i + 1, titulo, success: false, message: err.message || 'Erro ao enviar' });
        }
        if (i < messages.length - 1 && delayMs > 0) {
          await sleep(delayMs);
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      res.json({
        success: errorCount === 0,
        total: results.length,
        successCount,
        errorCount,
        results,
      });
    } catch (err) {
      console.error('POST /gestao/telecom/sms/send-batch error:', err);
      res.status(500).json({ error: err.message || 'Erro ao enviar SMS em lote.' });
    }
  });

  // GET /gestao/telecom/sms/history
  app.get(`${base}/history`, requireAuthAndFilter, async (req, res) => {
    try {
      const { month, year, search, page = 1, limit = 20 } = req.query;
      const now = new Date();
      const y = year ? parseInt(year, 10) : now.getFullYear();
      const m = month ? parseInt(month, 10) : now.getMonth() + 1;
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59);

      let whereClause = 'WHERE data_envio >= $1 AND data_envio <= $2';
      const params = [startDate, endDate];
      if (search && String(search).trim()) {
        params.push(`%${String(search).trim()}%`);
        whereClause += ` AND (numero_destino ILIKE $${params.length} OR mensagem_corpo ILIKE $${params.length})`;
      }

      const countRes = await pool.query(
        `SELECT COUNT(*) as total FROM sms_logs ${whereClause}`,
        params
      );
      const total = parseInt(countRes.rows[0]?.total || 0, 10);

      const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
      const limitVal = Math.min(100, Math.max(1, parseInt(limit, 10)));

      const dataRes = await pool.query(
        `SELECT id, data_envio, numero_destino, mensagem_corpo, status_entrega, gateway, erro_mensagem
         FROM sms_logs ${whereClause}
         ORDER BY data_envio DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitVal, offset]
      );

      res.json({
        data: dataRes.rows,
        total,
        page: Math.max(1, parseInt(page, 10)),
        limit: limitVal,
      });
    } catch (err) {
      console.error('GET /gestao/telecom/sms/history error:', err);
      res.status(500).json({ error: 'Erro ao listar histórico de SMS.' });
    }
  });

  // POST /gestao/telecom/sms/reset - Reset de simcard (chip Voxter) por deviceId
  app.post(`${base}/reset`, requireAuthAndFilter, async (req, res) => {
    try {
      const { deviceId } = req.body;
      const devId = deviceId != null ? parseInt(deviceId, 10) : null;
      if (!devId) {
        return res.status(400).json({ error: 'deviceId é obrigatório.' });
      }
      if (!pool) {
        return res.status(503).json({ error: 'Banco de dados não configurado.' });
      }
      const chipRes = await pool.query(
        'SELECT id, numero, operadora FROM chips WHERE traccar_device_id = $1 LIMIT 1',
        [devId]
      );
      const chip = chipRes.rows[0];
      if (!chip) {
        return res.status(404).json({ error: 'Nenhum chip associado a este dispositivo.' });
      }
      if (!isVoxterResetSupported(chip.operadora)) {
        return res.status(400).json({ error: `Reset não suportado para operadora ${chip.operadora || 'N/A'}. Apenas chips Emnify, Algar, Claro, Vivo M2M, NLT e Links Field.` });
      }
      const fullNum = (chip.numero || '').replace(/\D/g, '');
      const searchNum = fullNum.length >= 12 ? fullNum : `55${fullNum}`;
      const config = await getGatewayConfig(pool);
      const voxterCreds = config?.voxter;
      const listResult = await listSimcards(1, searchNum, voxterCreds);
      const match = (listResult.data || []).find(
        (s) => String(s.line || '').replace(/\D/g, '') === searchNum.replace(/\D/g, '')
      );
      if (!match?.id) {
        return res.status(404).json({ error: 'Simcard não encontrado na plataforma Voxter.' });
      }
      const result = await resetSimcard(match.id, voxterCreds);
      res.json({ success: result.success, message: result.message });
    } catch (err) {
      console.error('POST /gestao/telecom/sms/reset error:', err);
      res.status(err.message?.includes('obrigatórios') ? 503 : 500).json({
        error: err.message || 'Erro ao resetar simcard.',
      });
    }
  });
}
