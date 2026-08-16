import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { listCaseStudiesQuerySchema } from '../schemas/caseStudies.schema.js';
import * as caseStudiesController from '../controllers/caseStudies.controller.js';

const router = Router();

// GET /case-studies — public, paginated list with validation
router.get('/', validate(listCaseStudiesQuerySchema), caseStudiesController.listCaseStudies);

// GET /case-studies/:caseStudyId — public, no schema validation
router.get('/:caseStudyId', caseStudiesController.getCaseStudyById);

export default router;
