import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/events.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { PENGURUS_ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/events', getEvents);
router.get('/events/:id', getEventById);

router.post(
  '/events',
  requireRole(...PENGURUS_ROLES),
  validate({
    title: { required: true },
    category: { required: true },
    date: { required: true },
    time: { required: true },
    location: { required: true },
    organizer: { required: true },
  }),
  createEvent
);

router.patch(
  '/events/:id',
  requireRole(...PENGURUS_ROLES),
  updateEvent
);

router.delete(
  '/events/:id',
  requireRole(...PENGURUS_ROLES),
  deleteEvent
);

export default router;

