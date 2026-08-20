import { Router } from 'express';
import {
  getLandingContent,
  getMethodologyContent,
  getAboutContent,
} from '../controllers/content.controller.js';

const router = Router();

router.get('/landing', getLandingContent);
router.get('/methodology', getMethodologyContent);
router.get('/about', getAboutContent);

export default router;
