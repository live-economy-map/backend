import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import {
  getCellsQuerySchema,
  getCellDetailParamsSchema,
  getRawLayerParamsSchema,
  searchMapBodySchema,
} from '../schemas/map.schema.js';
import { getCells, getCellDetail, getRawLayer, searchMap } from '../controllers/map.controller.js';

const router = Router();

router.get('/', validate(getCellsQuerySchema), getCells);
router.get('/:cellId', validate(getCellDetailParamsSchema), getCellDetail);
router.get('/layers/:sourceKey', validate(getRawLayerParamsSchema), getRawLayer);
router.post('/search', validate(searchMapBodySchema), searchMap);

export default router;
