import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  refreshParamsSchema,
  recomputeBodySchema,
  createWeightConfigSchema,
} from '../schemas/adminPipeline.schema.js';
import {
  listSources,
  triggerRefresh,
  listRuns,
  triggerRecompute,
  listWeightConfigs,
  createWeightConfig,
} from '../controllers/adminPipeline.controller.js';

const router = Router();

// authMiddleware applies to every route in this router (per Doc 8-6).
router.use(authMiddleware);

router.get('/sources', listSources);
router.post('/sources/:sourceKey/refresh', validate(refreshParamsSchema), triggerRefresh);
router.get('/runs', listRuns);
router.post('/recompute', validate(recomputeBodySchema), triggerRecompute);
router.get('/weight-configs', listWeightConfigs);
router.post('/weight-configs', validate(createWeightConfigSchema), createWeightConfig);

export default router;
