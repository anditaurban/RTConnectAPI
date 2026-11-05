# API Specification — RTConnect

**Status:** Kontrak awal / rancangan untuk fase backend.  
**Catatan:** Dokumen ini mendefinisikan kebutuhan komunikasi frontend-backend. Implementasi API, database, dan autentikasi server belum boleh dimulai sebelum frontend disetujui.

## 1. Prinsip
- REST API berbasis JSON.
- Prefix versi: `/api/v1`.
- Frontend dan backend terpisah.
- Authentication menggunakan access token; mekanisme refresh dan penyimpanan token ditetapkan saat desain keamanan backend.
- Semua endpoint privat memerlukan autentikasi dan otorisasi role + wilayah.
- Waktu disimpan/dikirim dalam ISO 8601; nominal uang menggunakan integer rupiah.
- Pagination dan filter konsisten.

## 2. Format Respons
### Sukses
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Periksa kembali data yang dikirim.",
    "details": []
  }
}
```

HTTP status yang digunakan: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.

## 3. Authentication & Profile
| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout/revoke sesi |
| POST | `/auth/refresh` | Perbarui access token |
| POST | `/auth/forgot-password` | Minta reset password |
| POST | `/auth/reset-password` | Reset password |
| GET | `/me` | Profil dan role pengguna |

## 4. Dashboard
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/dashboard/summary` | Ringkasan sesuai role/wilayah |
| GET | `/dashboard/activities` | Aktivitas terbaru |
| GET | `/dashboard/pending-tasks` | Antrean tindakan |

## 5. Wilayah dan Data Warga
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/regions` | Daftar wilayah yang dapat diakses |
| GET | `/residents` | Daftar warga; filter RT/status/search |
| POST | `/residents` | Tambah warga |
| GET | `/residents/{id}` | Detail warga |
| PATCH | `/residents/{id}` | Ubah data warga |
| GET | `/families` | Daftar KK |
| POST | `/families` | Tambah KK |
| GET | `/families/{id}` | Detail KK dan anggota |
| PATCH | `/families/{id}` | Ubah data KK |

Query list standar: `page`, `limit`, `search`, `sort`, `order`, dan filter domain seperti `rt_id`, `status`.

## 6. Administrasi Surat
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/letters/types` | Jenis surat dan persyaratan |
| GET | `/letters/requests` | Daftar pengajuan sesuai akses |
| POST | `/letters/requests` | Ajukan surat |
| GET | `/letters/requests/{id}` | Detail dan timeline |
| PATCH | `/letters/requests/{id}` | Perbarui draft/revisi sesuai aturan |
| POST | `/letters/requests/{id}/submit` | Kirim pengajuan |
| POST | `/letters/requests/{id}/review` | Setujui/tolak/minta revisi/proses |
| GET | `/letters/requests/{id}/document` | Unduh surat final |

## 7. Keuangan dan Iuran
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/finance/summary` | Saldo dan ringkasan periode |
| GET | `/finance/transactions` | Daftar transaksi |
| POST | `/finance/transactions` | Catat transaksi |
| GET | `/finance/transactions/{id}` | Detail transaksi |
| PATCH | `/finance/transactions/{id}` | Koreksi sesuai aturan audit |
| GET | `/dues/types` | Jenis iuran |
| POST | `/dues/types` | Buat jenis iuran |
| GET | `/dues/bills` | Daftar tagihan |
| POST | `/dues/bills/generate` | Generate tagihan periode |
| GET | `/dues/bills/{id}` | Detail tagihan |
| POST | `/dues/payments` | Catat pembayaran |
| POST | `/dues/payments/{id}/verify` | Verifikasi pembayaran |
| GET | `/dues/my-bills` | Tagihan milik warga login |

## 8. Pengumuman, Aspirasi, Agenda, Inventaris
| Method | Endpoint | Keterangan |
|---|---|---|
| GET/POST | `/announcements` | Daftar/buat pengumuman |
| GET/PATCH/DELETE | `/announcements/{id}` | Detail/ubah/arsipkan |
| GET/POST | `/complaints` | Daftar/buat aspirasi |
| GET/PATCH | `/complaints/{id}` | Detail dan pembaruan status |
| POST | `/complaints/{id}/responses` | Tanggapan pengurus |
| GET/POST | `/events` | Daftar/buat agenda |
| GET/PATCH/DELETE | `/events/{id}` | Detail/ubah/hapus |
| GET/POST | `/assets` | Daftar/tambah inventaris |
| GET/PATCH | `/assets/{id}` | Detail/ubah inventaris |

## 9. Pengguna dan Pengaturan
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/users` | Daftar pengguna (admin berwenang) |
| POST | `/users` | Buat akun |
| PATCH | `/users/{id}` | Ubah role/status |
| GET/PATCH | `/settings/region` | Pengaturan wilayah |

## 10. Standar List dan Upload
- List response memuat `items` dan `pagination` (`page`, `limit`, `total`, `totalPages`).
- Batas default `limit` disarankan 20 dan maksimum 100.
- Upload menggunakan multipart/form-data atau presigned upload sesuai keputusan backend.
- Validasi MIME type, ukuran file, dan otorisasi harus dilakukan server.
- File privat tidak boleh tersedia melalui URL publik tanpa kontrol akses.

## 11. Otorisasi dan Keamanan
- Terapkan role-based access control dan pembatasan wilayah pada setiap request.
- Warga hanya dapat membaca/mengubah resource miliknya sesuai aturan.
- NIK, nomor KK, alamat, dan dokumen pribadi diperlakukan sebagai data sensitif.
- Jangan mengirim data pribadi berlebihan pada endpoint list.
- Catat audit untuk perubahan data warga, persetujuan surat, transaksi, dan verifikasi pembayaran.
- Terapkan rate limiting pada login dan endpoint sensitif.
- Jangan menyimpan secret di frontend.
- Kebijakan retensi, backup, dan persetujuan pemrosesan data ditetapkan sebelum production.

## 12. Integrasi Frontend
Selama fase frontend, gunakan mock service dengan bentuk data dan status yang kompatibel dengan kontrak ini. Tidak boleh membuat endpoint palsu seolah-olah backend sudah tersedia. Tandai seluruh data simulasi dengan jelas pada lingkungan development.

## 13. Hal yang Harus Diputuskan Sebelum Backend
- Format nomor surat dan alur persetujuan per jenis surat.
- Penagihan berdasarkan KK atau individu.
- Definisi saldo awal dan koreksi transaksi.
- Struktur role final serta batas kewenangan RT/RW.
- Mekanisme autentikasi, token, dan reset password.
- Kebijakan penyimpanan dokumen dan bukti pembayaran.
