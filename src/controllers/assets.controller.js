import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';

export const getAssets = async (req, res, next) => {
  try {
    const user = req.user;
    const isRW = user.role === 'ketua_rw';

    let conditions = ['1=1'];
    let params = [];

    if (isRW) {
      conditions.push('(a.region_id = ? OR a.region_id IN (SELECT id FROM regions WHERE parent_id = ?))');
      params.push(user.region_id, user.region_id);
    } else if (user.role !== 'super_admin' && user.region_id) {
      conditions.push('a.region_id = ?');
      params.push(user.region_id);
    }

    const { category, condition } = req.query;
    if (category) {
      conditions.push('a.category = ?');
      params.push(category);
    }
    if (condition) {
      conditions.push('a.condition_status = ?');
      params.push(condition);
    }

    const [rows] = await pool.query(
      `SELECT a.id, a.code, a.name, a.category, a.quantity, a.unit,
              a.condition_status as conditionStatus, a.location, a.pic,
              a.notes, a.region_id as regionId, reg.name as regionName
       FROM assets a
       LEFT JOIN regions reg ON a.region_id = reg.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.name ASC`,
      params
    );

    return successResponse(res, { items: rows });
  } catch (err) {
    next(err);
  }
};

export const getAssetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT a.id, a.code, a.name, a.category, a.quantity, a.unit,
              a.condition_status as conditionStatus, a.location, a.pic,
              a.notes, a.region_id as regionId, reg.name as regionName
       FROM assets a
       LEFT JOIN regions reg ON a.region_id = reg.id
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 404, 'ASSET_NOT_FOUND', 'Barang inventaris tidak ditemukan.');
    }

    return successResponse(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

export const createAsset = async (req, res, next) => {
  try {
    const user = req.user;
    const { code, name, category, quantity = 1, unit = 'Unit', conditionStatus = 'Baik', location, pic, notes, regionId } = req.body;

    const targetRegionId = regionId || user.region_id;
    const newId = uuidv4();

    await pool.execute(
      `INSERT INTO assets (
        id, code, name, category, quantity, unit, condition_status, location, pic, notes, region_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, code, name, category, quantity, unit, conditionStatus, location, pic, notes || null, targetRegionId]
    );

    await logAudit({
      tableName: 'assets',
      recordId: newId,
      action: 'INSERT',
      newValues: { code, name, quantity, conditionStatus },
      userId: user.id,
      ipAddress: req.ip,
    });

    const [created] = await pool.execute('SELECT * FROM assets WHERE id = ?', [newId]);
    return successResponse(res, created[0], {}, 201);
  } catch (err) {
    next(err);
  }
};

export const updateAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { name, category, quantity, unit, conditionStatus, location, pic, notes } = req.body;

    const [currents] = await pool.execute('SELECT * FROM assets WHERE id = ?', [id]);
    if (currents.length === 0) {
      return errorResponse(res, 404, 'ASSET_NOT_FOUND', 'Barang inventaris tidak ditemukan.');
    }

    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (quantity !== undefined) { updates.push('quantity = ?'); params.push(quantity); }
    if (unit) { updates.push('unit = ?'); params.push(unit); }
    if (conditionStatus) { updates.push('condition_status = ?'); params.push(conditionStatus); }
    if (location) { updates.push('location = ?'); params.push(location); }
    if (pic) { updates.push('pic = ?'); params.push(pic); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length > 0) {
      params.push(id);
      await pool.execute(`UPDATE assets SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await pool.execute('SELECT * FROM assets WHERE id = ?', [id]);
    return successResponse(res, updated[0]);
  } catch (err) {
    next(err);
  }
};

