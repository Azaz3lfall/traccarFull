-- Schema para o banco gestao_telecom (chips, templates, sms)
-- Uso: psql -U postgres -d gestao_telecom -f scripts/gestao_telecom_schema.sql
-- Ou: psql -U postgres -c "CREATE DATABASE gestao_telecom;" && psql -U postgres -d gestao_telecom -f scripts/gestao_telecom_schema.sql

-- Tabela usuarios (referenciada por sms_templates e sms_logs)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    nivel_acesso VARCHAR(20) DEFAULT 'OPERADOR',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela chips (iccid VARCHAR(50) para suportar NA-numero-timestamp)
CREATE TABLE IF NOT EXISTS chips (
    id SERIAL PRIMARY KEY,
    codigo_referencia INTEGER,
    broker VARCHAR(50),
    operadora VARCHAR(30) NOT NULL DEFAULT 'N/A',
    numero VARCHAR(20) NOT NULL,
    iccid VARCHAR(50) NOT NULL,
    valor_custo DECIMAL(10, 2) DEFAULT 0.00,
    mbytes_plano INTEGER DEFAULT 20,
    status VARCHAR(20) DEFAULT 'ATIVO',
    traccar_device_id INTEGER,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(numero),
    UNIQUE(iccid)
);

-- Tabela sms_templates
CREATE TABLE IF NOT EXISTS sms_templates (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    tags_disponiveis VARCHAR(255),
    criado_por INTEGER REFERENCES usuarios(id)
);

-- Tabela sms_batch_templates (configurações em lote - sequência de templates)
CREATE TABLE IF NOT EXISTS sms_batch_templates (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    template_ids INTEGER[] NOT NULL,
    delay_entre_sms INTEGER DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela sms_logs
CREATE TABLE IF NOT EXISTS sms_logs (
    id SERIAL PRIMARY KEY,
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id),
    chip_id INTEGER REFERENCES chips(id),
    numero_destino VARCHAR(20) NOT NULL,
    mensagem_corpo TEXT NOT NULL,
    status_entrega VARCHAR(20) DEFAULT 'PENDENTE',
    gateway VARCHAR(20),
    erro_mensagem TEXT,
    referencia_externa_id VARCHAR(100)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chips_traccar_device_id ON chips(traccar_device_id);
CREATE INDEX IF NOT EXISTS idx_chips_numero ON chips(numero);
CREATE INDEX IF NOT EXISTS idx_sms_logs_data_envio ON sms_logs(data_envio);

-- Se as tabelas já existirem com iccid VARCHAR(25), execute para corrigir:
-- ALTER TABLE chips ALTER COLUMN iccid TYPE VARCHAR(50);

-- Tabela sms_gateway_config (credenciais editáveis pelo painel)
-- Execute também: scripts/gestao_telecom_gateway_config.sql para instalações existentes
CREATE TABLE IF NOT EXISTS sms_gateway_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    comtele_api_key VARCHAR(255),
    voxter_email VARCHAR(255),
    voxter_password VARCHAR(255),
    voxter_access_token VARCHAR(255),
    voxter_base_url VARCHAR(500),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO sms_gateway_config (id, comtele_api_key, voxter_email, voxter_password, voxter_access_token)
SELECT 1, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM sms_gateway_config WHERE id = 1);

-- Migração: adicionar coluna gateway em sms_logs (para instalações existentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sms_logs' AND column_name = 'gateway'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN gateway VARCHAR(20);
  END IF;
END $$;
