# BUSINESS RULES — RTConnect
## Sistem Pengelolaan Administrasi RT/RW

**Versi:** 1.0  
**Status:** Dokumen pendamping SOT  
**Keterkaitan:** PRD.md, USER-FLOW.md, UI-GUIDELINE.md, API-SPEC.md

> Aturan ini menjadi acuan frontend dan backend. Pada fase frontend, aturan hanya disimulasikan menggunakan mock data. Validasi otoritatif dilakukan backend setelah fase database disetujui.

## 1. Prinsip Umum
1. Setiap data operasional terikat pada wilayah RT/RW yang berwenang.
2. Pengguna hanya dapat melihat dan melakukan tindakan sesuai role serta cakupan wilayah.
3. Data pribadi warga tidak boleh ditampilkan kepada pengguna yang tidak berwenang.
4. Perubahan data penting harus dapat ditelusuri melalui audit log.
5. Transaksi keuangan dan riwayat persetujuan tidak boleh dihapus permanen melalui alur operasional biasa.
6. Status proses hanya berubah melalui tindakan yang diizinkan.
7. Aturan yang berbeda antarwilayah (nominal iuran, periode tagihan, format surat) harus dapat dikonfigurasi.
8. Sistem tidak mengambil keputusan administratif secara otomatis; keputusan tetap berada pada pengurus berwenang.

## 2. Role dan Kewenangan

| Role | Tanggung jawab |
|---|---|
| Super Admin | Konfigurasi sistem dan pengelolaan akun/wilayah; bukan pengambil keputusan administratif harian |
| Ketua RW | Ringkasan lintas RT dalam RW, informasi tingkat RW, persetujuan sesuai kebijakan |
| Ketua RT | Operasional RT, verifikasi data dan pengajuan warga |
| Sekretaris | Data warga dan administrasi surat sesuai delegasi |
| Bendahara | Iuran, pembayaran, kas, dan laporan keuangan |
| Petugas | Tugas operasional sesuai penugasan |
| Warga | Profil/keluarga sendiri, tagihan sendiri, pengajuan surat, pengumuman, agenda, dan laporan miliknya |

### Aturan akses
- Role tidak cukup menjadi satu-satunya pemeriksaan; cakupan wilayah juga wajib diperiksa.
- Pengurus RT hanya mengelola data pada RT yang ditugaskan.
- Pengurus RW dapat melihat ringkasan seluruh RT di RW tersebut. Detail data pribadi tetap dibatasi sesuai kebutuhan tugas.
- Warga hanya mengakses resource miliknya atau keluarganya sesuai relasi terverifikasi.
- Super Admin tidak otomatis berwenang menyetujui surat atau transaksi atas nama pengurus.
- Perubahan role dan penugasan wilayah hanya dilakukan oleh akun yang berwenang.
- Akses tidak sah harus ditolak di backend, bukan hanya disembunyikan dari UI.

## 3. Wilayah, Warga, dan Keluarga
- Struktur logis: RW → RT → KK → warga.
- Setiap warga memiliki ID internal unik. NIK bukan primary key.
- NIK dan nomor KK adalah data sensitif.
- Status warga: Aktif, Pindah, Meninggal, atau Nonaktif.
- Perubahan status mencatat tanggal efektif dan alasan bila diperlukan.
- Warga pindah/nonaktif tidak dihapus permanen jika masih memiliki riwayat.
- Pemindahan warga antar-RT hanya oleh pengurus berwenang dan harus tercatat.
- Satu warga hanya berada pada satu KK aktif pada satu waktu.
- Satu KK memiliki satu kepala keluarga aktif pada satu waktu.
- Kepala keluarga harus merupakan anggota KK tersebut.
- Data dummy tidak boleh dianggap sebagai data penduduk sebenarnya.

## 4. Administrasi Surat

### Aturan pengajuan
- Warga mengajukan surat untuk dirinya atau anggota keluarga yang dapat diwakilinya sesuai kebijakan.
- Jenis surat harus aktif dan tersedia untuk wilayah warga.
- Persyaratan dan lampiran wajib ditampilkan sebelum pengiriman.
- Pengajuan yang dikirim memperoleh nomor referensi unik.
- Pengajuan yang sedang diproses/disetujui/ditolak/selesai tidak dapat diedit pemohon, kecuali dikembalikan ke Perlu Revisi.
- Draft dapat diedit atau dibatalkan pemohon.

### Status dan transisi

| Status | Aksi | Status berikutnya | Pelaku |
|---|---|---|---|
| Draft | Kirim | Diajukan | Warga |
| Diajukan | Mulai proses | Diproses | Pengurus |
| Diajukan/Diproses | Minta perbaikan | Perlu Revisi | Pengurus |
| Perlu Revisi | Kirim ulang | Diajukan | Warga |
| Diajukan/Diproses | Setujui | Disetujui | Pejabat berwenang |
| Diajukan/Diproses | Tolak | Ditolak | Pejabat berwenang |
| Disetujui | Terbitkan/serahkan | Selesai | Pengurus |

- Setiap perubahan status menyimpan status asal/tujuan, pelaku, waktu, dan catatan.
- Alasan wajib saat meminta revisi atau menolak.
- Persetujuan mengikuti role dan kebijakan jenis surat.
- Nomor surat final unik dalam lingkup penomoran yang ditentukan.
- Surat final tidak boleh diubah diam-diam; koreksi harus tercatat.
- Template surat dapat berbeda antarwilayah.
- UI tidak boleh menyatakan surat resmi/terbit sebelum proses persetujuan dan penerbitan selesai.

## 5. Iuran dan Tagihan
- Jenis iuran memiliki nama, nominal, frekuensi, cakupan wilayah, basis penagihan, dan status aktif.
- Basis penagihan dapat per KK atau per warga dan ditentukan per jenis iuran.
- Perubahan nominal berlaku untuk tagihan baru; tagihan terbit menyimpan snapshot nominal.
- Tagihan memiliki periode dan tanggal jatuh tempo.
- Sistem mencegah tagihan ganda untuk jenis iuran, subjek, dan periode yang sama.
- Tagihan hanya dibuat bagi subjek yang memenuhi kriteria saat penerbitan.
- Tagihan belum lunas dapat menjadi terlambat setelah melewati jatuh tempo.

### Status pembayaran
| Status | Makna |
|---|---|
| Belum Dibayar | Belum ada pembayaran |
| Menunggu Verifikasi | Pembayaran/bukti menunggu pemeriksaan |
| Lunas | Pembayaran telah diverifikasi |
| Ditolak | Pembayaran ditolak; alasan tersedia |
| Dibatalkan | Tagihan/proses dibatalkan oleh pihak berwenang |
| Terlambat | Jatuh tempo terlewati dan belum lunas |

- MVP menggunakan pencatatan manual; tidak ada payment gateway.
- Transfer dapat menyertakan bukti; pembayaran tunai dicatat bendahara.
- Bendahara memeriksa nominal, tanggal, metode, dan bukti.
- Pembayaran disetujui menghasilkan kas masuk tepat satu kali.
- Default MVP adalah pembayaran penuh. Pembayaran parsial menunggu keputusan pengelola.
- Penolakan wajib memiliki alasan.
- Tagihan lunas tidak dibuka kembali tanpa koreksi tercatat.
- Pembatalan tagihan yang telah dibayar harus melalui prosedur koreksi/refund, bukan menghapus transaksi asal.

## 6. Keuangan dan Kas
- Transaksi bertipe Kas Masuk atau Kas Keluar.
- Wajib memiliki tanggal, kategori, nominal positif, deskripsi, pencatat, dan wilayah.
- Nominal disimpan sebagai integer rupiah.
- Kas masuk menambah saldo; kas keluar mengurangi saldo.
- Saldo dihitung dari saldo awal yang disepakati ditambah transaksi valid.
- Saldo dashboard bukan nilai yang diedit langsung.
- Transaksi tidak dihapus permanen; koreksi/void harus memiliki alasan dan audit.
- Perubahan transaksi nominal mencatat nilai sebelum dan sesudah.
- Hak membuat/mengubah transaksi dibatasi pada bendahara atau role yang didelegasikan.
- Bukti transaksi opsional kecuali kategori tertentu mewajibkannya.

## 7. Pengumuman
- Memiliki judul, isi, pembuat, target wilayah, tanggal publikasi, dan status.
- Target dapat RW atau RT sesuai kewenangan pembuat.
- Hanya tampil kepada warga/pengurus yang termasuk target.
- Status: Draft, Dipublikasikan, Diarsipkan.
- Pengumuman penting dapat diberi prioritas.
- Perubahan setelah publikasi harus memiliki jejak audit.
- Arsip lebih diutamakan daripada hapus permanen.

## 8. Aspirasi dan Pengaduan
- Warga mengirim kategori, judul/deskripsi, lokasi/keterangan lokasi, dan foto opsional.
- Pelapor dapat melihat laporan miliknya; identitas pelapor tidak ditampilkan kepada warga lain.
- Pengurus dapat menugaskan penanganan dan memberi tanggapan.
- Status: Baru → Ditinjau → Ditindaklanjuti → Selesai; dapat Ditolak dengan alasan.
- Perubahan status dan tanggapan disimpan sebagai histori.
- Tidak menjanjikan SLA sebelum waktu layanan ditetapkan wilayah.

## 9. Agenda dan Kegiatan
- Memiliki judul, deskripsi, waktu, lokasi, penyelenggara, target wilayah, dan status.
- Status: Akan Datang, Berlangsung, Selesai, Dibatalkan.
- Agenda batal tetap tersimpan.
- Warga hanya melihat agenda wilayahnya atau agenda RW yang bersifat umum.
- Perubahan waktu/lokasi setelah publikasi harus ditandai sebagai pembaruan.

## 10. Inventaris
- Aset memiliki nama, kode opsional, kategori, jumlah, kondisi, lokasi, dan catatan.
- Kode aset unik dalam wilayah bila digunakan.
- Perubahan jumlah/kondisi/lokasi dicatat.
- Aset tidak digunakan diarsipkan, bukan dihapus jika memiliki histori.
- MVP tidak mencakup procurement, depresiasi, atau akuntansi aset.

## 11. Notifikasi dan Aktivitas
- Notifikasi in-app dibuat untuk perubahan status surat, pembayaran, pengaduan, pengumuman penting, dan agenda.
- Notifikasi hanya dikirim kepada pengguna yang berhak.
- Kegagalan notifikasi tidak membatalkan transaksi utama.
- Aktivitas penting mencatat pelaku, waktu, tindakan, dan referensi objek.
- WhatsApp/SMS/email gateway berada di luar MVP.

## 12. Validasi Umum
- Field wajib tidak boleh kosong.
- Nominal harus lebih besar dari nol.
- Tanggal harus valid.
- File harus memiliki tipe dan ukuran yang diizinkan.
- Backend membersihkan dan memvalidasi input.
- ID resource bukan dasar tunggal otorisasi.
- Aksi sensitif harus mencegah request duplikat.

## 13. Audit dan Retensi
Audit minimal untuk perubahan data warga/KK, role/penugasan, status surat, penerbitan surat, transaksi kas, verifikasi pembayaran, dan status pengaduan. Audit menyimpan aktor, waktu, aksi, tipe/ID objek, dan ringkasan perubahan. Jangan menyalin NIK lengkap, password, token, atau dokumen pribadi ke log. Retensi data ditentukan pengelola sebelum production.

## 14. Keputusan yang Memerlukan Approval
1. Iuran rutin ditagihkan per KK atau per warga?
2. Apakah pembayaran parsial diperbolehkan?
3. Jenis surat apa saja dan siapa pejabat penandatangannya?
4. Apakah surat tertentu memerlukan persetujuan Ketua RW?
5. Bagaimana format nomor surat dan periode reset?
6. Apakah saldo kas memiliki saldo awal per RT/RW?
7. Satu akun warga dapat mewakili berapa anggota keluarga?
8. Siapa yang boleh membuat akun dan memindahkan warga antar-RT?

Jangan mengunci asumsi di atas ke dalam kode sebelum ada keputusan.
