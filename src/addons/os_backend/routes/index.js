import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import osRoutes from './os.routes.js';
import traccarRoutes from './traccar.routes.js';
import pool from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsOsDir = path.resolve(__dirname, '../../../../uploads/os');

export default function registerOSRoutes(app, { pool: fleetPool, requireAuthAndFilter }) {
  if (!pool) {
    console.warn('⚠️ OS Backend: DATABASE_OS_URL not configured. OS routes will return 503.');
  }

  app.use('/os-uploads', express.static(uploadsOsDir));
  app.use('/os-api', requireAuthAndFilter, (req, _res, next) => {
    req.fleetPool = fleetPool;
    next();
  }, osRoutes);

  // Clientes do fleet_core (para dropdown Cliente na OS)
  app.get('/os-api/clients', requireAuthAndFilter, async (req, res) => {
    if (!fleetPool) {
      return res.status(503).json({ error: 'Fleet core não configurado. Verifique DATABASE_URL.' });
    }
    try {
      const { rows } = await fleetPool.query(
        'SELECT id, name, email, type, tax_id FROM clients WHERE active = true ORDER BY name'
      );
      res.json(rows);
    } catch (err) {
      console.error('listClients error:', err?.message);
      res.status(500).json({ error: 'Erro ao buscar clientes do fleet_core' });
    }
  });

  app.use('/traccar-api', requireAuthAndFilter, traccarRoutes);
}
