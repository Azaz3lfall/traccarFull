/**
 * sync_full_system.js – A Correção do "all: true" 🛠️
 * * Correção Crítica:
 * - A função fetchDevicesByUser NÃO pode ter `all: true`.
 * - Isso fazia com que o Admin recebesse a frota inteira para cada usuário consultado.
 */

import 'dotenv/config';
import axios from 'axios';
import pool from '../src/addons/traccar_wrapper/db/index.js';

// Se houver algum usuário que deva ser ignorado explicitamente, coloque aqui.
// Mas com a lógica de eleição corrigida, isso deve ser desnecessário.
const IGNORED_EMAILS = ['admin', 'admin@traccar.org'];

const baseURL = process.env.TRACCAR_API_URL;
const auth = {
  username: process.env.TRACCAR_EMAIL,
  password: process.env.TRACCAR_PASSWORD,
};

function log(msg, ...args) {
  console.log(`[sync] ${msg}`, ...args);
}

// Configuração Axios
const api = axios.create({
  baseURL,
  auth,
  timeout: 120000 // Aumentado para 2 minutos
});

async function run() {
  log('--- 🏁 Iniciando Sincronização (Correção all:true) ---');

  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL não definida.');
    process.exit(1);
  }

  // 1. Buscar Tudo do Traccar (Global)
  log('📡 Baixando dados globais do Traccar...');
  
  let users = [];
  let devices = [];

  try {
    const [uRes, dRes] = await Promise.all([
      api.get('/api/users'),
      api.get('/api/devices', { params: { all: true } }) // AQUI precisa do all: true
    ]);
    users = uRes.data;
    devices = dRes.data;
    log(`   Recebidos: ${users.length} usuários, ${devices.length} dispositivos totais.`);
  } catch (e) {
    log('❌ Erro de conexão:', e.message);
    process.exit(1);
  }

  // 2. Sincronizar Clientes
  log('💾 Salvando Clientes...');
  const validUsers = []; // Lista limpa para a eleição

  for (const u of users) {
    if (u.administrator) continue; 
    
    // Filtro básico de blacklist (opcional agora, mas bom manter)
    if (u.email && IGNORED_EMAILS.includes(u.email)) continue;

    validUsers.push(u);

    // Upsert no Banco
    const name = u.name ? u.name.trim() : `User ${u.id}`;
    const email = u.email ? u.email.trim() : null;
    const phone = u.phone ? u.phone.trim() : null;

    try {
      await pool.query(
        `INSERT INTO clients (type, name, email, contact_phone, traccar_user_id, tax_id, address)
         VALUES ('PJ', $1, $2, $3, $4, NULL, NULL)
         ON CONFLICT (traccar_user_id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           contact_phone = EXCLUDED.contact_phone`,
        [name, email, phone, u.id]
      );
    } catch (err) {
       // ignora erro pontual
    }
  }

  // 3. Sincronizar Veículos (Sem Dono ainda)
  log('💾 Salvando Veículos...');
  const devicesWithPlate = devices.filter(d => d.attributes && d.attributes.PLACA);
  
  for (const d of devicesWithPlate) {
    const plate = d.attributes.PLACA.trim();
    await pool.query(
      `INSERT INTO vehicles (plate) VALUES ($1) ON CONFLICT (plate) DO NOTHING`,
      [plate]
    );
  }

  // 4. A Eleição Real (Investigação por Usuário)
  log('🕵️ Investigando posse real (Isso pode demorar)...');
  
  const candidatesByPlate = {}; // Placa -> Array de Candidatos

  let processed = 0;
  for (const u of validUsers) {
    try {
      // 🔥 A CORREÇÃO MÁGICA ESTÁ AQUI EMBAIXO 🔥
      // Removemos `all: true`. Agora o Traccar vai respeitar o userId.
      const res = await api.get('/api/devices', { params: { userId: u.id } });
      const userDevices = res.data;
      
      const deviceCount = userDevices.length;
      
      // Se o usuário vê TODOS os carros (ex: 166), ele provavelmente é um Gerente/Supervisor.
      // Vamos penalizá-lo na eleição.
      
      for (const d of userDevices) {
        if (d.attributes && d.attributes.PLACA) {
          const plate = d.attributes.PLACA.trim();
          
          if (!candidatesByPlate[plate]) candidatesByPlate[plate] = [];
          
          candidatesByPlate[plate].push({
            userId: u.id,
            userName: u.name,
            totalUserDevices: deviceCount // O peso do voto
          });
        }
      }
    } catch (err) {
      log(`   Erro ao ler devices do user ${u.name}: ${err.message}`);
    }
    
    processed++;
    if (processed % 5 === 0) process.stdout.write('.');
  }
  console.log(''); // Pula linha

  // 5. Apurando os Votos
  log('⚖️ Calculando vencedores...');
  
  let updates = 0;
  
  for (const [plate, candidates] of Object.entries(candidatesByPlate)) {
    if (candidates.length === 0) continue;

    // Se houver empate técnico (ex: André tem 166, Chico tem 166), temos um problema.
    // Mas agora, Chico deve ter 1 e André (se for fantasma) terá 166.
    
    // ORDENAR: Menor frota ganha.
    candidates.sort((a, b) => a.totalUserDevices - b.totalUserDevices);

    const winner = candidates[0]; 

    // Log de Disputa (Só se houver mais de 1 candidato ou se o vencedor tiver muitos carros)
    if (candidates.length > 1) {
        const runnerUp = candidates[1];
        log(`   [Vencedor] ${plate}: ${winner.userName} (${winner.totalUserDevices}) vs ${runnerUp.userName} (${runnerUp.totalUserDevices})`);
    } else if (winner.totalUserDevices > 50) {
        // Alerta se o vencedor tiver muitos carros (pode ser um falso positivo se for uma transportadora gigante)
        log(`   [Atenção] ${plate}: Vencedor único ${winner.userName} tem ${winner.totalUserDevices} carros.`);
    }

    // Salvar no Banco
    await pool.query(
      `UPDATE vehicles 
       SET client_id = (SELECT id FROM clients WHERE traccar_user_id = $1 LIMIT 1)
       WHERE plate = $2`,
      [winner.userId, plate]
    );
    updates++;
  }

  log(`✅ Finalizado! ${updates} veículos vinculados.`);
}

run()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });