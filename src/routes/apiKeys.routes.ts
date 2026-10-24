import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { createApiKeySchema, revokeApiKeySchema } from '../schemas/apiPlatform.schema.js';
import * as controller from '../controllers/apiPlatform.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createApiKeySchema), controller.createApiKey);
router.get('/', controller.listApiKeys);
router.delete('/:id', validate(revokeApiKeySchema), controller.revokeApiKey);

export default router;
