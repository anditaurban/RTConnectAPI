import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function seedPasswords() {
  const config = process.env.DATABASE_URL
    ? { uri: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rtconnect_db',
      };

  const connection = await mysql.createConnection(config);

  const defaultPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  console.log(`Hashing password '${defaultPassword}' -> ${passwordHash}`);

  const [result] = await connection.execute(
    'UPDATE users SET password_hash = ?',
    [passwordHash]
  );

  console.log(`Updated ${result.affectedRows} users with valid bcrypt password hash.`);
  await connection.end();
}

seedPasswords().catch((err) => {
  console.error('Failed to seed passwords:', err);
  process.exit(1);
});
