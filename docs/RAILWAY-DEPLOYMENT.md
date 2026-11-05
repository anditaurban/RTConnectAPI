# Panduan Deployment Otomatis Railway (Express API + MySQL Monorepo)

Dokumen ini menjelaskan arsitektur, konfigurasi, dan workflow deployment otomatis **RTConnect API** ke **Railway** dengan integrasi database MySQL terkelola dan sistem migrasi otomatis (*pre-deploy auto migration*).

---

## 1. Arsitektur Deployment (1 Project, 2 Services)

```text
┌─────────────────────────────────────────────────────────────┐
│                      Railway Project                        │
│                                                             │
│   ┌──────────────────────────┐    Private Network           │
│   │   Service 1: MySQL       │ ◄───────────────────┐        │
│   │   (Managed Database)     │                     │        │
│   │   Host: mysql.railway... │                     │        │
│   │   Port: 3306             │                     │        │
│   └──────────────────────────┘                     │        │
│                                                    │        │
│   ┌──────────────────────────┐                     │        │
│   │   Service 2: Express API │─────────────────────┘        │
│   │   Pre-Deploy: migrate    │                              │
│   │   Start: npm start       │ ◄─── Public Internet         │
│   │   Domain: *.up.railway.app│      (Frontend / Mobile App) │
│   └──────────────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ GitHub Push (Auto Deploy)
┌──────────────────────────────┴──────────────────────────────┐
│                  1 Monorepo GitHub Repository               │
│  - src/ (Express API)                                       │
│  - database/migrations/ (Auto Migration SQL)               │
│  - railway.json (Deployment Configuration)                  │
└─────────────────────────────────────────────────────────────┘
```

- **1 Railway Project:** Menampung seluruh infrastruktur backend dan database.
- **2 Railway Services:**
  1. `MySQL`: Managed MySQL 8.0+ service dengan persistent volume.
  2. `Express API`: Node.js Express application yang terhubung ke repository GitHub.
- **Private Networking:** Komunikasi Express API ke MySQL dilakukan melalui jaringan internal Railway (`${{MySQL.MYSQL_URL}}` atau private host), tidak melewati kuota egress internet publik.

---

## 2. Konfigurasi Service Railway

### 2.1 MySQL Service
- Dibuat via dashboard: **+ New -> Database -> Add MySQL**.
- Persistent Storage: Otomatis di-mount oleh Railway.
- Database default: `rtconnect_db` (atau `railway`).

### 2.2 Express API Service
- Dihubungkan ke GitHub repository: **+ New -> GitHub Repo -> RTConnectAPI**.
- **Root Directory:** `/` (default root repository).
- **Build Command:** Otomatis dikelola oleh Nixpacks (`npm install`).
- **Pre-Deploy Command:** `npm run migrate` (didefinisikan pada `railway.json` atau dashboard).
- **Start Command:** `npm start` (menjalankan `node src/server.js`).
- **Listen Address:** `0.0.0.0` pada `process.env.PORT`.

---

## 3. Konfigurasi Environment Variables di Railway

Pada tab **Variables** service Express API di Railway Dashboard, atur variabel berikut menggunakan fitur **Railway Reference Variables**:

| Variable Key | Nilai di Railway (Reference Variable) | Keterangan |
|---|---|---|
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` | URL koneksi private internal Railway |
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` | Host internal (contoh: `mysql.railway.internal`) |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` | Port internal MySQL (`3306`) |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` | Username root MySQL |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` | Password aman MySQL |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` | Nama database (`rtconnect_db`) |
| `NODE_ENV` | `production` | Mode runtime Express |
| `JWT_ACCESS_SECRET` | *(string acak 64 karakter)* | Secret kunci token JWT access |
| `JWT_REFRESH_SECRET`| *(string acak 64 karakter)* | Secret kunci token JWT refresh |
| `CORS_ORIGIN` | `*` *(atau domain frontend)* | Izin domain web frontend |

> **Catatan Keamanan:** Jangan pernah meng-commit file `.env` ke GitHub. Kredensial produksi hanya berada di Railway Variables.

---

## 4. Mekanisme Auto Migration Database

Setiap kali Railway melakukan deployment, Railway akan mengeksekusi **Pre-Deploy Command** (`npm run migrate`) terlebih dahulu:

1. **Advisory Lock:** Migrator mengambil lock eksklusif `rtconnect_migrator_lock` agar tidak terjadi balapan proses saat redeploy paralel.
2. **Tabel Histori (`_migrations`):** Jika tabel `_migrations` belum ada, tabel akan dibuat secara otomatis.
3. **Deteksi Baseline:** Jika basis data sudah berisi tabel (misal dari setup awal), file `001_initial_schema.sql` otomatis ditandai sebagai baseline sukses tanpa melakukan `DROP` atau overwrite tabel.
4. **Verifikasi Checksum (Anti-Tampering):** Setiap migrasi yang sudah pernah sukses dieksekusi akan dicek hash SHA-256-nya. Jika file lama diubah isinya di Git, proses langsung berhenti dengan kode error `1` guna mencegah korupsi data produksi.
5. **Eksekusi Serial:** File migrasi baru di folder `database/migrations/` dieksekusi satu per satu secara berurutan.
6. **Kegagalan & Proteksi Deployment:** Jika ada satu perintah SQL yang gagal, migrator keluar dengan exit code `1`. Railway mendeteksi exit code non-zero dan **langsung membatalkan rilis kontainer baru**, sehingga kontainer versi sebelumnya tetap aktif melayani pengguna (*zero downtime & zero broken state*).

---

## 5. Workflow Penambahan Fitur & Migrasi Baru

### 5.1 Membuat File Migrasi Baru
Jalankan perintah berikut di komputer lokal:
```bash
npm run migrate:create nama_perubahan_kolom
```
Perintah di atas akan membuat file baru di `database/migrations/` dengan penomoran berurutan, contoh: `database/migrations/003_nama_perubahan_kolom.sql`.

### 5.2 Menulis Pernyataan SQL
Buka file migrasi yang baru dibuat dan tuliskan DDL/DML yang dibutuhkan, contoh:
```sql
ALTER TABLE `residents`
  ADD COLUMN `blood_type` ENUM('A', 'B', 'AB', 'O') DEFAULT NULL AFTER `gender`;
```

### 5.3 Memeriksa Status Migrasi
```bash
npm run migrate:status
```

### 5.4 Menguji Migrasi di Lokal
```bash
npm run migrate
npm test
```

### 5.5 Push ke GitHub untuk Auto Deploy
```bash
git add .
git commit -m "feat: add blood_type to residents"
git push origin main
```

**Alur Otomatis di Railway:**
1. GitHub webhook memberi tahu Railway bahwa ada commit baru di branch `main`.
2. Railway mendownload source code dan menjalankan build Nixpacks.
3. Railway mengeksekusi `preDeployCommand`: `npm run migrate`.
4. Migrator membaca `database/migrations/`, menemukan migrasi baru, mengeksekusinya ke MySQL Railway, dan mencatatnya ke `_migrations`.
5. Setelah migrasi sukses, Railway menyalakan kontainer Express API baru.
6. Health check tercapai, trafik dialihkan ke kontainer baru secara mulus.

---

## 6. Prosedur Rollback & Troubleshooting

### 6.1 Jika Deployment Gagal Karena Error SQL
- Kontainer API yang lama **tidak akan mati** dan tetap melayani trafik normal.
- Periksa log Railway pada tab **Deployments -> View Build / Deploy Logs**.
- Perbaiki sintaks SQL di lokal. Jangan mengubah file yang sudah sukses tercatat di database produksi; perbaiki pada file migrasi yang bersangkutan jika belum berhasil diterapkan.
- Commit dan push ulang ke GitHub.

### 6.2 Rollback Kode Aplikasi
Jika ada bug aplikasi yang tidak berkaitan dengan skema database:
- Pada Railway Dashboard, buka tab **Deployments**.
- Cari deployment sukses sebelumnya.
- Klik tombol **Rollback** pada deployment tersebut. Railway akan langsung memutar kembali trafik ke versi sebelumnya dalam hitungan detik.

