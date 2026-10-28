import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import {
  listNotificationsQuerySchema,
  markNotificationReadParamsSchema,
} from '../schemas/exportAndAlerts.schema.js';
import * as controller from '../controllers/exportAndAlerts.controller.js';

const router = Router();

router.get('/', validate(listNotificationsQuerySchema), controller.listNotifications);
router.patch(
  '/:id/read',
  validate(markNotificationReadParamsSchema),
  controller.markNotificationRead,
);

export default router;
