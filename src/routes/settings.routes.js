import { Router } from 'express';
import { getRegionSettings, updateRegionSettings } from '../controllers/settings.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { PENGURUS_ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/settings/region', getRegionSettings);

router.patch(
  '/settings/region',
  requireRole(...PENGURUS_ROLES),
  validate({
    key: { required: true },
    value: { required: true },
  }),
  updateRegionSettings
);

export default router;

