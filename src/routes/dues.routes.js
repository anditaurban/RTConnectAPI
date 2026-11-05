import { Router } from 'express';
import {
  getDuesTypes,
  createDuesType,
  getDuesBills,
  getDuesBillById,
  generateDuesBills,
  payDuesBill,
  verifyDuesPayment,
  getMyBills,
} from '../controllers/dues.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { upload } from '../middlewares/upload.js';
import { PENGURUS_ROLES, ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/dues/types', getDuesTypes);
router.post(
  '/dues/types',
  requireRole(ROLES.BENDAHARA, ROLES.KETUA_RT, ROLES.KETUA_RW, ROLES.SUPER_ADMIN),
  validate({
    code: { required: true },
    name: { required: true },
    amount: { required: true, type: 'number' },
    billingType: { required: true, enum: ['per_kk', 'per_resident'] },
    billingPeriod: { required: true, enum: ['Bulanan', 'Tahunan', 'Sekali'] },
  }),
  createDuesType
);

router.get('/dues/bills', getDuesBills);
router.get('/dues/my-bills', getMyBills);
router.get('/dues/bills/:id', getDuesBillById);

router.post(
  '/dues/bills/generate',
  requireRole(ROLES.BENDAHARA, ROLES.KETUA_RT, ROLES.SUPER_ADMIN),
  validate({
    duesTypeId: { required: true },
    period: { required: true },
    dueDate: { required: true },
  }),
  generateDuesBills
);

router.post(
  '/dues/payments',
  upload.single('paymentProof'),
  payDuesBill
);

router.post(
  '/dues/payments/:id',
  upload.single('paymentProof'),
  payDuesBill
);

router.post(
  '/dues/payments/:id/verify',
  requireRole(ROLES.BENDAHARA, ROLES.KETUA_RT, ROLES.SUPER_ADMIN),
  validate({
    action: { required: true, enum: ['approve', 'reject'] },
  }),
  verifyDuesPayment
);

export default router;

