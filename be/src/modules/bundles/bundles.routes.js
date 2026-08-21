import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { uploadImage } from '../../middleware/upload.js';
import {
  list,
  getBySlug,
  getById,
  create,
  update,
  remove,
  uploadBundleImage,
} from './bundles.controller.js';

const router = Router();

router.get('/', optionalAuth, list);
router.post('/', protect, authorize(...CONTENT_ROLES), create);

// Static path before the param path so it isn't captured by /:id.
router.get('/slug/:slug', optionalAuth, getBySlug);

router.post('/:id/image', protect, authorize(...CONTENT_ROLES), uploadImage.single('file'), uploadBundleImage);

router.get('/:id', optionalAuth, getById);
router.patch('/:id', protect, authorize(...CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(...CONTENT_ROLES), remove);

export default router;
