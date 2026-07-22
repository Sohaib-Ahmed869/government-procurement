import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { uploadImage, uploadVideo } from '../../middleware/upload.js';
import {
  list,
  getBySlug,
  getById,
  create,
  getUploadUrl,
  uploadFile,
  uploadThumbnail,
  update,
  remove,
} from './videos.controller.js';

const router = Router();

// Public reads (optionalAuth: anonymous get published only, staff see all).
router.get('/', optionalAuth, list);

// Staff-only writes. Static paths before param paths to avoid capture.
router.post('/', protect, authorize(CONTENT_ROLES), create);
router.post('/upload-url', protect, authorize(CONTENT_ROLES), getUploadUrl);

router.get('/slug/:slug', optionalAuth, getBySlug);

router.post('/:id/file', protect, authorize(CONTENT_ROLES), uploadVideo.single('file'), uploadFile);
router.post(
  '/:id/thumbnail',
  protect,
  authorize(CONTENT_ROLES),
  uploadImage.single('file'),
  uploadThumbnail,
);

router.get('/:id', optionalAuth, getById);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
