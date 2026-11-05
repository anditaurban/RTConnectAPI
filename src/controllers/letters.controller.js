import { v4 as uuidv4 } from 'uuid';
import pool, { withTransaction } from '../config/db.js';
import { listResponse, successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';
import { generateReferenceNo, generateLetterNumber } from '../utils/codeGenerator.js';
import { isRegionAccessible } from '../middlewares/regionCheck.js';
import { LETTER_STATUSES } from '../config/constants.js';

export const getLetterTypes = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, code, name, description, requirements, processing_time as processingTime, is_active as isActive
       FROM letter_types
       WHERE is_active = 1
       ORDER BY code ASC`
    );

    const formatted = rows.map(r => ({
      ...r,
      requirements: typeof r.requirements === 'string' ? JSON.parse(r.requirements) : r.requirements,
      isActive: Boolean(r.isActive),
    }));

    return successResponse(res, { items: formatted });
  } catch (err) {
    next(err);
  }
};

export const getLetterRequests = async (req, res, next) => {
  try {
    const user = req.user;
    const isWarga = user.role === 'warga';
    const isRW = user.role === 'ketua_rw';

    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    const { status, residentId, search, rt_id } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (isWarga) {
      conditions.push('lr.resident_id = ?');
      params.push(user.resident_id || '');
    } else if (isRW) {
      if (rt_id) {
        conditions.push('lr.region_id = ?');
        params.push(rt_id);
      } else {
        conditions.push('(lr.region_id = ? OR lr.region_id IN (SELECT id FROM regions WHERE parent_id = ?))');
        params.push(user.region_id, user.region_id);
      }
    } else if (user.role !== 'super_admin') {
      conditions.push('lr.region_id = ?');
      params.push(user.region_id);
    } else if (rt_id) {
      conditions.push('lr.region_id = ?');
      params.push(rt_id);
    }

    if (residentId) {
      conditions.push('lr.resident_id = ?');
      params.push(residentId);
    }

    if (status) {
      conditions.push('lr.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(lr.reference_no LIKE ? OR lr.letter_number LIKE ? OR res.name LIKE ? OR lt.name LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    const whereClause = conditions.join(' AND ');

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM letter_requests lr
       JOIN letter_types lt ON lr.letter_type_id = lt.id
       JOIN residents res ON lr.resident_id = res.id
       WHERE ${whereClause}`,
      params
    );
    const total = Number(countResult[0].total);

    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(
      `SELECT lr.id, lr.reference_no as referenceNo, lr.letter_type_id as letterTypeId,
              lt.name as letterName, lt.code as letterCode,
              lr.resident_id as residentId, res.name as residentName, res.nik, res.no_kk as noKK,
              lr.region_id as regionId, reg.name as regionName, reg.code as rt,
              lr.purpose, lr.letter_number as letterNumber, lr.status,
              lr.reviewed_by_user_id as reviewedByUserId, urev.name as reviewedBy,
              lr.approved_by_user_id as approvedByUserId, uapp.name as approvedBy,
              lr.notes, lr.created_at as createdAt, lr.updated_at as updatedAt
       FROM letter_requests lr
       JOIN letter_types lt ON lr.letter_type_id = lt.id
       JOIN residents res ON lr.resident_id = res.id
       LEFT JOIN regions reg ON lr.region_id = reg.id
       LEFT JOIN users urev ON lr.reviewed_by_user_id = urev.id
       LEFT JOIN users uapp ON lr.approved_by_user_id = uapp.id
       WHERE ${whereClause}
       ORDER BY lr.created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    return listResponse(res, rows, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
};

export const getLetterRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.execute(
      `SELECT lr.id, lr.reference_no as referenceNo, lr.letter_type_id as letterTypeId,
              lt.name as letterName, lt.code as letterCode,
              lr.resident_id as residentId, res.name as residentName, res.nik, res.no_kk as noKK,
              res.gender, res.birth_place as birthPlace, res.birth_date as birthDate,
              res.job, res.religion, res.marital_status as maritalStatus, res.address as residentAddress,
              lr.region_id as regionId, reg.name as regionName, reg.code as rt,
              lr.purpose, lr.letter_number as letterNumber, lr.status,
              lr.reviewed_by_user_id as reviewedByUserId, urev.name as reviewedBy,
              lr.approved_by_user_id as approvedByUserId, uapp.name as approvedBy,
              lr.notes, lr.created_at as createdAt, lr.updated_at as updatedAt
       FROM letter_requests lr
       JOIN letter_types lt ON lr.letter_type_id = lt.id
       JOIN residents res ON lr.resident_id = res.id
       LEFT JOIN regions reg ON lr.region_id = reg.id
       LEFT JOIN users urev ON lr.reviewed_by_user_id = urev.id
       LEFT JOIN users uapp ON lr.approved_by_user_id = uapp.id
       WHERE lr.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 404, 'LETTER_REQUEST_NOT_FOUND', 'Pengajuan surat tidak ditemukan.');
    }

    const letter = rows[0];

    if (user.role === 'warga' && letter.residentId !== user.resident_id) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Anda hanya dapat melihat permohonan surat milik sendiri.');
    }
    if (user.role !== 'warga') {
      const allowed = await isRegionAccessible(user, letter.regionId);
      if (!allowed) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Pengajuan surat di luar wilayah kewenangan Anda.');
      }
    }

    // Attachments
    const [attachments] = await pool.execute(
      'SELECT id, file_name as name, file_path as path, file_size as size, mime_type as mimeType, created_at as createdAt FROM letter_attachments WHERE letter_request_id = ?',
      [id]
    );

    // Timeline
    const [timeline] = await pool.execute(
      `SELECT lt.id, lt.status, lt.note, lt.created_at as date, u.name as actorName, u.role as actorRole
       FROM letter_timeline lt
       LEFT JOIN users u ON lt.actor_user_id = u.id
       WHERE lt.letter_request_id = ?
       ORDER BY lt.created_at ASC`,
      [id]
    );

    return successResponse(res, {
      ...letter,
      attachments,
      timeline,
    });
  } catch (err) {
    next(err);
  }
};

export const createLetterRequest = async (req, res, next) => {
  try {
    const user = req.user;
    const { letterTypeId, purpose, isDraft } = req.body;
    let residentId = req.body.residentId;
    let regionId = req.body.regionId;

    if (user.role === 'warga') {
      residentId = user.resident_id;
      regionId = user.region_id;
    } else {
      if (!residentId) {
        return errorResponse(res, 422, 'VALIDATION_ERROR', 'ID Pemohon wajib ditentukan.');
      }
      if (!regionId) {
        const [resRows] = await pool.execute('SELECT region_id FROM residents WHERE id = ?', [residentId]);
        if (resRows.length > 0) regionId = resRows[0].region_id;
      }
    }

    const status = isDraft ? LETTER_STATUSES.DRAFT : LETTER_STATUSES.DIAJUKAN;
    const referenceNo = generateReferenceNo();
    const requestId = uuidv4();

    await withTransaction(async (conn) => {
      await conn.execute(
        `INSERT INTO letter_requests (id, reference_no, letter_type_id, resident_id, region_id, purpose, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [requestId, referenceNo, letterTypeId, residentId, regionId, purpose, status]
      );

      // Handle file attachments if uploaded via multer
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await conn.execute(
            `INSERT INTO letter_attachments (id, letter_request_id, file_name, file_path, file_size, mime_type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), requestId, file.originalname, file.filename, file.size, file.mimetype]
          );
        }
      }

      // Add timeline entry
      await conn.execute(
        `INSERT INTO letter_timeline (id, letter_request_id, status, note, actor_user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          requestId,
          status,
          status === LETTER_STATUSES.DRAFT ? 'Draf permohonan dibuat.' : 'Permohonan surat diajukan oleh pemohon.',
          user.id,
        ]
      );
    });

    await logAudit({
      tableName: 'letter_requests',
      recordId: requestId,
      action: 'INSERT',
      newValues: { referenceNo, letterTypeId, residentId, status },
      userId: user.id,
      ipAddress: req.ip,
    });

    const [created] = await pool.execute('SELECT * FROM letter_requests WHERE id = ?', [requestId]);
    return successResponse(res, created[0], {}, 201);
  } catch (err) {
    next(err);
  }
};

export const updateLetterRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { purpose, letterTypeId } = req.body;

    const [currents] = await pool.execute('SELECT * FROM letter_requests WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'LETTER_REQUEST_NOT_FOUND', 'Pengajuan surat tidak ditemukan.');
    }
    const current = currents[0];

    // Only allow edit if Draft or Perlu Revisi
    if (current.status !== LETTER_STATUSES.DRAFT && current.status !== LETTER_STATUSES.PERLU_REVISI) {
      return errorResponse(res, 400, 'CANNOT_EDIT', 'Surat yang sedang diproses atau disetujui tidak dapat diedit.');
    }

    if (user.role === 'warga' && current.resident_id !== user.resident_id) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Anda tidak berwenang mengubah permohonan ini.');
    }

    const updates = [];
    const params = [];
    if (purpose) {
      updates.push('purpose = ?');
      params.push(purpose);
    }
    if (letterTypeId) {
      updates.push('letter_type_id = ?');
      params.push(letterTypeId);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.execute(`UPDATE letter_requests SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return successResponse(res, { message: 'Pengajuan surat berhasil diperbarui.' });
  } catch (err) {
    next(err);
  }
};

export const submitLetterRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [currents] = await pool.execute('SELECT * FROM letter_requests WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'LETTER_REQUEST_NOT_FOUND', 'Pengajuan surat tidak ditemukan.');
    }
    const current = currents[0];

    if (current.status !== LETTER_STATUSES.DRAFT && current.status !== LETTER_STATUSES.PERLU_REVISI) {
      return errorResponse(res, 400, 'CANNOT_SUBMIT', 'Pengajuan sudah dalam proses pengurus.');
    }

    await withTransaction(async (conn) => {
      await conn.execute(
        'UPDATE letter_requests SET status = ?, notes = NULL WHERE id = ?',
        [LETTER_STATUSES.DIAJUKAN, id]
      );

      await conn.execute(
        `INSERT INTO letter_timeline (id, letter_request_id, status, note, actor_user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          id,
          LETTER_STATUSES.DIAJUKAN,
          current.status === LETTER_STATUSES.PERLU_REVISI
            ? 'Dokumen perbaikan telah dikirim ulang oleh pemohon.'
            : 'Permohonan surat resmi diajukan.',
          user.id,
        ]
      );
    });

    await logAudit({
      tableName: 'letter_requests',
      recordId: id,
      action: 'UPDATE',
      oldValues: { status: current.status },
      newValues: { status: LETTER_STATUSES.DIAJUKAN },
      userId: user.id,
      ipAddress: req.ip,
    });

    return successResponse(res, { message: 'Pengajuan surat berhasil dikirim ke pengurus.' });
  } catch (err) {
    next(err);
  }
};

export const reviewLetterRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { action, notes, letterNumber } = req.body;

    const [currents] = await pool.execute('SELECT * FROM letter_requests WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'LETTER_REQUEST_NOT_FOUND', 'Pengajuan surat tidak ditemukan.');
    }
    const current = currents[0];

    const allowed = await isRegionAccessible(user, current.region_id);
    if (!allowed) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Pengajuan surat di luar wilayah tugas Anda.');
    }

    let nextStatus;
    let reviewerField = null;
    let approverField = null;
    let officialNumber = current.letter_number;

    switch (action) {
      case 'process':
        nextStatus = LETTER_STATUSES.DIPROSES;
        reviewerField = user.id;
        break;
      case 'revise':
        if (!notes) {
          return errorResponse(res, 422, 'VALIDATION_ERROR', 'Catatan alasan perbaikan dokumen wajib diisi.');
        }
        nextStatus = LETTER_STATUSES.PERLU_REVISI;
        reviewerField = user.id;
        break;
      case 'approve':
        nextStatus = LETTER_STATUSES.DISETUJUI;
        approverField = user.id;
        officialNumber = letterNumber || generateLetterNumber('01', '05');
        break;
      case 'reject':
        if (!notes) {
          return errorResponse(res, 422, 'VALIDATION_ERROR', 'Alasan penolakan pengajuan surat wajib diisi.');
        }
        nextStatus = LETTER_STATUSES.DITOLAK;
        approverField = user.id;
        break;
      case 'complete':
        nextStatus = LETTER_STATUSES.SELESAI;
        break;
      default:
        return errorResponse(res, 400, 'INVALID_ACTION', 'Aksi verifikasi tidak valid.');
    }

    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE letter_requests
         SET status = ?,
             letter_number = ?,
             reviewed_by_user_id = COALESCE(?, reviewed_by_user_id),
             approved_by_user_id = COALESCE(?, approved_by_user_id),
             notes = ?
         WHERE id = ?`,
        [nextStatus, officialNumber, reviewerField, approverField, notes || current.notes, id]
      );

      await conn.execute(
        `INSERT INTO letter_timeline (id, letter_request_id, status, note, actor_user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), id, nextStatus, notes || `Status diubah menjadi ${nextStatus}.`, user.id]
      );

      // Create in-app notification for the applicant
      const [applicantUsers] = await conn.execute(
        'SELECT id FROM users WHERE resident_id = ?',
        [current.resident_id]
      );
      if (applicantUsers.length > 0) {
        await conn.execute(
          `INSERT INTO notifications (id, user_id, title, message, type, link_tab)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            applicantUsers[0].id,
            `Pembaruan Pengajuan Surat: ${nextStatus}`,
            `Pengajuan surat referensi ${current.reference_no} telah berstatus ${nextStatus}.`,
            action === 'reject' ? 'error' : action === 'approve' ? 'success' : 'info',
            'surat',
          ]
        );
      }
    });

    await logAudit({
      tableName: 'letter_requests',
      recordId: id,
      action: 'UPDATE',
      oldValues: { status: current.status },
      newValues: { status: nextStatus, action, notes, officialNumber },
      userId: user.id,
      ipAddress: req.ip,
    });

    const [updated] = await pool.execute('SELECT * FROM letter_requests WHERE id = ?', [id]);
    return successResponse(res, updated[0]);
  } catch (err) {
    next(err);
  }
};

export const getLetterDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT lr.*, lt.name as letter_type_name, lt.code as letter_type_code,
              res.name as resident_name, res.nik, res.no_kk, res.gender, res.birth_place, res.birth_date,
              res.job, res.religion, res.marital_status, res.address as resident_address,
              reg.name as region_name, reg.leader_name as rt_leader_name
       FROM letter_requests lr
       JOIN letter_types lt ON lr.letter_type_id = lt.id
       JOIN residents res ON lr.resident_id = res.id
       LEFT JOIN regions reg ON lr.region_id = reg.id
       WHERE lr.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 404, 'LETTER_REQUEST_NOT_FOUND', 'Pengajuan surat tidak ditemukan.');
    }

    const doc = rows[0];

    // Fetch region settings for official letter header
    const [settings] = await pool.execute(
      'SELECT setting_value FROM system_settings WHERE region_id = ? AND setting_key = "letter_header"',
      [doc.region_id]
    );

    const letterHeader = settings.length > 0 ? (typeof settings[0].setting_value === 'string' ? JSON.parse(settings[0].setting_value) : settings[0].setting_value) : null;

    return successResponse(res, {
      letter: doc,
      letterHeader,
    });
  } catch (err) {
    next(err);
  }
};

