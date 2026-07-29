import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import {
  listOpenings,
  createOpening,
  updateOpening,
  removeOpening,
} from './careers.controller.js';

const router = Router();

// Public read uses optionalAuth so staff also see drafts.
router.get('/openings', optionalAuth, listOpenings);

// Content mutations require an editor/superadmin.
router.post('/openings', protect, authorize(CONTENT_ROLES), createOpening);
router.patch('/openings/:id', protect, authorize(CONTENT_ROLES), updateOpening);
router.delete('/openings/:id', protect, authorize(CONTENT_ROLES), removeOpening);

export default router;
