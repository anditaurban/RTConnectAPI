# Prompt Execution — RTConnect

Gunakan prompt berikut pada AI coding agent (Codex/Antigravity/Cursor). Jalankan satu fase per sesi atau per instruksi. Jangan menggabungkan fase.

## Prompt 0 — Review SOT (tanpa coding)
```text
Bertindak sebagai Product/System Analyst, Frontend Engineer, dan UI/UX Designer yang anti-overengineering dan anti-AI-slop.

Baca AGENTS.md serta seluruh dokumen di docs/.
Tugas:
1. Audit konsistensi PRD, USER-FLOW, UI-GUIDELINE, dan API-SPEC.
2. Identifikasi konflik, kebutuhan ambigu, dan asumsi yang perlu keputusan pemilik proyek.
3. Buat ringkasan scope MVP dan daftar halaman frontend.
4. Usulkan koreksi dokumen jika memang diperlukan.

BATASAN:
- Jangan membuat atau mengubah kode aplikasi.
- Jangan membuat database, backend, endpoint, atau migrasi.
- Jangan memperluas scope.
- Akhiri dengan daftar keputusan yang membutuhkan approval.
Tunggu persetujuan saya sebelum Phase 1.
```

## Prompt 1 — Build Frontend Only
```text
Bertindak sebagai Senior Frontend Engineer dan UI/UX Designer modern SaaS yang anti-overengineering dan anti-AI-slop.

Ikuti AGENTS.md dan SOT pada docs/ sebagai sumber kebenaran.
Bangun frontend RTConnect menggunakan HTML5, React, Vite, dan Tailwind CSS.

TARGET:
- Aplikasi responsive untuk pengurus RT/RW dan warga.
- Visual modern SaaS 2026: elegant, clean, glassy secara selektif, readable, dan tidak berlebihan.
- Semua label dan konten UI menggunakan Bahasa Indonesia.
- Implementasikan role demo: Ketua RW, Ketua RT, Sekretaris, Bendahara, Petugas, dan Warga.
- Implementasikan halaman dan alur MVP yang tercantum dalam PRD dan USER-FLOW.
- Gunakan mock data/service lokal yang konsisten dan mudah diganti API adapter.
- Implementasikan navigasi sesuai role, form validation, search/filter, status, detail, dan feedback UI sesuai kebutuhan.
- Buat responsive state desktop, tablet, dan mobile.

BATASAN KERAS:
- FRONTEND ONLY.
- Jangan membuat database, schema SQL, backend, REST API, endpoint, migrasi, atau integrasi server.
- Jangan memasang library tambahan jika tidak benar-benar diperlukan.
- Jangan menambahkan fitur di luar SOT.
- Jangan mengubah dokumen SOT tanpa persetujuan.
- Jangan menyatakan data mock sebagai data produksi.

WORKFLOW:
1. Periksa repository dan struktur yang sudah ada sebelum mengubah file.
2. Rencanakan daftar halaman/komponen secara ringkas.
3. Implementasikan bertahap berdasarkan modul prioritas.
4. Jalankan lint/build dan perbaiki error.
5. Uji alur utama dan responsive layout.
6. Laporkan hasil dan file yang berubah.

STOP CONDITION:
Setelah frontend selesai, berhenti dengan status:
"FRONTEND SELESAI DAN SIAP DIVALIDASI".
Jangan lanjut ke database/backend sampai saya memberikan approval eksplisit.
```

## Prompt 1A — Review dan Perbaikan Frontend
```text
Lakukan review frontend RTConnect berdasarkan feedback saya berikut:
[TEMPEL FEEDBACK DI SINI]

Baca kembali AGENTS.md dan dokumen SOT.
Perbaiki hanya bagian yang berkaitan dengan feedback dan kebutuhan SOT.
Jangan memperluas scope, jangan membuat database/backend/API.
Setelah revisi, jalankan build dan laporkan hasilnya.
Tetap berhenti untuk menunggu approval frontend final.
```

## Prompt 2 — Database Design (setelah frontend approved)
```text
Frontend RTConnect telah saya setujui. Sekarang masuk ke fase database saja.

Baca AGENTS.md, PRD, USER-FLOW, API-SPEC, serta implementasi frontend yang telah disetujui.
Rancang database MySQL 8+ yang memenuhi kebutuhan nyata aplikasi.
Output minimal: ERD (Mermaid), DATABASE-SPEC.md, dan schema.sql bila saya meminta implementasi SQL.
Gunakan InnoDB, utf8mb4, dan relasi/integritas yang sesuai.
Perhatikan pembatasan wilayah, role, data sensitif, audit perubahan, surat, iuran, pembayaran, kas, pengumuman, aspirasi, agenda, dan inventaris.

Jangan membuat backend/API pada fase ini.
Jelaskan asumsi dan keputusan yang masih diperlukan, lalu berhenti untuk approval database.
```

## Prompt 3 — Backend REST API (setelah database approved)
```text
Database RTConnect telah saya setujui. Bangun backend REST API terpisah menggunakan Node.js dan Express.js sesuai API-SPEC dan skema database yang disetujui.

Terapkan autentikasi, otorisasi role dan wilayah, validasi server, error handling konsisten, audit log untuk perubahan kritis, serta proteksi data pribadi.
Buat endpoint hanya sesuai kontrak yang disetujui.
Sertakan env.example, dokumentasi setup, dan pengujian endpoint.

Jangan mengubah struktur database tanpa approval.
Jangan mengerjakan ulang frontend kecuali ada kebutuhan integrasi yang disetujui.
Laporkan hasil pengujian dan berhenti untuk review.
```

## Prompt 4 — Integrasi dan QA (setelah backend approved)
```text
Integrasikan frontend RTConnect yang telah disetujui dengan REST API yang telah disetujui.
Ganti mock service secara bertahap menggunakan API service layer.
Pertahankan UI/UX yang telah disetujui.
Uji seluruh alur berdasarkan USER-FLOW, role/wilayah, validasi, error/loading/empty state, dan responsive behavior.
Jangan menambah fitur di luar SOT.
Laporkan endpoint yang terintegrasi, hasil QA, bug tersisa, dan cara menjalankan aplikasi.
```

## Cara Menggunakan
1. Letakkan `AGENTS.md` di root project.
2. Letakkan folder `docs/` di root project.
3. Mulai dengan Prompt 0 untuk review SOT.
4. Setelah menyetujui SOT, jalankan Prompt 1.
5. Validasi frontend. Gunakan Prompt 1A untuk revisi.
6. Hanya setelah approval frontend, lanjutkan Prompt 2, Prompt 3, lalu Prompt 4.
