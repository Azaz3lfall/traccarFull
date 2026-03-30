import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Carregar .env antes de qualquer coisa
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Subir 4 níveis: db -> traccar_wrapper -> addons -> src -> raiz
const envPath = resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

import pg from 'pg';
import { URL } from 'url';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL not set. Fleet Core DB (clients, vehicles) will be unavailable.');
}

let pool;

if (process.env.DATABASE_URL) {
  try {
    // Normalizar DATABASE_URL: postgres:// e postgresql:// são equivalentes para o parser
    const rawUrl = String(process.env.DATABASE_URL || '').trim();
    const normalizedUrl = rawUrl.startsWith('postgres://') && !rawUrl.startsWith('postgresql://')
      ? rawUrl.replace('postgres://', 'postgresql://')
      : rawUrl;
    const dbUrl = new URL(normalizedUrl);

    // Garantir que TODOS os parâmetros sejam strings (evita "client password must be a string")
    // Prioridade: DB_PASSWORD (override) > senha na URL
    const dbPassword = process.env.DB_PASSWORD ?? dbUrl.password ?? '';
    const finalPassword = String(dbPassword);

    const config = {
      host: String(dbUrl.hostname || 'localhost'),
      port: parseInt(dbUrl.port || '5432', 10),
      database: String((dbUrl.pathname || '/').slice(1) || 'postgres'),
      user: String(dbUrl.username || 'postgres'),
      password: finalPassword,
    };
    
    // Log para debug (sem mostrar a senha completa)
    console.log('🔌 Configurando pool PostgreSQL:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password ? `${config.password.substring(0, 2)}***` : '(vazio)',
    });
    
    pool = new Pool(config);
    
    // Testar a conexão
    pool.on('error', (err) => {
      console.error('❌ Erro inesperado no pool do PostgreSQL:', err);
    });
    
    // Testar conexão imediatamente
    pool.query('SELECT NOW()')
      .then(() => {
        console.log('✅ Conexão com PostgreSQL estabelecida com sucesso');
      })
      .catch((err) => {
        console.error('❌ Erro ao testar conexão PostgreSQL:', err?.message);
      });
  } catch (err) {
    console.error('❌ Erro ao configurar pool do PostgreSQL:', err?.message);
    console.error('❌ Stack trace:', err?.stack);
    console.warn('⚠️ Tentando usar connectionString diretamente...');
    // Fallback para connectionString se o parsing falhar
    try {
      // Garantir que DATABASE_URL seja string
      const connectionString = String(process.env.DATABASE_URL || '');
      pool = new Pool({
        connectionString: connectionString,
      });
    } catch (fallbackErr) {
      console.error('❌ Erro no fallback também:', fallbackErr?.message);
      pool = null;
    }
  }
} else {
  // Criar um pool vazio se não houver DATABASE_URL
  console.warn('⚠️ DATABASE_URL not set. Fleet Core DB (clients, vehicles) will be unavailable.');
  pool = null;
}

export { pool };
export default pool;
