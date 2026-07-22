import { Router } from 'express';
import { getPublic, getAll, update } from './settings.controller.js';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ADMIN_ONLY } from '../../constants/roles.js';

const router = Router();

// Public-safe subset for the website — placed before any protected route.
router.get('/public', getPublic);

// Full settings doc + updates are superadmin-only.
router.get('/', protect, authorize(ADMIN_ONLY), getAll);
router.patch('/', protect, authorize(ADMIN_ONLY), update);

export default router;
