-- =====================================================================
-- Migration: 002_add_emergency_contact_to_residents.sql
-- =====================================================================

ALTER TABLE `residents`
  ADD COLUMN `emergency_contact` VARCHAR(50) DEFAULT NULL AFTER `phone`;
