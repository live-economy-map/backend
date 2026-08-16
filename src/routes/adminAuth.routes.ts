import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { loginSchema } from '../schemas/adminAuth.schema.js';
import { login, logout, getMe } from '../controllers/adminAuth.controller.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);

export default router;
