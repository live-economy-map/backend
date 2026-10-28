import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import {
  adminCreatePlanSchema,
  adminUpdateSubscriptionSchema,
  adminListPaymentsQuerySchema,
} from '../schemas/billing.schema.js';
import * as billingController from '../controllers/billing.controller.js';

const router = Router();

router.use(authMiddleware, requireRole('ADMIN'));

router.post('/plans', validate(adminCreatePlanSchema), billingController.adminCreatePlan);
router.get(
  '/payments',
  validate(adminListPaymentsQuerySchema),
  billingController.adminListPayments,
);
router.patch(
  '/subscriptions/:id',
  validate(adminUpdateSubscriptionSchema),
  billingController.adminUpdateSubscription,
);

export default router;
