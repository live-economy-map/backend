import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import {
  getCellsQuerySchema,
  getCellDetailParamsSchema,
  getRawLayerParamsSchema,
  searchMapBodySchema,
  getPeriodsQuerySchema,
  chatCellSchema,
} from '../schemas/map.schema.js';
import {
  getCells,
  getCellDetail,
  getRawLayer,
  searchMap,
  getPeriods,
  chatCell,
} from '../controllers/map.controller.js';

const router = Router();

router.get('/cells', validate(getCellsQuerySchema), getCells);
router.get('/cells/:cellId', validate(getCellDetailParamsSchema), getCellDetail);
router.post('/cells/:cellId/chat', validate(chatCellSchema), chatCell);
router.get('/layers/:sourceKey', validate(getRawLayerParamsSchema), getRawLayer);
router.post('/search', validate(searchMapBodySchema), searchMap);
router.get('/periods', validate(getPeriodsQuerySchema), getPeriods);
router.get('/:cellId', validate(getCellDetailParamsSchema), getCellDetail);
router.post('/:cellId/chat', validate(chatCellSchema), chatCell);

export default router;
