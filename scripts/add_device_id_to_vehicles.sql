-- Migration: Adicionar coluna device_id à tabela vehicles
-- Execute este script no banco de dados fleet_core

-- Adicionar coluna device_id (INT, pode ser NULL)
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS device_id INTEGER;

-- Criar índice para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_vehicles_device_id ON vehicles(device_id);

-- Comentário na coluna
COMMENT ON COLUMN vehicles.device_id IS 'ID do dispositivo rastreador do Traccar associado a este veículo';
