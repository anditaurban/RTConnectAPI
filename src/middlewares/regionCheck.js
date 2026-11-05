import pool from '../config/db.js';
import { errorResponse } from '../utils/response.js';

export const isRegionAccessible = async (user, targetRegionId) => {
  if (!targetRegionId) return true;
  if (user.role === 'super_admin') return true;

  // Direct match
  if (user.region_id === targetRegionId) return true;

  // If user is Ketua RW, check if targetRegionId is a sub-region (RT) of this RW
  if (user.role === 'ketua_rw') {
    const [rows] = await pool.execute(
      'SELECT id FROM regions WHERE id = ? AND parent_id = ?',
      [targetRegionId, user.region_id]
    );
    if (rows.length > 0) return true;
  }

  return false;
};

export const requireRegionAccess = (regionIdExtractor) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, 401, 'UNAUTHORIZED', 'Silakan login terlebih dahulu.');
      }

      const targetRegionId = typeof regionIdExtractor === 'function'
        ? await regionIdExtractor(req)
        : req.body[regionIdExtractor] || req.params[regionIdExtractor] || req.query[regionIdExtractor];

      const allowed = await isRegionAccessible(req.user, targetRegionId);
      if (!allowed) {
        return errorResponse(
          res,
          403,
          'REGION_ACCESS_DENIED',
          'Anda tidak memiliki akses ke wilayah target ini.'
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

