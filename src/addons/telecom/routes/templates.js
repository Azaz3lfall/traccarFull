export default function registerTemplateRoutes(app, { pool, requireAuthAndFilter }) {
  const base = '/gestao/telecom/templates';

  // GET /gestao/telecom/templates
  app.get(base, requireAuthAndFilter, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, titulo, mensagem, tags_disponiveis FROM sms_templates ORDER BY titulo ASC'
      );
      res.json(result.rows || []);
    } catch (err) {
      console.error('GET /gestao/telecom/templates error:', err);
      res.status(500).json({ error: 'Erro ao listar templates.' });
    }
  });

  // POST /gestao/telecom/templates
  app.post(base, requireAuthAndFilter, async (req, res) => {
    try {
      const { titulo, mensagem, tags_disponiveis } = req.body;
      if (!titulo || !String(titulo).trim()) {
        return res.status(400).json({ error: 'O nome do template é obrigatório.' });
      }
      if (!mensagem || !String(mensagem).trim()) {
        return res.status(400).json({ error: 'A mensagem do template é obrigatória.' });
      }
      const result = await pool.query(
        `INSERT INTO sms_templates (titulo, mensagem, tags_disponiveis, criado_por)
         VALUES ($1, $2, $3, NULL)
         RETURNING id, titulo, mensagem, tags_disponiveis`,
        [String(titulo).trim(), String(mensagem).trim(), tags_disponiveis || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /gestao/telecom/templates error:', err);
      res.status(500).json({ error: 'Erro ao criar template.' });
    }
  });

  // PUT /gestao/telecom/templates/:id
  app.put(`${base}/:id`, requireAuthAndFilter, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { titulo, mensagem, tags_disponiveis } = req.body;
      const result = await pool.query(
        `UPDATE sms_templates SET titulo = COALESCE($1, titulo), mensagem = COALESCE($2, mensagem), tags_disponiveis = $3
         WHERE id = $4
         RETURNING id, titulo, mensagem, tags_disponiveis`,
        [titulo != null ? String(titulo).trim() : null, mensagem != null ? String(mensagem).trim() : null, tags_disponiveis ?? null, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Template não encontrado.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PUT /gestao/telecom/templates error:', err);
      res.status(500).json({ error: 'Erro ao atualizar template.' });
    }
  });

  // DELETE /gestao/telecom/templates/:id
  app.delete(`${base}/:id`, requireAuthAndFilter, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await pool.query('DELETE FROM sms_templates WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Template não encontrado.' });
      }
      res.status(204).send();
    } catch (err) {
      console.error('DELETE /gestao/telecom/templates error:', err);
      res.status(500).json({ error: 'Erro ao remover template.' });
    }
  });
}
