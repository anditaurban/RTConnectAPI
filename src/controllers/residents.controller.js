import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { listResponse, successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';
import { isRegionAccessible } from '../middlewares/regionCheck.js';

const maskSensitiveData = (nik) => {
  if (!nik || nik.length < 8) return '****************';
  return nik.substring(0, 6) + '******' + nik.substring(nik.length - 4);
};

export const getResidents = async (req, res, next) => {
  try {
    const user = req.user;
    const isWarga = user.role === 'warga';
    const isRW = user.role === 'ketua_rw';

    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    const { search, status, rt, rt_id } = req.query;
    const filterRegion = rt_id || rt;

    let conditions = ['1=1'];
    let params = [];

    if (isWarga) {
      // Warga can only see themselves and family members
      if (user.family_id) {
        conditions.push('(r.family_id = ? OR r.id = ?)');
        params.push(user.family_id, user.resident_id || '');
      } else {
        conditions.push('r.id = ?');
        params.push(user.resident_id || '');
      }
    } else if (isRW) {
      if (filterRegion) {
        conditions.push('r.region_id = ?');
        params.push(filterRegion);
      } else {
        conditions.push('(r.region_id = ? OR r.region_id IN (SELECT id FROM regions WHERE parent_id = ?))');
        params.push(user.region_id, user.region_id);
      }
    } else if (user.role !== 'super_admin') {
      conditions.push('r.region_id = ?');
      params.push(user.region_id);
    } else if (filterRegion) {
      conditions.push('r.region_id = ?');
      params.push(filterRegion);
    }

    if (status) {
      conditions.push('r.status_kependudukan = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(r.name LIKE ? OR r.nik LIKE ? OR r.no_kk LIKE ? OR r.phone LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    const whereClause = conditions.join(' AND ');

    // Count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM residents r WHERE ${whereClause}`,
      params
    );
    const total = Number(countResult[0].total);

    // Fetch items with region and family info
    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(
      `SELECT r.id, r.family_id as familyId, r.nik, r.no_kk as noKK, r.name, r.gender,
              r.birth_place as birthPlace, r.birth_date as birthDate, r.religion, r.job,
              r.marital_status as maritalStatus, r.family_role as familyRole,
              r.status_domisili as statusDomisili, r.status_kependudukan as statusKependudukan,
              r.phone, r.region_id as regionId, reg.name as regionName, reg.code as rt,
              r.address, r.created_at as createdAt, r.updated_at as updatedAt
       FROM residents r
       LEFT JOIN regions reg ON r.region_id = reg.id
       WHERE ${whereClause}
       ORDER BY r.name ASC
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

export const getResidentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.execute(
      `SELECT r.id, r.family_id as familyId, r.nik, r.no_kk as noKK, r.name, r.gender,
              r.birth_place as birthPlace, r.birth_date as birthDate, r.religion, r.job,
              r.marital_status as maritalStatus, r.family_role as familyRole,
              r.status_domisili as statusDomisili, r.status_kependudukan as statusKependudukan,
              r.phone, r.region_id as regionId, reg.name as regionName, reg.code as rt,
              r.address, r.created_at as createdAt, r.updated_at as updatedAt,
              f.address as familyAddress
       FROM residents r
       LEFT JOIN regions reg ON r.region_id = reg.id
       LEFT JOIN families f ON r.family_id = f.id
       WHERE r.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 404, 'RESIDENT_NOT_FOUND', 'Data warga tidak ditemukan.');
    }

    const resident = rows[0];

    // Check authorization
    if (user.role === 'warga') {
      if (resident.id !== user.resident_id && resident.familyId !== user.family_id) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Anda hanya dapat mengakses profil Anda sendiri.');
      }
    } else {
      const allowed = await isRegionAccessible(user, resident.regionId);
      if (!allowed) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Data warga di luar cakupan wilayah Anda.');
      }
    }

    return successResponse(res, resident);
  } catch (err) {
    next(err);
  }
};

export const createResident = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      familyId,
      nik,
      noKK,
      name,
      gender,
      birthPlace,
      birthDate,
      religion,
      job,
      maritalStatus,
      familyRole,
      statusDomisili,
      statusKependudukan = 'Aktif',
      phone,
      regionId,
      address,
    } = req.body;

    const targetRegionId = regionId || user.region_id;
    const allowed = await isRegionAccessible(user, targetRegionId);
    if (!allowed) {
      return errorResponse(res, 403, 'REGION_ACCESS_DENIED', 'Wilayah pendaftaran tidak dapat diakses.');
    }

    // Check unique NIK
    const [existing] = await pool.execute('SELECT id FROM residents WHERE nik = ?', [nik]);
    if (existing.length > 0) {
      return errorResponse(res, 409, 'DUPLICATE_NIK', 'NIK sudah terdaftar dalam sistem.');
    }

    const newId = uuidv4();
    const sql = `
      INSERT INTO residents (
        id, family_id, nik, no_kk, name, gender, birth_place, birth_date, religion,
        job, marital_status, family_role, status_domisili, status_kependudukan,
        phone, region_id, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(sql, [
      newId,
      familyId || null,
      nik,
      noKK || null,
      name,
      gender,
      birthPlace,
      birthDate,
      religion,
      job,
      maritalStatus,
      familyRole,
      statusDomisili,
      statusKependudukan,
      phone || null,
      targetRegionId,
      address,
    ]);

    await logAudit({
      tableName: 'residents',
      recordId: newId,
      action: 'INSERT',
      newValues: { name, gender, regionId: targetRegionId, statusKependudukan },
      userId: user.id,
      ipAddress: req.ip,
    });

    const [created] = await pool.execute('SELECT * FROM residents WHERE id = ?', [newId]);
    return successResponse(res, created[0], {}, 201);
  } catch (err) {
    next(err);
  }
};

export const updateResident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [currents] = await pool.execute('SELECT * FROM residents WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'RESIDENT_NOT_FOUND', 'Data warga tidak ditemukan.');
    }
    const current = currents[0];

    const allowed = await isRegionAccessible(user, current.region_id);
    if (!allowed && user.role !== 'warga') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Data warga di luar cakupan wilayah Anda.');
    }
    if (user.role === 'warga' && current.id !== user.resident_id) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Anda tidak dapat mengubah data warga lain.');
    }

    const fields = [
      'name', 'gender', 'birth_place', 'birth_date', 'religion', 'job',
      'marital_status', 'family_role', 'status_domisili', 'status_kependudukan',
      'phone', 'address', 'family_id', 'no_kk'
    ];

    const updates = [];
    const params = [];
    const newValues = {};

    for (const key of fields) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const val = req.body[camelKey] !== undefined ? req.body[camelKey] : req.body[key];
      if (val !== undefined) {
        updates.push(`${key} = ?`);
        params.push(val);
        newValues[key] = val;
      }
    }

    if (updates.length === 0) {
      return successResponse(res, current);
    }

    params.push(id);
    await pool.execute(`UPDATE residents SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit({
      tableName: 'residents',
      recordId: id,
      action: 'UPDATE',
      oldValues: current,
      newValues,
      userId: user.id,
      ipAddress: req.ip,
    });

    const [updated] = await pool.execute('SELECT * FROM residents WHERE id = ?', [id]);
    return successResponse(res, updated[0]);
  } catch (err) {
    next(err);
  }
};

