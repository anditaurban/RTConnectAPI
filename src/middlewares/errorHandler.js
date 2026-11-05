import { errorResponse } from '../utils/response.js';

export const notFoundHandler = (req, res, next) => {
  return errorResponse(res, 404, 'NOT_FOUND', `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`);
};

export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, 'INVALID_TOKEN', 'Token autentikasi tidak valid.');
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'TOKEN_EXPIRED', 'Token autentikasi telah kedaluwarsa.');
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, 409, 'DUPLICATE_ENTRY', 'Data yang dikirim sudah terdaftar dalam sistem.');
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 422, 'FILE_TOO_LARGE', 'Ukuran file melebihi batas maksimal (5MB).');
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Terjadi kesalahan pada server internal.';
  const details = err.details || [];

  return errorResponse(res, statusCode, errorCode, message, details);
};

