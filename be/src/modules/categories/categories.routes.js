import { Router } from 'express';
import { list, create, update, remove } from './categories.controller.js';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';

const router = Router();

// Listing is public (optionalAuth keeps it consistent with other content reads).
router.get('/', optionalAuth, list);

// Mutations require an editor/superadmin.
router.post('/', protect, authorize(CONTENT_ROLES), create);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
