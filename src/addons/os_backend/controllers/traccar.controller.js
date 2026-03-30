import pool from '../db/index.js';
import * as traccarService from '../services/traccar.service.js';

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await traccarService.authenticate(email, password);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Credenciais inválidas no Traccar' });
  }
};

export const createClient = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha nome, email e senha.' });
  }

  try {
    const newUser = await traccarService.createUser({
      name,
      email,
      password,
      readonly: false,
      deviceLimit: -1,
      disabled: false
    });

    res.status(201).json({ message: 'Cliente criado com sucesso', user: newUser });
  } catch (error) {
    console.error('Erro ao criar cliente:', error.response ? error.response.data : error.message);

    if (error.response && error.response.status === 400) {
      return res.status(400).json({ error: 'Não foi possível criar. Verifique se o email já existe.' });
    }

    res.status(500).json({ error: 'Erro interno ao criar cliente no Traccar' });
  }
};

export const listUsers = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  try {
    const traccarUsers = await traccarService.getUsers();
    let techIds = new Set();
    try {
      const systemTechs = await pool.query('SELECT traccar_user_id FROM os_module.technicians');
      techIds = new Set(systemTechs.rows.map(t => t.traccar_user_id));
    } catch (dbErr) {
      try {
        const systemTechs = await pool.query('SELECT traccar_user_id FROM technicians');
        techIds = new Set(systemTechs.rows.map(t => t.traccar_user_id));
      } catch {
        console.warn('Tabela technicians não encontrada em os_module nem public, is_technician será false');
      }
    }

    const users = traccarUsers.map(user => ({
      ...user,
      is_technician: techIds.has(user.id)
    }));

    res.json(users);
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    const detail = error.response?.status === 401
      ? 'Verifique TRACCAR_EMAIL e TRACCAR_PASSWORD no .env'
      : error.code === 'ECONNREFUSED'
        ? 'Traccar API inacessível. Verifique TRACCAR_API_URL'
        : msg;
    console.error('listUsers error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao buscar usuários do Traccar', detail });
  }
};

export const toggleTechnicianStatus = async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Módulo OS não configurado. Verifique DATABASE_OS_URL.' });
  }
  const { traccar_user_id, status } = req.body;
  try {
    if (status) {
      await pool.query(
        'INSERT INTO os_module.technicians (traccar_user_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [traccar_user_id]
      );
    } else {
      await pool.query(
        'DELETE FROM os_module.technicians WHERE traccar_user_id = $1',
        [traccar_user_id]
      );
    }
    res.json({ message: 'Status de técnico atualizado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status de técnico' });
  }
};

export const verifyAndLinkDevice = async (req, res) => {
  const { uniqueId, name, userId } = req.body;
  try {
    let device = await traccarService.checkImeiExists(uniqueId);

    if (!device) {
      device = await traccarService.createDevice(name || `Device ${uniqueId}`, uniqueId);
    }

    await traccarService.linkDeviceToUser(userId, device.id);

    res.json({ message: 'Dispositivo vinculado com sucesso', device });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao vincular dispositivo' });
  }
};
