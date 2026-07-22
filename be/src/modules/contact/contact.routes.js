import { Router } from 'express';
import { submit, list, getById, update, remove } from './contact.controller.js';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { CONTENT_ROLES } from '../../constants/roles.js';

const router = Router();

// Public website contact form.
router.post('/', submit);

// Admin inbox management.
router.get('/', protect, authorize(CONTENT_ROLES), list);
router.patch('/:id', protect, authorize(CONTENT_ROLES), update);
router.delete('/:id', protect, authorize(CONTENT_ROLES), remove);

// Keep the catch-all id read last.
router.get('/:id', protect, authorize(CONTENT_ROLES), getById);

export default router;
