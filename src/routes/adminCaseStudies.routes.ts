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

const router = Router();

router.get('/', authMiddleware, listAllCaseStudies);
router.post('/', authMiddleware, validate(createCaseStudySchema), createCaseStudy);
router.patch('/:caseStudyId', authMiddleware, validate(updateCaseStudySchema), updateCaseStudy);
router.delete('/:caseStudyId', authMiddleware, deleteCaseStudy);
router.post('/discover', authMiddleware, validate(discoverBodySchema), discoverCandidates);

export default router;
