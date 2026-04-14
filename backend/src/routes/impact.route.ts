import { Router } from 'express';
import passport from 'passport';
import * as impactController from '../controllers/impact.controller';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();
const auth = passport.authenticate('jwt', { session: false });

// Public — used by the valuation engine and heatmap
router.get('/public', impactController.getAllImpactFactors);

// Admin only
router.get('/',       auth, requireAdmin, impactController.getAllImpactFactors);
router.post('/',      auth, requireAdmin, impactController.createImpactFactor);
router.put('/:id',    auth, requireAdmin, impactController.updateImpactFactor);
router.delete('/:id', auth, requireAdmin, impactController.deleteImpactFactor);

export default router;
