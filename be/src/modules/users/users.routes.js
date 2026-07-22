import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { ADMIN_ONLY } from '../../constants/roles.js';
import {
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
} from './users.controller.js';

const router = Router();

// Every user-management endpoint is admin-only.
router.use(protect, authorize(...ADMIN_ONLY));

router.get('/', listUsers);
router.post('/', createUser);

// Keep /:id routes last so they don't shadow static paths.
router.get('/:id', getUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
