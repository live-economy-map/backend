import { Router } from 'express';
import caseStudiesRoutes from './caseStudies.routes.js';
import mapRoutes from './map.routes.js';
import contentRoutes from './content.routes.js';
import adminAuthRoutes from './adminAuth.routes.js';
import adminPipelineRoutes from './adminPipeline.routes.js';
import adminCaseStudiesRoutes from './adminCaseStudies.routes.js';
import adminReportRequestsRoutes from './adminReportRequests.routes.js';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import plansRoutes from './plans.routes.js';
import billingRoutes from './billing.routes.js';
import adminBillingRoutes from './adminBilling.routes.js';
import adminReportDraftsRoutes from './adminReportDrafts.routes.js';
import apiKeysRoutes from './apiKeys.routes.js';
import publicApiRoutes from './publicApi.routes.js';
import organizationsRoutes from './organizations.routes.js';
import watchlistsRoutes from './watchlists.routes.js';

import { requireApiKey } from '../middlewares/apiKey.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  publicCellsQuerySchema,
  publicScoresQuerySchema,
  publicHistorySchema,
} from '../schemas/apiPlatform.schema.js';
import * as apiPlatformController from '../controllers/apiPlatform.controller.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/plans', plansRoutes);
router.use('/billing', billingRoutes);
router.use('/api-keys', apiKeysRoutes);
router.use('/public', publicApiRoutes);

// Direct aliases for public read endpoints
router.get(
  '/cells',
  requireApiKey,
  validate(publicCellsQuerySchema),
  apiPlatformController.getPublicCells,
);
router.get(
  '/scores',
  requireApiKey,
  validate(publicScoresQuerySchema),
  apiPlatformController.getPublicScores,
);
router.get(
  '/history/:cellId',
  requireApiKey,
  validate(publicHistorySchema),
  apiPlatformController.getPublicHistory,
);

router.use('/orgs', organizationsRoutes);
router.use('/watchlists', watchlistsRoutes);
router.use('/map', mapRoutes);
router.use('/case-studies', caseStudiesRoutes);
router.use('/content', contentRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/pipeline', adminPipelineRoutes);
router.use('/admin/case-studies', adminCaseStudiesRoutes);
router.use('/admin/billing', adminBillingRoutes);
router.use('/admin', adminBillingRoutes);
router.use('/admin', adminReportRequestsRoutes);
router.use('/admin', adminReportDraftsRoutes);

export default router;
