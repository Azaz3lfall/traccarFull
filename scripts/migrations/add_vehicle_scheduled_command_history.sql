CREATE TABLE IF NOT EXISTS vehicle_scheduled_command_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    device_id BIGINT,
    command_type VARCHAR(32) NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(24) NOT NULL,
    http_code INT,
    error_message TEXT,
    pending_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vsch_vehicle_attempted
    ON vehicle_scheduled_command_history(vehicle_id, attempted_at DESC);
