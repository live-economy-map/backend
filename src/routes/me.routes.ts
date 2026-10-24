import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { updateProfileSchema } from '../schemas/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';
import savedAreasRoutes from './savedAreas.routes.js';

const router = Router();

router.use(authMiddleware);

router.get('/', authController.getMe);
router.patch('/', validate(updateProfileSchema), authController.patchMe);
router.use('/saved-areas', savedAreasRoutes);

export default router;
