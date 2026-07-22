import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ADMIN_ONLY } from '../../constants/roles.js';
import {
  register,
  login,
  me,
  updateMe,
  forgotPassword,
  resetPassword,
} from './auth.controller.js';

const router = Router();

// Admin-only staff provisioning.
router.post('/register', protect, authorize(...ADMIN_ONLY), register);

// Public auth flows.
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Self-service (any authenticated user).
router.get('/me', protect, me);
router.patch('/me', protect, updateMe);

export default router;
