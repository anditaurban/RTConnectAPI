import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { listResponse, successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';
import { COMPLAINT_STATUSES } from '../config/constants.js';

export const getComplaints = async (req, res, next) => {
  try {
    const user = req.user;
    const isWarga = user.role === 'warga';
    const isRW = user.role === 'ketua_rw';

    let conditions = ['1=1'];
    let params = [];

    if (isWarga) {
      conditions.push('c.reporter_id = ?');
      params.push(user.resident_id || '');
    } else if (isRW) {
      conditions.push('(c.region_id = ? OR c.region_id IN (SELECT id FROM regions WHERE parent_id = ?))');
      params.push(user.region_id, user.region_id);
    } else if (user.role !== 'super_admin') {
      conditions.push('c.region_id = ?');
      params.push(user.region_id);
    }

    const { status, category, search } = req.query;
    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }
    if (category) {
      conditions.push('c.category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(c.title LIKE ? OR c.description LIKE ? OR c.location LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.category, c.location, c.description,
              c.reporter_id as reporterId, c.reporter_name as reporterName,
              c.reporter_phone as reporterPhone, c.region_id as regionId,
              reg.name as regionName, reg.code as rt,
              c.status, c.assigned_to as assignedTo, c.photo_url as photoUrl,
              c.created_at as createdAt, c.updated_at as updatedAt
       FROM complaints c
       LEFT JOIN regions reg ON c.region_id = reg.id
       WHERE ${whereClause}
       ORDER BY c.created_at DESC`,
      params
    );

    return successResponse(res, { items: rows });
  } catch (err) {
    next(err);
  }
};

export const getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.execute(
      `SELECT c.id, c.title, c.category, c.location, c.description,
              c.reporter_id as reporterId, c.reporter_name as reporterName,
              c.reporter_phone as reporterPhone, c.region_id as regionId,
              reg.name as regionName, reg.code as rt,
              c.status, c.assigned_to as assignedTo, c.photo_url as photoUrl,
              c.created_at as createdAt, c.updated_at as updatedAt
       FROM complaints c
       LEFT JOIN regions reg ON c.region_id = reg.id
       WHERE c.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 404, 'COMPLAINT_NOT_FOUND', 'Aduan tidak ditemukan.');
    }

    const complaint = rows[0];

    // Fetch responses
    const [responses] = await pool.execute(
      'SELECT id, author_name as author, message, created_at as date FROM complaint_responses WHERE complaint_id = ? ORDER BY created_at ASC',
      [id]
    );

    return successResponse(res, {
      ...complaint,
      responses,
    });
  } catch (err) {
    next(err);
  }
};

export const createComplaint = async (req, res, next) => {
  try {
    const user = req.user;
    const { title, category, location, description, reporterName, reporterPhone, regionId } = req.body;

    const newId = uuidv4();
    const finalReporterId = user.resident_id || null;
    const finalReporterName = reporterName || user.name;
    const finalReporterPhone = reporterPhone || user.phone || null;
    const finalRegionId = regionId || user.region_id;
    const photoUrl = req.file ? req.file.filename : req.body.photoUrl || null;

    await pool.execute(
      `INSERT INTO complaints (
        id, title, category, location, description, reporter_id, reporter_name,
        reporter_phone, region_id, status, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Baru', ?)`,
      [
        newId,
        title,
        category,
        location,
        description,
        finalReporterId,
        finalReporterName,
        finalReporterPhone,
        finalRegionId,
        photoUrl,
      ]
    );

    await logAudit({
      tableName: 'complaints',
      recordId: newId,
      action: 'INSERT',
      newValues: { title, category, finalRegionId },
      userId: user.id,
      ipAddress: req.ip,
    });

    const [created] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [newId]);
    return successResponse(res, created[0], {}, 201);
  } catch (err) {
    next(err);
  }
};

export const updateComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { status, assignedTo } = req.body;

    const [currents] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'COMPLAINT_NOT_FOUND', 'Aduan tidak ditemukan.');
    }

    const updates = [];
    const params = [];

    if (status) { updates.push('status = ?'); params.push(status); }
    if (assignedTo !== undefined) { updates.push('assigned_to = ?'); params.push(assignedTo); }

    if (updates.length > 0) {
      params.push(id);
      await pool.execute(`UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [id]);
    return successResponse(res, updated[0]);
  } catch (err) {
    next(err);
  }
};

export const addComplaintResponse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { message, authorName } = req.body;

    const [currents] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'COMPLAINT_NOT_FOUND', 'Aduan tidak ditemukan.');
    }

    const responseId = uuidv4();
    const finalAuthor = authorName || `${user.name} (${user.role})`;

    await pool.execute(
      'INSERT INTO complaint_responses (id, complaint_id, author_name, message) VALUES (?, ?, ?, ?)',
      [responseId, id, finalAuthor, message]
    );

    return successResponse(res, {
      id: responseId,
      complaintId: id,
      author: finalAuthor,
      message,
      date: new Date(),
    }, {}, 201);
  } catch (err) {
    next(err);
  }
};

