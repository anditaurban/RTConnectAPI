import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import { apiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { successResponse } from './utils/response.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import regionsRoutes from './routes/regions.routes.js';
import residentsRoutes from './routes/residents.routes.js';
import familiesRoutes from './routes/families.routes.js';
import lettersRoutes from './routes/letters.routes.js';
import financeRoutes from './routes/finance.routes.js';
import duesRoutes from './routes/dues.routes.js';
import announcementsRoutes from './routes/announcements.routes.js';
import complaintsRoutes from './routes/complaints.routes.js';
import eventsRoutes from './routes/events.routes.js';
import assetsRoutes from './routes/assets.routes.js';
import usersRoutes from './routes/users.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security & Parsing Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Akses diblokir oleh kebijakan CORS.'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploaded proofs / docs
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/api/v1/uploads', express.static(uploadDir));

// Rate Limiter
app.use('/api/v1', apiLimiter);

// Health Check
app.get('/api/v1/health', (req, res) => {
  return successResponse(res, {
    status: 'OK',
    service: 'RTConnect REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1', authRoutes);
app.use('/api/v1', dashboardRoutes);
app.use('/api/v1', regionsRoutes);
app.use('/api/v1', residentsRoutes);
app.use('/api/v1', familiesRoutes);
app.use('/api/v1', lettersRoutes);
app.use('/api/v1', financeRoutes);
app.use('/api/v1', duesRoutes);
app.use('/api/v1', announcementsRoutes);
app.use('/api/v1', complaintsRoutes);
app.use('/api/v1', eventsRoutes);
app.use('/api/v1', assetsRoutes);
app.use('/api/v1', usersRoutes);
app.use('/api/v1', settingsRoutes);
app.use('/api/v1', notificationsRoutes);

// 404 & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

