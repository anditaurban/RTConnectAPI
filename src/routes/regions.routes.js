import { Router } from 'express';
import { getRegions } from '../controllers/regions.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.get('/regions', getRegions);

export default router;

