-- =====================================================================
-- RTConnect — Database Schema DDL (MySQL 8.0+)
-- Storage Engine: InnoDB
-- Character Set: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. TABEL: regions (Hierarki Wilayah RW dan RT)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `regions`;
CREATE TABLE `regions` (
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

-- ---------------------------------------------------------------------
-- 2. TABEL: system_settings (Pengaturan Wilayah, Rekening & Kop Surat)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
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

-- ---------------------------------------------------------------------
-- 3. TABEL: users (Akun Login & Hak Akses Role)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
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

-- ---------------------------------------------------------------------
-- 4. TABEL: user_refresh_tokens (Sesi Token Refresh JWT)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `user_refresh_tokens`;
CREATE TABLE `user_refresh_tokens` (
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

-- ---------------------------------------------------------------------
-- 5. TABEL: families (Kartu Keluarga / KK)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `families`;
CREATE TABLE `families` (
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

-- ---------------------------------------------------------------------
-- 6. TABEL: residents (Data Individu Kependudukan)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `residents`;
CREATE TABLE `residents` (
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

-- Tambahkan FK head_resident_id pada families setelah residents ada
ALTER TABLE `families`
  ADD CONSTRAINT `fk_families_head_resident` FOREIGN KEY (`head_resident_id`) REFERENCES `residents` (`id`) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 7. TABEL: letter_types (Katalog Jenis Surat)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `letter_types`;
CREATE TABLE `letter_types` (
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

-- ---------------------------------------------------------------------
-- 8. TABEL: letter_requests (Permohonan Surat Warga)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `letter_requests`;
CREATE TABLE `letter_requests` (
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

-- ---------------------------------------------------------------------
-- 9. TABEL: letter_attachments (Lampiran Dokumen Surat)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `letter_attachments`;
CREATE TABLE `letter_attachments` (
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

-- ---------------------------------------------------------------------
-- 10. TABEL: letter_timeline (Riwayat Log Status Surat)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `letter_timeline`;
CREATE TABLE `letter_timeline` (
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

-- ---------------------------------------------------------------------
-- 11. TABEL: finance_transactions (Buku Kas Masuk & Kas Keluar)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `finance_transactions`;
CREATE TABLE `finance_transactions` (
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

-- ---------------------------------------------------------------------
-- 12. TABEL: audit_logs (Log Jejak Audit Seluruh Mutasi Kritis)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
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

-- ---------------------------------------------------------------------
-- 13. TABEL: dues_types (Master Tarif Iuran Lingkungan)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `dues_types`;
CREATE TABLE `dues_types` (
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

-- ---------------------------------------------------------------------
-- 14. TABEL: dues_bills (Daftar Tagihan Iuran Warga/KK)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `dues_bills`;
CREATE TABLE `dues_bills` (
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

-- ---------------------------------------------------------------------
-- 15. TABEL: announcements (Pengumuman & Warta Wilayah)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
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

-- ---------------------------------------------------------------------
-- 16. TABEL: complaints (Aspirasi & Laporan Pengaduan Warga)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `complaints`;
CREATE TABLE `complaints` (
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

-- ---------------------------------------------------------------------
-- 17. TABEL: complaint_responses (Tanggapan Pengurus atas Aduan)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `complaint_responses`;
CREATE TABLE `complaint_responses` (
  `id` VARCHAR(36) NOT NULL,
  `complaint_id` VARCHAR(36) NOT NULL,
  `author_name` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_complaint_resp_complaint` (`complaint_id`),
  CONSTRAINT `fk_complaint_resp_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 18. TABEL: events (Kalender Agenda & Kegiatan Lingkungan)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
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

-- ---------------------------------------------------------------------
-- 19. TABEL: assets (Pencatatan Inventaris Sarana Prasarana Lingkungan)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `assets`;
CREATE TABLE `assets` (
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

-- ---------------------------------------------------------------------
-- 20. TABEL: notifications (Penyimpanan Notifikasi In-App)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
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

-- ---------------------------------------------------------------------
-- 21. DATA AWAL (SEEDING BASELINE DARI MOCK DATA)
-- ---------------------------------------------------------------------

-- 1. Wilayah
INSERT INTO `regions` (`id`, `parent_id`, `type`, `code`, `name`, `leader_name`) VALUES
('rw-05', NULL, 'RW', 'RW-05', 'RW 05 Melati Asri', 'Bpk. Bambang Sutrisno'),
('rt-01', 'rw-05', 'RT', 'RT-01', 'RT 01 / RW 05', 'Bpk. Joko Widodo M.'),
('rt-02', 'rw-05', 'RT', 'RT-02', 'RT 02 / RW 05', 'Bpk. Hendra Gunawan'),
('rt-03', 'rw-05', 'RT', 'RT-03', 'RT 03 / RW 05', 'Bpk. Suryanto'),
('rt-04', 'rw-05', 'RT', 'RT-04', 'RT 04 / RW 05', 'Bpk. Dedi Supriyadi'),
('rt-05', 'rw-05', 'RT', 'RT-05', 'RT 05 / RW 05', 'Bpk. Kuswanto');

-- 2. Konfigurasi Sistem Wilayah
INSERT INTO `system_settings` (`id`, `region_id`, `setting_key`, `setting_value`) VALUES
('set-bank-rt1', 'rt-01', 'bank_account', JSON_OBJECT('bankName', 'Bank Central Asia (BCA)', 'accountNumber', '8820-1928-33', 'accountHolder', 'KAS RT 01 RW 05')),
('set-header-rt1', 'rt-01', 'letter_header', JSON_OBJECT('government', 'PEMERINTAH KOTA ADMINISTRASI JAKARTA BARAT', 'district', 'KECAMATAN KEBON JERUK — KELURAHAN KEBON JERUK', 'neighborhood', 'RUKUN WARGA 05 / RUKUN TETANGGA 01', 'address', 'Sekretariat: Jl. Mawar Indah Blok B1 No. 01, Telp: 0813-1122-3344')),
('set-contact-rt1', 'rt-01', 'contact_center', JSON_OBJECT('phone', '0812-9876-5432'));

-- 3. Akun Pengguna
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `region_id`, `resident_id`, `name`, `phone`, `avatar_url`) VALUES
('user-rw', 'ketua.rw@rtconnect.id', '$2y$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhashforauthrw', 'ketua_rw', 'rw-05', NULL, 'Bpk. Bambang Sutrisno', '0812-9876-5432', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
('user-rt1', 'ketua.rt01@rtconnect.id', '$2y$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhashforauthrt1', 'ketua_rt', 'rt-01', NULL, 'Bpk. Joko Widodo M.', '0813-1122-3344', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
('user-sekre', 'sekretaris@rtconnect.id', '$2y$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhashforauthsek', 'sekretaris', 'rt-01', NULL, 'Ibu Siti Rahayu', '0812-4455-6677', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'),
('user-benda', 'bendahara@rtconnect.id', '$2y$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhashforauthbnd', 'bendahara', 'rt-01', NULL, 'Ibu Dewi Anggraeni', '0813-7788-9900', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'),
('user-petugas', 'petugas@rtconnect.id', '$2y$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhashforauthptg', 'petugas', 'rt-01', NULL, 'Bpk. Agus Saputra', '0815-3344-5566', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'),
('user-warga1', 'warga@rtconnect.id', '$2y$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhashforauthwrg', 'warga', 'rt-01', 'res-01', 'Ahmad Ridwan', '0812-8899-0011', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');

-- 4. Keluarga & Warga
INSERT INTO `families` (`id`, `no_kk`, `region_id`, `address`) VALUES
('fam-01', '3171012309870001', 'rt-01', 'Jl. Mawar Indah Blok B2 No. 14, RT 01 / RW 05'),
('fam-02', '3171012309870002', 'rt-01', 'Jl. Mawar Indah Blok B1 No. 01, RT 01 / RW 05'),
('fam-03', '3171012309870003', 'rt-01', 'Jl. Mawar Indah Blok B3 No. 05, RT 01 / RW 05'),
('fam-04', '3171012309870004', 'rt-01', 'Jl. Mawar Indah Blok B2 No. 08, RT 01 / RW 05');

INSERT INTO `residents` (`id`, `family_id`, `nik`, `no_kk`, `name`, `gender`, `birth_place`, `birth_date`, `religion`, `job`, `marital_status`, `family_role`, `status_domisili`, `status_kependudukan`, `phone`, `region_id`, `address`) VALUES
('res-01', 'fam-01', '3171011508890002', '3171012309870001', 'Ahmad Ridwan', 'Laki-laki', 'Jakarta', '1989-08-15', 'Islam', 'Karyawan Swasta', 'Kawin', 'Kepala Keluarga', 'Tetap', 'Aktif', '0812-8899-0011', 'rt-01', 'Jl. Mawar Indah Blok B2 No. 14'),
('res-02', 'fam-01', '3171015204910003', '3171012309870001', 'Nurul Hidayati', 'Perempuan', 'Bandung', '1991-04-12', 'Islam', 'Ibu Rumah Tangga', 'Kawin', 'Istri', 'Tetap', 'Aktif', '0812-8899-0012', 'rt-01', 'Jl. Mawar Indah Blok B2 No. 14'),
('res-03', 'fam-01', '3171011002160004', '3171012309870001', 'Fadhil Pratama Ridwan', 'Laki-laki', 'Jakarta', '2016-02-10', 'Islam', 'Pelajar', 'Belum Kawin', 'Anak', 'Tetap', 'Aktif', '-', 'rt-01', 'Jl. Mawar Indah Blok B2 No. 14'),
('res-04', 'fam-02', '3171012201750005', '3171012309870002', 'Bpk. Joko Widodo Mulyono', 'Laki-laki', 'Solo', '1975-01-22', 'Islam', 'Wiraswasta', 'Kawin', 'Kepala Keluarga', 'Tetap', 'Aktif', '0813-1122-3344', 'rt-01', 'Jl. Mawar Indah Blok B1 No. 01'),
('res-05', 'fam-03', '3171016509780006', '3171012309870003', 'Ibu Siti Rahayu', 'Perempuan', 'Yogyakarta', '1978-09-25', 'Islam', 'Guru', 'Kawin', 'Kepala Keluarga', 'Tetap', 'Aktif', '0812-4455-6677', 'rt-01', 'Jl. Mawar Indah Blok B3 No. 05'),
('res-06', 'fam-04', '3171015112830007', '3171012309870004', 'Ibu Dewi Anggraeni', 'Perempuan', 'Semarang', '1983-12-11', 'Islam', 'Akuntan Swasta', 'Kawin', 'Kepala Keluarga', 'Tetap', 'Aktif', '0813-7788-9900', 'rt-01', 'Jl. Mawar Indah Blok B2 No. 08');

UPDATE `families` SET `head_resident_id` = 'res-01' WHERE `id` = 'fam-01';
UPDATE `families` SET `head_resident_id` = 'res-04' WHERE `id` = 'fam-02';
UPDATE `families` SET `head_resident_id` = 'res-05' WHERE `id` = 'fam-03';
UPDATE `families` SET `head_resident_id` = 'res-06' WHERE `id` = 'fam-04';

-- 5. Jenis Surat
INSERT INTO `letter_types` (`id`, `code`, `name`, `description`, `requirements`, `processing_time`, `is_active`) VALUES
('lt-01', 'SK-DOM', 'Surat Keterangan Domisili', 'Keterangan tempat tinggal resmi bagi warga tetap maupun warga berdomisili sementara.', JSON_ARRAY('Foto KTP Pemohon', 'Foto Kartu Keluarga (KK)', 'Bukti Kepemilikan Rumah atau Surat Sewa/Kontrak'), '1 - 2 Hari Kerja', 1),
('lt-02', 'SP-KTP', 'Surat Pengantar Pembuatan / Perubahan KTP-el', 'Pengantar pengurusan KTP baru, penggantian rusak, atau hilang ke Kantor Kelurahan.', JSON_ARRAY('Foto Kartu Keluarga (KK)', 'Foto KTP Lama (jika perpanjangan/rusak)', 'Surat Keterangan Hilang Polsek (jika hilang)'), '1 Hari Kerja', 1),
('lt-03', 'SKTM', 'Surat Keterangan Tidak Mampu (SKTM)', 'Keterangan kondisi ekonomi untuk keperluan keringanan biaya pendidikan/kesehatan.', JSON_ARRAY('Foto KTP Pemohon & Kepala Keluarga', 'Foto Kartu Keluarga', 'Surat Pernyataan Penghasilan bermeterai'), '2 - 3 Hari Kerja', 1),
('lt-04', 'SKU', 'Surat Keterangan Usaha (SKU)', 'Pengantar legalitas keberadaan usaha mikro/rumahan di lingkungan tempat tinggal.', JSON_ARRAY('Foto KTP Pemohon', 'Foto KK', 'Foto Tempat & Aktivitas Usaha'), '1 - 2 Hari Kerja', 1),
('lt-05', 'SIK', 'Surat Izin Keramaian Lingkungan', 'Pemberitahuan & persetujuan izin mengadakan hajatan, tenda, atau acara keluarga.', JSON_ARRAY('Foto KTP Penyelenggara', 'Surat Kesepakatan Tetangga Terdekat', 'Jadwal dan Rundown Acara'), '2 Hari Kerja', 1);

-- 6. Jenis Tarif Iuran
INSERT INTO `dues_types` (`id`, `region_id`, `code`, `name`, `amount`, `billing_type`, `billing_period`, `description`, `is_active`) VALUES
('dt-01', 'rt-01', 'IUR-KEB', 'Iuran Kebersihan & Sampah', 35000.00, 'per_kk', 'Bulanan', 'Retribusi pengangkutan sampah rumah tangga mingguan', 1),
('dt-02', 'rt-01', 'IUR-KMN', 'Iuran Keamanan & Ronda', 50000.00, 'per_kk', 'Bulanan', 'Honor petugas ronda malam dan pemeliharaan CCTV gang', 1),
('dt-03', 'rt-01', 'IUR-SOS', 'Iuran Sosial & Kematian', 15000.00, 'per_kk', 'Bulanan', 'Dana santunan musibah kemalangan keluarga warga', 1),
('dt-04', 'rt-01', 'IUR-17AN', 'Iuran Semarak HUT Kemerdekaan RI', 25000.00, 'per_resident', 'Sekali', 'Penyelenggaraan perlombaan dan panggung gembira', 1);

-- 7. Transaksi Keuangan
INSERT INTO `finance_transactions` (`id`, `transaction_code`, `region_id`, `date`, `type`, `category`, `amount`, `description`, `recorded_by_user_id`, `receipt_url`, `status`) VALUES
('fin-01', 'TRX-202608-001', 'rt-01', '2026-08-01', 'in', 'Iuran Warga', 2400000.00, 'Penerimaan kolektif iuran bulanan kebersihan & keamanan warga RT 01 (Periode Juli-Agustus)', 'user-benda', 'bukti-kas-01.jpg', 'active'),
('fin-02', 'TRX-202608-002', 'rt-01', '2026-08-03', 'out', 'Kebersihan & Lingkungan', 650000.00, 'Honor petugas angkut sampah lingkungan RT 01 dan pengadaan karung sampah besar', 'user-benda', 'nota-sampah-01.jpg', 'active'),
('fin-03', 'TRX-202608-003', 'rt-01', '2026-08-06', 'out', 'Pemeliharaan Fasilitas', 420000.00, 'Penggantian 6 unit lampu LED penerangan jalan gang Mawar 2 dan kabel instalasi', 'user-benda', 'nota-lampu.jpg', 'active'),
('fin-04', 'TRX-202608-004', 'rt-01', '2026-08-08', 'in', 'Sumbangan & Donasi', 1500000.00, 'Sumbangan swadaya donatur warga untuk kegiatan peringatan HUT RI ke-81', 'user-benda', 'bukti-transfer-donasi.jpg', 'active');

-- 8. Inventaris Aset
INSERT INTO `assets` (`id`, `code`, `name`, `category`, `quantity`, `unit`, `condition_status`, `location`, `pic`, `notes`, `region_id`) VALUES
('ast-01', 'AST-TND-01', 'Tenda Terop Pesta Ukuran 4x6 Meter', 'Tenda & Terpal', 2, 'Unit', 'Baik', 'Gudang Balai Warga RW 05', 'Bpk. Agus Saputra (Petugas)', 'Kain terpal putih-biru lengkap rangka pipa', 'rt-01'),
('ast-02', 'AST-KRS-01', 'Kursi Lipat Besi (Merk Chitose)', 'Mebel & Perlengkapan', 120, 'Buah', 'Baik', 'Gudang Balai Warga RW 05', 'Bpk. Agus Saputra (Petugas)', '110 mulus, 10 buah baut agak kendor', 'rt-01'),
('ast-03', 'AST-SND-01', 'Sound System Portable Wireless & 2 Mic UHF', 'Elektronik & Audio', 1, 'Set', 'Baik', 'Rumah Sekretaris RT 01', 'Ibu Siti Rahayu', 'Baterai rechargeable normal 4 jam', 'rt-01');

SET FOREIGN_KEY_CHECKS = 1;
