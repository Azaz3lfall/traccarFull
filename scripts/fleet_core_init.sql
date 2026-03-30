-- fleet_core: init script for PostgreSQL
-- Run manually after creating the database: CREATE DATABASE fleet_core;
-- Then connect to fleet_core (PgAdmin, DBeaver or psql) and run this file.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('PF', 'PJ')),
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(20) UNIQUE,
    address TEXT,
    contact_phone VARCHAR(20),
    email VARCHAR(100),
    traccar_user_id INT UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    plate VARCHAR(20) UNIQUE NOT NULL,
    make VARCHAR(50),
    model VARCHAR(50),
    color VARCHAR(30),
    year INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vehicles_plate ON vehicles(plate);
CREATE INDEX idx_clients_traccar_id ON clients(traccar_user_id);
