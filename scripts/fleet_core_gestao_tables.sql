-- fleet_core: gestão tables for PostgreSQL (CORRIGIDO)
-- Run after fleet_core_init.sql
-- Usage: psql -U postgres -d fleet_core -f scripts/fleet_core_gestao_tables.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drivers: motoristas
-- Nota: unique_id é o ID do Traccar (Integer). O ID interno é UUID.
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(20),
    cnh_number VARCHAR(50),
    cnh_category VARCHAR(10),
    cnh_validity DATE,
    phone VARCHAR(30),
    unique_id INTEGER UNIQUE, -- ID do Motorista no Traccar
    traccar_user_id INTEGER,  -- ID do Usuário de Login no Traccar (se houver)
    association_type VARCHAR(20) DEFAULT 'manual',
    last_sync TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drivers_unique_id ON drivers(unique_id);

-- 2. Driver users: login do app
CREATE TABLE IF NOT EXISTS driver_users (
    driver_id UUID PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Driver-vehicle association
CREATE TABLE IF NOT EXISTS driver_vehicles (
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE, -- Link direto com fleet_core.vehicles
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (driver_id, vehicle_id)
);

-- 4. Trips: viagens
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    start_city VARCHAR(255),
    end_city VARCHAR(255),
    is_round_trip BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    status VARCHAR(30) DEFAULT 'Em Andamento',
    distancia_total NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Refuelings: abastecimentos
CREATE TABLE IF NOT EXISTS refuelings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    refuel_date DATE NOT NULL,
    odometer NUMERIC(12,2) NOT NULL,
    liters_filled NUMERIC(10,2) NOT NULL,
    price_per_liter NUMERIC(10,4),
    total_cost NUMERIC(12,2),
    is_full_tank BOOLEAN NOT NULL,
    foto_bomba TEXT,
    foto_odometro TEXT,
    posto_nome VARCHAR(255),
    cidade VARCHAR(100),
    viagem_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Custos: custos extras
CREATE TABLE IF NOT EXISTS custos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    viagem_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    tipo_custo VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    data_custo TIMESTAMP DEFAULT NOW(),
    foto_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Maintenances: manutenções
CREATE TABLE IF NOT EXISTS maintenances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    description TEXT NOT NULL,
    cost NUMERIC(12,2) NOT NULL,
    odometer NUMERIC(12,2),
    provider_name VARCHAR(255),
    foto_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Association history (Logs de troca de motorista)
CREATE TABLE IF NOT EXISTS association_history (
    id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    action VARCHAR(50),
    details JSONB,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- 9. VIEW necessária para a rota /gestao/association-history
-- O código backend faz select nesta view, então precisamos criá-la.
CREATE OR REPLACE VIEW association_history_view AS
SELECT 
    ah.id,
    ah.driver_id,
    d.name as driver_name,
    ah.vehicle_id,
    v.name as vehicle_name,
    v.plate as vehicle_plate,
    ah.action,
    ah.details,
    ah.changed_at
FROM association_history ah
LEFT JOIN drivers d ON ah.driver_id = d.id
LEFT JOIN vehicles v ON ah.vehicle_id = v.id;

-- 10. Sync schedule (Configuração do Cron)
CREATE TABLE IF NOT EXISTS sync_schedule (
    id INTEGER PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN DEFAULT FALSE,
    interval_minutes INTEGER DEFAULT 60,
    next_run TIMESTAMP,
    status VARCHAR(20) DEFAULT 'idle',
    last_success TIMESTAMP,
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    error_message TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO sync_schedule (id, enabled, interval_minutes) VALUES (1, FALSE, 60) ON CONFLICT (id) DO NOTHING;

-- 11. Scheduled sync logs (Logs gerais do Cron)
-- Adicionei as colunas que o seu código Node.js tenta preencher
CREATE TABLE IF NOT EXISTS scheduled_sync_logs (
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP,
    triggered_by VARCHAR(50),
    status VARCHAR(20),
    duration_seconds INTEGER,
    drivers_synced INTEGER,
    associations_created INTEGER,
    associations_removed INTEGER,
    errors_count INTEGER,
    error_details JSONB,
    details TEXT
);

-- 12. Sync Logs (Logs detalhados por entidade)
-- O seu código faz 'INSERT INTO sync_logs', mas essa tabela faltava no script original
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50), -- 'driver', 'association', etc
    entity_id VARCHAR(100),  -- Pode ser UUID ou Int convertido pra string
    action VARCHAR(50),      -- 'create', 'update', 'sync'
    details JSONB,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);