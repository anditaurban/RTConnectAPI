import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const LOCK_NAME = 'rtconnect_migrator_lock';
const LOCK_TIMEOUT_SECONDS = 15;

function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function getConnectionConfig() {
  if (process.env.DATABASE_URL) {
    return {
      uri: process.env.DATABASE_URL,
      multipleStatements: true,
      charset: 'utf8mb4',
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rtconnect_db',
    multipleStatements: true,
    charset: 'utf8mb4',
  };
}

async function ensureMigrationTable(conn) {
  const sql = `
    CREATE TABLE IF NOT EXISTS \`_migrations\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL UNIQUE,
      \`checksum\` VARCHAR(64) NOT NULL,
      \`executed_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`execution_time_ms\` INT NOT NULL,
      \`status\` ENUM('success', 'failed') NOT NULL DEFAULT 'success'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await conn.query(sql);
}

async function acquireLock(conn) {
  const [rows] = await conn.query('SELECT GET_LOCK(?, ?) AS locked', [LOCK_NAME, LOCK_TIMEOUT_SECONDS]);
  if (!rows[0] || rows[0].locked !== 1) {
    throw new Error(`Gagal memperoleh migration lock (${LOCK_NAME}). Proses migrasi lain mungkin sedang berjalan.`);
  }
  console.log(`[LOCK] Migration lock '${LOCK_NAME}' diperoleh.`);
}

async function releaseLock(conn) {
  try {
    await conn.query('SELECT RELEASE_LOCK(?) AS released', [LOCK_NAME]);
    console.log(`[LOCK] Migration lock '${LOCK_NAME}' dilepaskan.`);
  } catch (err) {
    console.warn('[LOCK] Gagal melepaskan lock:', err.message);
  }
}

async function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

async function runMigrations() {
  console.log('========================================================');
  console.log('  RTConnect Database Auto-Migrator');
  console.log('========================================================');

  const config = getConnectionConfig();
  let conn;

  try {
    conn = await mysql.createConnection(config);
    console.log(`[DB] Terhubung ke MySQL database.`);

    await acquireLock(conn);
    await ensureMigrationTable(conn);

    const [recordedRows] = await conn.query('SELECT * FROM `_migrations` ORDER BY id ASC');
    const recordedMap = new Map(recordedRows.map(r => [r.name, r]));

    const migrationFiles = await getMigrationFiles();
    if (migrationFiles.length === 0) {
      console.log('[INFO] Tidak ada file migrasi ditemukan di database/migrations.');
      return;
    }

    // Baseline detection strategy:
    // If _migrations is completely empty AND existing tables exist (e.g. 'regions'),
    // baseline 001_initial_schema.sql as applied without dropping/recreating tables!
    if (recordedRows.length === 0) {
      const [tableCheck] = await conn.query("SHOW TABLES LIKE 'regions'");
      if (tableCheck.length > 0 && migrationFiles[0] === '001_initial_schema.sql') {
        const baselineFile = '001_initial_schema.sql';
        const content = fs.readFileSync(path.join(MIGRATIONS_DIR, baselineFile), 'utf8');
        const checksum = calculateChecksum(content);

        await conn.query(
          'INSERT INTO `_migrations` (name, checksum, execution_time_ms, status) VALUES (?, ?, ?, ?)',
          [baselineFile, checksum, 0, 'success']
        );
        console.log(`[BASELINE] Terdeteksi tabel existing. ${baselineFile} dicatat sebagai baseline (sudah diterapkan).`);
        recordedMap.set(baselineFile, { name: baselineFile, checksum, status: 'success' });
      }
    }

    let appliedCount = 0;

    for (const file of migrationFiles) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const currentChecksum = calculateChecksum(content);

      const recorded = recordedMap.get(file);

      if (recorded) {
        if (recorded.status === 'success') {
          // Checksum validation
          if (recorded.checksum !== currentChecksum) {
            throw new Error(
              `[CHECKSUM ERROR] Migrasi '${file}' telah diterapkan sebelumnya namun isinya diubah!\n` +
              `  Checksum tercatat : ${recorded.checksum}\n` +
              `  Checksum saat ini : ${currentChecksum}\n` +
              `Aturan: Jangan mengedit migrasi yang sudah pernah diterapkan ke production. Gunakan file migrasi baru!`
            );
          }
          console.log(`  [OK] ${file} (sudah diterapkan)`);
          continue;
        }
      }

      console.log(`  -> Menjalankan migrasi: ${file}...`);
      const startTime = Date.now();

      try {
        await conn.query(content);
        const duration = Date.now() - startTime;

        await conn.query(
          `INSERT INTO \`_migrations\` (name, checksum, execution_time_ms, status)
           VALUES (?, ?, ?, 'success')
           ON DUPLICATE KEY UPDATE checksum = VALUES(checksum), execution_time_ms = VALUES(execution_time_ms), status = 'success', executed_at = NOW()`,
          [file, currentChecksum, duration]
        );

        console.log(`  ✓ ${file} sukses diterapkan dalam ${duration}ms.`);
        appliedCount++;
      } catch (sqlErr) {
        const duration = Date.now() - startTime;
        console.error(`  ✗ GAGAL menjalankan migrasi '${file}':`, sqlErr.message);

        // Record failed attempt
        try {
          await conn.query(
            `INSERT INTO \`_migrations\` (name, checksum, execution_time_ms, status)
             VALUES (?, ?, ?, 'failed')
             ON DUPLICATE KEY UPDATE status = 'failed', execution_time_ms = VALUES(execution_time_ms), executed_at = NOW()`,
            [file, currentChecksum, duration]
          );
        } catch (_) {}

        throw new Error(`Migrasi gagal pada '${file}'. Deployment dihentikan demi keamanan data!`);
      }
    }

    console.log('--------------------------------------------------------');
    console.log(`[SELESAI] Migrasi database berhasil. Total baru diterapkan: ${appliedCount}`);
    console.log('========================================================');
  } finally {
    if (conn) {
      await releaseLock(conn);
      await conn.end();
    }
  }
}

async function showStatus() {
  const config = getConnectionConfig();
  let conn;
  try {
    conn = await mysql.createConnection(config);
    await ensureMigrationTable(conn);

    const [recordedRows] = await conn.query('SELECT * FROM `_migrations` ORDER BY id ASC');
    const recordedMap = new Map(recordedRows.map(r => [r.name, r]));

    const files = await getMigrationFiles();

    console.log('=== Status Database Migrations ===');
    console.log('File Migrasi\t\t\tStatus\t\tTanggal Eksekusi\tDurasi');
    console.log('--------------------------------------------------------------------------------');

    for (const file of files) {
      const rec = recordedMap.get(file);
      if (rec) {
        console.log(`${file}\t${rec.status.toUpperCase()}\t\t${rec.executed_at}\t${rec.execution_time_ms}ms`);
      } else {
        console.log(`${file}\tPENDING\t\t-\t\t\t-`);
      }
    }
    console.log('==================================');
  } finally {
    if (conn) await conn.end();
  }
}

function createMigrationFile(name) {
  if (!name) {
    console.error('Harap sertakan deskripsi migrasi. Contoh: npm run migrate:create add_status_to_assets');
    process.exit(1);
  }

  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
  
  let nextSeq = 1;
  for (const f of files) {
    const match = f.match(/^(\d+)_/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= nextSeq) nextSeq = num + 1;
    }
  }

  const paddedSeq = String(nextSeq).padStart(3, '0');
  const fileName = `${paddedSeq}_${cleanName}.sql`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);

  const template = `-- =====================================================================
-- Migration: ${fileName}
-- Dibuat pada: ${new Date().toISOString()}
-- =====================================================================

-- Tuliskan pernyataan SQL di bawah ini:
-- CONTOH:
-- ALTER TABLE \`residents\` ADD COLUMN \`emergency_contact\` VARCHAR(50) DEFAULT NULL;

`;

  fs.writeFileSync(filePath, template, 'utf8');
  console.log(`[CREATED] File migrasi baru berhasil dibuat: database/migrations/${fileName}`);
}

const command = process.argv[2];

if (command === 'status') {
  showStatus().catch(err => {
    console.error('Status Error:', err.message);
    process.exit(1);
  });
} else if (command === 'create') {
  createMigrationFile(process.argv[3]);
} else {
  runMigrations().catch(err => {
    console.error('\n[FATAL ERROR]', err.message);
    process.exit(1);
  });
}

