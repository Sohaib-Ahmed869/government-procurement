import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { uploadImage } from '../../middleware/upload.js';
import { list, create, update, uploadLogo, remove } from './tenderSites.controller.js';

const router = Router();

// Public read uses optionalAuth so staff can also ask for inactive entries.
router.get('/', optionalAuth, list);

router.post('/', protect, authorize(CONTENT_ROLES), create);
router.post('/:id/logo', protect, authorize(CONTENT_ROLES), uploadImage.single('file'), uploadLogo);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
