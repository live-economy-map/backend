import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { updateProfileSchema } from '../schemas/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';
import * as billingController from '../controllers/billing.controller.js';
import * as exportAndAlertsController from '../controllers/exportAndAlerts.controller.js';
import { requireEntitlement } from '../middlewares/entitlement.middleware.js';
import { exportDataQuerySchema } from '../schemas/exportAndAlerts.schema.js';
import savedAreasRoutes from './savedAreas.routes.js';
import reportRequestsRoutes from './reportRequests.routes.js';
import alertsRoutes from './alerts.routes.js';
import notificationsRoutes from './notifications.routes.js';
import apiKeysRoutes from './apiKeys.routes.js';
import * as apiPlatformController from '../controllers/apiPlatform.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', authController.getMe);
router.patch('/', validate(updateProfileSchema), authController.patchMe);
router.get('/subscription', billingController.getMySubscription);
router.get('/usage', apiPlatformController.getUsageSummary);
router.get(
  '/export',
  requireEntitlement('canExport'),
  validate(exportDataQuerySchema),
  exportAndAlertsController.exportData,
);
router.use('/saved-areas', savedAreasRoutes);
router.use('/report-requests', reportRequestsRoutes);
router.use('/alerts', alertsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/api-keys', apiKeysRoutes);

export default router;
