import { Router } from 'express';
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcements.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { PENGURUS_ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/announcements', getAnnouncements);
router.get('/announcements/:id', getAnnouncementById);

router.post(
  '/announcements',
  requireRole(...PENGURUS_ROLES),
  validate({
    title: { required: true, minLength: 5 },
    content: { required: true, minLength: 10 },
  }),
  createAnnouncement
);

router.patch(
  '/announcements/:id',
  requireRole(...PENGURUS_ROLES),
  updateAnnouncement
);

router.delete(
  '/announcements/:id',
  requireRole(...PENGURUS_ROLES),
  deleteAnnouncement
);

export default router;

