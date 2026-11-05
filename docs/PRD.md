# Product Requirements Document (PRD)
## RTConnect — Sistem Pengelolaan Administrasi RT/RW

**Status:** Draft SOT — baseline untuk validasi  
**Versi:** 1.0  
**Prioritas implementasi:** Frontend terlebih dahulu

## 1. Ringkasan Produk
RTConnect adalah aplikasi web untuk membantu pengurus RT/RW mengelola administrasi lingkungan secara terpusat serta memberi akses layanan mandiri kepada warga. Sistem memfasilitasi data warga, surat-menyurat, iuran dan kas, pengumuman, aspirasi, kegiatan, serta inventaris.

Produk harus sederhana untuk digunakan oleh pengurus dengan kemampuan digital beragam dan mudah diakses warga melalui ponsel.

## 2. Tujuan
- Mengurangi pencatatan administrasi yang tersebar di buku, spreadsheet, dan percakapan.
- Memudahkan warga mengajukan surat dan memantau statusnya.
- Membuat pencatatan kas dan iuran lebih transparan serta dapat ditelusuri.
- Menyediakan kanal informasi dan aspirasi lingkungan.
- Menyediakan ringkasan operasional bagi pengurus tanpa pelaporan yang rumit.

## 3. Pengguna dan Hak Akses
| Peran | Tanggung jawab utama |
|---|---|
| Super Admin | Konfigurasi sistem dan pengelolaan wilayah/akun pengurus (opsional, bukan operator harian) |
| Ketua RW | Melihat ringkasan lintas RT, pengumuman RW, dan laporan agregat |
| Ketua RT | Mengelola operasional RT, verifikasi pengajuan, data warga sesuai kewenangan |
| Sekretaris | Data warga, administrasi surat, pengumuman, agenda |
| Bendahara | Kas, iuran, tagihan, pembayaran, dan laporan keuangan |
| Petugas | Menangani tugas yang diberikan sesuai izin |
| Warga | Melihat informasi, mengajukan surat/aspirasi, melihat tagihan dan riwayat miliknya |

Hak akses mengikuti prinsip least privilege. Warga hanya dapat melihat data pribadi/keluarganya dan informasi publik wilayah. Pengurus hanya dapat mengakses wilayah yang menjadi kewenangannya.

## 4. Ruang Lingkup MVP
### 4.1 Dashboard
- Ringkasan jumlah warga dan KK.
- Ringkasan kas, iuran, surat masuk, pengaduan, dan agenda.
- Aktivitas terbaru dan tindakan yang perlu diproses.
- Tampilan dashboard menyesuaikan role.

### 4.2 Data Warga dan Keluarga
- Daftar warga dengan pencarian dan filter RT/status.
- Profil warga: nama, nomor identitas, kontak, alamat, status domisili, dan status kependudukan.
- Data KK dan relasi anggota keluarga.
- Status: aktif, pindah, meninggal, atau nonaktif.
- Impor/ekspor data merupakan fitur lanjutan; MVP cukup menyediakan UI daftar, detail, tambah, edit, dan validasi.

### 4.3 Administrasi Surat
- Katalog jenis surat yang dapat diajukan.
- Form pengajuan dengan lampiran bila diperlukan.
- Status: Draft, Diajukan, Perlu Revisi, Diproses, Disetujui, Ditolak, Selesai.
- Catatan verifikasi dan riwayat perubahan status.
- Template surat dan nomor surat dikelola pengurus.
- Unduh/cetak surat menjadi keluaran setelah disetujui.

### 4.4 Keuangan dan Kas
- Pencatatan kas masuk dan keluar.
- Kategori transaksi dan tanggal transaksi.
- Ringkasan saldo dan periode.
- Lampiran bukti transaksi opsional.
- Laporan sederhana berdasarkan rentang tanggal dan kategori.
- Perubahan transaksi harus memiliki jejak audit.

### 4.5 Iuran Warga
- Jenis iuran dan periode tagihan.
- Tagihan per warga/KK sesuai kebijakan wilayah.
- Status: Belum Dibayar, Menunggu Verifikasi, Lunas, Terlambat, atau Dibatalkan.
- Pencatatan pembayaran tunai/transfer secara manual.
- Bendahara memverifikasi pembayaran; MVP tidak mengintegrasikan payment gateway.

### 4.6 Pengumuman
- Pengumuman RT/RW dengan judul, isi, tanggal, dan lampiran opsional.
- Target publikasi berdasarkan wilayah.
- Penanda penting dan masa berlaku.
- Warga dapat melihat pengumuman yang relevan dengan wilayahnya.

### 4.7 Aspirasi dan Pengaduan
- Warga mengirim laporan dengan kategori, deskripsi, lokasi, dan foto opsional.
- Status: Baru, Ditinjau, Ditindaklanjuti, Selesai, atau Ditolak.
- Pengurus memberi tanggapan dan memperbarui status.
- Pelapor dapat memantau laporan miliknya.

### 4.8 Kegiatan dan Agenda
- Kalender/daftar kegiatan lingkungan.
- Informasi waktu, lokasi, deskripsi, dan penyelenggara.
- Status kegiatan: Akan Datang, Berlangsung, Selesai, atau Dibatalkan.

### 4.9 Inventaris
- Daftar aset/fasilitas lingkungan.
- Kode/nama aset, jumlah, kondisi, lokasi, dan catatan.
- MVP berfokus pada pencatatan, bukan procurement atau akuntansi aset.

### 4.10 Pengguna dan Pengaturan
- Pengelolaan akun dan role oleh pengurus berwenang.
- Pengaturan profil wilayah: nama wilayah, alamat, struktur RT/RW, logo opsional.
- Preferensi notifikasi dasar.

## 5. Di Luar Ruang Lingkup MVP
- Integrasi payment gateway dan virtual account.
- Integrasi WhatsApp Business API atau SMS gateway.
- Tanda tangan elektronik tersertifikasi.
- Integrasi Dukcapil atau layanan pemerintah.
- Aplikasi native Android/iOS.
- Akuntansi double-entry, payroll, procurement, dan ERP.
- Peta GIS kompleks dan pelacakan lokasi real-time.
- AI chatbot atau otomatisasi keputusan administrasi.

## 6. Prinsip Produk dan UX
- Mobile-first untuk warga; desktop-friendly untuk pengurus.
- Bahasa Indonesia yang jelas dan tidak teknis.
- Setiap proses memiliki status, langkah berikutnya, dan umpan balik.
- Form hanya meminta data yang diperlukan.
- Tabel pengurus mendukung pencarian, filter, pagination, dan empty state.
- Hindari dashboard penuh grafik yang tidak membantu keputusan.
- Aksi berisiko seperti menghapus data harus meminta konfirmasi.

## 7. Kebutuhan Non-Fungsional
- Responsive pada ponsel, tablet, dan desktop.
- Akses berbasis role dan wilayah.
- Validasi input di sisi UI; validasi server wajib diterapkan pada fase backend.
- Data sensitif tidak ditampilkan pada halaman publik.
- Penanganan loading, error, empty, dan success state.
- Aksesibilitas dasar: kontras, label form, fokus keyboard, dan ukuran target sentuh.
- Struktur frontend modular dan mudah diintegrasikan dengan REST API.

## 8. Indikator Keberhasilan
- Pengurus dapat menemukan data warga dengan cepat.
- Warga dapat mengajukan surat dan memantau status tanpa datang hanya untuk menanyakan progres.
- Bendahara dapat melihat saldo, transaksi, dan status iuran per periode.
- Pengumuman dan agenda dapat diakses sesuai wilayah.
- Tidak ada akses lintas wilayah atau data pribadi tanpa kewenangan.

## 9. Asumsi dan Keputusan yang Perlu Divalidasi
- Struktur wilayah minimal RW → RT → KK → warga.
- Satu warga dapat menjadi kepala keluarga atau anggota keluarga.
- Aturan jenis surat, format nomor surat, biaya administrasi, dan persetujuan dapat berbeda antarwilayah; sistem harus menyediakan konfigurasi sederhana.
- Penagihan iuran dapat berbasis KK atau warga; kebijakan final ditentukan pengurus.
- Pembayaran pada MVP dicatat dan diverifikasi manual.
- Notifikasi MVP tampil di dalam aplikasi; kanal eksternal ditunda.

## 10. Prioritas Implementasi
1. Frontend: shell aplikasi, autentikasi mock, role-based navigation, dashboard, modul inti dengan data dummy.
2. Validasi UI/UX oleh pemilik proyek dan revisi sampai disetujui.
3. Desain database berdasarkan kebutuhan yang telah disetujui.
4. Implementasi REST API dan integrasi frontend.
5. Pengujian, hardening akses, dan persiapan deployment.

**Aturan:** Jangan menganggap asumsi sebagai keputusan final. Catat perubahan kebutuhan pada dokumen SOT sebelum implementasi terkait.
