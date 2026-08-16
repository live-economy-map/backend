import { Router } from 'express';
import { getLandingContent, getMethodologyContent } from '../controllers/content.controller.js';

const router = Router();

router.get('/landing', getLandingContent);
router.get('/methodology', getMethodologyContent);

export default router;