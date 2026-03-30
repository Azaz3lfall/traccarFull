-- Migration: Add equipment_items column for multiple devices per OS
-- Run: psql -U postgres -d gestao_os -f scripts/migrations/add_equipment_items.sql

ALTER TABLE os_module.work_orders 
ADD COLUMN IF NOT EXISTS equipment_items JSONB DEFAULT '[]';

-- Optional: Migrate existing single device data to equipment_items
-- Uncomment and run if you have existing data to migrate:
/*
UPDATE os_module.work_orders
SET equipment_items = jsonb_build_array(
  jsonb_build_object(
    'equipment_type', COALESCE(equipment_type, '[]'::jsonb),
    'device_id', NULL,
    'device_imei', device_imei,
    'equipment_model', equipment_model,
    'equipment_serial', equipment_serial,
    'chip_number', chip_number,
    'lock_type', COALESCE(lock_type, '[]'::jsonb)
  )
)
WHERE (equipment_items IS NULL OR equipment_items = '[]'::jsonb)
  AND (device_imei IS NOT NULL AND device_imei != '');
*/
