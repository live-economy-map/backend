import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkoutSchema, verifyPaymentParamsSchema } from '../schemas/billing.schema.js';
import * as billingController from '../controllers/billing.controller.js';

const router = Router();

router.post(
  '/checkout',
  authMiddleware,
  validate(checkoutSchema),
  billingController.initializeCheckout,
);
router.get(
  '/verify/:txRef',
  authMiddleware,
  validate(verifyPaymentParamsSchema),
  billingController.verifyPayment,
);
router.post('/webhook', billingController.handleWebhook);
router.get('/me', authMiddleware, billingController.getMySubscription);

export default router;
