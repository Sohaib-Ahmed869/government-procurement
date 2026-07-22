import { Router } from 'express';
import { submit, confirm, unsubscribe, list, exportCsv, remove } from './subscribers.controller.js';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';

const router = Router();

// Public double opt-in endpoints (the website subscribe form + email links).
router.post('/', submit);
router.get('/confirm', confirm);
router.post('/unsubscribe', unsubscribe);

// Admin management. `/export` is a static path and must precede `/:id`.
router.get('/', protect, authorize(CONTENT_ROLES), list);
router.get('/export', protect, authorize(CONTENT_ROLES), exportCsv);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

export default router;
