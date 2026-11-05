import { Router } from 'express';
import {
  getFamilies,
  getFamilyById,
  createFamily,
  updateFamily,
} from '../controllers/families.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { PENGURUS_ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/families', getFamilies);
router.get('/families/:id', getFamilyById);

router.post(
  '/families',
  requireRole(...PENGURUS_ROLES),
  validate({
    noKK: { required: true, minLength: 16, maxLength: 16 },
    address: { required: true },
  }),
  createFamily
);

router.patch(
  '/families/:id',
  requireRole(...PENGURUS_ROLES),
  updateFamily
);

export default router;

