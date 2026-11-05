# RTConnect REST API Backend

Backend REST API terpisah untuk **RTConnect — Sistem Pengelolaan Administrasi RT/RW** berbasis Node.js dan Express.js, terintegrasi dengan basis data MySQL 8.0+ sesuai spesifikasi dokumen SOT (`docs/API-SPEC.md`, `docs/DATABASE-SPEC.md`, dan `docs/BUSINESS-RULES.md`).

---

## 1. Fitur Utama

- **Autentikasi & Sesi Aman:** JWT Access Token (1 jam) dan Refresh Token terenkripsi (7 hari) dengan mekanisme pencabutan (*revoke*) pada logout.
- **Otorisasi Berbasis Peran & Isolasi Wilayah (RBAC & Multi-tenant RT/RW):**
  - `super_admin`: Konfigurasi global.
  - `ketua_rw`: Monitoring agregat seluruh RT di bawah RW bersangkutan.
  - `ketua_rt`, `sekretaris`, `bendahara`, `petugas`: Hak akses terisolasi pada `region_id` RT yang ditugaskan.
  - `warga`: Akses terisolasi pada profil pribadi, Kartu Keluarga, tagihan iuran sendiri, dan surat sendiri.
- **Proteksi Data Pribadi (UU PDP):** Identitas internal menggunakan UUID v4. NIK dan No KK diproteksi dari paparan publik.
- **Integritas Audit Keuangan (Zero Hard Delete):** Transaksi buku kas tidak dapat dihapus permanen (`void` soft-cancellation dengan alasan dan jejak audit). Pembayaran tagihan yang diverifikasi membukukan transaksi kas masuk secara atomik via MySQL Transaction.
- **Validasi Server Konsisten:** Respon validasi terstandarisasi dengan kode status `422 VALIDATION_ERROR`.
- **Audit Logging Lengkap:** Mencatat riwayat mutasi kritis pada tabel `audit_logs`.

---

## 2. Prasyarat Sistem

- **Node.js:** v18.0.0 atau lebih baru (Diuji pada v24.22.1)
- **NPM:** v9.0.0 atau lebih baru
- **MySQL:** 8.0+ (InnoDB Engine, utf8mb4)

---

## 3. Langkah Instalasi & Konfigurasi

### 3.1 Clone & Masuk ke Direktori
```bash
cd c:\xampp\htdocs\RTConnectAPI
```

### 3.2 Pasang Dependensi
```bash
npm install
```

### 3.3 Konfigurasi Environment (`.env`)
Salin file `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Sesuaikan parameter koneksi MySQL dan JWT pada `.env`:
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rtconnect_db

JWT_ACCESS_SECRET=rtconnect_super_secret_access_key_2026_xyz
JWT_REFRESH_SECRET=rtconnect_super_secret_refresh_key_2026_xyz
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=*
UPLOAD_DIR=uploads
```

---

## 4. Inisialisasi Basis Data & Seed Data

### 4.1 Import Skema Database (jika belum ada)
Jalankan file DDL `database/schema.sql` pada MySQL:
```bash
mysql -u root -p rtconnect_db < database/schema.sql
```

### 4.2 Update Hash Password Demo
Akun bawaan skema disetel menggunakan kata sandi standar `Password123!`:
```bash
npm run seed:passwords
```

### 4.3 Database Auto Migration (Railway Pre-Deploy)
Mengecek status dan menjalankan migrasi file baru secara bertahap:
```bash
npm run migrate:status
npm run migrate
```
Membuat file migrasi baru:
```bash
npm run migrate:create nama_fitur_baru
```

### 4.4 Seeding Baseline Data (Opsional / Testing)
Mengisi data awal pengumuman, pengaduan, agenda, dan permohonan surat:
```bash
node database/seed-all.js
```

---

## 5. Menjalankan Server

### Mode Development (Hot Reload):
```bash
npm run dev
```

### Mode Production:
```bash
npm start
```

Server akan aktif pada: `http://localhost:5000/api/v1`

---

## 6. Menjalankan Pengujian Otomatis

Suite pengujian komprehensif menguji seluruh alur autentikasi, otorisasi peran/wilayah, CRUD warga, siklus surat, pembukuan kas, verifikasi tagihan atomik, dan integritas audit:

```bash
npm test
```

Hasil pengujian mencakup 29 pengujian integrasi dengan tingkat kelulusan 100%.

---

## 7. Akun Demo Bawaan

| Email | Peran | Wilayah | Password |
|---|---|---|---|
| `ketua.rw@rtconnect.id` | Ketua RW | RW 05 Melati Asri | `Password123!` |
| `ketua.rt01@rtconnect.id` | Ketua RT | RT 01 / RW 05 | `Password123!` |
| `sekretaris@rtconnect.id` | Sekretaris | RT 01 / RW 05 | `Password123!` |
| `bendahara@rtconnect.id` | Bendahara | RT 01 / RW 05 | `Password123!` |
| `petugas@rtconnect.id` | Petugas Lingkungan | RT 01 / RW 05 | `Password123!` |
| `warga@rtconnect.id` | Warga Tetap | RT 01 / RW 05 | `Password123!` |

---

## 8. Ringkasan Endpoint REST API (`/api/v1`)

### 8.1 Autentikasi & Profil
| Method | Endpoint | Keterangan | Akses |
|---|---|---|---|
| `GET` | `/health` | Health check server | Publik |
| `POST` | `/auth/login` | Login (mendapatkan access & refresh token) | Publik (Rate-limited) |
| `POST` | `/auth/logout` | Revoke sesi refresh token | Authenticated |
| `POST` | `/auth/refresh` | Refresh access token baru | Publik |
| `POST` | `/auth/forgot-password` | Pengajuan lupa password | Publik |
| `POST` | `/auth/reset-password` | Reset password dengan token | Publik |
| `GET` | `/me` | Profil pengguna & identitas warga login | Authenticated |
| `PATCH` | `/me` | Perbarui nomor telepon / foto profil | Authenticated |

### 8.2 Dashboard
| Method | Endpoint | Keterangan | Akses |
|---|---|---|---|
| `GET` | `/dashboard/summary` | Statistik agregat sesuai peran & wilayah | Authenticated |
| `GET` | `/dashboard/activities` | Aktivitas terbaru dari audit logs | Authenticated |
| `GET` | `/dashboard/pending-tasks` | Antrean tindakan mendesak (surat/iuran/aduan) | Pengurus |

### 8.3 Wilayah & Kependudukan
| Method | Endpoint | Keterangan | Akses |
|---|---|---|---|
| `GET` | `/regions` | Daftar wilayah yang dapat diakses | Authenticated |
| `GET` | `/residents` | Daftar warga (filter RT, status, search) | Pengurus & Warga (terisolasi) |
| `POST` | `/residents` | Tambah data warga baru | Pengurus |
| `GET` | `/residents/:id` | Detail data warga & informasi keluarga | Terotorisasi |
| `PATCH` | `/residents/:id` | Perbarui data warga | Pengurus & Warga (profil sendiri) |
| `GET` | `/families` | Daftar Kartu Keluarga (KK) | Pengurus & Warga (KK sendiri) |
| `POST` | `/families` | Tambah data Kartu Keluarga baru | Pengurus |
| `GET` | `/families/:id` | Detail KK & daftar anggota keluarga | Terotorisasi |
| `PATCH` | `/families/:id` | Perbarui alamat / kepala keluarga | Pengurus |

### 8.4 Layanan Administrasi Surat
| Method | Endpoint | Keterangan | Akses |
|---|---|---|---|
| `GET` | `/letters/types` | Katalog jenis surat & dokumen prasyarat | Authenticated |
| `GET` | `/letters/requests` | Daftar permohonan surat | Pengurus & Warga |
| `POST` | `/letters/requests` | Ajukan permohonan surat baru | Warga / Pengurus |
| `GET` | `/letters/requests/:id` | Detail permohonan, lampiran & timeline | Terotorisasi |
| `PATCH` | `/letters/requests/:id` | Perbarui draf / revisi dokumen | Pemohon |
| `POST` | `/letters/requests/:id/submit` | Kirim permohonan ke pengurus | Pemohon |
| `POST` | `/letters/requests/:id/review` | Verifikasi (process/revise/approve/reject/complete) | Pengurus Berwenang |
| `GET` | `/letters/requests/:id/document` | Metadata & pratinjau surat resmi terbit | Terotorisasi |

### 8.5 Keuangan & Iuran Lingkungan
| Method | Endpoint | Keterangan | Akses |
|---|---|---|---|
| `GET` | `/finance/summary` | Saldo kas, pemasukan & pengeluaran bulan ini | Pengurus |
| `GET` | `/finance/transactions` | Buku kas umum (in/out, kategori, tanggal) | Pengurus |
| `POST` | `/finance/transactions` | Catat transaksi kas masuk / kas keluar | Bendahara / Ketua |
| `GET` | `/finance/transactions/:id` | Detail transaksi buku kas | Pengurus |
| `PATCH` | `/finance/transactions/:id` | Koreksi transaksi atau pembatalan (`void`) | Bendahara / Ketua |
| `GET` | `/dues/types` | Master jenis & tarif iuran | Authenticated |
| `POST` | `/dues/types` | Buat jenis tarif iuran baru | Bendahara / Ketua |
| `GET` | `/dues/bills` | Daftar tagihan iuran warga | Pengurus & Warga |
| `GET` | `/dues/my-bills` | Tagihan khusus milik warga login | Warga |
| `POST` | `/dues/bills/generate` | Penerbitan tagihan massal per periode | Bendahara / Ketua |
| `GET` | `/dues/bills/:id` | Detail tagihan | Terotorisasi |
| `POST` | `/dues/payments` | Unggah bukti transfer atau catat tunai | Warga / Bendahara |
| `POST` | `/dues/payments/:id/verify` | Verifikasi pembayaran (otomatis bukukan kas) | Bendahara / Ketua |

### 8.6 Pengumuman, Aspirasi, Agenda & Inventaris
| Method | Endpoint | Keterangan | Akses |
|---|---|---|---|
| `GET` | `/announcements` | Warta pengumuman resmi lingkungan | Authenticated |
| `POST` | `/announcements` | Terbitkan pengumuman baru | Pengurus |
| `GET` | `/announcements/:id` | Detail pengumuman | Authenticated |
| `PATCH` | `/announcements/:id` | Perbarui pengumuman | Pengurus |
| `DELETE` | `/announcements/:id` | Arsipkan pengumuman | Pengurus |
| `GET` | `/complaints` | Daftar aspirasi & pengaduan | Authenticated |
| `POST` | `/complaints` | Kirim aspirasi / aduan warga | Authenticated |
| `GET` | `/complaints/:id` | Detail aduan & riwayat tanggapan | Authenticated |
| `PATCH` | `/complaints/:id` | Perbarui status aduan / penugasan petugas | Pengurus |
| `POST` | `/complaints/:id/responses`| Kirim tanggapan resmi pengurus | Pengurus |
| `GET` | `/events` | Kalender agenda kegiatan warga | Authenticated |
| `POST` | `/events` | Buat agenda kegiatan baru | Pengurus |
| `GET` | `/events/:id` | Detail agenda kegiatan | Authenticated |
| `PATCH` | `/events/:id` | Perbarui agenda kegiatan | Pengurus |
| `DELETE` | `/events/:id` | Batalkan agenda kegiatan | Pengurus |
| `GET` | `/assets` | Daftar inventaris sarana prasarana | Pengurus |
| `POST` | `/assets` | Catat aset inventaris baru | Pengurus |
| `GET` | `/assets/:id` | Detail aset | Pengurus |
| `PATCH` | `/assets/:id` | Perbarui kondisi / jumlah aset | Pengurus |

### 8.7 Pengguna, Pengaturan & Notifikasi
| Method | Endpoint | Keterangan | Akses |
|---|---|---|---|
| `GET` | `/users` | Kelola akun pengguna sistem | Admin / Ketua |
| `POST` | `/users` | Daftarkan akun baru | Admin / Ketua |
| `PATCH` | `/users/:id` | Ubah peran / status aktif / password akun | Admin / Ketua |
| `GET` | `/settings/region` | Pengaturan kop surat & rekening kas RT | Authenticated |
| `PATCH` | `/settings/region` | Perbarui kop surat / rekening bank kas | Pengurus |
| `GET` | `/notifications` | Daftar notifikasi in-app pengguna | Authenticated |
| `PATCH` | `/notifications/read-all` | Tandai semua notifikasi sudah dibaca | Authenticated |
| `PATCH` | `/notifications/:id/read` | Tandai notifikasi spesifik sudah dibaca | Authenticated |

---

## 9. Deployment ke Railway (Monorepo Auto Deploy)

Konfigurasi deployment otomatis satu repository ke Railway telah disiapkan melalui `railway.json` dengan perintah migrasi otomatis `npm run migrate` pada tahap *Pre-Deploy*.

Untuk panduan lengkap setup Railway, reference variables, arsitektur private network, dan penambahan migrasi baru, silakan baca [Panduan Deployment Railway](docs/RAILWAY-DEPLOYMENT.md).


