import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import {
  createReportRequestSchema,
  requestIdParamSchema,
} from '../schemas/reportRequests.schema.js';
import * as reportRequestsController from '../controllers/reportRequests.controller.js';

const router = Router();

router.post('/', validate(createReportRequestSchema), reportRequestsController.createReportRequest);

router.get('/', reportRequestsController.listUserReportRequests);

router.get('/:id', validate(requestIdParamSchema), reportRequestsController.getUserReportRequest);

export default router;
