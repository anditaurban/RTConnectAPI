import dotenv from 'dotenv';
import app from './app.js';
import { testConnection } from './config/db.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('CRITICAL: Tidak dapat terhubung ke database MySQL. Periksa konfigurasi .env');
    process.exit(1);
  }

  console.log('Database MySQL connected successfully.');

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  RTConnect REST API Backend`);
    console.log(`  Server berjalan di: http://0.0.0.0:${PORT}/api/v1`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });

  const gracefulShutdown = () => {
    console.log('\nMematikan server RTConnect API...');
    server.close(() => {
      console.log('Server HTTP dimatikan.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

startServer();

