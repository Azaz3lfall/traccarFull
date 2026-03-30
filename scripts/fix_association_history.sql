-- Corrige association_history: usa driver_id INTEGER para compatibilidade com drivers existente (id INTEGER).
-- Execute: psql -U postgres -d fleet_core -f scripts/fix_association_history.sql

-- Remove a tabela se existir com schema errado (caso de tentativa anterior)
DROP TABLE IF EXISTS association_history CASCADE;

-- Cria association_history compatível com drivers.id INTEGER (schema legado)
CREATE TABLE association_history (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    action VARCHAR(50),
    details JSONB,
    changed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_association_history_driver ON association_history(driver_id);
CREATE INDEX idx_association_history_changed ON association_history(changed_at);

-- Recria a view
CREATE OR REPLACE VIEW association_history_view AS
SELECT 
    ah.id,
    ah.driver_id,
    d.name as driver_name,
    ah.vehicle_id,
    COALESCE(v.nickname, v.plate, v.model) as vehicle_name,
    v.plate as vehicle_plate,
    ah.action,
    ah.details,
    ah.changed_at
FROM association_history ah
LEFT JOIN drivers d ON ah.driver_id = d.id
LEFT JOIN vehicles v ON ah.vehicle_id = v.id;
