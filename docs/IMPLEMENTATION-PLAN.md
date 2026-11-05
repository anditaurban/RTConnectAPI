# IMPLEMENTATION PLAN — RTConnect
## Sistem Pengelolaan Administrasi RT/RW

**Versi:** 1.0  
**Status:** Rencana implementasi untuk approval  
**Frontend:** HTML5 responsive + Tailwind CSS + React + Vite  
**Arsitektur target:** Decoupled frontend dan backend melalui REST API  
**Database target:** MySQL 8.0+

> Prinsip utama: kerjakan frontend terlebih dahulu sampai siap divalidasi. Jangan membuat database, backend, endpoint aktif, atau integrasi API sebelum frontend disetujui secara eksplisit oleh pemilik project.

## 1. Tujuan
Menjadi urutan kerja yang terukur bagi AI coding agent/developer agar implementasi RTConnect konsisten dengan dokumen SOT, tidak melebar dari scope, dan dapat direview per fase.

## 2. Source of Truth
Sebelum mengubah kode, baca dokumen berikut:

1. `AGENTS.md`
2. `docs/PRD.md`
3. `docs/USER-FLOW.md`
4. `docs/UI-GUIDELINE.md`
5. `docs/API-SPEC.md`
6. `docs/BUSINESS-RULES.md`
7. `docs/DATABASE-SPEC.md`
8. `docs/IMPLEMENTATION-PLAN.md` (dokumen ini)

Jika terjadi konflik:
- Ikuti keputusan terbaru yang telah disetujui pemilik project.
- Jangan menebak atau mengubah business rule secara sepihak.
- Catat konflik dan ajukan pertanyaan sebelum implementasi.
- Dokumen SOT lebih diutamakan daripada asumsi agent atau preferensi pribadi agent.

## 3. Aturan Eksekusi
- Selesaikan satu fase, lakukan self-review, lalu laporkan hasilnya.
- Jangan melanjutkan ke fase berikutnya tanpa approval eksplisit.
- Jangan mengerjakan database/backend ketika fase frontend belum disetujui.
- Gunakan mock data dan mock service selama fase frontend.
- Hindari overengineering: implementasikan hanya kebutuhan yang tercantum dalam SOT.
- Jangan menambahkan library, state management, abstraction layer, atau design pattern tanpa kebutuhan nyata.
- Pertahankan komponen reusable secukupnya; hindari membuat komponen generik yang terlalu abstrak.
- Gunakan data dan akun dummy fiktif. Jangan memasukkan data pribadi warga nyata.
- Jangan mengubah struktur dokumen SOT tanpa melaporkan alasan dan dampaknya.
- Setiap fase harus menghasilkan aplikasi yang dapat dijalankan atau artefak yang dapat direview.

## 4. Target Struktur Project

Struktur awal yang disarankan:

```text
rtconnect/
├── AGENTS.md
├── Prompt-execution.md
├── docs/
│   ├── PRD.md
│   ├── USER-FLOW.md
│   ├── UI-GUIDELINE.md
│   ├── API-SPEC.md
│   ├── BUSINESS-RULES.md
│   ├── DATABASE-SPEC.md
│   └── IMPLEMENTATION-PLAN.md
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── data/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

Agent boleh menyesuaikan struktur jika ada alasan teknis yang jelas, tetapi jangan membuat struktur folder berlebihan. `src/services/` pada fase frontend hanya berisi mock service; jangan membuat client API aktif sebelum fase integrasi backend disetujui.

## 5. Phase 0 — Project Audit dan Persiapan

**Tujuan:** memahami kondisi repository dan memetakan pekerjaan tanpa mengubah implementasi secara besar-besaran.

### Task
1. Periksa struktur repository dan file yang sudah tersedia.
2. Baca seluruh dokumen SOT.
3. Identifikasi fitur, role, halaman, komponen UI, dan alur utama.
4. Cocokkan implementasi yang sudah ada dengan SOT jika project bukan repository kosong.
5. Catat dependensi yang sudah tersedia.
6. Buat daftar gap atau konflik dokumen jika ditemukan.

### Output
- Ringkasan hasil audit.
- Daftar halaman dan modul frontend.
- Rencana urutan implementasi yang terkonfirmasi.
- Daftar pertanyaan yang membutuhkan keputusan pemilik project.

### Approval Gate
Minta approval sebelum mulai implementasi frontend jika ada konflik scope atau keputusan penting yang belum ditentukan.

## 6. Phase 1 — Frontend Foundation

**Tujuan:** menyiapkan fondasi frontend tanpa backend.

### Task
1. Inisialisasi atau rapikan project React + Vite.
2. Konfigurasikan Tailwind CSS sesuai versi yang kompatibel dengan project.
3. Siapkan global styles, typography, spacing, color tokens, dan design tokens dari UI Guideline.
4. Buat routing halaman dengan solusi ringan yang sesuai kebutuhan.
5. Siapkan layout utama aplikasi dan layout autentikasi.
6. Buat komponen dasar yang benar-benar digunakan: button, input, select, modal/drawer, badge status, card, table, pagination, empty state, loading state, dan toast.
7. Pastikan responsive behavior untuk mobile, tablet, dan desktop.

### Batasan
- Belum membuat autentikasi backend.
- Belum membuat database atau API.
- Tidak menambahkan dependency kompleks tanpa kebutuhan.

### Acceptance Criteria
- Project dapat dijalankan secara lokal.
- Layout dan komponen dasar konsisten dengan UI Guideline.
- Tidak ada error build atau error runtime utama.
- Navigasi dasar dapat diuji.

### Output
Frontend foundation yang siap dipakai untuk membangun modul.

## 7. Phase 2 — Frontend Modul dan Halaman

**Tujuan:** membangun seluruh tampilan dan interaksi MVP berdasarkan PRD dan User Flow.

Urutan pengerjaan yang disarankan:

### 2.1 Autentikasi dan Role Preview
- Halaman login.
- Tampilan lupa password jika tercantum pada PRD.
- Role preview/mock session untuk menguji variasi menu.
- Proteksi route di sisi UI sebagai simulasi, bukan pengganti otorisasi backend.

### 2.2 Dashboard
- Dashboard pengurus sesuai role.
- Dashboard warga.
- Ringkasan statistik menggunakan mock data.
- Aktivitas terbaru dan informasi penting.

### 2.3 Data Wilayah dan Warga
- Daftar RT/RW sesuai cakupan role.
- Daftar warga.
- Detail warga dan keluarga/KK.
- Form tambah/edit dan tampilan status warga.
- Search, filter, pagination, empty state.

### 2.4 Administrasi Surat
- Daftar jenis surat.
- Form pengajuan warga.
- Daftar pengajuan untuk pengurus.
- Detail pengajuan dan riwayat status.
- Simulasi aksi proses, revisi, setujui, tolak, dan selesai sesuai Business Rules.

### 2.5 Iuran dan Pembayaran
- Daftar jenis iuran.
- Daftar tagihan warga/KK.
- Detail tagihan.
- Form pelaporan pembayaran dan upload bukti dummy.
- Halaman verifikasi pembayaran untuk bendahara.
- Status dan ringkasan pembayaran menggunakan mock data.

### 2.6 Keuangan dan Kas
- Ringkasan kas.
- Daftar kas masuk dan keluar.
- Form transaksi.
- Filter periode dan kategori.
- Simulasi koreksi/void sesuai Business Rules.

### 2.7 Pengumuman dan Agenda
- Daftar dan detail pengumuman.
- Form pengelolaan pengumuman.
- Daftar agenda dan detail kegiatan.
- Tampilan target publikasi sesuai wilayah.

### 2.8 Aspirasi dan Pengaduan
- Form pengaduan warga.
- Daftar laporan milik warga.
- Daftar pengaduan untuk pengurus.
- Detail, tanggapan, penugasan, dan simulasi perubahan status.

### 2.9 Inventaris
- Daftar aset.
- Detail dan form pengelolaan aset.
- Filter kategori, kondisi, dan wilayah.

### 2.10 Notifikasi dan Profil
- Daftar notifikasi.
- Status sudah/belum dibaca.
- Profil pengguna dan pengaturan dasar yang termasuk MVP.

### Aturan implementasi modul
- Setiap halaman harus mengikuti role dan alur pada SOT.
- Setiap tombol utama harus memiliki interaksi yang berfungsi pada mock environment.
- Jangan membuat tombol dekoratif yang terlihat aktif tetapi tidak melakukan apa pun.
- Gunakan mock data terpusat dan mock service sederhana agar mudah diganti saat integrasi API.
- Tampilkan loading, success, error, empty, dan confirmation state yang relevan.
- Validasi form di frontend untuk pengalaman pengguna; validasi backend tetap wajib pada fase backend.

### Acceptance Criteria
- Semua halaman MVP pada PRD telah tersedia.
- Alur utama tiap role dapat diuji dengan mock data.
- Semua aksi UI penting memberikan feedback.
- Tampilan konsisten dan responsive.
- Tidak ada integrasi ke database atau backend.

## 8. Phase 3 — Frontend QA dan Validasi Pemilik Project

**Tujuan:** memastikan frontend siap disetujui sebelum database/backend dikerjakan.

### Checklist QA
- [ ] Seluruh route utama dapat dibuka.
- [ ] Navigasi dan menu sesuai role.
- [ ] Form memiliki validasi dan pesan error.
- [ ] Modal, drawer, dropdown, filter, search, dan pagination berfungsi.
- [ ] Status proses konsisten dengan Business Rules.
- [ ] Mock data realistis tetapi sepenuhnya fiktif.
- [ ] Tampilan mobile, tablet, dan desktop diperiksa.
- [ ] Tidak ada horizontal overflow yang tidak disengaja.
- [ ] Tidak ada broken image, dead button, atau placeholder yang tertinggal.
- [ ] Tidak ada error console/build yang diketahui.
- [ ] README berisi cara menjalankan frontend.

### Output
- Frontend MVP siap validasi.
- Daftar halaman/fitur yang selesai.
- Daftar keterbatasan yang masih diketahui.
- Screenshot atau preview halaman utama jika diminta.

### Approval Gate — WAJIB
Hentikan pekerjaan setelah laporan QA dan minta pemilik project melakukan review.

**Jangan memulai Phase 4 sebelum pemilik project menyatakan frontend disetujui/fix secara eksplisit.** Jika ada revisi, kerjakan kembali Phase 2/3 sesuai feedback, lalu minta approval ulang.

## 9. Phase 4 — Finalisasi Database

**Prasyarat:** frontend telah disetujui dan pemilik project memberi izin memulai database.

### Task
1. Review ulang `DATABASE-SPEC.md` dan `BUSINESS-RULES.md`.
2. Selesaikan keputusan yang masih terbuka, terutama cakupan multi-RW, basis iuran, pembayaran parsial, dan saldo awal kas.
3. Finalisasi ERD, tipe data, enum/status, foreign key, unique constraint, dan index.
4. Buat `schema.sql` untuk MySQL 8+.
5. Pastikan urutan pembuatan tabel menangani foreign key siklik dengan benar.
6. Siapkan seed data development yang fiktif.
7. Uji schema dari database kosong.
8. Verifikasi relasi, constraint, dan data seed.

### Acceptance Criteria
- Schema dapat dijalankan dari database kosong.
- Semua tabel dan relasi sesuai dokumen yang disetujui.
- Seed data development dapat digunakan untuk pengujian.
- Tidak ada data pribadi nyata.
- Perubahan dari Database Spec terdokumentasi.

### Output
- `database/schema.sql`
- Dokumentasi perubahan schema bila ada.
- Hasil pengujian schema dan seed data.

### Approval Gate
Minta review dan approval database sebelum membangun backend.

## 10. Phase 5 — Backend REST API

**Prasyarat:** database dan schema telah disetujui.

### Task
1. Siapkan project backend terpisah dari frontend.
2. Gunakan Node.js + Express.js sesuai keputusan project dan API Spec.
3. Konfigurasikan koneksi MySQL melalui environment variables.
4. Implementasikan autentikasi dan otorisasi berbasis role serta cakupan wilayah.
5. Implementasikan validasi request dan error handling terpusat.
6. Implementasikan endpoint secara bertahap mengikuti API Spec.
7. Terapkan Business Rules pada service layer dan transaksi database.
8. Implementasikan upload file dengan validasi tipe/ukuran dan akses terkontrol.
9. Implementasikan audit log untuk aksi sensitif.
10. Tambahkan dokumentasi cara menjalankan backend dan konfigurasi environment.

### Urutan modul API
1. Auth dan user/role.
2. Wilayah, keluarga, dan warga.
3. Jenis surat, pengajuan, dan histori surat.
4. Jenis iuran, tagihan, dan pembayaran.
5. Kategori keuangan dan transaksi kas.
6. Pengumuman dan agenda.
7. Pengaduan dan histori.
8. Inventaris.
9. Notifikasi.
10. Audit dan laporan sesuai kebutuhan MVP.

### Acceptance Criteria
- Endpoint mengikuti kontrak API Spec.
- Otorisasi diperiksa di backend untuk setiap resource.
- Transisi status mengikuti Business Rules.
- Operasi keuangan kritis menggunakan database transaction.
- Error response konsisten.
- Endpoint utama diuji dengan skenario sukses dan gagal.

### Output
- Source code backend REST API.
- Environment example tanpa secret.
- Dokumentasi endpoint dan cara menjalankan.
- Hasil pengujian API.

## 11. Phase 6 — Integrasi Frontend dan Backend

**Prasyarat:** frontend, database, dan backend telah disetujui untuk integrasi.

### Task
1. Ganti mock service dengan API client secara bertahap.
2. Implementasikan konfigurasi base URL melalui environment variable.
3. Hubungkan autentikasi dan pengelolaan session/token sesuai keputusan keamanan.
4. Integrasikan modul satu per satu mengikuti urutan API.
5. Samakan format data, status, pagination, dan error handling.
6. Pastikan loading, empty, success, dan error state tetap konsisten.
7. Hapus mock data yang tidak lagi digunakan setelah modul terkait tervalidasi.
8. Jangan menghapus mock service sebelum pengganti API berjalan dan diuji.

### Acceptance Criteria
- Alur utama tiap role berjalan menggunakan API.
- Data yang ditampilkan sesuai cakupan wilayah pengguna.
- Tidak ada akses lintas wilayah yang tidak sah.
- Kegagalan API ditangani dengan feedback yang jelas.
- Tidak ada secret backend di frontend.

## 12. Phase 7 — End-to-End QA dan Release Preparation

### Checklist
- [ ] Login dan akses role diuji.
- [ ] Pembatasan data berdasarkan RW/RT diuji.
- [ ] CRUD data warga dan keluarga diuji.
- [ ] Pengajuan dan transisi status surat diuji.
- [ ] Penerbitan tagihan dan pencegahan duplikasi diuji.
- [ ] Verifikasi pembayaran dan pencatatan kas ganda diuji.
- [ ] Kas masuk/keluar dan koreksi transaksi diuji.
- [ ] Pengumuman dan target wilayah diuji.
- [ ] Pengaduan dan histori status diuji.
- [ ] Upload dan akses lampiran diuji.
- [ ] Audit log untuk aksi sensitif diuji.
- [ ] Responsive layout dan browser utama diuji.
- [ ] Environment production tidak menggunakan kredensial dummy.
- [ ] Backup, retensi, dan prosedur pemulihan ditetapkan pengelola.

### Output
- Daftar hasil QA dan bug.
- Daftar isu yang belum diselesaikan.
- Release checklist.
- Dokumentasi deployment sesuai infrastruktur yang dipilih.

## 13. Definition of Done
Sebuah fase dianggap selesai jika:
1. Seluruh task fase tersebut selesai atau sisa pekerjaan dijelaskan.
2. Acceptance criteria fase terpenuhi.
3. Tidak ada perubahan scope yang tidak disetujui.
4. Hasil dapat dijalankan atau direview.
5. Agent melaporkan file yang dibuat/diubah dan cara pengujian.
6. Approval pemilik project diperoleh sebelum fase berikutnya.

## 14. Format Laporan Setiap Fase

Gunakan format ringkas berikut:

```text
PHASE:
STATUS: Completed / Blocked / Need Review

COMPLETED:
- ...

FILES CREATED/UPDATED:
- ...

VALIDATION:
- Perintah yang dijalankan:
- Hasil:

KNOWN ISSUES:
- ...

SCOPE CHANGES:
- None / Jelaskan

NEXT ACTION:
- Menunggu approval / Revisi / Fase berikutnya setelah approval
```

## 15. Instruksi Keras untuk AI Coding Agent
- Jangan mengerjakan semua fase sekaligus.
- Jangan menganggap approval satu fase sebagai approval seluruh project.
- Jangan membuat SQL, migration, model ORM, backend route, controller, atau koneksi API pada Phase 0–3.
- Jangan mengganti mock data dengan API sebelum Phase 6.
- Jangan menambahkan fitur di luar PRD hanya karena lazim ditemukan pada aplikasi RT/RW.
- Jika kebutuhan belum jelas, ajukan satu pertanyaan paling penting dan tunggu jawaban.
- Jika ada perubahan SOT, laporkan dokumen yang terdampak dan minta persetujuan.
- Prioritaskan aplikasi yang sederhana, aman, mudah digunakan pengurus dan warga, serta mudah dipelihara.
