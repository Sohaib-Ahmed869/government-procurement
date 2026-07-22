import { Router } from 'express';
import { overview } from './dashboard.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

// Admin overview — any authenticated staff member.
router.get('/', protect, overview);

export default router;
