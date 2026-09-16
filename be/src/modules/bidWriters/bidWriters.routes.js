import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { uploadImage } from '../../middleware/upload.js';
import { list, create, update, remove, uploadLogo, reorder } from './bidWriters.controller.js';

const router = Router();

// B7.8 — public, unconditionally. Whether the page is advertised is the
// Site Navigation toggle (see navPages.controller.js), not a route gate.
router.get('/', optionalAuth, list);

// Admin CRUD, as ever — listings still have to be prepared and paid for
// before an editor switches the page on in Site Navigation.
router.post('/', protect, authorize(CONTENT_ROLES), create);
router.post('/:id/logo', protect, authorize(CONTENT_ROLES), uploadImage.single('file'), uploadLogo);
// Above `/:id`, or Express reads "reorder" as the id of a listing to update.
router.patch('/reorder', protect, authorize(CONTENT_ROLES), reorder);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
