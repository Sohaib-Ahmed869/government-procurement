import { Router } from 'express';
import { streamFile } from './files.controller.js';

const router = Router();

// Wildcard so keys with slashes (courses/uuid.png) are captured whole.
router.get('/*', streamFile);

export default router;
