import { Router } from 'express';
import { search } from './search.controller.js';

const router = Router();

// PUBLIC site-wide search over published content.
router.get('/', search);

export default router;
