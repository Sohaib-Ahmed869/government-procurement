import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { uploadImage } from '../../middleware/upload.js';
import { list, getBySlug, create, update, uploadPhoto, remove } from './team.controller.js';

const router = Router();

// Public reads use optionalAuth so staff also see drafts.
router.get('/', optionalAuth, list);
router.get('/slug/:slug', optionalAuth, getBySlug);

// Content mutations require an editor/superadmin.
router.post('/', protect, authorize(CONTENT_ROLES), create);
router.post('/:id/photo', protect, authorize(CONTENT_ROLES), uploadImage.single('file'), uploadPhoto);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
