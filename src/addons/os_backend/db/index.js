import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import pg from 'pg';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const { Pool } = pg;

let pool = null;

const dbUrl = process.env.DATABASE_OS_URL || process.env.DATABASE_URL;

if (dbUrl) {
  try {
    const rawUrl = String(dbUrl).trim();
    const normalizedUrl = rawUrl.startsWith('postgres://') && !rawUrl.startsWith('postgresql://')
      ? rawUrl.replace('postgres://', 'postgresql://')
      : rawUrl;
    const parsed = new URL(normalizedUrl);
    const dbName = process.env.DATABASE_OS_URL
      ? String((parsed.pathname || '/').slice(1) || 'gestao_os')
      : 'gestao_os';
    const config = {
      host: String(parsed.hostname || 'localhost'),
      port: parseInt(parsed.port || '5432', 10),
      database: dbName,
      user: String(parsed.username || 'postgres'),
      password: String(process.env.DB_OS_PASSWORD ?? parsed.password ?? ''),
    };
    pool = new Pool(config);
    pool.on('error', (err) => console.error('❌ OS DB pool error:', err));
  } catch (err) {
    console.error('❌ OS DB config error:', err?.message);
  }
} else {
  console.warn('⚠️ DATABASE_OS_URL not set. OS features will be unavailable.');
}

export { pool };
export default pool;
