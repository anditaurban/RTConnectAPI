import { errorResponse } from '../utils/response.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Silakan login terlebih dahulu.');
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        'FORBIDDEN',
        `Peran Anda (${req.user.role}) tidak memiliki akses ke fungsi ini.`
      );
    }

    next();
  };
};

