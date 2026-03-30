-- Migration: Add vehicle_photo_path column for OS vehicle photo
-- Run: psql -U postgres -d gestao_os -f scripts/migrations/add_vehicle_photo_path.sql

ALTER TABLE os_module.work_orders 
ADD COLUMN IF NOT EXISTS vehicle_photo_path VARCHAR(512);
