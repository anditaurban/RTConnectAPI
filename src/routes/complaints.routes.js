import { Router } from 'express';
import {
  getComplaints,
  getComplaintById,
  createComplaint,
  updateComplaint,
  addComplaintResponse,
} from '../controllers/complaints.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { upload } from '../middlewares/upload.js';
import { PENGURUS_ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/complaints', getComplaints);
router.get('/complaints/:id', getComplaintById);

router.post(
  '/complaints',
  upload.single('photo'),
  validate({
    title: { required: true, minLength: 5 },
    category: { required: true },
    location: { required: true },
    description: { required: true, minLength: 10 },
  }),
  createComplaint
);

router.patch(
  '/complaints/:id',
  requireRole(...PENGURUS_ROLES),
  updateComplaint
);

router.post(
  '/complaints/:id/responses',
  requireRole(...PENGURUS_ROLES),
  validate({
    message: { required: true, minLength: 3 },
  }),
  addComplaintResponse
);

export default router;

