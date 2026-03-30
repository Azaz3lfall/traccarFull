export default function registerChipRoutes(app, { pool, requireAuthAndFilter }) {
  const base = '/gestao/telecom/chips';

  // GET /gestao/telecom/chips - list chips (paginated, sortable, search)
  app.get(base, requireAuthAndFilter, async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = 'id', order = 'asc', search = '' } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
      const limitVal = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const orderDir = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      const sortCol = ['id', 'codigo_referencia', 'broker', 'operadora', 'numero', 'iccid', 'status', 'mbytes_plano', 'valor_custo'].includes(sort) ? sort : 'id';

      let whereClause = '';
      const params = [];
      if (search && String(search).trim()) {
        const term = `%${String(search).trim()}%`;
        whereClause = ' WHERE (numero ILIKE $1 OR operadora ILIKE $1 OR iccid ILIKE $1 OR broker ILIKE $1)';
        params.push(term);
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM chips${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total || 0, 10);

      const dataResult = await pool.query(
        `SELECT id, codigo_referencia, broker, operadora, numero, iccid, valor_custo, mbytes_plano, status, traccar_device_id, data_cadastro
         FROM chips${whereClause}
         ORDER BY ${sortCol} ${orderDir}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitVal, offset]
      );

      res.json({
        data: dataResult.rows,
        total,
        page: Math.max(1, parseInt(page, 10)),
        limit: limitVal,
      });
    } catch (err) {
      console.error('GET /gestao/telecom/chips error:', err);
      res.status(500).json({ error: 'Erro ao listar chips.' });
    }
  });

  // GET /gestao/telecom/chips/available - chips not associated or associated with deviceId
  app.get(`${base}/available`, requireAuthAndFilter, async (req, res) => {
    try {
      const { deviceId } = req.query;
      let query;
      const params = [];
      if (deviceId) {
        params.push(parseInt(deviceId, 10));
        query = 'SELECT id, numero, operadora, iccid, status FROM chips WHERE traccar_device_id IS NULL OR traccar_device_id = $1 ORDER BY numero ASC';
      } else {
        query = 'SELECT id, numero, operadora, iccid, status FROM chips WHERE traccar_device_id IS NULL ORDER BY numero ASC';
      }
      const result = await pool.query(query, params);
      res.json(result.rows || []);
    } catch (err) {
      console.error('GET /gestao/telecom/chips/available error:', err);
      res.status(500).json({ error: 'Erro ao listar chips disponíveis.' });
    }
  });

  // GET /gestao/telecom/chips/by-device/:deviceId
  app.get(`${base}/by-device/:deviceId`, requireAuthAndFilter, async (req, res) => {
    try {
      const deviceId = parseInt(req.params.deviceId, 10);
      const result = await pool.query(
        'SELECT id, numero, operadora, iccid, status FROM chips WHERE traccar_device_id = $1 LIMIT 1',
        [deviceId]
      );
      res.json(result.rows[0] || null);
    } catch (err) {
      console.error('GET /gestao/telecom/chips/by-device error:', err);
      res.status(500).json({ error: 'Erro ao buscar chip do dispositivo.' });
    }
  });

  // POST /gestao/telecom/chips - create chip (only numero required)
  app.post(base, requireAuthAndFilter, async (req, res) => {
    try {
      const { numero, operadora, iccid, broker, valor_custo, mbytes_plano, status } = req.body;
      if (!numero || !String(numero).trim()) {
        return res.status(400).json({ error: 'O número da linha é obrigatório.' });
      }
      const num = String(numero).trim();
      const op = operadora != null ? String(operadora).trim() : 'N/A';
      const ic = iccid != null ? String(iccid).trim() : `NA-${num}-${Date.now()}`;
      const result = await pool.query(
        `INSERT INTO chips (numero, operadora, iccid, broker, valor_custo, mbytes_plano, status)
         VALUES ($1, $2, $3, $4, COALESCE($5::decimal, 0), COALESCE($6::int, 20), COALESCE($7, 'ATIVO'))
         RETURNING id, codigo_referencia, broker, operadora, numero, iccid, valor_custo, mbytes_plano, status, traccar_device_id, data_cadastro`,
        [num, op, ic, broker || null, valor_custo, mbytes_plano, status]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Já existe um chip com este número ou ICCID.' });
      }
      console.error('POST /gestao/telecom/chips error:', err);
      res.status(500).json({ error: 'Erro ao criar chip.' });
    }
  });

  // PUT /gestao/telecom/chips/:id - update chip (including traccar_device_id)
  app.put(`${base}/:id`, requireAuthAndFilter, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { numero, operadora, iccid, broker, valor_custo, mbytes_plano, status, traccar_device_id } = req.body;
      const updates = [];
      const values = [];
      let idx = 1;
      if (numero != null) { updates.push(`numero = $${idx++}`); values.push(String(numero).trim()); }
      if (operadora != null) { updates.push(`operadora = $${idx++}`); values.push(String(operadora).trim()); }
      if (iccid != null) { updates.push(`iccid = $${idx++}`); values.push(String(iccid).trim()); }
      if (broker !== undefined) { updates.push(`broker = $${idx++}`); values.push(broker || null); }
      if (valor_custo != null) { updates.push(`valor_custo = $${idx++}`); values.push(valor_custo); }
      if (mbytes_plano != null) { updates.push(`mbytes_plano = $${idx++}`); values.push(mbytes_plano); }
      if (status != null) { updates.push(`status = $${idx++}`); values.push(status); }
      if (traccar_device_id !== undefined) { updates.push(`traccar_device_id = $${idx++}`); values.push(traccar_device_id ? parseInt(traccar_device_id, 10) : null); }
      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
      }
      values.push(id);
      const result = await pool.query(
        `UPDATE chips SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, codigo_referencia, broker, operadora, numero, iccid, valor_custo, mbytes_plano, status, traccar_device_id, data_cadastro`,
        values
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Chip não encontrado.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Já existe um chip com este número ou ICCID.' });
      }
      console.error('PUT /gestao/telecom/chips error:', err);
      res.status(500).json({ error: 'Erro ao atualizar chip.' });
    }
  });

  // DELETE /gestao/telecom/chips/:id
  app.delete(`${base}/:id`, requireAuthAndFilter, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await pool.query('DELETE FROM chips WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Chip não encontrado.' });
      }
      res.status(204).send();
    } catch (err) {
      console.error('DELETE /gestao/telecom/chips error:', err);
      res.status(500).json({ error: 'Erro ao remover chip.' });
    }
  });

  // POST /gestao/telecom/chips/batch - batch create (CSV)
  app.post(`${base}/batch`, requireAuthAndFilter, async (req, res) => {
    try {
      const { rows } = req.body; // array of { numero, operadora?, iccid?, broker?, mbytes_plano?, valor_custo? }
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Envie um array de chips (rows).' });
      }
      const created = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const num = r?.numero ? String(r.numero).trim() : null;
        if (!num) continue;
        const op = r?.operadora ? String(r.operadora).trim() : 'N/A';
        const ic = r?.iccid ? String(r.iccid).trim() : `NA-${num}-${i}-${Date.now()}`;
        try {
          const ins = await pool.query(
            `INSERT INTO chips (numero, operadora, iccid, broker, valor_custo, mbytes_plano, status)
             VALUES ($1, $2, $3, $4, COALESCE($5::decimal, 0), COALESCE($6::int, 20), 'ATIVO')
             RETURNING id, numero`,
            [num, op, ic, r?.broker || null, r?.valor_custo, r?.mbytes_plano]
          );
          created.push(ins.rows[0]);
        } catch (e) {
          if (e.code !== '23505') throw e;
        }
      }
      res.status(201).json({ created: created.length, items: created });
    } catch (err) {
      console.error('POST /gestao/telecom/chips/batch error:', err);
      res.status(500).json({ error: 'Erro no cadastro em lote.' });
    }
  });

  // POST /gestao/telecom/chips/batch-remove - batch delete
  app.post(`${base}/batch-remove`, requireAuthAndFilter, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Envie um array de IDs (ids).' });
      }
      const validIds = ids.map((x) => parseInt(x, 10)).filter((x) => !Number.isNaN(x));
      if (validIds.length === 0) {
        return res.status(400).json({ error: 'Nenhum ID válido.' });
      }
      await pool.query('DELETE FROM chips WHERE id = ANY($1::int[])', [validIds]);
      res.json({ removed: validIds.length });
    } catch (err) {
      console.error('POST /gestao/telecom/chips/batch-remove error:', err);
      res.status(500).json({ error: 'Erro na remoção em lote.' });
    }
  });
}
