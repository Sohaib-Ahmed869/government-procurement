import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { list, create, update, remove } from './panels.controller.js';

const router = Router();

// Public read uses optionalAuth so staff also see drafts — which is how a
// seeded entry is reviewed in the CMS before it is published.
router.get('/', optionalAuth, list);

// Content mutations require an editor/superadmin.
router.post('/', protect, authorize(CONTENT_ROLES), create);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
