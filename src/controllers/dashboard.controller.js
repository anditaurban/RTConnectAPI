import pool from '../config/db.js';
import { successResponse } from '../utils/response.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const user = req.user;
    const isWarga = user.role === 'warga';
    const isRW = user.role === 'ketua_rw';
    const regionId = user.region_id;

    if (isWarga) {
      // Warga summary
      const [letters] = await pool.execute(
        'SELECT COUNT(*) as count FROM letter_requests WHERE resident_id = ? AND status IN ("Diajukan", "Diproses", "Perlu Revisi")',
        [user.resident_id || '']
      );
      const [bills] = await pool.execute(
        'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalAmount FROM dues_bills WHERE resident_id = ? AND status IN ("Belum Dibayar", "Menunggu Verifikasi")',
        [user.resident_id || '']
      );
      const [complaints] = await pool.execute(
        'SELECT COUNT(*) as count FROM complaints WHERE reporter_id = ? AND status NOT IN ("Selesai", "Ditolak")',
        [user.resident_id || '']
      );

      return successResponse(res, {
        suratAktif: Number(letters[0].count),
        tagihanTertunda: Number(bills[0].count),
        nominalTagihanTertunda: Number(bills[0].totalAmount),
        aspirasiAktif: Number(complaints[0].count),
      });
    }

    // Pengurus (RT or RW)
    let regionFilter = 'r.region_id = ?';
    let regionParams = [regionId];

    if (isRW) {
      // Aggregate across all RTs in RW
      regionFilter = 'r.region_id IN (SELECT id FROM regions WHERE parent_id = ? OR id = ?)';
      regionParams = [regionId, regionId];
    }

    // 1. Total Warga
    const [wargaRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM residents r WHERE ${regionFilter} AND r.status_kependudukan = 'Aktif'`,
      regionParams
    );

    // 2. Total KK
    const [kkRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM families r WHERE ${regionFilter}`,
      regionParams
    );

    // 3. Kas Saldo
    let kasFilter = 't.region_id = ?';
    let kasParams = [regionId];
    if (isRW) {
      kasFilter = 't.region_id IN (SELECT id FROM regions WHERE parent_id = ? OR id = ?)';
      kasParams = [regionId, regionId];
    }
    const [kasRows] = await pool.execute(
      `SELECT 
         COALESCE(SUM(CASE WHEN t.type = 'in' THEN t.amount ELSE 0 END), 0) as totalIn,
         COALESCE(SUM(CASE WHEN t.type = 'out' THEN t.amount ELSE 0 END), 0) as totalOut
       FROM finance_transactions t
       WHERE ${kasFilter} AND t.status = 'active'`,
      kasParams
    );
    const kasSaldo = Number(kasRows[0].totalIn) - Number(kasRows[0].totalOut);

    // 4. Surat Tertunda
    let suratFilter = 'region_id = ?';
    let suratParams = [regionId];
    if (isRW) {
      suratFilter = 'region_id IN (SELECT id FROM regions WHERE parent_id = ? OR id = ?)';
      suratParams = [regionId, regionId];
    }
    const [suratRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM letter_requests WHERE ${suratFilter} AND status IN ('Diajukan', 'Diproses', 'Perlu Revisi')`,
      suratParams
    );

    // 5. Aspirasi Aktif
    let cmpFilter = 'region_id = ?';
    let cmpParams = [regionId];
    if (isRW) {
      cmpFilter = 'region_id IN (SELECT id FROM regions WHERE parent_id = ? OR id = ?)';
      cmpParams = [regionId, regionId];
    }
    const [cmpRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM complaints WHERE ${cmpFilter} AND status NOT IN ('Selesai', 'Ditolak')`,
      cmpParams
    );

    // 6. Tagihan Menunggu Verifikasi
    let duesFilter = 'region_id = ?';
    let duesParams = [regionId];
    if (isRW) {
      duesFilter = 'region_id IN (SELECT id FROM regions WHERE parent_id = ? OR id = ?)';
      duesParams = [regionId, regionId];
    }
    const [duesRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM dues_bills WHERE ${duesFilter} AND status = 'Menunggu Verifikasi'`,
      duesParams
    );

    return successResponse(res, {
      totalWarga: Number(wargaRows[0].total),
      totalKK: Number(kkRows[0].total),
      kasSaldo,
      suratTertunda: Number(suratRows[0].total),
      aspirasiAktif: Number(cmpRows[0].total),
      tagihanMenunggu: Number(duesRows[0].total),
    });
  } catch (err) {
    next(err);
  }
};

export const getDashboardActivities = async (req, res, next) => {
  try {
    const user = req.user;
    const isRW = user.role === 'ketua_rw';
    const regionId = user.region_id;

    let regionFilter = 'a.record_id IS NOT NULL';
    let params = [];

    // Query recent audit logs with user info
    const [logs] = await pool.execute(
      `SELECT a.id, a.table_name, a.record_id, a.action, a.new_values, a.created_at,
              u.name as actor_name, u.role as actor_role
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 10`,
      params
    );

    const activities = logs.map(log => ({
      id: String(log.id),
      table: log.table_name,
      recordId: log.record_id,
      action: log.action,
      actorName: log.actor_name || 'Sistem',
      actorRole: log.actor_role || 'system',
      timestamp: log.created_at,
      details: log.new_values ? (typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values) : {},
    }));

    return successResponse(res, { items: activities });
  } catch (err) {
    next(err);
  }
};

export const getDashboardPendingTasks = async (req, res, next) => {
  try {
    const user = req.user;
    const isRW = user.role === 'ketua_rw';
    const regionId = user.region_id;

    let regionFilter = 'region_id = ?';
    let params = [regionId];
    if (isRW) {
      regionFilter = 'region_id IN (SELECT id FROM regions WHERE parent_id = ? OR id = ?)';
      params = [regionId, regionId];
    }

    const [letters] = await pool.execute(
      `SELECT lr.id, lr.reference_no, lr.purpose, lr.status, lr.created_at, lt.name as letter_type_name, res.name as resident_name
       FROM letter_requests lr
       JOIN letter_types lt ON lr.letter_type_id = lt.id
       JOIN residents res ON lr.resident_id = res.id
       WHERE lr.${regionFilter} AND lr.status IN ('Diajukan', 'Diproses')
       ORDER BY lr.created_at ASC
       LIMIT 5`,
      params
    );

    const [payments] = await pool.execute(
      `SELECT db.id, db.bill_number, db.amount, db.payment_method, db.payment_date, res.name as resident_name
       FROM dues_bills db
       JOIN residents res ON db.resident_id = res.id
       WHERE db.${regionFilter} AND db.status = 'Menunggu Verifikasi'
       ORDER BY db.payment_date ASC
       LIMIT 5`,
      params
    );

    const [complaints] = await pool.execute(
      `SELECT c.id, c.title, c.category, c.status, c.created_at, c.reporter_name
       FROM complaints c
       WHERE c.${regionFilter} AND c.status = 'Baru'
       ORDER BY c.created_at ASC
       LIMIT 5`,
      params
    );

    return successResponse(res, {
      letters: letters.map(l => ({
        id: l.id,
        referenceNo: l.reference_no,
        letterType: l.letter_type_name,
        residentName: l.resident_name,
        status: l.status,
        createdAt: l.created_at,
      })),
      payments: payments.map(p => ({
        id: p.id,
        billNumber: p.bill_number,
        amount: Number(p.amount),
        paymentMethod: p.payment_method,
        residentName: p.resident_name,
        paymentDate: p.payment_date,
      })),
      complaints: complaints.map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        reporterName: c.reporter_name,
        status: c.status,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
};

