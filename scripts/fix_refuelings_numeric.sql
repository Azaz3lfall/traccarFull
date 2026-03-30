-- Corrige: odometer e liters_filled devem ser NUMERIC para aceitar decimais (ex: 882132.6)
-- Se forem INTEGER, gera "invalid input syntax for type integer".
-- Uso: psql -U postgres -d fleet_core -f scripts/fix_refuelings_numeric.sql

ALTER TABLE refuelings
  ALTER COLUMN odometer TYPE NUMERIC(12,2) USING odometer::NUMERIC(12,2),
  ALTER COLUMN liters_filled TYPE NUMERIC(10,2) USING liters_filled::NUMERIC(10,2);
