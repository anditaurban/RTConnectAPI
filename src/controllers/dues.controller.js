import { v4 as uuidv4 } from 'uuid';
import pool, { withTransaction } from '../config/db.js';
import { listResponse, successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';
import { generateBillNumber, generateTransactionCode } from '../utils/codeGenerator.js';
import { isRegionAccessible } from '../middlewares/regionCheck.js';
import { BILL_STATUSES } from '../config/constants.js';

export const getDuesTypes = async (req, res, next) => {
  try {
    const user = req.user;
    const isRW = user.role === 'ketua_rw';

    let sql = 'SELECT id, region_id as regionId, code, name, amount, billing_type as billingType, billing_period as billingPeriod, description, is_active as isActive FROM dues_types';
    let params = [];

    if (isRW) {
      sql += ' WHERE region_id = ? OR region_id IN (SELECT id FROM regions WHERE parent_id = ?)';
      params.push(user.region_id, user.region_id);
    } else if (user.role !== 'super_admin' && user.region_id) {
      sql += ' WHERE region_id = ?';
      params.push(user.region_id);
    }

    sql += ' ORDER BY code ASC';

    const [rows] = await pool.execute(sql, params);
    const formatted = rows.map(r => ({
      ...r,
      amount: Number(r.amount),
      isActive: Boolean(r.isActive),
    }));

    return successResponse(res, { items: formatted });
  } catch (err) {
    next(err);
  }
};

export const createDuesType = async (req, res, next) => {
  try {
    const user = req.user;
    const { code, name, amount, billingType, billingPeriod, description, regionId } = req.body;

    const targetRegionId = regionId || user.region_id;
    const allowed = await isRegionAccessible(user, targetRegionId);
    if (!allowed) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Wilayah jenis iuran di luar wewenang Anda.');
    }

    const newId = uuidv4();
    await pool.execute(
      `INSERT INTO dues_types (id, region_id, code, name, amount, billing_type, billing_period, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [newId, targetRegionId, code, name, amount, billingType, billingPeriod, description || null]
    );

    await logAudit({
      tableName: 'dues_types',
      recordId: newId,
      action: 'INSERT',
      newValues: { code, name, amount, billingType, targetRegionId },
      userId: user.id,
      ipAddress: req.ip,
    });

    const [created] = await pool.execute('SELECT * FROM dues_types WHERE id = ?', [newId]);
    created[0].amount = Number(created[0].amount);
    return successResponse(res, created[0], {}, 201);
  } catch (err) {
    next(err);
  }
};

export const getDuesBills = async (req, res, next) => {
  try {
    const user = req.user;
    const isWarga = user.role === 'warga';
    const isRW = user.role === 'ketua_rw';

    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    const { status, period, duesTypeId, residentId, search, rt_id } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (isWarga) {
      // Warga sees bills for their resident ID or their family ID
      conditions.push('(b.resident_id = ? OR b.family_id = ?)');
      params.push(user.resident_id || '', user.family_id || '');
    } else if (isRW) {
      if (rt_id) {
        conditions.push('b.region_id = ?');
        params.push(rt_id);
      } else {
        conditions.push('(b.region_id = ? OR b.region_id IN (SELECT id FROM regions WHERE parent_id = ?))');
        params.push(user.region_id, user.region_id);
      }
    } else if (user.role !== 'super_admin') {
      conditions.push('b.region_id = ?');
      params.push(user.region_id);
    } else if (rt_id) {
      conditions.push('b.region_id = ?');
      params.push(rt_id);
    }

    if (residentId) {
      conditions.push('b.resident_id = ?');
      params.push(residentId);
    }

    if (status) {
      conditions.push('b.status = ?');
      params.push(status);
    }

    if (period) {
      conditions.push('b.period = ?');
      params.push(period);
    }

    if (duesTypeId) {
      conditions.push('b.dues_type_id = ?');
      params.push(duesTypeId);
    }

    if (search) {
      conditions.push('(b.bill_number LIKE ? OR res.name LIKE ? OR dt.name LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    const whereClause = conditions.join(' AND ');

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM dues_bills b
       JOIN dues_types dt ON b.dues_type_id = dt.id
       JOIN residents res ON b.resident_id = res.id
       WHERE ${whereClause}`,
      params
    );
    const total = Number(countResult[0].total);

    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(
      `SELECT b.id, b.bill_number as billNumber, b.dues_type_id as duesTypeId,
              dt.name as duesName, dt.code as duesCode,
              b.period, b.amount, b.due_date as dueDate,
              b.resident_id as residentId, res.name as residentName, res.no_kk as noKK,
              b.family_id as familyId, b.region_id as regionId,
              reg.name as regionName, reg.code as rt,
              b.status, b.payment_method as paymentMethod, b.payment_date as paymentDate,
              b.payment_proof_url as paymentProofUrl,
              b.verified_by_user_id as verifiedByUserId, uver.name as verifiedBy,
              b.verified_at as verifiedAt, b.verification_notes as verificationNotes,
              b.created_at as createdAt
       FROM dues_bills b
       JOIN dues_types dt ON b.dues_type_id = dt.id
       JOIN residents res ON b.resident_id = res.id
       LEFT JOIN regions reg ON b.region_id = reg.id
       LEFT JOIN users uver ON b.verified_by_user_id = uver.id
       WHERE ${whereClause}
       ORDER BY b.due_date DESC, b.created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    const formatted = rows.map(r => ({
      ...r,
      amount: Number(r.amount),
    }));

    return listResponse(res, formatted, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
};

export const getDuesBillById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.execute(
      `SELECT b.id, b.bill_number as billNumber, b.dues_type_id as duesTypeId,
              dt.name as duesName, dt.code as duesCode,
              b.period, b.amount, b.due_date as dueDate,
              b.resident_id as residentId, res.name as residentName, res.no_kk as noKK,
              b.family_id as familyId, b.region_id as regionId,
              reg.name as regionName, reg.code as rt,
              b.status, b.payment_method as paymentMethod, b.payment_date as paymentDate,
              b.payment_proof_url as paymentProofUrl,
              b.verified_by_user_id as verifiedByUserId, uver.name as verifiedBy,
              b.verified_at as verifiedAt, b.verification_notes as verificationNotes,
              b.created_at as createdAt
       FROM dues_bills b
       JOIN dues_types dt ON b.dues_type_id = dt.id
       JOIN residents res ON b.resident_id = res.id
       LEFT JOIN regions reg ON b.region_id = reg.id
       LEFT JOIN users uver ON b.verified_by_user_id = uver.id
       WHERE b.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 404, 'BILL_NOT_FOUND', 'Tagihan tidak ditemukan.');
    }

    const bill = rows[0];

    if (user.role === 'warga') {
      if (bill.residentId !== user.resident_id && bill.familyId !== user.family_id) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Anda hanya dapat mengakses tagihan keluarga sendiri.');
      }
    } else {
      const allowed = await isRegionAccessible(user, bill.regionId);
      if (!allowed) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Tagihan di luar cakupan wilayah Anda.');
      }
    }

    bill.amount = Number(bill.amount);
    return successResponse(res, bill);
  } catch (err) {
    next(err);
  }
};

export const generateDuesBills = async (req, res, next) => {
  try {
    const user = req.user;
    const { duesTypeId, period, dueDate, regionId } = req.body;

    const targetRegionId = regionId || user.region_id;
    const allowed = await isRegionAccessible(user, targetRegionId);
    if (!allowed) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Wilayah penerbitan tagihan di luar akses Anda.');
    }

    const [types] = await pool.execute('SELECT * FROM dues_types WHERE id = ?', [duesTypeId]);
    if (types.length === 0) {
      return errorResponse(res, 404, 'DUES_TYPE_NOT_FOUND', 'Jenis iuran tidak ditemukan.');
    }
    const duesType = types[0];

    let subjects = [];
    if (duesType.billing_type === 'per_kk') {
      // Find all active KK in region with valid head resident
      const [fams] = await pool.execute(
        `SELECT f.id as family_id, f.head_resident_id as resident_id
         FROM families f
         WHERE f.region_id = ? AND f.head_resident_id IS NOT NULL`,
        [targetRegionId]
      );
      subjects = fams;
    } else {
      // Find all active residents in region
      const [resList] = await pool.execute(
        `SELECT r.id as resident_id, r.family_id
         FROM residents r
         WHERE r.region_id = ? AND r.status_kependudukan = 'Aktif'`,
        [targetRegionId]
      );
      subjects = resList;
    }

    let generatedCount = 0;
    let skippedCount = 0;

    await withTransaction(async (conn) => {
      for (const sub of subjects) {
        // Prevent duplicate bill
        const [existing] = await conn.execute(
          `SELECT id FROM dues_bills
           WHERE dues_type_id = ? AND resident_id = ? AND period = ?`,
          [duesTypeId, sub.resident_id, period]
        );

        if (existing.length > 0) {
          skippedCount++;
          continue;
        }

        const billId = uuidv4();
        const billNumber = generateBillNumber();

        await conn.execute(
          `INSERT INTO dues_bills (id, bill_number, dues_type_id, period, amount, due_date, resident_id, family_id, region_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Belum Dibayar')`,
          [
            billId,
            billNumber,
            duesTypeId,
            period,
            duesType.amount,
            dueDate,
            sub.resident_id,
            sub.family_id,
            targetRegionId,
          ]
        );
        generatedCount++;
      }
    });

    await logAudit({
      tableName: 'dues_bills',
      recordId: null,
      action: 'INSERT',
      newValues: { duesTypeId, period, targetRegionId, generatedCount, skippedCount },
      userId: user.id,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      message: `Penerbitan tagihan selesai. Berhasil: ${generatedCount}, Dilewati (duplikat): ${skippedCount}.`,
      generated: generatedCount,
      skipped: skippedCount,
    });
  } catch (err) {
    next(err);
  }
};

export const payDuesBill = async (req, res, next) => {
  try {
    const user = req.user;
    const { billId, paymentMethod, paymentDate, isCashByBendahara } = req.body;
    const id = req.params.id || billId;

    const [bills] = await pool.execute('SELECT * FROM dues_bills WHERE id = ?', [id]);
    if (bills.length === 0) {
      return errorResponse(res, 404, 'BILL_NOT_FOUND', 'Tagihan tidak ditemukan.');
    }
    const bill = bills[0];

    const proofFile = req.file ? req.file.filename : req.body.paymentProofUrl || null;
    const payDate = paymentDate || new Date();

    if (isCashByBendahara && ['bendahara', 'ketua_rt', 'super_admin'].includes(user.role)) {
      // Direct cash payment verified by treasurer
      await withTransaction(async (conn) => {
        await conn.execute(
          `UPDATE dues_bills
           SET status = 'Lunas',
               payment_method = ?,
               payment_date = ?,
               verified_by_user_id = ?,
               verified_at = NOW(),
               verification_notes = 'Pembayaran tunai diterima langsung oleh bendahara.'
           WHERE id = ?`,
          [paymentMethod || 'Tunai ke Bendahara', payDate, user.id, id]
        );

        // Automatically record incoming cash transaction
        const trxId = uuidv4();
        const trxCode = generateTransactionCode();
        await conn.execute(
          `INSERT INTO finance_transactions (
            id, transaction_code, region_id, date, type, category, amount,
            description, recorded_by_user_id, status, audit_note
          ) VALUES (?, ?, ?, CURDATE(), 'in', 'Iuran Warga', ?, ?, ?, 'active', ?)`,
          [
            trxId,
            trxCode,
            bill.region_id,
            bill.amount,
            `Penerimaan pembayaran tagihan #${bill.bill_number} (Tunai)`,
            user.id,
            `Otomatis tercatat dari pelunasan tagihan ${bill.bill_number}`,
          ]
        );
      });

      return successResponse(res, { message: 'Pembayaran tunai berhasil dicatat dan lunas.' });
    }

    // Citizen upload transfer proof
    await pool.execute(
      `UPDATE dues_bills
       SET status = 'Menunggu Verifikasi',
           payment_method = ?,
           payment_date = ?,
           payment_proof_url = ?
       WHERE id = ?`,
      [paymentMethod || 'Transfer Bank', payDate, proofFile, id]
    );

    return successResponse(res, { message: 'Bukti pembayaran berhasil diunggah. Menunggu verifikasi pengurus.' });
  } catch (err) {
    next(err);
  }
};

export const verifyDuesPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { action, notes } = req.body;

    const [bills] = await pool.execute('SELECT * FROM dues_bills WHERE id = ?', [id]);
    if (bills.length === 0) {
      return errorResponse(res, 404, 'BILL_NOT_FOUND', 'Tagihan tidak ditemukan.');
    }
    const bill = bills[0];

    const allowed = await isRegionAccessible(user, bill.region_id);
    if (!allowed) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Tagihan di luar cakupan wilayah Anda.');
    }

    if (action === 'approve') {
      await withTransaction(async (conn) => {
        await conn.execute(
          `UPDATE dues_bills
           SET status = 'Lunas',
               verified_by_user_id = ?,
               verified_at = NOW(),
               verification_notes = ?
           WHERE id = ?`,
          [user.id, notes || 'Pembayaran telah diverifikasi oleh Bendahara.', id]
        );

        // Record cash entry EXACTLY ONCE
        const trxId = uuidv4();
        const trxCode = generateTransactionCode();
        await conn.execute(
          `INSERT INTO finance_transactions (
            id, transaction_code, region_id, date, type, category, amount,
            description, recorded_by_user_id, status, audit_note
          ) VALUES (?, ?, ?, CURDATE(), 'in', 'Iuran Warga', ?, ?, ?, 'active', ?)`,
          [
            trxId,
            trxCode,
            bill.region_id,
            bill.amount,
            `Penerimaan transfer pembayaran iuran #${bill.bill_number}`,
            user.id,
            `Otomatis tercatat setelah verifikasi bukti bayar iuran #${bill.bill_number}`,
          ]
        );

        // Send in-app notification to payer
        const [payerUsers] = await conn.execute(
          'SELECT id FROM users WHERE resident_id = ?',
          [bill.resident_id]
        );
        if (payerUsers.length > 0) {
          await conn.execute(
            `INSERT INTO notifications (id, user_id, title, message, type, link_tab)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              payerUsers[0].id,
              'Pembayaran Iuran Berhasil Diverifikasi',
              `Tagihan nomor ${bill.bill_number} telah diverifikasi lunas. Terima kasih atas partisipasi Anda.`,
              'success',
              'iuran',
            ]
          );
        }
      });

      await logAudit({
        tableName: 'dues_bills',
        recordId: id,
        action: 'UPDATE',
        oldValues: { status: bill.status },
        newValues: { status: 'Lunas', verifiedBy: user.id },
        userId: user.id,
        ipAddress: req.ip,
      });

      return successResponse(res, { message: 'Pembayaran iuran disetujui dan kas masuk berhasil dibukukan.' });
    } else if (action === 'reject') {
      if (!notes) {
        return errorResponse(res, 422, 'VALIDATION_ERROR', 'Alasan penolakan pembayaran wajib disertakan.');
      }

      await withTransaction(async (conn) => {
        await conn.execute(
          `UPDATE dues_bills
           SET status = 'Ditolak',
               verified_by_user_id = ?,
               verified_at = NOW(),
               verification_notes = ?
           WHERE id = ?`,
          [user.id, notes, id]
        );

        const [payerUsers] = await conn.execute(
          'SELECT id FROM users WHERE resident_id = ?',
          [bill.resident_id]
        );
        if (payerUsers.length > 0) {
          await conn.execute(
            `INSERT INTO notifications (id, user_id, title, message, type, link_tab)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              payerUsers[0].id,
              'Pembayaran Iuran Ditolak',
              `Bukti pembayaran tagihan ${bill.bill_number} ditolak dengan alasan: ${notes}`,
              'error',
              'iuran',
            ]
          );
        }
      });

      await logAudit({
        tableName: 'dues_bills',
        recordId: id,
        action: 'UPDATE',
        oldValues: { status: bill.status },
        newValues: { status: 'Ditolak', notes },
        userId: user.id,
        ipAddress: req.ip,
      });

      return successResponse(res, { message: 'Pembayaran ditolak.' });
    }

    return errorResponse(res, 400, 'INVALID_ACTION', 'Aksi verifikasi harus approve atau reject.');
  } catch (err) {
    next(err);
  }
};

export const getMyBills = async (req, res, next) => {
  try {
    const user = req.user;
    const [rows] = await pool.execute(
      `SELECT b.id, b.bill_number as billNumber, b.dues_type_id as duesTypeId,
              dt.name as duesName, dt.code as duesCode,
              b.period, b.amount, b.due_date as dueDate,
              b.status, b.payment_method as paymentMethod, b.payment_date as paymentDate,
              b.payment_proof_url as paymentProofUrl, b.verification_notes as verificationNotes
       FROM dues_bills b
       JOIN dues_types dt ON b.dues_type_id = dt.id
       WHERE b.resident_id = ? OR b.family_id = ?
       ORDER BY b.due_date DESC`,
      [user.resident_id || '', user.family_id || '']
    );

    const formatted = rows.map(r => ({
      ...r,
      amount: Number(r.amount),
    }));

    return successResponse(res, { items: formatted });
  } catch (err) {
    next(err);
  }
};

