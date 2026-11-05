import { Router } from 'express';
import {
  getLetterTypes,
  getLetterRequests,
  getLetterRequestById,
  createLetterRequest,
  updateLetterRequest,
  submitLetterRequest,
  reviewLetterRequest,
  getLetterDocument,
} from '../controllers/letters.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { validate } from '../middlewares/validator.js';
import { upload } from '../middlewares/upload.js';
import { PENGURUS_ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

router.get('/letters/types', getLetterTypes);
router.get('/letters/requests', getLetterRequests);
router.get('/letters/requests/:id', getLetterRequestById);
router.get('/letters/requests/:id/document', getLetterDocument);

router.post(
  '/letters/requests',
  upload.array('attachments', 5),
  validate({
    letterTypeId: { required: true },
    purpose: { required: true, minLength: 5 },
  }),
  createLetterRequest
);

router.patch(
  '/letters/requests/:id',
  updateLetterRequest
);

router.post(
  '/letters/requests/:id/submit',
  submitLetterRequest
);

router.post(
  '/letters/requests/:id/review',
  requireRole(...PENGURUS_ROLES),
  validate({
    action: { required: true, enum: ['process', 'revise', 'approve', 'reject', 'complete'] },
  }),
  reviewLetterRequest
);

export default router;

