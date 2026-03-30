-- Migração: Múltiplos Usuários por Cliente e Controle de Veículos por Usuário
-- Run: psql -U postgres -d fleet_core -f scripts/migrate_client_multi_users.sql

-- 1. Tabela client_users: Cliente -> Usuários (N:N)
CREATE TABLE IF NOT EXISTS client_users (
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    traccar_user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (client_id, traccar_user_id)
);
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_traccar_user_id ON client_users(traccar_user_id);

-- 2. Tabela user_vehicles: Usuário -> Veículos (N:N) + opção Notificar
CREATE TABLE IF NOT EXISTS user_vehicles (
    traccar_user_id INTEGER NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    notify BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (traccar_user_id, vehicle_id)
);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_traccar_user_id ON user_vehicles(traccar_user_id);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_vehicle_id ON user_vehicles(vehicle_id);

-- 3. Migrar dados existentes: clients.traccar_user_id -> client_users
INSERT INTO client_users (client_id, traccar_user_id)
SELECT id, traccar_user_id FROM clients WHERE traccar_user_id IS NOT NULL
ON CONFLICT (client_id, traccar_user_id) DO NOTHING;

-- 4. Migrar: usuário existente recebe acesso a TODOS os veículos do cliente
INSERT INTO user_vehicles (traccar_user_id, vehicle_id)
SELECT cu.traccar_user_id, v.id
FROM client_users cu
JOIN vehicles v ON v.client_id = cu.client_id
ON CONFLICT (traccar_user_id, vehicle_id) DO NOTHING;

-- 5. Remover UNIQUE de traccar_user_id em clients (manter coluna para compatibilidade)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_traccar_user_id_key;

COMMENT ON TABLE client_users IS 'Relação N:N entre clientes e usuários Traccar';
COMMENT ON TABLE user_vehicles IS 'Relação N:N entre usuários e veículos com flag notify';
