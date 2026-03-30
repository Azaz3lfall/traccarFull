export default function registerBatchTemplateRoutes(app, { pool, requireAuthAndFilter }) {
  const base = '/gestao/telecom/batch-templates';

  // GET /gestao/telecom/batch-templates
  app.get(base, requireAuthAndFilter, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, nome, template_ids, delay_entre_sms, criado_em FROM sms_batch_templates ORDER BY nome ASC'
      );
      res.json(result.rows || []);
    } catch (err) {
      console.error('GET /gestao/telecom/batch-templates error:', err);
      res.status(500).json({ error: 'Erro ao listar configurações em lote.' });
    }
  });

  // POST /gestao/telecom/batch-templates
  app.post(base, requireAuthAndFilter, async (req, res) => {
    try {
      const { nome, template_ids, delay_entre_sms } = req.body;
      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ error: 'O nome da configuração é obrigatório.' });
      }
      const ids = Array.isArray(template_ids) ? template_ids : [];
      if (ids.length === 0) {
        return res.status(400).json({ error: 'Selecione pelo menos um template.' });
      }
      const validIds = ids.map((x) => parseInt(x, 10)).filter((x) => !Number.isNaN(x) && x > 0);
      if (validIds.length === 0) {
        return res.status(400).json({ error: 'IDs de templates inválidos.' });
      }
      const delay = delay_entre_sms != null ? Math.max(0, parseInt(delay_entre_sms, 10)) : 0;

      const result = await pool.query(
        `INSERT INTO sms_batch_templates (nome, template_ids, delay_entre_sms)
         VALUES ($1, $2, $3)
         RETURNING id, nome, template_ids, delay_entre_sms, criado_em`,
        [String(nome).trim(), validIds, delay]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /gestao/telecom/batch-templates error:', err);
      res.status(500).json({ error: 'Erro ao criar configuração em lote.' });
    }
  });

  // PUT /gestao/telecom/batch-templates/:id
  app.put(`${base}/:id`, requireAuthAndFilter, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { nome, template_ids, delay_entre_sms } = req.body;
      const ids = Array.isArray(template_ids) ? template_ids : [];
      if (ids.length === 0 && template_ids !== undefined) {
        return res.status(400).json({ error: 'Selecione pelo menos um template.' });
      }
      const validIds = ids.length > 0
        ? ids.map((x) => parseInt(x, 10)).filter((x) => !Number.isNaN(x) && x > 0)
        : null;
      const delay = delay_entre_sms != null ? Math.max(0, parseInt(delay_entre_sms, 10)) : null;

      const updateParts = [];
      const params = [];
      let idx = 1;
      if (nome != null) {
        updateParts.push(`nome = $${idx}`);
        params.push(String(nome).trim());
        idx++;
      }
      if (validIds !== null) {
        updateParts.push(`template_ids = $${idx}`);
        params.push(validIds);
        idx++;
      }
      if (delay !== null) {
        updateParts.push(`delay_entre_sms = $${idx}`);
        params.push(delay);
        idx++;
      }
      if (updateParts.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
      }
      params.push(id);
      const result = await pool.query(
        `UPDATE sms_batch_templates SET ${updateParts.join(', ')} WHERE id = $${idx}
         RETURNING id, nome, template_ids, delay_entre_sms, criado_em`,
        params
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PUT /gestao/telecom/batch-templates error:', err);
      res.status(500).json({ error: 'Erro ao atualizar configuração.' });
    }
  });

  // DELETE /gestao/telecom/batch-templates/:id
  app.delete(`${base}/:id`, requireAuthAndFilter, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await pool.query('DELETE FROM sms_batch_templates WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada.' });
      }
      res.status(204).send();
    } catch (err) {
      console.error('DELETE /gestao/telecom/batch-templates error:', err);
      res.status(500).json({ error: 'Erro ao remover configuração.' });
    }
  });
}
