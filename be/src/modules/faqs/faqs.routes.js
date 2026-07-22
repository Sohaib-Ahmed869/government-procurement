import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { list, create, update, remove } from './faqs.controller.js';

const router = Router();

router.get('/', optionalAuth, list);
router.post('/', protect, authorize(...CONTENT_ROLES), create);
router.patch('/:id', protect, authorize(...CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(...CONTENT_ROLES), remove);

export default router;
