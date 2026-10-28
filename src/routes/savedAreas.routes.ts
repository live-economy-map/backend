import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import {
  createSavedAreaSchema,
  updateSavedAreaSchema,
  savedAreaIdParamSchema,
} from '../schemas/savedAreas.schema.js';
import * as savedAreasController from '../controllers/savedAreas.controller.js';

const router = Router();

router.get('/', savedAreasController.listSavedAreas);

router.post('/', validate(createSavedAreaSchema), savedAreasController.createSavedArea);

router.patch('/:id', validate(updateSavedAreaSchema), savedAreasController.updateSavedArea);

router.delete('/:id', validate(savedAreaIdParamSchema), savedAreasController.deleteSavedArea);

export default router;
