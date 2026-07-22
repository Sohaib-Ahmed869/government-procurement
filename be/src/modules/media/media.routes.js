import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { uploadMedia } from '../../middleware/upload.js';
import { list, create, getById, update, remove } from './media.controller.js';

const router = Router();

// Every media endpoint requires authentication; reads are open to any staff,
// writes are limited to content roles.
router.get('/', protect, list);
router.post('/', protect, authorize(CONTENT_ROLES), uploadMedia.single('file'), create);

router.get('/:id', protect, getById);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
