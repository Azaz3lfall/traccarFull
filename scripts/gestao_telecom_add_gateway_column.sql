-- Migração: adicionar coluna gateway em sms_logs
-- Execute: psql -U postgres -d gestao_telecom -f scripts/gestao_telecom_add_gateway_column.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sms_logs' AND column_name = 'gateway'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN gateway VARCHAR(20);
    RAISE NOTICE 'Coluna gateway adicionada à tabela sms_logs.';
  ELSE
    RAISE NOTICE 'Coluna gateway já existe em sms_logs.';
  END IF;
END $$;
