import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import passport from 'passport';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', passport.authenticate('jwt', { session: false }), getMe);

export default router;
