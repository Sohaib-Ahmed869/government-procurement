import { Router } from 'express';
import {
  submit,
  list,
  getBySlug,
  getById,
  updateStatus,
  answer,
  sendAnswer,
  setFeatured,
  remove,
} from './questions.controller.js';
import { protect, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { MODERATION_ROLES } from '../../constants/roles.js';

const router = Router();

// PUBLIC submission (website forum) + optionalAuth reads (published-only for
// anonymous, all statuses for staff — this powers the moderation queue).
router.post('/', submit);
router.get('/', optionalAuth, list);
// Static path before param path so `/slug/:slug` isn't captured by `/:id`.
router.get('/slug/:slug', optionalAuth, getBySlug);

// Moderation actions — moderator/editor/superadmin only.
router.patch('/:id/status', protect, authorize(MODERATION_ROLES), updateStatus);
router.patch('/:id/answer', protect, authorize(MODERATION_ROLES), answer);
router.post('/:id/send-answer', protect, authorize(MODERATION_ROLES), sendAnswer);
router.patch('/:id/featured', protect, authorize(MODERATION_ROLES), setFeatured);
router.delete('/:id', protect, authorize(MODERATION_ROLES), remove);

// Keep the catch-all id route last.
router.get('/:id', optionalAuth, getById);

export default router;
