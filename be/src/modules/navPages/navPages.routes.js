import { Router } from 'express';
import { list, setVisible } from './navPages.controller.js';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';

const router = Router();

// Public: the header and footer read this on every page load.
router.get('/', list);

// Toggling what's visible on the site is a content decision, the same access
// level as switching a Link off.
router.patch('/:key', protect, authorize(CONTENT_ROLES), setVisible);

export default router;
