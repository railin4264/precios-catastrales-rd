import { Router } from 'express';
import { createCheckoutSession, handleWebhook } from '../controllers/payment.controller';
import passport from 'passport';

const router = Router();

router.post('/create-checkout-session', passport.authenticate('jwt', { session: false }), createCheckoutSession);
router.post('/webhook', handleWebhook);

export default router;
