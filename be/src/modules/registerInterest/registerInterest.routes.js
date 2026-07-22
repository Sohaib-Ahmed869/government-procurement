import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';
import {
  create,
  list,
  exportCsv,
  getById,
  update,
  remove,
} from './registerInterest.controller.js';

const router = Router();

// PUBLIC website form.
router.post('/', create);

router.get('/', protect, authorize(...CONTENT_ROLES), list);
// /export must come before /:id so it isn't captured as an id.
router.get('/export', protect, authorize(...CONTENT_ROLES), exportCsv);

router.get('/:id', protect, authorize(...CONTENT_ROLES), getById);
router.patch('/:id', protect, authorize(...CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(...CONTENT_ROLES), remove);

export default router;
