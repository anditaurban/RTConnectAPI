# User Flow — RTConnect

## 1. Pola Navigasi
- **Pengurus:** Login → Dashboard → pilih modul dari sidebar → lakukan tindakan → lihat notifikasi/status.
- **Warga:** Login → Beranda Warga → pilih layanan → isi form → kirim → pantau status dari menu Aktivitas Saya.
- Navigasi dan data yang terlihat dibatasi oleh role serta wilayah akun.

## 2. Login dan Akses
1. Pengguna membuka halaman login.
2. Mengisi email/nomor telepon dan kata sandi.
3. Sistem memvalidasi kredensial.
4. Pengguna diarahkan ke dashboard sesuai role.
5. Jika gagal, tampilkan pesan yang jelas tanpa membocorkan apakah akun terdaftar.
6. Lupa kata sandi ditampilkan sebagai alur UI; mekanisme reset ditentukan pada fase backend.

## 3. Dashboard Pengurus
1. Pengurus login.
2. Sistem menampilkan ringkasan sesuai kewenangan.
3. Pengurus melihat daftar tugas tertunda: pengajuan surat, pembayaran, atau pengaduan.
4. Pengurus memilih item untuk membuka detail.
5. Pengurus memproses atau meneruskan item sesuai hak akses.

## 4. Data Warga
1. Pengurus membuka Data Warga.
2. Mencari berdasarkan nama, nomor KK, atau atribut yang diizinkan.
3. Memfilter berdasarkan RT/status.
4. Membuka detail warga/KK.
5. Menambah atau mengubah data.
6. Sistem menampilkan validasi dan konfirmasi penyimpanan.
7. Perubahan penting tercatat dalam riwayat/audit pada backend.

## 5. Pengajuan Surat oleh Warga
1. Warga membuka Layanan Surat.
2. Memilih jenis surat.
3. Sistem menampilkan persyaratan dan estimasi proses bila dikonfigurasi.
4. Warga mengisi form dan melampirkan dokumen bila diwajibkan.
5. Warga meninjau ringkasan lalu mengirim pengajuan.
6. Pengajuan mendapat status **Diajukan** dan nomor referensi.
7. Warga memantau status serta catatan pengurus.
8. Jika **Perlu Revisi**, warga memperbaiki dan mengirim ulang.
9. Jika **Disetujui/Selesai**, warga melihat atau mengunduh surat sesuai mekanisme yang tersedia.

## 6. Verifikasi Surat oleh Pengurus
1. Sekretaris/ketua membuka Antrean Surat.
2. Memilih pengajuan dan memeriksa data/lampiran.
3. Memilih tindakan: minta revisi, proses, setujui, atau tolak.
4. Mengisi catatan bila diperlukan.
5. Sistem memperbarui status dan menampilkan notifikasi kepada warga.
6. Surat final dibuat dari template yang berlaku setelah persetujuan.

## 7. Iuran dan Pembayaran
### Warga
1. Membuka menu Iuran Saya.
2. Melihat tagihan aktif dan riwayat.
3. Memilih tagihan lalu melihat instruksi pembayaran.
4. Mencatat pembayaran dan mengunggah bukti jika metode transfer digunakan.
5. Status berubah menjadi **Menunggu Verifikasi**.
6. Warga melihat hasil verifikasi.

### Bendahara
1. Membuka Verifikasi Pembayaran.
2. Memeriksa bukti dan nominal.
3. Menyetujui atau menolak dengan catatan.
4. Jika disetujui, status menjadi **Lunas** dan transaksi kas tercatat sesuai aturan.
5. Bendahara dapat melihat laporan periode.

## 8. Kas RT/RW
1. Bendahara membuka menu Keuangan.
2. Memilih Kas Masuk atau Kas Keluar.
3. Mengisi tanggal, kategori, nominal, deskripsi, dan bukti opsional.
4. Meninjau lalu menyimpan.
5. Dashboard saldo dan laporan periode diperbarui.
6. Koreksi transaksi dilakukan melalui mekanisme edit/void dengan alasan dan jejak audit, bukan menghilangkan riwayat.

## 9. Pengumuman dan Agenda
1. Pengurus membuka Pengumuman atau Agenda.
2. Membuat konten, menentukan target wilayah, dan mengatur tanggal.
3. Menyimpan sebagai draft atau mempublikasikan.
4. Warga melihat konten yang ditujukan untuk wilayahnya.
5. Konten kedaluwarsa tetap dapat diakses pengurus melalui arsip.

## 10. Aspirasi/Pengaduan
### Warga
1. Membuka menu Aspirasi.
2. Memilih kategori dan mengisi deskripsi.
3. Menambahkan lokasi/foto bila relevan.
4. Mengirim laporan.
5. Memantau status dan tanggapan.

### Pengurus
1. Membuka antrean laporan.
2. Meninjau detail dan menentukan penanggung jawab.
3. Memperbarui status dan memberi tanggapan.
4. Menandai selesai dengan ringkasan tindak lanjut.

## 11. Inventaris
1. Pengurus membuka Inventaris.
2. Melihat daftar aset dan kondisi.
3. Menambah/mengubah data aset.
4. Memperbarui kondisi/lokasi dengan catatan.
5. Melihat riwayat perubahan bila tersedia.

## 12. Edge Cases yang Harus Ditangani UI
- Data kosong: tampilkan empty state dan CTA yang relevan.
- Pencarian tanpa hasil: tampilkan opsi reset filter.
- Form tidak valid: tampilkan pesan di dekat field.
- Pengajuan gagal: pertahankan input agar tidak hilang.
- Akses ditolak: tampilkan halaman 403/akses tidak tersedia.
- Sesi berakhir: arahkan ke login dengan pesan yang wajar.
- Lampiran terlalu besar/format tidak didukung: jelaskan batasan.
- Data sudah diproses oleh pengguna lain: minta refresh dan tampilkan status terbaru.
- Koneksi terputus: tampilkan retry; jangan mengklaim data tersimpan sebelum API mengonfirmasi.

## 13. Status Baku
| Domain | Status |
|---|---|
| Surat | Draft, Diajukan, Perlu Revisi, Diproses, Disetujui, Ditolak, Selesai |
| Pembayaran | Belum Dibayar, Menunggu Verifikasi, Lunas, Terlambat, Ditolak, Dibatalkan |
| Pengaduan | Baru, Ditinjau, Ditindaklanjuti, Selesai, Ditolak |
| Agenda | Akan Datang, Berlangsung, Selesai, Dibatalkan |
