import { Router } from 'express';
import { list, create, update, uploadAvatar, remove } from './testimonials.controller.js';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { uploadImage } from '../../middleware/upload.js';

const router = Router();

// Public list uses optionalAuth so staff also see drafts.
router.get('/', optionalAuth, list);

// Content mutations require an editor/superadmin.
router.post('/', protect, authorize(CONTENT_ROLES), create);
router.post(
  '/:id/avatar',
  protect,
  authorize(CONTENT_ROLES),
  uploadImage.single('file'),
  uploadAvatar,
);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
