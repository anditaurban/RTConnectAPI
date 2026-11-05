import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { listResponse, successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';

export const getUsers = async (req, res, next) => {
  try {
    const user = req.user;
    const isRW = user.role === 'ketua_rw';

    let conditions = ['1=1'];
    let params = [];

    if (isRW) {
      conditions.push('(u.region_id = ? OR u.region_id IN (SELECT id FROM regions WHERE parent_id = ?))');
      params.push(user.region_id, user.region_id);
    } else if (user.role !== 'super_admin') {
      conditions.push('u.region_id = ?');
      params.push(user.region_id);
    }

    const { role, search } = req.query;
    if (role) {
      conditions.push('u.role = ?');
      params.push(role);
    }
    if (search) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.region_id as regionId,
              reg.name as regionName, reg.code as rt,
              u.resident_id as residentId, u.phone, u.avatar_url as avatarUrl,
              u.is_active as isActive, u.last_login_at as lastLoginAt,
              u.created_at as createdAt
       FROM users u
       LEFT JOIN regions reg ON u.region_id = reg.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.created_at DESC`,
      params
    );

    const formatted = rows.map(r => ({
      ...r,
      isActive: Boolean(r.isActive),
    }));

    return successResponse(res, { items: formatted });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const actor = req.user;
    const { email, password, role, name, phone, regionId, residentId } = req.body;

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return errorResponse(res, 409, 'DUPLICATE_EMAIL', 'Email sudah digunakan oleh akun lain.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newId = uuidv4();
    const targetRegionId = regionId || actor.region_id;

    await pool.execute(
      `INSERT INTO users (id, email, password_hash, role, region_id, resident_id, name, phone, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [newId, email, passwordHash, role, targetRegionId, residentId || null, name, phone || null]
    );

    await logAudit({
      tableName: 'users',
      recordId: newId,
      action: 'INSERT',
      newValues: { email, role, name, targetRegionId },
      userId: actor.id,
      ipAddress: req.ip,
    });

    const [created] = await pool.execute(
      'SELECT id, name, email, role, region_id as regionId, phone, is_active as isActive FROM users WHERE id = ?',
      [newId]
    );

    return successResponse(res, created[0], {}, 201);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actor = req.user;
    const { role, isActive, regionId, name, phone, password } = req.body;

    const [currents] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'USER_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }
    const current = currents[0];

    const updates = [];
    const params = [];
    const newValues = {};

    if (role) { updates.push('role = ?'); params.push(role); newValues.role = role; }
    if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); newValues.isActive = isActive; }
    if (regionId) { updates.push('region_id = ?'); params.push(regionId); newValues.regionId = regionId; }
    if (name) { updates.push('name = ?'); params.push(name); newValues.name = name; }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); newValues.phone = phone; }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

      await logAudit({
        tableName: 'users',
        recordId: id,
        action: 'UPDATE',
        oldValues: { role: current.role, is_active: current.is_active },
        newValues,
        userId: actor.id,
        ipAddress: req.ip,
      });
    }

    const [updated] = await pool.execute(
      'SELECT id, name, email, role, region_id as regionId, phone, is_active as isActive FROM users WHERE id = ?',
      [id]
    );

    return successResponse(res, updated[0]);
  } catch (err) {
    next(err);
  }
};

