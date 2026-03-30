-- Schema para o módulo de Ordem de Serviço (OS)
-- Banco: gestao_os (ou use DATABASE_OS_URL)
-- Execute: psql -U postgres -d gestao_os -f scripts/gestao_os_schema.sql

-- CREATE DATABASE gestao_os;
-- \c gestao_os;

CREATE SCHEMA IF NOT EXISTS os_module;

-- Tabela de Ordens de Serviço
-- IDs de clientes, técnicos e dispositivos são links lógicos (Traccar)
CREATE TABLE os_module.work_orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    technician_id INTEGER NOT NULL,
    device_id INTEGER,
    status VARCHAR(50) DEFAULT 'PENDING',
    type VARCHAR(50) NOT NULL,
    description TEXT,
    vehicle_plate VARCHAR(20),
    vehicle_model VARCHAR(100),
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    -- Campos de equipamento (preenchidos via checklist/edição)
    equipment_type JSONB,
    equipment_model VARCHAR(100),
    equipment_serial VARCHAR(100),
    chip_number VARCHAR(50),
    lock_type JSONB,
    device_imei VARCHAR(50),
    installation_details TEXT
);

-- Tabela de Checklists
CREATE TABLE os_module.checklists (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL UNIQUE REFERENCES os_module.work_orders(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]',
    technician_notes TEXT,
    client_signature_path VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Fotos/Anexos
CREATE TABLE os_module.attachments (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES os_module.work_orders(id) ON DELETE CASCADE,
    file_path VARCHAR(512) NOT NULL,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_os_technician ON os_module.work_orders(technician_id);
CREATE INDEX idx_os_customer ON os_module.work_orders(customer_id);
CREATE INDEX idx_os_status ON os_module.work_orders(status);

-- Tabela de Técnicos Autorizados (traccar_user_id = tc_users.id)
CREATE TABLE IF NOT EXISTS os_module.technicians (
    traccar_user_id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
