import { Router } from 'express';
import {
  getFinanceSummary,
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
} from '../controllers/finance.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { upload } from '../middlewares/upload.js';
import { PENGURUS_ROLES, ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/finance/summary', getFinanceSummary);
router.get('/finance/transactions', getTransactions);
router.get('/finance/transactions/:id', getTransactionById);

router.post(
  '/finance/transactions',
  requireRole(ROLES.BENDAHARA, ROLES.KETUA_RT, ROLES.KETUA_RW, ROLES.SUPER_ADMIN),
  upload.single('receipt'),
  validate({
    type: { required: true, enum: ['in', 'out'] },
    category: { required: true },
    amount: { required: true, type: 'number' },
    description: { required: true, minLength: 3 },
  }),
  createTransaction
);

router.patch(
  '/finance/transactions/:id',
  requireRole(ROLES.BENDAHARA, ROLES.KETUA_RT, ROLES.KETUA_RW, ROLES.SUPER_ADMIN),
  updateTransaction
);

export default router;

