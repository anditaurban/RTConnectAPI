import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function seedData() {
  const config = process.env.DATABASE_URL
    ? { uri: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rtconnect_db',
      };

  const connection = await mysql.createConnection(config);

  console.log('Seeding baseline demo data...');

  // 1. Announcements
  const [annCount] = await connection.execute('SELECT COUNT(*) as c FROM announcements');
  if (annCount[0].c === 0) {
    await connection.execute(`
      INSERT INTO announcements (id, title, content, target_region, priority, status, publish_date, valid_until, author_user_id, region_id)
      VALUES
      ('ann-01', 'Pemberitahuan Kerja Bakti Massal & Fogging Pencegahan DBD', 'Sehubungan dengan datangnya musim hujan dan peningkatan kasus jentik nyamuk, kami mengundang seluruh bapak/ibu warga RT 01 s/d RT 05 untuk berpartisipasi dalam kerja bakti membersihkan saluran air.', 'Semua RT (RW 05)', 'Penting', 'Dipublikasikan', '2026-08-13 07:00:00', '2026-08-18', 'user-rw', 'rw-05'),
      ('ann-02', 'Jadwal Pelayanan Posyandu Balita & Posbindu Lansia Melati Indah', 'Pemeriksaan tumbuh kembang balita, imunisasi campak, serta cek tensi & gula darah gratis untuk lansia akan dilaksanakan pada Sabtu depan di Balai Warga RW 05.', 'RW 05 Melati Asri', 'Biasa', 'Dipublikasikan', '2026-08-12 09:00:00', '2026-08-20', 'user-sekre', 'rt-01'),
      ('ann-03', 'Himbauan Pengurangan Kecepatan Kendaraan Bermotor di Gang Pemukiman', 'Demi keselamatan anak-anak dan ketenangan lingkungan, seluruh warga dan kurir ekspedisi dimohon tidak memacu sepeda motor lebih dari 15 km/jam.', 'RT 01', 'Penting', 'Dipublikasikan', '2026-08-07 10:00:00', '2026-09-01', 'user-rt1', 'rt-01'),
      ('ann-04', 'Rancangan Anggaran Peringatan HUT RI ke-81 (Draft Koordinasi)', 'Draft internal susunan panitia dan rincian alokasi biaya perlombaan anak-anak, jalan santai keluarga, dan panggung apresiasi seni warga.', 'Khusus Pengurus RT/RW', 'Biasa', 'Draft', '2026-08-04 15:00:00', '2026-08-17', 'user-sekre', 'rt-01')
    `);
    console.log('Inserted announcements.');
  }

  // 2. Complaints
  const [cmpCount] = await connection.execute('SELECT COUNT(*) as c FROM complaints');
  if (cmpCount[0].c === 0) {
    await connection.execute(`
      INSERT INTO complaints (id, title, category, location, description, reporter_id, reporter_name, reporter_phone, region_id, status, assigned_to, photo_url)
      VALUES
      ('cmp-01', 'Lampu Penerangan Jalan Gang Mawar 3 Mati Total', 'Fasilitas Umum', 'Depan rumah No. B3/12, Gang Mawar 3, RT 01', 'Sudah 3 malam lampu jalan di tiang depan rumah warga padam. Jalan menjadi sangat gelap saat malam hari.', 'res-01', 'Ahmad Ridwan', '0812-8899-0011', 'rt-01', 'Ditindaklanjuti', 'Bpk. Agus Saputra (Petugas)', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'),
      ('cmp-02', 'Saluran Air Got Mampet Tersumbat Sampah Plastik', 'Kebersihan & Lingkungan', 'Sudut pertigaan Blok B2 dekat lapangan', 'Air got meluap ke badan jalan paving saat hujan rintik-rintik kemarin karena tersumbat endapan lumpur.', 'res-01', 'Ahmad Ridwan', '0812-8899-0011', 'rt-01', 'Ditinjau', NULL, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'),
      ('cmp-03', 'Pohon Mangga Doyong Menjorok ke Kabel Listrik PLN', 'Keamanan Lingkungan', 'Halaman kosong Blok B4 No. 02', 'Dahan pohon mangga yang sudah tua menimpa kabel optik internet dan kabel listrik, dikhawatirkan korsleting saat angin kencang.', 'res-04', 'Bpk. Joko Widodo Mulyono', '0813-1122-3344', 'rt-01', 'Selesai', 'Bpk. Agus Saputra', NULL)
    `);

    await connection.execute(`
      INSERT INTO complaint_responses (id, complaint_id, author_name, message)
      VALUES
      ('cmp-res-01', 'cmp-01', 'Bpk. Joko Widodo M. (Ketua RT 01)', 'Laporan diterima. Sudah dikoordinasikan dengan petugas Pak Agus untuk pembelian bohlam LED baru sore hari ini.'),
      ('cmp-res-02', 'cmp-01', 'Bpk. Agus Saputra (Petugas)', 'Siap pak, tangga dan alat instalasi sudah disiapkan di pos.'),
      ('cmp-res-03', 'cmp-02', 'Ibu Siti Rahayu (Sekretaris)', 'Terima kasih laporannya Pak Ahmad. Lokasi ini sudah dimasukkan ke agenda prioritas kerja bakti hari Minggu.')
    `);
    console.log('Inserted complaints and responses.');
  }

  // 3. Events
  const [evtCount] = await connection.execute('SELECT COUNT(*) as c FROM events');
  if (evtCount[0].c === 0) {
    await connection.execute(`
      INSERT INTO events (id, title, category, event_date, time_string, location, organizer, description, status, attendees_count, region_id)
      VALUES
      ('evt-01', 'Kerja Bakti Serentak Warga RW 05', 'Kerja Bakti', '2026-08-16', '07:00 - 10:30 WIB', 'Sepanjang Jalan Lingkungan RW 05 dan Saluran Utama', 'Pengurus RW 05 & Ketua RT 01-05', 'Pembersihan saluran air dan pemotongan semak liar menyambut hari kemerdekaan.', 'Akan Datang', 85, 'rw-05'),
      ('evt-02', 'Malam Puncak Panggung Gembira HUT RI ke-81', 'Peringatan Hari Besar', '2026-08-17', '19:30 - 22:30 WIB', 'Lapangan Olahraga Balai Warga RW 05', 'Karang Taruna Tunas Melati & Pengurus RW', 'Penyerahan piala pemenang aneka perlombaan dan ramah tamah.', 'Akan Datang', 220, 'rw-05'),
      ('evt-03', 'Pelayanan Imunisasi Balita & Cek Kesehatan Lansia', 'Kesehatan', '2026-08-14', '08:30 - 11:30 WIB', 'Posyandu Melati RT 01', 'Kader Posyandu & Puskesmas Kecamatan', 'Pemberian vitamin A, penimbangan balita, dan cek tensi/gula darah.', 'Berlangsung', 42, 'rt-01'),
      ('evt-04', 'Rapat Koordinasi Pengurus RT & RW Triwulan III', 'Rapat', '2026-07-28', '20:00 - 22:00 WIB', 'Ruang Rapat Kantor RW 05', 'Ketua RW 05', 'Evaluasi program kebersihan dan laporan kas semester 1.', 'Selesai', 18, 'rw-05')
    `);
    console.log('Inserted events.');
  }

  // 4. Letter Requests
  const [letCount] = await connection.execute('SELECT COUNT(*) as c FROM letter_requests');
  if (letCount[0].c === 0) {
    await connection.execute(`
      INSERT INTO letter_requests (id, reference_no, letter_type_id, resident_id, region_id, purpose, letter_number, status, reviewed_by_user_id, approved_by_user_id, notes)
      VALUES
      ('req-01', 'REQ/2026/08/0014', 'lt-01', 'res-01', 'rt-01', 'Pendaftaran rekening bank simpanan pelajar anak di Bank Mandiri', '470/014/RT.01-RW.05/VIII/2026', 'Disetujui', 'user-sekre', 'user-rt1', 'Data dan lampiran telah diverifikasi lengkap. Surat resmi telah disetujui.'),
      ('req-02', 'REQ/2026/08/0021', 'lt-02', 'res-02', 'rt-01', 'Penggantian KTP-el yang rusak fisik/terkelupas', NULL, 'Diajukan', NULL, NULL, 'Menunggu peninjauan pengurus.'),
      ('req-03', 'REQ/2026/08/0009', 'lt-04', 'res-01', 'rt-01', 'Pengajuan kemitraan agen ekspedisi logistik di rumah', NULL, 'Perlu Revisi', 'user-sekre', NULL, 'Foto tempat usaha buram dan belum menyertakan spanduk usaha.')
    `);

    await connection.execute(`
      INSERT INTO letter_timeline (id, letter_request_id, status, note, actor_user_id)
      VALUES
      ('lt-tm-01', 'req-01', 'Diajukan', 'Permohonan surat dikirim oleh warga.', 'user-warga1'),
      ('lt-tm-02', 'req-01', 'Diproses', 'Berkas diterima & diverifikasi oleh Sekretaris RT.', 'user-sekre'),
      ('lt-tm-03', 'req-01', 'Disetujui', 'Surat disetujui & nomor surat resmi diterbitkan oleh Ketua RT.', 'user-rt1'),
      ('lt-tm-04', 'req-02', 'Diajukan', 'Permohonan diajukan oleh pemohon.', 'user-warga1'),
      ('lt-tm-05', 'req-03', 'Diajukan', 'Pengajuan surat SKU dikirim.', 'user-warga1'),
      ('lt-tm-06', 'req-03', 'Perlu Revisi', 'Pengurus meminta perbaikan dokumen foto tempat usaha.', 'user-sekre')
    `);
    console.log('Inserted letter requests and timeline.');
  }

  // 5. Dues Bills
  const [billCount] = await connection.execute('SELECT COUNT(*) as c FROM dues_bills');
  if (billCount[0].c === 0) {
    await connection.execute(`
      INSERT INTO dues_bills (id, bill_number, dues_type_id, period, amount, due_date, resident_id, family_id, region_id, status, payment_method, payment_date, payment_proof_url, verified_by_user_id, verified_at, verification_notes)
      VALUES
      ('bill-01', 'TAG-202608-0014', 'dt-01', 'Agustus 2026', 100000.00, '2026-08-15', 'res-01', 'fam-01', 'rt-01', 'Menunggu Verifikasi', 'Transfer Bank BCA', '2026-08-12 14:20:00', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80', NULL, NULL, 'Warga telah mengunggah bukti transfer sebesar Rp 100.000.'),
      ('bill-02', 'TAG-202607-0014', 'dt-01', 'Juli 2026', 100000.00, '2026-07-15', 'res-01', 'fam-01', 'rt-01', 'Lunas', 'Tunai ke Bendahara', '2026-07-10 16:00:00', NULL, 'user-benda', '2026-07-10 16:05:00', 'Diterima tunai oleh Ibu Dewi Anggraeni (Kuitansi #K-202607-14).'),
      ('bill-03', 'TAG-202608-0018', 'dt-01', 'Agustus 2026', 100000.00, '2026-08-15', 'res-04', 'fam-02', 'rt-01', 'Belum Dibayar', NULL, NULL, NULL, NULL, NULL, NULL),
      ('bill-04', 'TAG-202608-0005', 'dt-04', 'Agustus 2026', 75000.00, '2026-08-10', 'res-01', 'fam-01', 'rt-01', 'Lunas', 'Transfer Bank BCA', '2026-08-05 11:00:00', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80', 'user-benda', '2026-08-06 09:00:00', 'Pembayaran disetujui oleh Bendahara pada 06 Agu 2026.')
    `);
    console.log('Inserted dues bills.');
  }

  // 6. Notifications
  const [notifCount] = await connection.execute('SELECT COUNT(*) as c FROM notifications');
  if (notifCount[0].c === 0) {
    await connection.execute(`
      INSERT INTO notifications (id, user_id, title, message, type, link_tab, is_read)
      VALUES
      ('notif-01', 'user-warga1', 'Surat Keterangan Disetujui', 'Pengajuan Surat Keterangan Domisili (REQ/2026/08/0014) telah disetujui oleh Ketua RT.', 'success', 'surat', 0),
      ('notif-02', 'user-warga1', 'Tagihan Iuran Baru', 'Tagihan iuran lingkungan periode Agustus 2026 sebesar Rp 100.000 telah terbit.', 'info', 'iuran', 0),
      ('notif-03', 'user-benda', 'Konfirmasi Pembayaran Masuk', 'Warga Ahmad Ridwan telah mengunggah bukti pembayaran tagihan TAG-202608-0014.', 'warning', 'iuran', 0),
      ('notif-04', 'user-rt1', 'Pengajuan Surat Baru', 'Permohonan surat pengantar baru dari Ahmad Ridwan menunggu proses verifikasi.', 'info', 'surat', 0)
    `);
    console.log('Inserted notifications.');
  }

  console.log('Baseline demo data seeding complete!');
  await connection.end();
}

seedData().catch((err) => {
  console.error('Failed to seed baseline data:', err);
  process.exit(1);
});

