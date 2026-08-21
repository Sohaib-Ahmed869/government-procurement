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
  uploadCourseImage,
} from './courses.controller.js';

const router = Router();

router.get('/', optionalAuth, list);
router.post('/', protect, authorize(...CONTENT_ROLES), create);

// Static path before param path so it isn't captured by /:id.
router.get('/slug/:slug', optionalAuth, getBySlug);

router.post('/:id/image', protect, authorize(...CONTENT_ROLES), uploadImage.single('file'), uploadCourseImage);

// NOTE: the course-materials routes (POST /:id/media, /:id/media/link, DELETE
// /:id/media/:mediaId) are gone. A course's detail page carries its cover image
// and nothing else; videos, PDFs and YouTube links are LESSON content, authored
// in the LMS builder and gated per lesson. Removed rather than merely hidden in
// the CMS, so the rule holds against anything that still knows the URLs.

router.get('/:id', optionalAuth, getById);
router.patch('/:id', protect, authorize(...CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(...CONTENT_ROLES), remove);

export default router;
