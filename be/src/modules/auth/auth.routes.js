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

import { listProviders, start, callback } from './oauth.controller.js';

const router = Router();

/* ---- Federated sign-in (L6) -----------------------------------------------
   All three are PUBLIC by necessity: the sign-in screen renders before anyone
   has a session, and the provider's redirect arrives without our headers. The
   signed `state` parameter is what makes that safe — see oauth/index.js. */
router.get('/oauth/providers', listProviders);
router.get('/oauth/:provider/start', start);
router.get('/oauth/:provider/callback', callback);

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
