import { listSimcards, sendSms, resetSimcard } from '../services/voxterApi.js';
import { getGatewayConfig } from '../services/gatewayConfig.js';

function voxterHttpStatus(err) {
  if (err.message?.includes('obrigatórios')) return 503;
  if (err.isVoxterDown) return 503;
  if (err.voxterStatus >= 400 && err.voxterStatus < 500) return 401;
  return 500;
}

export default function registerVoxterRoutes(app, { pool, requireAuthAndFilter }) {
  const base = '/gestao/telecom/voxter';

  // GET /gestao/telecom/voxter/simcards - Lista simcards da plataforma Voxter
  app.get(`${base}/simcards`, requireAuthAndFilter, async (req, res) => {
    try {
      const config = pool ? await getGatewayConfig(pool) : null;
      const voxterCreds = config?.voxter;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const search = req.query.search ? String(req.query.search).trim() : '';
      const result = await listSimcards(page, search, voxterCreds);
      res.json(result);
    } catch (err) {
      console.error('GET /gestao/telecom/voxter/simcards error:', err.message);
      res.status(voxterHttpStatus(err)).json({
        error: err.message || 'Erro ao listar simcards Voxter.',
      });
    }
  });

  // POST /gestao/telecom/voxter/simcards/sms - Envia SMS (apenas chips Emnify/Claro)
  app.post(`${base}/simcards/sms`, requireAuthAndFilter, async (req, res) => {
    try {
      const config = pool ? await getGatewayConfig(pool) : null;
      const voxterCreds = config?.voxter;
      const { line, payload } = req.body || {};
      const lineNum = line != null ? String(line).replace(/\D/g, '') : '';
      const msg = payload ? String(payload).trim() : '';
      if (!lineNum || lineNum.length < 10) {
        return res.status(400).json({ error: 'Linha inválida.' });
      }
      if (!msg) {
        return res.status(400).json({ error: 'A mensagem é obrigatória.' });
      }
      const fullLine = lineNum.length >= 12 ? lineNum : `55${lineNum}`;
      const result = await sendSms(fullLine, msg, voxterCreds);
      res.json({ success: result.success, message: result.message });
    } catch (err) {
      console.error('POST /gestao/telecom/voxter/simcards/sms error:', err.message);
      res.status(voxterHttpStatus(err)).json({
        error: err.message || 'Erro ao enviar SMS.',
      });
    }
  });

  // POST /gestao/telecom/voxter/simcards/:id/reset - Reset de linha
  app.post(`${base}/simcards/:id/reset`, requireAuthAndFilter, async (req, res) => {
    try {
      const config = pool ? await getGatewayConfig(pool) : null;
      const voxterCreds = config?.voxter;
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: 'ID do simcard é obrigatório.' });
      }
      const result = await resetSimcard(id, voxterCreds);
      res.json({ success: result.success, message: result.message });
    } catch (err) {
      console.error('POST /gestao/telecom/voxter/simcards/:id/reset error:', err.message);
      res.status(voxterHttpStatus(err)).json({
        error: err.message || 'Erro ao resetar linha.',
      });
    }
  });
}
