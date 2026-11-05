import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/response.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 requests per 15 minutes
  handler: (req, res) => {
    return errorResponse(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Terlalu banyak percobaan autentikasi. Silakan coba kembali dalam beberapa saat.'
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 requests per 15 min
  handler: (req, res) => {
    return errorResponse(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Batas panggilan API terlampaui. Silakan tunggu sebentar.'
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
});

