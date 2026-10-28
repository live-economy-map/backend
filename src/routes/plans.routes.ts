import { Router } from 'express';
import * as billingController from '../controllers/billing.controller.js';

const router = Router();

router.get('/', billingController.listPlans);

export default router;
