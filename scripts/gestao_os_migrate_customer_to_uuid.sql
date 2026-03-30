-- Migração: customer_id de INTEGER (Traccar user) para UUID (fleet_core client)
-- Execute em gestao_os: psql -U postgres -h localhost -d gestao_os -f scripts/gestao_os_migrate_customer_to_uuid.sql
-- ATENÇÃO: Se houver dados, faça backup e migre manualmente mapeando traccar_user_id -> clients.id

-- Para tabela vazia ou nova instalação:
ALTER TABLE os_module.work_orders DROP COLUMN IF EXISTS customer_id;
ALTER TABLE os_module.work_orders ADD COLUMN customer_id UUID;
CREATE INDEX IF NOT EXISTS idx_os_customer ON os_module.work_orders(customer_id);
