import { Router } from 'express';
import passport from 'passport';
import { requireAdmin } from '../middleware/admin.middleware';
import {
  listZones, getZone, createZone, updateZone, deleteZone,
  getStats, listUsers, promoteUser, bootstrapAdmin,
} from '../controllers/admin.controller';

const router = Router();

// One-time bootstrap (no auth required — protected by secret in body)
router.post('/bootstrap', bootstrapAdmin);

// All routes below require JWT + ADMIN role
const auth = passport.authenticate('jwt', { session: false });

router.get('/stats', auth, requireAdmin, getStats);

router.get('/zones', auth, requireAdmin, listZones);
router.get('/zones/:id', auth, requireAdmin, getZone);
router.post('/zones', auth, requireAdmin, createZone);
router.put('/zones/:id', auth, requireAdmin, updateZone);
router.delete('/zones/:id', auth, requireAdmin, deleteZone);

router.get('/users', auth, requireAdmin, listUsers);
router.put('/users/:id', auth, requireAdmin, promoteUser);

export default router;
