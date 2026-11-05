import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { listResponse, successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';
import { generateTransactionCode } from '../utils/codeGenerator.js';
import { isRegionAccessible } from '../middlewares/regionCheck.js';

export const getFinanceSummary = async (req, res, next) => {
  try {
    const user = req.user;
    const isRW = user.role === 'ketua_rw';
    const regionId = user.region_id;

    let regionFilter = 'region_id = ?';
    let params = [regionId];

    if (isRW) {
      regionFilter = '(region_id = ? OR region_id IN (SELECT id FROM regions WHERE parent_id = ?))';
      params = [regionId, regionId];
    } else if (user.role === 'super_admin') {
      regionFilter = '1=1';
      params = [];
    }

    // Current month bounds
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const startOfMonth = `${currentYear}-${currentMonth}-01`;

    // 1. Overall Balance
    const [balanceRows] = await pool.execute(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as totalIn,
         COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as totalOut
       FROM finance_transactions
       WHERE ${regionFilter} AND status = 'active'`,
      params
    );

    const saldo = Number(balanceRows[0].totalIn) - Number(balanceRows[0].totalOut);

    // 2. Current Month Income & Expense
    const monthParams = [...params, startOfMonth];
    const [monthRows] = await pool.execute(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as monthIn,
         COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as monthOut
       FROM finance_transactions
       WHERE ${regionFilter} AND status = 'active' AND date >= ?`,
      monthParams
    );

    return successResponse(res, {
      saldo,
      kasMasukBulanIni: Number(monthRows[0].monthIn),
      kasKeluarBulanIni: Number(monthRows[0].monthOut),
      totalKasMasuk: Number(balanceRows[0].totalIn),
      totalKasKeluar: Number(balanceRows[0].totalOut),
    });
  } catch (err) {
    next(err);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const user = req.user;
    const isRW = user.role === 'ketua_rw';

    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    const { type, category, startDate, endDate, status = 'active', rt_id } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (isRW) {
      if (rt_id) {
        conditions.push('t.region_id = ?');
        params.push(rt_id);
      } else {
        conditions.push('(t.region_id = ? OR t.region_id IN (SELECT id FROM regions WHERE parent_id = ?))');
        params.push(user.region_id, user.region_id);
      }
    } else if (user.role !== 'super_admin') {
      conditions.push('t.region_id = ?');
      params.push(user.region_id);
    } else if (rt_id) {
      conditions.push('t.region_id = ?');
      params.push(rt_id);
    }

    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }

    if (type) {
      conditions.push('t.type = ?');
      params.push(type);
    }

    if (category) {
      conditions.push('t.category = ?');
      params.push(category);
    }

    if (startDate) {
      conditions.push('t.date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('t.date <= ?');
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM finance_transactions t WHERE ${whereClause}`,
      params
    );
    const total = Number(countResult[0].total);

    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(
      `SELECT t.id, t.transaction_code as transactionCode, t.region_id as regionId,
              reg.name as regionName, reg.code as rt,
              t.date, t.type, t.category, t.amount, t.description,
              t.recorded_by_user_id as recordedByUserId, u.name as recordedBy,
              t.receipt_url as receiptUrl, t.status, t.void_reason as voidReason,
              t.audit_note as auditNote, t.created_at as createdAt
       FROM finance_transactions t
       LEFT JOIN regions reg ON t.region_id = reg.id
       LEFT JOIN users u ON t.recorded_by_user_id = u.id
       WHERE ${whereClause}
       ORDER BY t.date DESC, t.created_at DESC
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

export const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.execute(
      `SELECT t.id, t.transaction_code as transactionCode, t.region_id as regionId,
              reg.name as regionName, reg.code as rt,
              t.date, t.type, t.category, t.amount, t.description,
              t.recorded_by_user_id as recordedByUserId, u.name as recordedBy,
              t.receipt_url as receiptUrl, t.status, t.void_reason as voidReason,
              t.audit_note as auditNote, t.created_at as createdAt,
              uv.name as voidedBy, t.voided_at as voidedAt
       FROM finance_transactions t
       LEFT JOIN regions reg ON t.region_id = reg.id
       LEFT JOIN users u ON t.recorded_by_user_id = u.id
       LEFT JOIN users uv ON t.voided_by_user_id = uv.id
       WHERE t.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 404, 'TRANSACTION_NOT_FOUND', 'Transaksi keuangan tidak ditemukan.');
    }

    const tx = rows[0];
    const allowed = await isRegionAccessible(user, tx.regionId);
    if (!allowed && user.role !== 'warga') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Transaksi di luar wilayah Anda.');
    }

    tx.amount = Number(tx.amount);
    return successResponse(res, tx);
  } catch (err) {
    next(err);
  }
};

export const createTransaction = async (req, res, next) => {
  try {
    const user = req.user;
    const { type, category, amount, description, date, receiptUrl, regionId, auditNote } = req.body;

    const targetRegionId = regionId || user.region_id;
    const allowed = await isRegionAccessible(user, targetRegionId);
    if (!allowed) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Wilayah transaksi tidak diizinkan.');
    }

    if (Number(amount) <= 0) {
      return errorResponse(res, 422, 'VALIDATION_ERROR', 'Nominal transaksi harus lebih besar dari 0.');
    }

    const newId = uuidv4();
    const transactionCode = generateTransactionCode();
    const finalDate = date || new Date().toISOString().split('T')[0];

    const fileReceipt = req.file ? req.file.filename : receiptUrl || null;

    const sql = `
      INSERT INTO finance_transactions (
        id, transaction_code, region_id, date, type, category, amount,
        description, recorded_by_user_id, receipt_url, status, audit_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `;

    await pool.execute(sql, [
      newId,
      transactionCode,
      targetRegionId,
      finalDate,
      type,
      category,
      amount,
      description,
      user.id,
      fileReceipt,
      auditNote || null,
    ]);

    await logAudit({
      tableName: 'finance_transactions',
      recordId: newId,
      action: 'INSERT',
      newValues: { transactionCode, type, category, amount, targetRegionId },
      userId: user.id,
      ipAddress: req.ip,
    });

    const [created] = await pool.execute('SELECT * FROM finance_transactions WHERE id = ?', [newId]);
    created[0].amount = Number(created[0].amount);
    return successResponse(res, created[0], {}, 201);
  } catch (err) {
    next(err);
  }
};

export const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { action, voidReason, auditNote, description, category, amount, date } = req.body;

    const [currents] = await pool.execute('SELECT * FROM finance_transactions WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'TRANSACTION_NOT_FOUND', 'Transaksi tidak ditemukan.');
    }
    const current = currents[0];

    const allowed = await isRegionAccessible(user, current.region_id);
    if (!allowed) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Transaksi di luar wilayah kewenangan Anda.');
    }

    if (action === 'void') {
      if (!voidReason) {
        return errorResponse(res, 422, 'VALIDATION_ERROR', 'Alasan pembatalan/void wajib disertakan.');
      }

      await pool.execute(
        `UPDATE finance_transactions
         SET status = 'void', void_reason = ?, voided_by_user_id = ?, voided_at = NOW()
         WHERE id = ?`,
        [voidReason, user.id, id]
      );

      await logAudit({
        tableName: 'finance_transactions',
        recordId: id,
        action: 'VOID',
        oldValues: { status: current.status },
        newValues: { status: 'void', voidReason },
        userId: user.id,
        ipAddress: req.ip,
      });

      return successResponse(res, { message: 'Transaksi berhasil dibatalkan (void).' });
    }

    // Correction update
    const updates = [];
    const params = [];
    const newValues = {};

    if (description) {
      updates.push('description = ?');
      params.push(description);
      newValues.description = description;
    }
    if (category) {
      updates.push('category = ?');
      params.push(category);
      newValues.category = category;
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(amount);
      newValues.amount = amount;
    }
    if (date) {
      updates.push('date = ?');
      params.push(date);
      newValues.date = date;
    }
    if (auditNote) {
      updates.push('audit_note = ?');
      params.push(auditNote);
      newValues.auditNote = auditNote;
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.execute(`UPDATE finance_transactions SET ${updates.join(', ')} WHERE id = ?`, params);

      await logAudit({
        tableName: 'finance_transactions',
        recordId: id,
        action: 'UPDATE',
        oldValues: current,
        newValues,
        userId: user.id,
        ipAddress: req.ip,
      });
    }

    const [updated] = await pool.execute('SELECT * FROM finance_transactions WHERE id = ?', [id]);
    updated[0].amount = Number(updated[0].amount);
    return successResponse(res, updated[0]);
  } catch (err) {
    next(err);
  }
};

