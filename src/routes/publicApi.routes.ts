import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import { requireApiKey } from '../middlewares/apiKey.middleware.js';
import {
  publicCellsQuerySchema,
  publicScoresQuerySchema,
  publicHistorySchema,
} from '../schemas/apiPlatform.schema.js';
import * as controller from '../controllers/apiPlatform.controller.js';
import * as caseStudiesController from '../controllers/caseStudies.controller.js';

const router = Router();

// Programmatic developer API tier gated by API Key & RPM limiter
router.use(requireApiKey);

router.get('/cells', validate(publicCellsQuerySchema), controller.getPublicCells);
router.get('/scores', validate(publicScoresQuerySchema), controller.getPublicScores);
router.get('/history/:cellId', validate(publicHistorySchema), controller.getPublicHistory);
router.get('/case-studies', caseStudiesController.listCaseStudies);

export default router;
