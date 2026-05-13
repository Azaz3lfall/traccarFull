/**
 * CRUD de papéis (roles) com permissões por tela.
 * Tabela criada automaticamente na primeira execução.
 *
 * GET    /api/roles
 * POST   /api/roles
 * PUT    /api/roles/:id
 * DELETE /api/roles/:id
 */

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      permissions JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export default function registerRolesRoutes(app, { pool, requireAuthAndFilter }) {
  let tableReady = false;

  const withTable = async (fn) => {
    if (!tableReady) {
      await ensureTable(pool);
      tableReady = true;
    }
    return fn();
  };

  // GET /api/roles
  app.get('/api/roles', requireAuthAndFilter, async (req, res) => {
    try {
      await withTable(async () => {
        const { rows } = await pool.query(
          'SELECT id, name, permissions, created_at, updated_at FROM user_roles ORDER BY name ASC',
        );
        res.json({ roles: rows });
      });
    } catch (err) {
      console.error('GET /api/roles error:', err.message);
      res.status(500).json({ error: 'Erro ao listar papéis.' });
    }
  });

  // POST /api/roles
  app.post('/api/roles', requireAuthAndFilter, async (req, res) => {
    try {
      const { name, permissions = {} } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'O nome do papel é obrigatório.' });
      }
      await withTable(async () => {
        const { rows } = await pool.query(
          `INSERT INTO user_roles (name, permissions, updated_at)
           VALUES ($1, $2::jsonb, NOW())
           RETURNING id, name, permissions, created_at, updated_at`,
          [String(name).trim(), JSON.stringify(permissions)],
        );
        res.status(201).json(rows[0]);
      });
    } catch (err) {
      if (err.constraint === 'user_roles_name_key' || err.code === '23505') {
        return res.status(409).json({ error: 'Já existe um papel com esse nome.' });
      }
      console.error('POST /api/roles error:', err.message);
      res.status(500).json({ error: 'Erro ao criar papel.' });
    }
  });

  // PUT /api/roles/:id
  app.put('/api/roles/:id', requireAuthAndFilter, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ error: 'ID inválido.' });
      const { name, permissions = {} } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'O nome do papel é obrigatório.' });
      }
      await withTable(async () => {
        const { rows } = await pool.query(
          `UPDATE user_roles
           SET name = $1, permissions = $2::jsonb, updated_at = NOW()
           WHERE id = $3
           RETURNING id, name, permissions, created_at, updated_at`,
          [String(name).trim(), JSON.stringify(permissions), id],
        );
        if (!rows.length) return res.status(404).json({ error: 'Papel não encontrado.' });
        res.json(rows[0]);
      });
    } catch (err) {
      if (err.constraint === 'user_roles_name_key' || err.code === '23505') {
        return res.status(409).json({ error: 'Já existe um papel com esse nome.' });
      }
      console.error('PUT /api/roles/:id error:', err.message);
      res.status(500).json({ error: 'Erro ao atualizar papel.' });
    }
  });

  // DELETE /api/roles/:id
  app.delete('/api/roles/:id', requireAuthAndFilter, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ error: 'ID inválido.' });
      await withTable(async () => {
        const { rowCount } = await pool.query(
          'DELETE FROM user_roles WHERE id = $1',
          [id],
        );
        if (!rowCount) return res.status(404).json({ error: 'Papel não encontrado.' });
        res.json({ success: true });
      });
    } catch (err) {
      console.error('DELETE /api/roles/:id error:', err.message);
      res.status(500).json({ error: 'Erro ao excluir papel.' });
    }
  });
}
