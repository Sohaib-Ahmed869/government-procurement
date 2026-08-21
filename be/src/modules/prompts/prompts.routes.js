import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { list, getById, create, update, remove } from './prompts.controller.js';

const router = Router();

// Public read uses optionalAuth so staff also see drafts on the live page.
router.get('/', optionalAuth, list);

// Before the id-taking write routes below, and after the collection route
// above, so `/prompts/:id` cannot swallow anything static.
router.get('/:id', optionalAuth, getById);

router.post('/', protect, authorize(CONTENT_ROLES), create);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
