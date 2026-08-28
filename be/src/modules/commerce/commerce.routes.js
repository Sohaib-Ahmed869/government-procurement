import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { status, createOrder, myOrders, getOrder, webhook } from './commerce.controller.js';

const router = Router();

/* The webhook is PUBLIC — it is Stripe calling us, with none of our headers.
   Its signature check is the authentication, and it needs the RAW body, which
   app.js arranges by mounting express.raw() on this exact path ahead of the
   JSON parser. Declared first so nothing else can shadow it. */
router.post('/commerce/webhook', webhook);

router.get('/commerce/status', protect, status);

router.post('/orders', protect, createOrder);
router.get('/orders', protect, myOrders);
router.get('/orders/:id', protect, getOrder);

export default router;
