-- Corrige: foto_bomba e foto_odometro podem receber base64 (centenas de KB)
-- VARCHAR(500) gera erro "value too long". Alterar para TEXT.
-- Uso: psql -U postgres -d fleet_core -f scripts/fix_refuelings_varchar.sql

ALTER TABLE refuelings
  ALTER COLUMN foto_bomba TYPE TEXT USING foto_bomba::TEXT,
  ALTER COLUMN foto_odometro TYPE TEXT USING foto_odometro::TEXT;
