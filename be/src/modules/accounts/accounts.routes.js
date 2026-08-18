import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ROLES } from '../../constants/roles.js';
import { signup, meWithProfile, updateInstructorProfile } from './accounts.controller.js';

const router = Router();

// Signup is the one unauthenticated write on this router, so it gets a tighter
// limit than the app-wide one. Otherwise it is a free account-creation and
// email-enumeration endpoint.
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many signup attempts. Try again later.' },
});

router.post('/signup', signupLimiter, signup);

router.get('/me', protect, meWithProfile);
router.patch(
  '/instructor-profile',
  protect,
  authorize(ROLES.INSTRUCTOR),
  updateInstructorProfile,
);

export default router;
