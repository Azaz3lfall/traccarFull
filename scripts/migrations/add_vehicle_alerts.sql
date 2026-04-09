CREATE TABLE IF NOT EXISTS vehicle_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(vehicle_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_vehicle_id ON vehicle_alerts(vehicle_id);
