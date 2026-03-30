import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Obter o diretório atual do arquivo
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

import express from 'express';
import cors from 'cors';

import fleetRoutes from '../../../routes/fleetRoutes.js';
import clientsRoutes from '../../../routes/clientsRoutes.js';
import vehiclesRoutes from '../../../routes/vehiclesRoutes.js';

const app = express();

const PORT = process.env.CORE_PORT || 4000;

app.use(cors());
app.use(express.json());

// Rota de Health Check (pra saber se tá vivo)
app.get('/', (req, res) => {
  res.json({ 
    service: 'Core Fleet Wrapper', 
    path: 'src/addons/traccar_wrapper/core/core.js',
    status: 'Online 🟢' 
  });
});

// Registra as rotas da frota
app.use('/api/fleet', fleetRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/vehicles', vehiclesRoutes);

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`\n🧠 Core Wrapper rodando na porta ${PORT}`);
  console.log(`👉 Teste a API: http://localhost:${PORT}/api/fleet/map`);
  // Dica visual para saber se pegou as credenciais certas
  console.log(`🔧 Traccar Auth: ${process.env.TRACCAR_EMAIL ? 'Configurado ✅' : 'Faltando ❌'}`);
  console.log(`🗄️  Database URL: ${process.env.DATABASE_URL ? 'Configurado ✅' : 'Faltando ❌'}\n`);
});