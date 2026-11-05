# UI Guideline — RTConnect

## 1. Arah Visual
**Karakter:** modern SaaS, glassy secara selektif, elegant, ramah warga, terpercaya, dan tidak terasa seperti template dashboard generik.

Gunakan glass effect hanya untuk elemen yang memang perlu layering (topbar, floating panel, modal tertentu). Konten utama tetap memakai surface solid agar keterbacaan dan performa terjaga.

## 2. Design Principles
- Clarity over decoration: informasi dan tindakan utama harus langsung terbaca.
- Calm administration: visual rapi, tidak terlalu ramai atau penuh gradient.
- Consistency: pola tabel, form, modal, status, dan navigasi seragam.
- Mobile-first: layanan warga harus nyaman digunakan dengan satu tangan.
- Meaningful data: grafik hanya dipakai jika membantu memahami tren.

## 3. Color Direction
Palet dasar yang disarankan:
- Primary: deep indigo / blue-violet untuk kepercayaan dan navigasi.
- Accent: teal lembut untuk keberhasilan dan aksi positif.
- Background: cool off-white / slate sangat muda.
- Surface: white dengan border tipis.
- Text: charcoal/slate gelap.
- Warning: amber; danger: red; success: emerald.

Gunakan token warna terpusat melalui CSS variables/Tailwind theme. Hindari terlalu banyak warna aksen. Status tidak boleh dibedakan hanya dengan warna; sertakan label teks.

## 4. Typography
- Gunakan font sans-serif modern yang mudah dibaca (mis. Inter atau system sans).
- Hierarki: page title, section title, body, label, helper text.
- Angka nominal dan statistik menggunakan tabular numerals bila tersedia.
- Hindari teks terlalu kecil; helper text tetap terbaca pada ponsel.

## 5. Layout dan Responsiveness
### Desktop
- Sidebar kiri dengan lebar konsisten dan dapat diciutkan.
- Topbar berisi breadcrumb/judul konteks, pencarian bila relevan, notifikasi, dan profil.
- Konten memakai grid responsif dengan lebar baca terkontrol.
- Tabel admin memanfaatkan ruang desktop.

### Tablet
- Sidebar dapat menjadi drawer.
- Ringkasan dashboard beralih ke grid dua kolom.
- Tabel memiliki horizontal scroll terkontrol atau berubah menjadi list card untuk data yang cocok.

### Mobile
- Warga mendapat navigasi ringkas (bottom navigation atau menu drawer).
- Form satu kolom dengan tombol utama mudah dijangkau.
- Tabel kompleks berubah menjadi card/list; jangan memaksa tabel desktop mini.
- Hindari modal besar; gunakan halaman/detail sheet jika alur panjang.

## 6. Komponen Inti
- App shell: sidebar, topbar, content container.
- KPI card: angka, label, konteks periode; maksimal 4–5 pada satu area.
- Data table: search, filter, pagination, row action, empty/loading/error state.
- Status badge: label + warna semantik.
- Form field: label, input, helper, error; jangan mengandalkan placeholder sebagai label.
- Dialog konfirmasi: menjelaskan konsekuensi dan aksi.
- Toast/inline alert: konfirmasi hasil tindakan.
- Timeline: riwayat status surat/pengaduan.
- File uploader: format dan ukuran yang diterima ditampilkan sebelum upload.
- Empty state: penjelasan singkat + satu CTA utama.

## 7. Dashboard
- Prioritaskan ringkasan yang memicu tindakan, bukan dekorasi.
- Tampilkan antrean tertunda dan aktivitas terbaru.
- Grafik keuangan sederhana per periode bila datanya tersedia.
- Hindari donut chart berlebihan, angka tanpa konteks, dan widget yang tidak punya tindakan lanjutan.

## 8. Form dan Interaksi
- Kelompokkan field berdasarkan tujuan.
- Tandai wajib secara eksplisit.
- Validasi inline dan ringkasan error untuk form panjang.
- Gunakan confirmation untuk hapus, tolak, dan tindakan yang tidak mudah dibatalkan.
- Pertahankan input saat terjadi error jaringan.
- Beri feedback loading pada tombol submit agar tidak terjadi submit ganda.

## 9. Glassy Treatment
- Gunakan backdrop blur ringan dan transparansi secukupnya.
- Pastikan teks memiliki kontras yang cukup.
- Jangan menggunakan glass pada setiap card.
- Hindari glow, gradient neon, border bercahaya, dan shadow berlebihan.
- Pada perangkat/peramban yang tidak mendukung blur, tampilkan surface solid sebagai fallback.

## 10. Accessibility dan Quality
- Kontras teks memadai.
- Semua input memiliki label.
- Fokus keyboard terlihat.
- Tombol memiliki state hover, focus, active, disabled, dan loading.
- Ikon dekoratif tidak menggantikan label tindakan.
- Target sentuh mobile cukup besar.
- Hormati prefers-reduced-motion.

## 11. Frontend Engineering Rules
- Stack: HTML5, React, Vite, Tailwind CSS.
- Gunakan komponen reusable berdasarkan kebutuhan nyata, bukan abstraksi berlebihan.
- Pisahkan layout, pages, components, data/mock, dan services.
- Gunakan mock data terpusat dan konsisten untuk seluruh halaman.
- Buat API service layer/interface agar mock dapat diganti REST API tanpa menulis ulang UI.
- Jangan menanam business logic penting di komponen presentasi.
- Hindari state management library tambahan sebelum kebutuhan terbukti.
- Semua halaman wajib memiliki loading, empty, error, dan success state yang relevan.
