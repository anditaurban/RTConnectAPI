import { Router } from 'express';
import {
  getResidents,
  getResidentById,
  createResident,
  updateResident,
} from '../controllers/residents.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { PENGURUS_ROLES, ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/residents', getResidents);
router.get('/residents/:id', getResidentById);

router.post(
  '/residents',
  requireRole(...PENGURUS_ROLES),
  validate({
    nik: { required: true, minLength: 16, maxLength: 16 },
    name: { required: true, minLength: 2 },
    gender: { required: true, enum: ['Laki-laki', 'Perempuan'] },
    birthPlace: { required: true },
    birthDate: { required: true },
    religion: { required: true },
    job: { required: true },
    maritalStatus: { required: true },
    familyRole: { required: true },
    statusDomisili: { required: true },
    address: { required: true },
  }),
  createResident
);

router.patch(
  '/residents/:id',
  requireRole(...PENGURUS_ROLES, ROLES.WARGA),
  updateResident
);

export default router;

