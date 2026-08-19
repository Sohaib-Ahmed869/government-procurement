import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import { active, list, create, update, publish, remove } from './rulePacks.controller.js';

const router = Router();

// Public: the site reads the active overlay for a jurisdiction.
router.get('/active/:jurisdiction', active);

router.get('/', protect, authorize(CONTENT_ROLES), list);
router.post('/', protect, authorize(CONTENT_ROLES), create);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.post('/:id/publish', protect, authorize(CONTENT_ROLES), publish);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
