#!/usr/bin/env node
/**
 * Sincroniza devices do Traccar (com phone) para a tabela chips.
 * Uso: node src/addons/telecom/scripts/syncDevicesToChips.js
 * Env: TRACCAR_API_URL, TRACCAR_EMAIL, TRACCAR_PASSWORD, DATABASE_TELECOM_URL
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../../../.env') });

const traccarUrl = process.env.TRACCAR_API_URL;
const email = process.env.TRACCAR_EMAIL;
const password = process.env.TRACCAR_PASSWORD;
const dbUrl = process.env.DATABASE_TELECOM_URL || process.env.DATABASE_URL;

async function main() {
  if (!traccarUrl || !email || !password) {
    console.error('Defina TRACCAR_API_URL, TRACCAR_EMAIL e TRACCAR_PASSWORD');
    process.exit(1);
  }
  if (!dbUrl) {
    console.error('Defina DATABASE_TELECOM_URL ou DATABASE_URL');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: dbUrl });

  const loginRes = await fetch(`${traccarUrl}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
  });
  const cookies = loginRes.headers.get('set-cookie');
  if (!cookies) {
    console.error('Falha no login no Traccar');
    process.exit(1);
  }

  const devRes = await fetch(`${traccarUrl}/api/devices?all=true`, {
    headers: { Cookie: cookies },
  });
  const devices = await devRes.json();
  let created = 0;
  let updated = 0;

  for (const d of devices) {
    const phone = d.phone ? String(d.phone).trim().replace(/\D/g, '') : null;
    if (!phone || phone.length < 10) continue;
    const fullNum = phone.length >= 12 ? phone : `55${phone}`;
    const deviceId = parseInt(d.id, 10);
    const existing = await pool.query(
      'SELECT id, traccar_device_id FROM chips WHERE numero = $1 OR traccar_device_id = $2 LIMIT 1',
      [fullNum, deviceId]
    );
    if (existing.rows[0]) {
      if (existing.rows[0].traccar_device_id !== deviceId) {
        await pool.query('UPDATE chips SET traccar_device_id = $1 WHERE id = $2', [deviceId, existing.rows[0].id]);
        updated++;
      }
    } else {
      await pool.query(
        `INSERT INTO chips (numero, operadora, iccid, traccar_device_id) VALUES ($1, 'N/A', $2, $3)`,
        [fullNum, `NA-${fullNum}-${Date.now()}`, deviceId]
      );
      created++;
    }
  }

  await pool.end();
  console.log(`Sync concluído: ${created} criados, ${updated} atualizados, ${devices.length} devices processados`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
