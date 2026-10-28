import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import {
  adminReportRequestsQuerySchema,
  adminUpdateReportRequestSchema,
  adminUploadDeliverableSchema,
} from '../schemas/reportRequests.schema.js';
import * as adminReportRequestsController from '../controllers/adminReportRequests.controller.js';

const router = Router();

router.use(authMiddleware, requireRole('ADMIN'));

router.get(
  '/report-requests',
  validate(adminReportRequestsQuerySchema),
  adminReportRequestsController.adminListReportRequests,
);

router.patch(
  '/report-requests/:id',
  validate(adminUpdateReportRequestSchema),
  adminReportRequestsController.adminUpdateReportRequest,
);

router.post(
  '/report-requests/:id/deliverable',
  validate(adminUploadDeliverableSchema),
  adminReportRequestsController.adminAttachDeliverable,
);

router.get('/metrics/demand', adminReportRequestsController.getDemandMetrics);

export default router;
