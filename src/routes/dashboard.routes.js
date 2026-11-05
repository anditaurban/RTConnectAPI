import { Router } from 'express';
import {
  getDashboardSummary,
  getDashboardActivities,
  getDashboardPendingTasks,
} from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard/summary', getDashboardSummary);
router.get('/dashboard/activities', getDashboardActivities);
router.get('/dashboard/pending-tasks', getDashboardPendingTasks);

export default router;

