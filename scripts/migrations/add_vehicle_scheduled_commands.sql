CREATE TABLE IF NOT EXISTS vehicle_scheduled_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    lock_time TIME,
    unlock_time TIME,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(vehicle_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_vsc_vehicle_id ON vehicle_scheduled_commands(vehicle_id);
