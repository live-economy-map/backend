import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import {
  getCellsQuerySchema,
  getCellDetailParamsSchema,
  getRawLayerParamsSchema,
  searchMapBodySchema,
  getPeriodsQuerySchema,
} from '../schemas/map.schema.js';
import {
  getCells,
  getCellDetail,
  getRawLayer,
  searchMap,
  getPeriods,
} from '../controllers/map.controller.js';

const router = Router();

router.get('/', validate(getCellsQuerySchema), getCells);
router.get('/:cellId', validate(getCellDetailParamsSchema), getCellDetail);
router.get('/layers/:sourceKey', validate(getRawLayerParamsSchema), getRawLayer);
router.post('/search', validate(searchMapBodySchema), searchMap);
router.get('/periods', validate(getPeriodsQuerySchema), getPeriods);

export default router;
