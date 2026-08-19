import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { uploadDocument } from '../../middleware/upload.js';
import { list, create, update, remove, uploadFile, download } from './templates.controller.js';

const router = Router();

// Public read uses optionalAuth so staff also see drafts on the live page.
router.get('/', optionalAuth, list);

// B6.4 — the download itself. optionalAuth so staff can test a draft before it
// is published; anonymous callers only reach published documents.
router.get('/:id/download', optionalAuth, download);

router.post('/', protect, authorize(CONTENT_ROLES), create);
router.post(
  '/:id/file',
  protect,
  authorize(CONTENT_ROLES),
  uploadDocument.single('file'),
  uploadFile,
);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
