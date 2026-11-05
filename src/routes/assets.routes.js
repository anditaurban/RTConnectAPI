import { Router } from 'express';
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
} from '../controllers/assets.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { PENGURUS_ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/assets', getAssets);
router.get('/assets/:id', getAssetById);

router.post(
  '/assets',
  requireRole(...PENGURUS_ROLES),
  validate({
    code: { required: true },
    name: { required: true },
    category: { required: true },
    location: { required: true },
    pic: { required: true },
  }),
  createAsset
);

router.patch(
  '/assets/:id',
  requireRole(...PENGURUS_ROLES),
  updateAsset
);

export default router;

