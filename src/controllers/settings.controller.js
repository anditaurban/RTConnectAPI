import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';

export const getRegionSettings = async (req, res, next) => {
  try {
    const user = req.user;
    const regionId = req.query.regionId || user.region_id;

    const [rows] = await pool.execute(
      'SELECT id, setting_key, setting_value, updated_at FROM system_settings WHERE region_id = ?',
      [regionId]
    );

    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = typeof row.setting_value === 'string'
        ? JSON.parse(row.setting_value)
        : row.setting_value;
    }

    return successResponse(res, settings);
  } catch (err) {
    next(err);
  }
};

export const updateRegionSettings = async (req, res, next) => {
  try {
    const user = req.user;
    const { key, value, regionId } = req.body;

    const targetRegionId = regionId || user.region_id;
    const jsonValue = JSON.stringify(value);

    // Upsert setting
    const [existing] = await pool.execute(
      'SELECT id FROM system_settings WHERE region_id = ? AND setting_key = ?',
      [targetRegionId, key]
    );

    if (existing.length > 0) {
      await pool.execute(
        'UPDATE system_settings SET setting_value = ?, updated_by_user_id = ?, updated_at = NOW() WHERE id = ?',
        [jsonValue, user.id, existing[0].id]
      );
    } else {
      await pool.execute(
        'INSERT INTO system_settings (id, region_id, setting_key, setting_value, updated_by_user_id) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), targetRegionId, key, jsonValue, user.id]
      );
    }

    await logAudit({
      tableName: 'system_settings',
      recordId: targetRegionId,
      action: 'UPDATE',
      newValues: { key, targetRegionId },
      userId: user.id,
      ipAddress: req.ip,
    });

    return successResponse(res, { message: `Pengaturan ${key} berhasil diperbarui.` });
  } catch (err) {
    next(err);
  }
};

