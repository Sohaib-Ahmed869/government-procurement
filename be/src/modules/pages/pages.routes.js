import { Router } from 'express';
import { list, getBySlug, getById, create, update, remove } from './pages.controller.js';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';

const router = Router();

// Public reads use optionalAuth so staff get extra visibility (drafts, filters).
router.get('/', optionalAuth, list);
// Static path before param path so `/slug/:slug` isn't captured by `/:id`.
router.get('/slug/:slug', optionalAuth, getBySlug);

// Content mutations require an editor/superadmin.
router.post('/', protect, authorize(CONTENT_ROLES), create);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

// Keep the catch-all id route last.
router.get('/:id', optionalAuth, getById);

export default router;
