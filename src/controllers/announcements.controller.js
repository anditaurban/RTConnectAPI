import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { listResponse, successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';

export const getAnnouncements = async (req, res, next) => {
  try {
    const user = req.user;
    const isWarga = user.role === 'warga';

    let conditions = ['1=1'];
    let params = [];

    if (isWarga) {
      conditions.push("status = 'Dipublikasikan'");
    }

    const { priority, status, search } = req.query;
    if (priority) {
      conditions.push('priority = ?');
      params.push(priority);
    }
    if (status && !isWarga) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(title LIKE ? OR content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.content, a.target_region as targetRegion,
              a.priority, a.status, a.publish_date as date, a.valid_until as validUntil,
              a.author_user_id as authorUserId, u.name as author, a.region_id as regionId,
              a.created_at as createdAt, a.updated_at as updatedAt
       FROM announcements a
       LEFT JOIN users u ON a.author_user_id = u.id
       WHERE ${whereClause}
       ORDER BY a.priority = 'Mendesak' DESC, a.priority = 'Penting' DESC, a.publish_date DESC`,
      params
    );

    return successResponse(res, { items: rows });
  } catch (err) {
    next(err);
  }
};

export const getAnnouncementById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT a.id, a.title, a.content, a.target_region as targetRegion,
              a.priority, a.status, a.publish_date as date, a.valid_until as validUntil,
              a.author_user_id as authorUserId, u.name as author, a.region_id as regionId,
              a.created_at as createdAt, a.updated_at as updatedAt
       FROM announcements a
       LEFT JOIN users u ON a.author_user_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 404, 'ANNOUNCEMENT_NOT_FOUND', 'Pengumuman tidak ditemukan.');
    }

    return successResponse(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const user = req.user;
    const { title, content, targetRegion, priority = 'Biasa', status = 'Dipublikasikan', validUntil, regionId } = req.body;

    const targetRegionId = regionId || user.region_id;
    const newId = uuidv4();

    await pool.execute(
      `INSERT INTO announcements (
        id, title, content, target_region, priority, status, publish_date, valid_until, author_user_id, region_id
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [newId, title, content, targetRegion || 'Semua Warga', priority, status, validUntil || null, user.id, targetRegionId]
    );

    await logAudit({
      tableName: 'announcements',
      recordId: newId,
      action: 'INSERT',
      newValues: { title, priority, status, targetRegion },
      userId: user.id,
      ipAddress: req.ip,
    });

    const [created] = await pool.execute('SELECT * FROM announcements WHERE id = ?', [newId]);
    return successResponse(res, created[0], {}, 201);
  } catch (err) {
    next(err);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { title, content, targetRegion, priority, status, validUntil } = req.body;

    const [currents] = await pool.execute('SELECT * FROM announcements WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'ANNOUNCEMENT_NOT_FOUND', 'Pengumuman tidak ditemukan.');
    }

    const updates = [];
    const params = [];

    if (title) { updates.push('title = ?'); params.push(title); }
    if (content) { updates.push('content = ?'); params.push(content); }
    if (targetRegion) { updates.push('target_region = ?'); params.push(targetRegion); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (validUntil !== undefined) { updates.push('valid_until = ?'); params.push(validUntil); }

    if (updates.length > 0) {
      params.push(id);
      await pool.execute(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await pool.execute('SELECT * FROM announcements WHERE id = ?', [id]);
    return successResponse(res, updated[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Per business rules: archive instead of hard delete
    await pool.execute("UPDATE announcements SET status = 'Diarsipkan' WHERE id = ?", [id]);

    await logAudit({
      tableName: 'announcements',
      recordId: id,
      action: 'UPDATE',
      newValues: { status: 'Diarsipkan' },
      userId: user.id,
      ipAddress: req.ip,
    });

    return successResponse(res, { message: 'Pengumuman berhasil diarsipkan.' });
  } catch (err) {
    next(err);
  }
};

