import { Router } from 'express';
import caseStudiesRoutes from './caseStudies.routes.js';
import mapRoutes from './map.routes.js';
import contentRoutes from './content.routes.js';
import adminAuthRoutes from './adminAuth.routes.js';
import adminPipelineRoutes from './adminPipeline.routes.js';
import adminCaseStudiesRoutes from './adminCaseStudies.routes.js';

const router = Router();

router.use('/map', mapRoutes);
router.use('/case-studies', caseStudiesRoutes);
router.use('/content', contentRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/pipeline', adminPipelineRoutes);
router.use('/admin/case-studies', adminCaseStudiesRoutes);

export default router;
