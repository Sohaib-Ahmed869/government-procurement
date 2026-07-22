import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ADMIN_ONLY } from '../../constants/roles.js';
import { list } from './audit.controller.js';

const router = Router();

router.get('/', protect, authorize(ADMIN_ONLY), list);

export default router;
