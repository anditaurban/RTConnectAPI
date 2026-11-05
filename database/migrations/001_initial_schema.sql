-- =====================================================================
-- Migration 001: Initial Database Baseline Schema
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. regions
CREATE TABLE IF NOT EXISTS `regions` (
  `id` VARCHAR(36) NOT NULL,
  `parent_id` VARCHAR(36) DEFAULT NULL,
  `type` ENUM('RW', 'RT') NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `leader_name` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_regions_code` (`code`),
  KEY `idx_regions_parent` (`parent_id`),
  CONSTRAINT `fk_regions_parent` FOREIGN KEY (`parent_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. system_settings
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` VARCHAR(36) NOT NULL,
  `region_id` VARCHAR(36) NOT NULL,
  `setting_key` VARCHAR(50) NOT NULL,
  `setting_value` JSON NOT NULL,
  `updated_by_user_id` VARCHAR(36) DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_settings_region_key` (`region_id`, `setting_key`),
  CONSTRAINT `fk_settings_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. users
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('super_admin', 'ketua_rw', 'ketua_rt', 'sekretaris', 'bendahara', 'petugas', 'warga') NOT NULL,
  `region_id` VARCHAR(36) DEFAULT NULL,
  `resident_id` VARCHAR(36) DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_region` (`region_id`),
  KEY `idx_users_resident` (`resident_id`),
  CONSTRAINT `fk_users_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. user_refresh_tokens
CREATE TABLE IF NOT EXISTS `user_refresh_tokens` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tokens_user` (`user_id`),
  CONSTRAINT `fk_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. families
CREATE TABLE IF NOT EXISTS `families` (
  `id` VARCHAR(36) NOT NULL,
  `no_kk` CHAR(16) NOT NULL,
  `head_resident_id` VARCHAR(36) DEFAULT NULL,
  `region_id` VARCHAR(36) NOT NULL,
  `address` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_families_no_kk` (`no_kk`),
  KEY `idx_families_region` (`region_id`),
  KEY `idx_families_head` (`head_resident_id`),
  CONSTRAINT `fk_families_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. residents
CREATE TABLE IF NOT EXISTS `residents` (
  `id` VARCHAR(36) NOT NULL,
  `family_id` VARCHAR(36) DEFAULT NULL,
  `nik` CHAR(16) NOT NULL,
  `no_kk` CHAR(16) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `gender` ENUM('Laki-laki', 'Perempuan') NOT NULL,
  `birth_place` VARCHAR(50) NOT NULL,
  `birth_date` DATE NOT NULL,
  `religion` ENUM('Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya') NOT NULL,
  `job` VARCHAR(50) NOT NULL,
  `marital_status` ENUM('Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati') NOT NULL,
  `family_role` ENUM('Kepala Keluarga', 'Istri', 'Anak', 'Famili Lain') NOT NULL,
  `status_domisili` ENUM('Tetap', 'Kontrak', 'Kost', 'Sementara') NOT NULL,
  `status_kependudukan` ENUM('Aktif', 'Pindah', 'Meninggal', 'Nonaktif') NOT NULL DEFAULT 'Aktif',
  `phone` VARCHAR(20) DEFAULT NULL,
  `region_id` VARCHAR(36) NOT NULL,
  `address` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_residents_nik` (`nik`),
  KEY `idx_residents_name` (`name`),
  KEY `idx_residents_family` (`family_id`),
  KEY `idx_residents_region_status` (`region_id`, `status_kependudukan`),
  CONSTRAINT `fk_residents_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_residents_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. letter_types
CREATE TABLE IF NOT EXISTS `letter_types` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `requirements` JSON DEFAULT NULL,
  `processing_time` VARCHAR(50) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_letter_types_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. letter_requests
CREATE TABLE IF NOT EXISTS `letter_requests` (
  `id` VARCHAR(36) NOT NULL,
  `reference_no` VARCHAR(50) NOT NULL,
  `letter_type_id` VARCHAR(36) NOT NULL,
  `resident_id` VARCHAR(36) NOT NULL,
  `region_id` VARCHAR(36) NOT NULL,
  `purpose` TEXT NOT NULL,
  `letter_number` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('Draft', 'Diajukan', 'Perlu Revisi', 'Diproses', 'Disetujui', 'Ditolak', 'Selesai') NOT NULL DEFAULT 'Diajukan',
  `reviewed_by_user_id` VARCHAR(36) DEFAULT NULL,
  `approved_by_user_id` VARCHAR(36) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_letter_requests_ref` (`reference_no`),
  KEY `idx_letter_requests_region_status` (`region_id`, `status`),
  KEY `idx_letter_requests_resident` (`resident_id`),
  CONSTRAINT `fk_letters_type` FOREIGN KEY (`letter_type_id`) REFERENCES `letter_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_letters_resident` FOREIGN KEY (`resident_id`) REFERENCES `residents` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_letters_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_letters_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_letters_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. letter_attachments
CREATE TABLE IF NOT EXISTS `letter_attachments` (
  `id` VARCHAR(36) NOT NULL,
  `letter_request_id` VARCHAR(36) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_size` INT UNSIGNED NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_letter_att_request` (`letter_request_id`),
  CONSTRAINT `fk_letter_att_request` FOREIGN KEY (`letter_request_id`) REFERENCES `letter_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. letter_timeline
CREATE TABLE IF NOT EXISTS `letter_timeline` (
  `id` VARCHAR(36) NOT NULL,
  `letter_request_id` VARCHAR(36) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `note` TEXT DEFAULT NULL,
  `actor_user_id` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_letter_tl_request` (`letter_request_id`),
  CONSTRAINT `fk_letter_tl_request` FOREIGN KEY (`letter_request_id`) REFERENCES `letter_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_letter_tl_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. finance_transactions
CREATE TABLE IF NOT EXISTS `finance_transactions` (
  `id` VARCHAR(36) NOT NULL,
  `transaction_code` VARCHAR(50) NOT NULL,
  `region_id` VARCHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  `type` ENUM('in', 'out') NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `description` TEXT NOT NULL,
  `recorded_by_user_id` VARCHAR(36) NOT NULL,
  `receipt_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('active', 'void') NOT NULL DEFAULT 'active',
  `void_reason` TEXT DEFAULT NULL,
  `voided_by_user_id` VARCHAR(36) DEFAULT NULL,
  `voided_at` DATETIME DEFAULT NULL,
  `audit_note` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_finance_code` (`transaction_code`),
  KEY `idx_finance_region_date` (`region_id`, `date`, `status`),
  CONSTRAINT `fk_finance_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_finance_recorder` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_finance_voider` FOREIGN KEY (`voided_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `table_name` VARCHAR(50) NOT NULL,
  `record_id` VARCHAR(36) NOT NULL,
  `action` ENUM('INSERT', 'UPDATE', 'DELETE', 'VOID') NOT NULL,
  `old_values` JSON DEFAULT NULL,
  `new_values` JSON DEFAULT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_table_record` (`table_name`, `record_id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. dues_types
CREATE TABLE IF NOT EXISTS `dues_types` (
  `id` VARCHAR(36) NOT NULL,
  `region_id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `billing_type` ENUM('per_kk', 'per_resident') NOT NULL DEFAULT 'per_kk',
  `billing_period` ENUM('Bulanan', 'Tahunan', 'Sekali') NOT NULL DEFAULT 'Bulanan',
  `description` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dues_types_region_code` (`region_id`, `code`),
  CONSTRAINT `fk_dues_types_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. dues_bills
CREATE TABLE IF NOT EXISTS `dues_bills` (
  `id` VARCHAR(36) NOT NULL,
  `bill_number` VARCHAR(50) NOT NULL,
  `dues_type_id` VARCHAR(36) NOT NULL,
  `period` VARCHAR(30) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `due_date` DATE NOT NULL,
  `resident_id` VARCHAR(36) NOT NULL,
  `family_id` VARCHAR(36) DEFAULT NULL,
  `region_id` VARCHAR(36) NOT NULL,
  `status` ENUM('Belum Dibayar', 'Menunggu Verifikasi', 'Lunas', 'Terlambat', 'Ditolak', 'Dibatalkan') NOT NULL DEFAULT 'Belum Dibayar',
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `payment_date` DATETIME DEFAULT NULL,
  `payment_proof_url` VARCHAR(255) DEFAULT NULL,
  `verified_by_user_id` VARCHAR(36) DEFAULT NULL,
  `verified_at` DATETIME DEFAULT NULL,
  `verification_notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dues_bills_number` (`bill_number`),
  UNIQUE KEY `uk_dues_bills_subject_period` (`dues_type_id`, `resident_id`, `period`),
  KEY `idx_dues_bills_resident_status` (`resident_id`, `status`),
  KEY `idx_dues_bills_region_period` (`region_id`, `period`),
  CONSTRAINT `fk_dues_bills_type` FOREIGN KEY (`dues_type_id`) REFERENCES `dues_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dues_bills_resident` FOREIGN KEY (`resident_id`) REFERENCES `residents` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dues_bills_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dues_bills_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dues_bills_verifier` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. announcements
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `target_region` VARCHAR(100) NOT NULL,
  `priority` ENUM('Biasa', 'Penting', 'Mendesak') NOT NULL DEFAULT 'Biasa',
  `status` ENUM('Draft', 'Dipublikasikan', 'Diarsipkan') NOT NULL DEFAULT 'Dipublikasikan',
  `publish_date` DATETIME NOT NULL,
  `valid_until` DATE DEFAULT NULL,
  `author_user_id` VARCHAR(36) NOT NULL,
  `region_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_announcements_region_status` (`region_id`, `status`),
  CONSTRAINT `fk_announcements_author` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_announcements_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. complaints
CREATE TABLE IF NOT EXISTS `complaints` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `reporter_id` VARCHAR(36) DEFAULT NULL,
  `reporter_name` VARCHAR(100) NOT NULL,
  `reporter_phone` VARCHAR(20) DEFAULT NULL,
  `region_id` VARCHAR(36) NOT NULL,
  `status` ENUM('Baru', 'Ditinjau', 'Ditindaklanjuti', 'Selesai', 'Ditolak') NOT NULL DEFAULT 'Baru',
  `assigned_to` VARCHAR(100) DEFAULT NULL,
  `photo_url` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_complaints_region_status` (`region_id`, `status`),
  KEY `idx_complaints_reporter` (`reporter_id`),
  CONSTRAINT `fk_complaints_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `residents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_complaints_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. complaint_responses
CREATE TABLE IF NOT EXISTS `complaint_responses` (
  `id` VARCHAR(36) NOT NULL,
  `complaint_id` VARCHAR(36) NOT NULL,
  `author_name` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_complaint_resp_complaint` (`complaint_id`),
  CONSTRAINT `fk_complaint_resp_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. events
CREATE TABLE IF NOT EXISTS `events` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `event_date` DATE NOT NULL,
  `time_string` VARCHAR(50) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `organizer` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('Akan Datang', 'Berlangsung', 'Selesai', 'Dibatalkan') NOT NULL DEFAULT 'Akan Datang',
  `attendees_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `region_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_region_date` (`region_id`, `event_date`, `status`),
  CONSTRAINT `fk_events_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. assets
CREATE TABLE IF NOT EXISTS `assets` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `unit` VARCHAR(20) NOT NULL DEFAULT 'Unit',
  `condition_status` ENUM('Baik', 'Perlu Perbaikan', 'Rusak') NOT NULL DEFAULT 'Baik',
  `location` VARCHAR(150) NOT NULL,
  `pic` VARCHAR(100) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `region_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_assets_code` (`code`),
  KEY `idx_assets_region` (`region_id`),
  CONSTRAINT `fk_assets_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
  `link_tab` VARCHAR(50) DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_unread` (`user_id`, `is_read`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

