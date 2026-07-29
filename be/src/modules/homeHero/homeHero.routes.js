import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { list, save } from './homeHero.controller.js';

const router = Router();

router.get('/', list);
router.patch('/:audience', protect, authorize(CONTENT_ROLES), save);

export default router;
