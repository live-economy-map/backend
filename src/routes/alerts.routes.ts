import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import { requireEntitlement } from '../middlewares/entitlement.middleware.js';
import {
  createAlertRuleSchema,
  updateAlertRuleSchema,
  deleteAlertRuleSchema,
} from '../schemas/exportAndAlerts.schema.js';
import * as controller from '../controllers/exportAndAlerts.controller.js';

const router = Router();

router.use(requireEntitlement('canAlert'));

router.get('/', controller.listAlertRules);
router.post('/', validate(createAlertRuleSchema), controller.createAlertRule);
router.patch('/:id', validate(updateAlertRuleSchema), controller.updateAlertRule);
router.delete('/:id', validate(deleteAlertRuleSchema), controller.deleteAlertRule);

export default router;
