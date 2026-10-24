import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  createCaseStudySchema,
  updateCaseStudySchema,
  discoverBodySchema,
} from '../schemas/adminCaseStudies.schema.js';
import {
  listAllCaseStudies,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  discoverCandidates,
} from '../controllers/adminCaseStudies.controller.js';

import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware, requireRole('ADMIN'));

router.get('/', listAllCaseStudies);
router.post('/', validate(createCaseStudySchema), createCaseStudy);
router.patch('/:caseStudyId', validate(updateCaseStudySchema), updateCaseStudy);
router.delete('/:caseStudyId', deleteCaseStudy);
router.post('/discover', validate(discoverBodySchema), discoverCandidates);

export default router;
