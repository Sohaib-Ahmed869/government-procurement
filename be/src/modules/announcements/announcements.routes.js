import { Router } from 'express';
import { active, list, create, update, remove } from './announcements.controller.js';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';

const router = Router();

// Public banner endpoint — placed before `/:id` so it isn't captured.
router.get('/active', active);

// Admin list + mutations require an editor/superadmin.
router.get('/', protect, authorize(CONTENT_ROLES), list);
router.post('/', protect, authorize(CONTENT_ROLES), create);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
