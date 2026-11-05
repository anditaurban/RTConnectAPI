import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getNotifications = async (req, res, next) => {
  try {
    const user = req.user;
    const [rows] = await pool.execute(
      `SELECT id, title, message, type, link_tab as linkTab, is_read as isRead, created_at as createdAt
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [user.id]
    );

    const formatted = rows.map(r => ({
      ...r,
      isRead: Boolean(r.isRead),
    }));

    return successResponse(res, { items: formatted });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, user.id]
    );

    return successResponse(res, { message: 'Notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const user = req.user;
    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [user.id]
    );

    return successResponse(res, { message: 'Semua notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    next(err);
  }
};

