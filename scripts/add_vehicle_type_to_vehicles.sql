-- Migration: Adicionar coluna vehicle_type à tabela vehicles
-- Execute este script no banco de dados fleet_core

-- Adicionar coluna vehicle_type (VARCHAR, categoria do Traccar: car, truck, motorcycle, default, etc.)
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50);

COMMENT ON COLUMN vehicles.vehicle_type IS 'Tipo/categoria do veículo (igual ao Traccar: car, truck, motorcycle, default, etc.)';
