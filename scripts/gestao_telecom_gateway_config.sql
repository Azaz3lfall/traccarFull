-- Tabela de configuração dos gateways SMS (Comtele e Voxter)
-- Permite que o usuário configure credenciais pelo painel, sem editar .env
-- Uso: psql -U postgres -d gestao_telecom -f scripts/gestao_telecom_gateway_config.sql

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
