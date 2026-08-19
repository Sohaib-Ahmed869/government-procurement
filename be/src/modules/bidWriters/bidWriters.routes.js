import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { uploadImage } from '../../middleware/upload.js';
import { list, create, update, remove, uploadLogo } from './bidWriters.controller.js';

const router = Router();

// B7.8 — the public read is gated by FEATURE_BID_WRITERS inside the controller,
// not here: staff must keep access at every flag setting so the directory can be
// built and checked before anything is switched on.
router.get('/', optionalAuth, list);

// Admin CRUD is never flag-gated. Listings have to be prepared and paid for
// before go-live, which is the whole point of holding the page back.
router.post('/', protect, authorize(CONTENT_ROLES), create);
router.post('/:id/logo', protect, authorize(CONTENT_ROLES), uploadImage.single('file'), uploadLogo);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
