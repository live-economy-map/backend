import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import {
  generateDraftSchema,
  getDraftParamsSchema,
  updateDraftSchema,
  deliverDraftSchema,
} from '../schemas/reportDrafts.schema.js';
import * as controller from '../controllers/reportDrafts.controller.js';

const router = Router();

router.use(authMiddleware, requireRole('ADMIN'));

router.post(
  '/report-requests/:id/generate-draft',
  validate(generateDraftSchema),
  controller.generateDraft,
);
router.post('/report-requests/:id/draft', validate(generateDraftSchema), controller.generateDraft);
router.get('/report-drafts/:id', validate(getDraftParamsSchema), controller.getDraft);
router.get('/drafts/:id', validate(getDraftParamsSchema), controller.getDraft);
router.patch('/report-drafts/:id', validate(updateDraftSchema), controller.updateDraft);
router.patch('/drafts/:id', validate(updateDraftSchema), controller.updateDraft);
router.post('/report-drafts/:id/deliver', validate(deliverDraftSchema), controller.deliverDraft);
router.post('/drafts/:id/deliver', validate(deliverDraftSchema), controller.deliverDraft);

export default router;
