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

const router = Router();

router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/plans', plansRoutes);
router.use('/billing', billingRoutes);
router.use('/map', mapRoutes);
router.use('/case-studies', caseStudiesRoutes);
router.use('/content', contentRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/pipeline', adminPipelineRoutes);
router.use('/admin/case-studies', adminCaseStudiesRoutes);
router.use('/admin/billing', adminBillingRoutes);
router.use('/admin', adminReportRequestsRoutes);
router.use('/admin', adminReportDraftsRoutes);

export default router;
