import { Router } from 'express';
import validate from '../middlewares/validate.middleware.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
  createOrgSchema,
  getOrgParamsSchema,
  addMemberSchema,
  removeMemberSchema,
} from '../schemas/organizations.schema.js';
import * as controller from '../controllers/organizations.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createOrgSchema), controller.createOrg);
router.get('/my', controller.getMyOrgs);
router.get('/:id', validate(getOrgParamsSchema), controller.getOrg);
router.post('/:id/members', validate(addMemberSchema), controller.addMember);
router.delete('/:id/members/:userId', validate(removeMemberSchema), controller.removeMember);

export default router;
