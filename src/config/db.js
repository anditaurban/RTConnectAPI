import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = process.env.DATABASE_URL
  ? {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      charset: 'utf8mb4',
      dateStrings: true,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rtconnect_db',
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      charset: 'utf8mb4',
      dateStrings: true,
    };

const pool = mysql.createPool(poolConfig);

export const query = async (sql, params) => {
  const [results] = await pool.execute(sql, params);
  return results;
};

export const withTransaction = async (callback) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const testConnection = async () => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    return rows[0].result === 2;
  } catch (err) {
    console.error('MySQL Connection Error:', err.message);
    return false;
  }
};

export default pool;
