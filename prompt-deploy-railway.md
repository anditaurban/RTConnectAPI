# PROMPT EXECUTION — RAILWAY MONOREPO AUTO DEPLOYMENT (EXPRESS + MYSQL)

## ROLE

Kamu adalah Senior Backend Engineer, DevOps Engineer, dan Database Engineer yang berpengalaman dalam:
- Node.js dan Express.js
- MySQL Database
- Railway Deployment
- GitHub CI/CD
- Database Migration Management
- Monorepo Deployment Architecture

Tugasmu adalah mengimplementasikan konfigurasi deployment otomatis untuk project existing menggunakan Railway dengan pendekatan minimal changes, aman, maintainable, dan production-ready.

## 1. PROJECT OBJECTIVE

Saya ingin melakukan deployment menggunakan ketentuan berikut:

1. Hanya menggunakan **1 Railway Project**.
2. Memiliki tepat **2 Railway Services**:
   - MySQL Service sebagai database.
   - Express API Service sebagai backend REST API.
3. Hanya menggunakan **1 GitHub Repository**.
4. Database MySQL dan codebase Express berada dalam repository yang sama, tetapi berada di folder berbeda.
5. Setiap kali developer melakukan `git push` ke branch deployment, Railway mendeteksi perubahan dan melakukan deployment otomatis.
6. Jika terdapat perubahan database melalui file SQL atau database migration, perubahan tersebut juga diterapkan secara otomatis ke MySQL Railway.
7. Tidak perlu membuat repository baru, Railway Project baru, atau service database tambahan.

## 2. CRITICAL RULES — WAJIB DIPATUHI

Sebelum melakukan perubahan, patuhi seluruh ketentuan berikut:

- JANGAN mengubah nama folder existing.
- JANGAN mengubah struktur folder existing.
- JANGAN memindahkan file atau direktori existing.
- JANGAN menghapus file konfigurasi existing.
- JANGAN membuat ulang project Express.
- JANGAN mengganti framework, library, atau database driver yang sudah digunakan tanpa alasan teknis yang kuat.
- JANGAN mengubah nama endpoint, routes, controllers, models, atau business logic.
- JANGAN merusak konfigurasi environment variables existing.
- JANGAN melakukan reset database saat deployment.
- JANGAN menjalankan ulang full SQL dump setiap kali GitHub menerima push.
- JANGAN menghapus, truncate, atau overwrite data produksi.
- JANGAN membuat Railway service ketiga.
- JANGAN hardcode database credentials.
- JANGAN melakukan refactoring yang tidak berhubungan dengan kebutuhan deployment.

**Prinsip utama: ADAPT EXISTING PROJECT, NOT REBUILD EXISTING PROJECT.**

Jika perlu menambahkan file baru, tempatkan di direktori existing yang paling sesuai. Jangan membuat struktur folder baru jika fungsi yang dibutuhkan bisa diimplementasikan melalui struktur yang sudah tersedia.

## 3. PHASE 1 — REPOSITORY AUDIT

Sebelum menulis atau mengubah kode:

1. Scan seluruh repository.
2. Identifikasi folder Express API.
3. Identifikasi folder database.
4. Temukan seluruh file `.sql`.
5. Periksa package.json dan package-lock.json.
6. Identifikasi entry point Express.
7. Identifikasi database configuration.
8. Identifikasi database driver yang digunakan.
9. Periksa environment variables yang dibutuhkan.
10. Identifikasi apakah sudah ada sistem migration.
11. Periksa apakah file SQL merupakan:
    - Full database dump.
    - Database schema.
    - Initial seed data.
    - Database migration.
    - Kombinasi dari beberapa jenis tersebut.

Jangan berasumsi bahwa file SQL hanya berisi CREATE TABLE.

Buat ringkasan audit sebelum implementasi.

## 4. PHASE 2 — RAILWAY ARCHITECTURE

Target arsitektur:

GitHub Repository
- Express API folder.
- Database folder.
- SQL files.
- Existing configuration.

Railway Project:
- Service 1: MySQL.
- Service 2: Express API.

Keduanya harus berada dalam satu Railway Project.

### MySQL Service

MySQL menggunakan managed database service dari Railway.

Persyaratan:
- Database menggunakan persistent storage.
- Database credentials menggunakan Railway variables.
- Komunikasi Express ke MySQL menggunakan private networking.
- Database tidak harus diekspos ke public internet.
- Jangan menjalankan MySQL server kedua dari Express container.

### Express API Service

Express API menggunakan GitHub repository yang sama.

Persyaratan:
- Root Directory harus disesuaikan dengan lokasi Express existing.
- Jangan mengubah lokasi folder Express.
- Build dan Start Command harus mengikuti package.json existing.
- Menggunakan process.env.PORT.
- Listen pada 0.0.0.0.
- Public domain hanya untuk Express API.

Konfigurasikan Railway monorepo deployment agar perubahan folder backend maupun database dapat memicu deployment yang diperlukan.

Perhatikan bahwa jika Railway hanya melakukan deployment berdasarkan perubahan folder Express, perubahan migration di folder database juga harus tetap dapat memicu deployment Express atau migration runner.

## 5. PHASE 3 — DATABASE AUTO MIGRATION

Implementasikan mekanisme database migration otomatis.

Tujuan:
Setiap perubahan SQL yang di-push ke GitHub dapat diterapkan ke MySQL Railway tanpa import manual berulang kali.

Persyaratan:

1. Identifikasi mekanisme migration existing sebelum membuat sistem baru.
2. Jika sudah ada migration system yang sesuai, gunakan sistem tersebut.
3. Jika belum ada, implementasikan migration runner yang kompatibel dengan MySQL dan database driver existing.
4. Migration dijalankan menggunakan Railway Pre-Deploy Command atau mekanisme deployment yang setara.
5. Migration hanya menjalankan perubahan yang belum pernah dieksekusi.
6. Migration history harus disimpan di database MySQL Railway.
7. Migration harus dijalankan secara serial.
8. Implementasikan migration lock untuk mencegah eksekusi bersamaan.
9. Jika migration gagal, deployment baru harus dihentikan.
10. Migration yang sudah sukses tidak boleh dijalankan ulang.
11. Migration yang sudah pernah diterapkan tidak boleh diedit untuk mengubah histori.
12. Perubahan berikutnya harus menggunakan migration file baru.

Contoh penamaan migration (hanya contoh, bukan kewajiban mengubah struktur):

001_create_users.sql
002_create_products.sql
003_add_phone_to_users.sql
004_create_orders.sql

Gunakan timestamp atau penomoran konsisten sesuai konvensi project existing.

### Initial Database

Perlakukan full SQL dump existing sebagai initial database baseline.

Jangan otomatis mengeksekusi ulang full SQL dump setiap kali deployment.

Jika database existing belum memiliki migration history:
- Analisis tabel dan struktur database existing.
- Tentukan strategi baseline.
- Pastikan migration awal tidak membuat tabel yang sudah ada.
- Jangan menghapus atau menimpa data existing.
- Sediakan prosedur initial import yang aman.

Jika file SQL berisi DROP DATABASE, DROP TABLE, TRUNCATE, atau destructive statements, identifikasi dan berikan peringatan sebelum menerapkannya ke production.

### Migration Safety

- Validasi SQL sebelum eksekusi jika memungkinkan.
- Jangan menganggap semua MySQL DDL dapat di-rollback menggunakan transaction.
- Hindari perubahan breaking yang langsung merusak versi API aktif.
- Gunakan pendekatan expand-and-contract untuk perubahan skema yang membutuhkan kompatibilitas.
- Catat nama file, checksum, waktu eksekusi, dan status migration.
- Jika checksum migration yang sudah diterapkan berubah, hentikan proses dan tampilkan error yang jelas.
- Jangan otomatis menghapus atau mengulang migration gagal tanpa pemeriksaan kondisi database.

## 6. PHASE 4 — ENVIRONMENT VARIABLES

Audit environment variables existing dan pertahankan nama variable yang sudah digunakan aplikasi jika memungkinkan.

Jika perlu menggunakan Railway reference variables, konfigurasi secara konseptual seperti:

DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

Nama `MySQL` harus menyesuaikan nama service Railway.

Jika project existing menggunakan MYSQL_HOST, DB_HOST, DATABASE_URL, atau nama lainnya, adaptasikan konfigurasi tanpa merusak kompatibilitas.

Jangan memasukkan credentials ke source code, GitHub, atau file SQL.

Pastikan `.env` tidak ter-commit.

Buat atau perbarui dokumentasi `.env.example` tanpa nilai credentials asli.

## 7. PHASE 5 — GITHUB AUTO DEPLOYMENT

Konfigurasikan deployment workflow:

Developer melakukan:

git add .
git commit -m "feat: update application and database"
git push origin main

Expected workflow:

1. GitHub menerima push.
2. Railway mendeteksi perubahan.
3. Railway membangun Express API.
4. Railway menjalankan database migration.
5. Migration runner memeriksa migration history.
6. Migration baru diterapkan ke MySQL.
7. Jika migration sukses, deployment Express dilanjutkan.
8. Jika migration gagal, deployment baru dihentikan.
9. Versi API sebelumnya tetap menjadi versi aktif jika deployment gagal.

Pastikan perubahan di folder SQL juga dapat memicu proses deployment yang menjalankan migration, meskipun source code Express tidak berubah.

Jangan membuat GitHub Actions tambahan jika Railway sudah bisa menangani kebutuhan tersebut secara langsung.

Jika ada keterbatasan Railway yang membuat workflow tidak dapat dipenuhi, jelaskan keterbatasannya dan pilih solusi paling sederhana tanpa menambah Railway Service.

## 8. PHASE 6 — DATABASE OPERATION

Pastikan implementasi mendukung:

- CREATE TABLE.
- ALTER TABLE.
- ADD COLUMN.
- MODIFY COLUMN.
- CREATE INDEX.
- ADD FOREIGN KEY.
- INSERT initial/reference data.
- UPDATE data yang memang diperlukan.

Untuk perubahan data produksi, pastikan migration bersifat eksplisit dan tidak melakukan overwrite massal tanpa alasan.

Migration harus idempotent dalam konteks pencatatan eksekusi: satu migration yang sukses tidak dieksekusi kembali.

## 9. PHASE 7 — TESTING

Lakukan validasi implementasi:

1. Express bisa berjalan secara lokal.
2. Express dapat terhubung ke MySQL.
3. Migration runner dapat berjalan.
4. Migration history tercatat.
5. Migration lama tidak dijalankan ulang.
6. Migration baru terdeteksi.
7. Migration gagal menghentikan deployment baru.
8. Database existing tidak kehilangan data.
9. Environment variables tidak hardcode.
10. Konfigurasi Railway sesuai struktur repository.

Jika tidak memiliki akses Railway production, jangan mengklaim sudah melakukan deployment.

Lakukan pengujian lokal dan berikan instruksi manual untuk konfigurasi dashboard Railway.

## 10. PHASE 8 — DOCUMENTATION

Buat atau perbarui dokumentasi deployment di lokasi dokumentasi existing.

Dokumentasi minimal mencakup:

- Arsitektur satu Railway Project dengan dua service.
- Konfigurasi Root Directory Express.
- Konfigurasi Railway variables.
- Konfigurasi Build dan Start Command.
- Konfigurasi Pre-Deploy Command.
- Prosedur initial SQL import.
- Cara membuat migration baru.
- Cara push perubahan ke GitHub.
- Cara memeriksa migration history.
- Cara troubleshooting migration gagal.
- Cara melakukan rollback aplikasi dan pemulihan database.
- Catatan keamanan database production.

Berikan contoh workflow yang bisa digunakan developer lain.

## 11. FINAL EXECUTION REPORT

Setelah implementasi selesai, tampilkan laporan:

### A. Repository Audit
- Struktur folder existing.
- Lokasi Express.
- Lokasi database SQL.
- Database driver.
- Existing migration system.

### B. Files Changed
Daftar file yang dibuat dan dimodifikasi beserta alasan.

### C. Railway Configuration
- Service MySQL.
- Service Express API.
- Root Directory.
- Build Command.
- Start Command.
- Pre-Deploy Command.
- Required environment variables.
- Networking configuration.

### D. Database Migration
- Migration mechanism.
- Migration history.
- Initial baseline strategy.
- Migration safety mechanism.

### E. Testing Results
Status setiap pengujian yang benar-benar dilakukan.

### F. Manual Railway Setup
Langkah dashboard yang masih harus dilakukan oleh developer.

### G. Deployment Workflow
Berikan langkah penggunaan dari Git commit hingga database dan Express API berhasil diperbarui.

## FINAL PRINCIPLE

Prioritaskan implementasi yang:
- Tidak mengubah struktur folder existing.
- Tidak mengganti nama file dan folder existing.
- Tidak merusak business logic.
- Tidak menghapus data database.
- Menggunakan satu GitHub repository.
- Menggunakan satu Railway Project.
- Menggunakan tepat dua Railway Services: MySQL dan Express API.
- Mengotomatisasi penerapan database migration setiap push yang relevan.
- Aman untuk production.
- Mudah dipahami dan dikelola oleh developer lain.

Jangan berhenti pada rekomendasi atau contoh kode. Setelah audit, lanjutkan implementasi nyata pada repository sesuai kemampuan dan akses yang tersedia.

Jika ada keputusan yang berisiko terhadap data production, jangan mengeksekusinya secara otomatis. Jelaskan risiko dan minta persetujuan terlebih dahulu.