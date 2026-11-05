# AGENTS.md — RTConnect

## Misi
Bangun RTConnect mengikuti dokumen SOT di `docs/`. Prioritas utama adalah kesesuaian kebutuhan, UX yang jelas, keamanan data warga, dan implementasi yang sederhana.

## Sumber Kebenaran
Baca sebelum bekerja:
1. `docs/PRD.md`
2. `docs/USER-FLOW.md`
3. `docs/UI-GUIDELINE.md`
4. `docs/API-SPEC.md`

Jika instruksi prompt bertentangan dengan SOT, berhenti dan minta klarifikasi. Jangan menambahkan fitur di luar scope tanpa persetujuan.

## Aturan Mutlak
- Anti-overengineering dan anti-AI-slop.
- Jangan membuat fitur, halaman, library, abstraksi, atau konfigurasi yang tidak dibutuhkan.
- Jangan mengarang kebijakan administrasi RT/RW yang belum ditentukan.
- Gunakan Bahasa Indonesia pada UI.
- Data warga dan dokumen pribadi harus diperlakukan sensitif.
- Jangan menampilkan data pribadi pada halaman publik.
- Jangan mengklaim aksi berhasil bila hanya menggunakan mock.
- Jangan mengubah SOT diam-diam; usulkan perubahan terlebih dahulu.

## Approval Gate dan Urutan Fase
### Phase 0 — SOT Review
- Audit kelengkapan dokumen dan identifikasi asumsi.
- Laporkan konflik/pertanyaan penting.
- Jangan generate kode aplikasi sebelum user menyetujui SOT.

### Phase 1 — Frontend Only
- Setelah SOT disetujui, bangun frontend menggunakan HTML5, React, Vite, Tailwind CSS.
- Gunakan mock data/service lokal.
- Bangun halaman, navigasi, komponen, responsive states, dan interaksi UI.
- Tidak boleh membuat database, backend, endpoint API, migrasi, atau integrasi server.
- API-SPEC hanya menjadi kontrak rancangan untuk menjaga kesiapan integrasi.
- Setelah implementasi, jalankan lint/build dan perbaiki error frontend.
- Laporkan halaman yang selesai, fitur mock, batasan, dan hasil build.
- Berhenti dengan status **Frontend selesai dan siap divalidasi**. Tunggu approval/revisi user.

### Phase 2 — Database Design
Hanya setelah frontend disetujui:
- Review kebutuhan data aktual dari frontend yang telah disetujui.
- Susun database MySQL 8+ dan dokumentasi skema.
- Ajukan ERD/schema untuk approval sebelum implementasi database final.
- Jangan mulai backend API pada fase ini.

### Phase 3 — Backend REST API
Hanya setelah database disetujui:
- Bangun Node.js + Express.js REST API terpisah.
- Implementasikan autentikasi, otorisasi role/wilayah, validasi, audit, dan endpoint sesuai API-SPEC.
- Jangan menambahkan endpoint/fitur tanpa kebutuhan terverifikasi.
- Uji endpoint dan dokumentasikan cara menjalankan.

### Phase 4 — Integrasi dan QA
Hanya setelah backend siap:
- Hubungkan frontend melalui service layer.
- Ganti mock dengan API secara bertahap.
- Uji role, alur utama, error state, keamanan akses, dan responsive behavior.

## Frontend Engineering
- Gunakan React + Vite + Tailwind CSS.
- Gunakan struktur folder yang mudah dipahami; hindari arsitektur berlapis berlebihan.
- Pisahkan pages, shared components, layouts, mock data, dan API/service adapter bila diperlukan.
- Gunakan satu sumber mock data yang konsisten.
- Buat route/navigation berdasarkan role.
- Setiap halaman penting menangani loading, empty, error, success, dan unauthorized state sesuai konteks.
- Hindari state management tambahan sebelum ada kebutuhan nyata.
- Jangan hardcode data yang sama di banyak komponen.
- Pastikan keyboard focus, label form, kontras, dan ukuran target sentuh memadai.

## Definition of Done — Phase 1
- Semua halaman dalam scope MVP memiliki tampilan dan alur UI.
- Navigasi role dapat diuji menggunakan akun/demo role lokal.
- Form utama memiliki validasi sisi frontend.
- Search/filter/pagination yang ditampilkan berfungsi pada mock data.
- Responsive desktop, tablet, dan mobile.
- Tidak ada error console/build yang diketahui.
- Tidak ada backend/database/API yang dibuat.
- Ada ringkasan implementasi dan daftar asumsi terbuka.
- Agent berhenti dan meminta approval.

## Output dan Pelaporan
Setiap fase harus melaporkan:
1. File yang dibuat/diubah.
2. Fitur yang selesai.
3. Cara menjalankan dan menguji.
4. Hasil lint/build/test yang relevan.
5. Asumsi atau blocker.
6. Status approval yang dibutuhkan.

Jangan melanjutkan fase berikutnya secara otomatis.
