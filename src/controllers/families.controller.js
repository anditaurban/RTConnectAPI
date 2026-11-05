import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { listResponse, successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';
import { isRegionAccessible } from '../middlewares/regionCheck.js';

export const getFamilies = async (req, res, next) => {
  try {
    const user = req.user;
    const isWarga = user.role === 'warga';
    const isRW = user.role === 'ketua_rw';

    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    const { search, rt_id, rt } = req.query;
    const filterRegion = rt_id || rt;

    let conditions = ['1=1'];
    let params = [];

    if (isWarga) {
      if (user.family_id) {
        conditions.push('f.id = ?');
        params.push(user.family_id);
      } else {
        conditions.push('1=0');
      }
    } else if (isRW) {
      if (filterRegion) {
        conditions.push('f.region_id = ?');
        params.push(filterRegion);
      } else {
        conditions.push('(f.region_id = ? OR f.region_id IN (SELECT id FROM regions WHERE parent_id = ?))');
        params.push(user.region_id, user.region_id);
      }
    } else if (user.role !== 'super_admin') {
      conditions.push('f.region_id = ?');
      params.push(user.region_id);
    } else if (filterRegion) {
      conditions.push('f.region_id = ?');
      params.push(filterRegion);
    }

    if (search) {
      conditions.push('(f.no_kk LIKE ? OR f.address LIKE ? OR res.name LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    const whereClause = conditions.join(' AND ');

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM families f
       LEFT JOIN residents res ON f.head_resident_id = res.id
       WHERE ${whereClause}`,
      params
    );
    const total = Number(countResult[0].total);

    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(
      `SELECT f.id, f.no_kk as noKK, f.head_resident_id as headResidentId, f.region_id as regionId,
              f.address, f.created_at as createdAt, f.updated_at as updatedAt,
              reg.name as regionName, reg.code as rt,
              res.name as headResidentName, res.phone as headResidentPhone,
              (SELECT COUNT(*) FROM residents r WHERE r.family_id = f.id) as membersCount
       FROM families f
       LEFT JOIN regions reg ON f.region_id = reg.id
       LEFT JOIN residents res ON f.head_resident_id = res.id
       WHERE ${whereClause}
       ORDER BY f.created_at DESC
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

export const getFamilyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.execute(
      `SELECT f.id, f.no_kk as noKK, f.head_resident_id as headResidentId, f.region_id as regionId,
              f.address, f.created_at as createdAt, f.updated_at as updatedAt,
              reg.name as regionName, reg.code as rt,
              res.name as headResidentName, res.phone as headResidentPhone
       FROM families f
       LEFT JOIN regions reg ON f.region_id = reg.id
       LEFT JOIN residents res ON f.head_resident_id = res.id
       WHERE f.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 404, 'FAMILY_NOT_FOUND', 'Data KK tidak ditemukan.');
    }

    const family = rows[0];

    if (user.role === 'warga' && user.family_id !== family.id) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Anda hanya dapat mengakses data keluarga Anda.');
    }
    if (user.role !== 'warga') {
      const allowed = await isRegionAccessible(user, family.regionId);
      if (!allowed) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Data KK di luar cakupan wilayah Anda.');
      }
    }

    // Get family members
    const [members] = await pool.execute(
      `SELECT id, nik, name, gender, birth_place as birthPlace, birth_date as birthDate,
              religion, job, marital_status as maritalStatus, family_role as familyRole,
              status_domisili as statusDomisili, status_kependudukan as statusKependudukan, phone
       FROM residents
       WHERE family_id = ?
       ORDER BY FIELD(family_role, 'Kepala Keluarga', 'Istri', 'Anak', 'Famili Lain') ASC`,
      [id]
    );

    return successResponse(res, {
      ...family,
      members,
    });
  } catch (err) {
    next(err);
  }
};

export const createFamily = async (req, res, next) => {
  try {
    const user = req.user;
    const { noKK, regionId, address, headResidentId } = req.body;

    const targetRegionId = regionId || user.region_id;
    const allowed = await isRegionAccessible(user, targetRegionId);
    if (!allowed) {
      return errorResponse(res, 403, 'REGION_ACCESS_DENIED', 'Wilayah KK tidak dapat diakses.');
    }

    const [existing] = await pool.execute('SELECT id FROM families WHERE no_kk = ?', [noKK]);
    if (existing.length > 0) {
      return errorResponse(res, 409, 'DUPLICATE_NO_KK', 'Nomor KK sudah terdaftar dalam sistem.');
    }

    const newId = uuidv4();
    await pool.execute(
      'INSERT INTO families (id, no_kk, head_resident_id, region_id, address) VALUES (?, ?, ?, ?, ?)',
      [newId, noKK, headResidentId || null, targetRegionId, address]
    );

    await logAudit({
      tableName: 'families',
      recordId: newId,
      action: 'INSERT',
      newValues: { noKK, regionId: targetRegionId, address },
      userId: user.id,
      ipAddress: req.ip,
    });

    const [created] = await pool.execute('SELECT * FROM families WHERE id = ?', [newId]);
    return successResponse(res, created[0], {}, 201);
  } catch (err) {
    next(err);
  }
};

export const updateFamily = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [currents] = await pool.execute('SELECT * FROM families WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'FAMILY_NOT_FOUND', 'Data KK tidak ditemukan.');
    }
    const current = currents[0];

    const allowed = await isRegionAccessible(user, current.region_id);
    if (!allowed) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Data KK di luar cakupan wilayah Anda.');
    }

    const { address, headResidentId } = req.body;
    const updates = [];
    const params = [];

    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (headResidentId !== undefined) {
      updates.push('head_resident_id = ?');
      params.push(headResidentId);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.execute(`UPDATE families SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    await logAudit({
      tableName: 'families',
      recordId: id,
      action: 'UPDATE',
      oldValues: current,
      newValues: { address, headResidentId },
      userId: user.id,
      ipAddress: req.ip,
    });

    const [updated] = await pool.execute('SELECT * FROM families WHERE id = ?', [id]);
    return successResponse(res, updated[0]);
  } catch (err) {
    next(err);
  }
};

