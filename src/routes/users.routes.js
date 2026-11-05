import { Router } from 'express';
import { getUsers, createUser, updateUser } from '../controllers/users.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get(
  '/users',
  requireRole(ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT),
  getUsers
);

router.post(
  '/users',
  requireRole(ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT),
  validate({
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
    name: { required: true, minLength: 2 },
    role: {
      required: true,
      enum: ['super_admin', 'ketua_rw', 'ketua_rt', 'sekretaris', 'bendahara', 'petugas', 'warga'],
    },
  }),
  createUser
);

router.patch(
  '/users/:id',
  requireRole(ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT),
  updateUser
);

export default router;

