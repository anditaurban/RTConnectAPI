import pool from '../config/db.js';
import { successResponse } from '../utils/response.js';

export const getRegions = async (req, res, next) => {
  try {
    const user = req.user;
    let sql = 'SELECT id, parent_id as parentId, type, code, name, leader_name as leaderName FROM regions';
    let params = [];

    if (user.role === 'ketua_rw') {
      sql += ' WHERE id = ? OR parent_id = ?';
      params.push(user.region_id, user.region_id);
    } else if (user.role !== 'super_admin' && user.region_id) {
      // Find region and its parent RW if user is in an RT
      sql += ' WHERE id = ? OR id = (SELECT parent_id FROM regions WHERE id = ?)';
      params.push(user.region_id, user.region_id);
    }

    sql += ' ORDER BY type ASC, code ASC';

    const [rows] = await pool.execute(sql, params);
    return successResponse(res, { items: rows });
  } catch (err) {
    next(err);
  }
};

