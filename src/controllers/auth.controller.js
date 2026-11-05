import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'rtconnect_super_secret_access_key_2026_xyz';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'rtconnect_super_secret_refresh_key_2026_xyz';

const formatUser = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    regionId: user.region_id,
    regionName: user.region_name || null,
    residentId: user.resident_id,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    nik: user.nik || null,
    noKK: user.no_kk || null,
    familyId: user.family_id || null,
  };
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.execute(
      `SELECT u.*, r.name as region_name, res.nik, res.no_kk, res.family_id
       FROM users u
       LEFT JOIN regions r ON u.region_id = r.id
       LEFT JOIN residents res ON u.resident_id = res.id
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Email atau kata sandi tidak sesuai.');
    }

    const user = users[0];

    if (!user.is_active) {
      return errorResponse(res, 403, 'ACCOUNT_INACTIVE', 'Akun Anda telah dinonaktifkan. Hubungi pengurus RT/RW.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Email atau kata sandi tidak sesuai.');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, regionId: user.region_id },
      ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Save refresh token hash
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      'INSERT INTO user_refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, tokenHash, expiresAt]
    );

    // Update last_login_at
    await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    await logAudit({
      tableName: 'users',
      recordId: user.id,
      action: 'UPDATE',
      newValues: { event: 'LOGIN' },
      userId: user.id,
      ipAddress: req.ip,
    });

    return successResponse(res, {
      token: accessToken,
      refreshToken,
      user: formatUser(user),
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user) {
      await pool.execute(
        'UPDATE user_refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
        [req.user.id]
      );
    }
    return successResponse(res, { message: 'Sesi berhasil diakhiri.' });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return errorResponse(res, 400, 'TOKEN_REQUIRED', 'Refresh token wajib dikirim.');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (err) {
      return errorResponse(res, 401, 'INVALID_REFRESH_TOKEN', 'Refresh token tidak valid atau telah kedaluwarsa.');
    }

    const [tokens] = await pool.execute(
      'SELECT * FROM user_refresh_tokens WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 5',
      [decoded.userId]
    );

    if (tokens.length === 0) {
      return errorResponse(res, 401, 'INVALID_REFRESH_TOKEN', 'Refresh token telah dicabut.');
    }

    const [users] = await pool.execute(
      'SELECT id, role, region_id FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (users.length === 0) {
      return errorResponse(res, 401, 'USER_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }

    const user = users[0];
    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role, regionId: user.region_id },
      ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h' }
    );

    return successResponse(res, {
      token: newAccessToken,
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const [users] = await pool.execute('SELECT id, email FROM users WHERE email = ?', [email]);
    // Always return success for security (prevent email enumeration)
    return successResponse(res, {
      message: 'Jika alamat email terdaftar, instruksi pengaturan ulang kata sandi telah dikirimkan.',
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, password, token } = req.body;
    // In production, token would be verified from a reset_tokens table. For MVP:
    if (!token || token.length < 6) {
      return errorResponse(res, 400, 'INVALID_RESET_TOKEN', 'Kode token reset tidak valid.');
    }

    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return errorResponse(res, 404, 'USER_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, users[0].id]);

    await logAudit({
      tableName: 'users',
      recordId: users[0].id,
      action: 'UPDATE',
      newValues: { event: 'RESET_PASSWORD' },
      userId: users[0].id,
      ipAddress: req.ip,
    });

    return successResponse(res, { message: 'Kata sandi berhasil diperbarui. Silakan login kembali.' });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return successResponse(res, formatUser(req.user));
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const { name, phone, avatarUrl } = req.body;
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatarUrl);
    }

    if (updates.length > 0) {
      params.push(req.user.id);
      await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await pool.execute(
      `SELECT u.*, r.name as region_name, res.nik, res.no_kk, res.family_id
       FROM users u
       LEFT JOIN regions r ON u.region_id = r.id
       LEFT JOIN residents res ON u.resident_id = res.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    return successResponse(res, formatUser(updated[0]));
  } catch (err) {
    next(err);
  }
};

