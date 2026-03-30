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

const dbUrl = process.env.DATABASE_TELECOM_URL || process.env.DATABASE_URL;

if (dbUrl) {
  try {
    const rawUrl = String(dbUrl).trim();
    const normalizedUrl = rawUrl.startsWith('postgres://') && !rawUrl.startsWith('postgresql://')
      ? rawUrl.replace('postgres://', 'postgresql://')
      : rawUrl;
    const parsed = new URL(normalizedUrl);
    const dbName = process.env.DATABASE_TELECOM_URL
      ? String((parsed.pathname || '/').slice(1) || 'gestao_telecom')
      : 'gestao_telecom';
    const config = {
      host: String(parsed.hostname || 'localhost'),
      port: parseInt(parsed.port || '5432', 10),
      database: dbName,
      user: String(parsed.username || 'postgres'),
      password: String(process.env.DB_TELECOM_PASSWORD ?? parsed.password ?? ''),
    };
    pool = new Pool(config);
    pool.on('error', (err) => console.error('❌ Telecom DB pool error:', err));
  } catch (err) {
    console.error('❌ Telecom DB config error:', err?.message);
  }
} else {
  console.warn('⚠️ DATABASE_TELECOM_URL not set. Telecom features will be unavailable.');
}

export { pool };
export default pool;
