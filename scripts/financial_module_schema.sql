-- Financial module schema for fleet_core
-- Run after fleet_core_init.sql:
-- psql -U postgres -d fleet_core -f scripts/financial_module_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS billing_status VARCHAR(20) NOT NULL DEFAULT 'ativo'
    CHECK (billing_status IN ('ativo', 'inadimplente')),
  ADD COLUMN IF NOT EXISTS billing_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billing_last_overdue_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS billing_blocked_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS billing_due_day SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS financial_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  asaas_api_key_enc TEXT,
  asaas_api_key_masked VARCHAR(32),
  asaas_environment VARCHAR(20) NOT NULL DEFAULT 'sandbox'
    CHECK (asaas_environment IN ('sandbox', 'production')),
  asaas_connected BOOLEAN NOT NULL DEFAULT FALSE,
  asaas_last_test_at TIMESTAMP NULL,
  asaas_last_error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO financial_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS financial_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  recurring_interval VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'
    CHECK (recurring_interval IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_plan_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES financial_plans(id) ON DELETE CASCADE,
  equipment_signature VARCHAR(255) NOT NULL,
  equipment_count INTEGER NOT NULL DEFAULT 1,
  monthly_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_plan_rules_plan_id
  ON financial_plan_rules(plan_id);
CREATE INDEX IF NOT EXISTS idx_financial_plan_rules_signature
  ON financial_plan_rules(equipment_signature);

CREATE TABLE IF NOT EXISTS client_financial_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  plan_id UUID NULL REFERENCES financial_plans(id) ON DELETE SET NULL,
  custom_due_day SMALLINT NOT NULL DEFAULT 1,
  grace_days_to_block INTEGER NOT NULL DEFAULT 7,
  auto_block_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asaas_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  asaas_customer_id VARCHAR(80) NOT NULL UNIQUE,
  raw_payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asaas_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id UUID NULL REFERENCES financial_plans(id) ON DELETE SET NULL,
  asaas_subscription_id VARCHAR(80) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  next_due_date DATE NULL,
  raw_payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asaas_subscriptions_client_id
  ON asaas_subscriptions(client_id);

CREATE TABLE IF NOT EXISTS client_billing_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cycle_reference VARCHAR(10) NOT NULL, -- YYYY-MM
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date TIMESTAMP NULL,
  asaas_payment_id VARCHAR(80) NULL,
  asaas_invoice_url TEXT NULL,
  asaas_bank_slip_url TEXT NULL,
  equipment_snapshot JSONB,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, cycle_reference)
);

CREATE INDEX IF NOT EXISTS idx_client_billing_cycles_status
  ON client_billing_cycles(status);
CREATE INDEX IF NOT EXISTS idx_client_billing_cycles_due_date
  ON client_billing_cycles(due_date);

CREATE TABLE IF NOT EXISTS asaas_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cycle_id UUID NULL REFERENCES client_billing_cycles(id) ON DELETE SET NULL,
  asaas_payment_id VARCHAR(80) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NULL,
  paid_at TIMESTAMP NULL,
  raw_payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(20) NOT NULL,
  event_key VARCHAR(160) NOT NULL UNIQUE,
  event_type VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMP NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_client_id
  ON billing_events(client_id);

