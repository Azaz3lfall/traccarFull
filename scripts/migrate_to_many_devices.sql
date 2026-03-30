-- Script de Migração: Suporte a Múltiplos Rastreadores por Veículo
-- Este script cria a tabela vehicle_devices e migra os dados existentes

-- 1. Criar a tabela vehicle_devices (relação muitos-para-muitos)
CREATE TABLE IF NOT EXISTS vehicle_devices (
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    device_id INTEGER NOT NULL,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (vehicle_id, device_id)
);

-- 2. Criar índice para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_vehicle_devices_vehicle_id ON vehicle_devices(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_devices_device_id ON vehicle_devices(device_id);

-- 3. Migrar dados existentes: Copiar device_id da tabela vehicles para vehicle_devices
-- Apenas para veículos que têm device_id preenchido
INSERT INTO vehicle_devices (vehicle_id, device_id, is_primary)
SELECT id, device_id, true
FROM vehicles
WHERE device_id IS NOT NULL
ON CONFLICT (vehicle_id, device_id) DO NOTHING;

-- 4. Comentário na coluna antiga (depreciação)
-- Nota: Não removemos a coluna device_id para manter compatibilidade temporária
-- Você pode removê-la manualmente depois de verificar que tudo está funcionando:
-- ALTER TABLE vehicles DROP COLUMN device_id;

COMMENT ON COLUMN vehicles.device_id IS 'DEPRECATED: Use vehicle_devices table instead. This column will be removed in a future version.';
