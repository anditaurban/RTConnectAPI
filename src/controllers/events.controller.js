import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';

export const getEvents = async (req, res, next) => {
  try {
    const user = req.user;
    const isRW = user.role === 'ketua_rw';

    let conditions = ['1=1'];
    let params = [];

    if (isRW) {
      conditions.push('(e.region_id = ? OR e.region_id IN (SELECT id FROM regions WHERE parent_id = ?))');
      params.push(user.region_id, user.region_id);
    } else if (user.role !== 'super_admin' && user.region_id) {
      conditions.push('(e.region_id = ? OR e.region_id IN (SELECT parent_id FROM regions WHERE id = ?))');
      params.push(user.region_id, user.region_id);
    }

    const { status, category } = req.query;
    if (status) {
      conditions.push('e.status = ?');
      params.push(status);
    }
    if (category) {
      conditions.push('e.category = ?');
      params.push(category);
    }

    const [rows] = await pool.query(
      `SELECT e.id, e.title, e.category, e.event_date as date, e.time_string as time,
              e.location, e.organizer, e.description, e.status, e.attendees_count as attendeesCount,
              e.region_id as regionId, reg.name as regionName
       FROM events e
       LEFT JOIN regions reg ON e.region_id = reg.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.event_date ASC`,
      params
    );

    return successResponse(res, { items: rows });
  } catch (err) {
    next(err);
  }
};

export const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT e.id, e.title, e.category, e.event_date as date, e.time_string as time,
              e.location, e.organizer, e.description, e.status, e.attendees_count as attendeesCount,
              e.region_id as regionId, reg.name as regionName
       FROM events e
       LEFT JOIN regions reg ON e.region_id = reg.id
       WHERE e.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 404, 'EVENT_NOT_FOUND', 'Agenda kegiatan tidak ditemukan.');
    }

    return successResponse(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const user = req.user;
    const { title, category, date, time, location, organizer, description, attendeesCount = 0, regionId } = req.body;

    const newId = uuidv4();
    const targetRegionId = regionId || user.region_id;

    await pool.execute(
      `INSERT INTO events (
        id, title, category, event_date, time_string, location, organizer, description, status, attendees_count, region_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Akan Datang', ?, ?)`,
      [newId, title, category, date, time, location, organizer, description || null, attendeesCount, targetRegionId]
    );

    const [created] = await pool.execute('SELECT * FROM events WHERE id = ?', [newId]);
    return successResponse(res, created[0], {}, 201);
  } catch (err) {
    next(err);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, category, date, time, location, organizer, description, status, attendeesCount } = req.body;

    const updates = [];
    const params = [];

    if (title) { updates.push('title = ?'); params.push(title); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (date) { updates.push('event_date = ?'); params.push(date); }
    if (time) { updates.push('time_string = ?'); params.push(time); }
    if (location) { updates.push('location = ?'); params.push(location); }
    if (organizer) { updates.push('organizer = ?'); params.push(organizer); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (attendeesCount !== undefined) { updates.push('attendees_count = ?'); params.push(attendeesCount); }

    if (updates.length > 0) {
      params.push(id);
      await pool.execute(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await pool.execute('SELECT * FROM events WHERE id = ?', [id]);
    return successResponse(res, updated[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.execute("UPDATE events SET status = 'Dibatalkan' WHERE id = ?", [id]);
    return successResponse(res, { message: 'Agenda kegiatan telah dibatalkan.' });
  } catch (err) {
    next(err);
  }
};

