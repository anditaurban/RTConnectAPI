import pool from '../config/db.js';

const SENSITIVE_FIELDS = ['password', 'password_hash', 'token', 'token_hash'];

const sanitizeValues = (values) => {
  if (!values || typeof values !== 'object') return values;
  const clone = { ...values };
  for (const field of SENSITIVE_FIELDS) {
    if (field in clone) {
      delete clone[field];
    }
  }
  return clone;
};

export const logAudit = async ({
  tableName,
  recordId,
  action,
  oldValues = null,
  newValues = null,
  userId = null,
  ipAddress = null,
  client = null,
}) => {
  try {
    const executor = client || pool;
    const sanitizedOld = oldValues ? JSON.stringify(sanitizeValues(oldValues)) : null;
    const sanitizedNew = newValues ? JSON.stringify(sanitizeValues(newValues)) : null;

    const sql = `
      INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await executor.execute(sql, [
      tableName,
      recordId ? String(recordId) : null,
      action,
      sanitizedOld,
      sanitizedNew,
      userId,
      ipAddress,
    ]);
  } catch (error) {
    console.error('Audit Log Error (non-blocking):', error.message);
  }
};

