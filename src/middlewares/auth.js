import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { errorResponse } from '../utils/response.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Akses ditolak. Token autentikasi tidak ditemukan.');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'rtconnect_super_secret_access_key_2026_xyz');
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'TOKEN_EXPIRED', 'Token autentikasi telah kedaluwarsa.');
      }
      return errorResponse(res, 401, 'INVALID_TOKEN', 'Token autentikasi tidak valid.');
    }

    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.role, u.region_id, u.resident_id, u.name, u.phone, u.avatar_url, u.is_active,
              r.name as region_name, r.type as region_type, r.parent_id as region_parent_id,
              res.nik, res.no_kk, res.family_id
       FROM users u
       LEFT JOIN regions r ON u.region_id = r.id
       LEFT JOIN residents res ON u.resident_id = res.id
       WHERE u.id = ? AND u.is_active = 1`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return errorResponse(res, 401, 'USER_NOT_FOUND', 'Pengguna tidak ditemukan atau telah dinonaktifkan.');
    }

    req.user = users[0];
    next();
  } catch (error) {
    next(error);
  }
};

