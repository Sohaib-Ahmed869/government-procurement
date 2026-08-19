import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { uploadImage } from '../../middleware/upload.js';
import {
  list,
  create,
  update,
  remove,
  uploadCardImage,
  removeCardImage,
} from './capabilities.controller.js';

const router = Router();

// Public read uses optionalAuth so staff can also ask for inactive cards.
router.get('/', optionalAuth, list);

router.post('/', protect, authorize(CONTENT_ROLES), create);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);

// The service photograph. Needs a saved card to attach to, so the admin drawer
// only offers it once the card exists.
router.post('/:id/image', protect, authorize(CONTENT_ROLES), uploadImage.single('file'), uploadCardImage);
router.delete('/:id/image', protect, authorize(CONTENT_ROLES), removeCardImage);

router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
