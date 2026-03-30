-- Migration: Adicionar colunas nickname e installation_details à tabela vehicles
-- Execute este script no banco de dados fleet_core

-- Adicionar coluna nickname (VARCHAR, pode ser NULL)
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);

-- Adicionar coluna installation_details (TEXT, pode ser NULL)
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS installation_details TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN vehicles.nickname IS 'Apelido ou nome alternativo do veículo';
COMMENT ON COLUMN vehicles.installation_details IS 'Detalhes da instalação do rastreador no veículo';
