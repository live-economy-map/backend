import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
  createWatchlistSchema,
  getWatchlistParamsSchema,
  addWatchlistItemSchema,
  removeWatchlistItemSchema,
} from '../schemas/watchlists.schema.js';
import * as controller from '../controllers/watchlists.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createWatchlistSchema), controller.createWatchlist);
router.get('/', controller.listWatchlists);
router.get('/:id', validate(getWatchlistParamsSchema), controller.getWatchlist);
router.post('/:id/items', validate(addWatchlistItemSchema), controller.addItem);
router.delete('/:id/items/:cellId', validate(removeWatchlistItemSchema), controller.removeItem);

export default router;
