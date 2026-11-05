import { Router } from 'express';
import {
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validator.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post(
  '/auth/login',
  authLimiter,
  validate({
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
  }),
  login
);

router.post('/auth/logout', authenticate, logout);
router.post('/auth/refresh', refresh);

router.post(
  '/auth/forgot-password',
  validate({ email: { required: true, type: 'email' } }),
  forgotPassword
);

router.post(
  '/auth/reset-password',
  validate({
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
    token: { required: true },
  }),
  resetPassword
);

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);

export default router;

