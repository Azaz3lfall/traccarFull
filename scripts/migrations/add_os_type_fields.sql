-- Migration: Add fields for OS by service type (Manutenção, Remoção)
-- Run: psql -U postgres -d gestao_os -f scripts/migrations/add_os_type_fields.sql

-- devices_to_remove: array of device_id to remove (Manutenção/Remoção)
ALTER TABLE os_module.work_orders 
ADD COLUMN IF NOT EXISTS devices_to_remove INTEGER[] DEFAULT '{}';

-- delete_vehicle_if_empty: when removing all devices, delete vehicle (Remoção only)
ALTER TABLE os_module.work_orders 
ADD COLUMN IF NOT EXISTS delete_vehicle_if_empty BOOLEAN DEFAULT false;
