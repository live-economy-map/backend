import { Router } from 'express';
import caseStudiesRoutes from './caseStudies.routes.js';

const router = Router();
router.use('/case-studies', caseStudiesRoutes);
// register your routes here
// example: router.use('/users', usersRouter);

export default router;
