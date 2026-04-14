import { Router } from 'express';
import { 
  getProvincias, 
  getMunicipios, 
  getSectores, 
  queryValor, 
  searchAll, 
  getValuation,
  generateReport,
  generateApiKey,
  getApiKeys,
  getHeatmap,
} from '../controllers/api.controller';
import passport from 'passport';
import { freeLimiter, smartLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Optional JWT — attaches user to req if token is present, no error if absent
const optionalAuth = passport.authenticate('jwt', { session: false, failWithError: false });
const tryAuth = (req: any, res: any, next: any) => {
  passport.authenticate('jwt', { session: false }, (_err: any, user: any) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
};

// Public endpoints — smart limiter reads plan from JWT if present, else FREE limits
router.get('/provincias', freeLimiter, getProvincias);
router.get('/municipios', freeLimiter, getMunicipios);
router.get('/sectores', freeLimiter, getSectores);
router.get('/consulta', tryAuth, smartLimiter, queryValor);
router.get('/buscar', tryAuth, smartLimiter, searchAll);
router.get('/evaluate/:zoneId', tryAuth, smartLimiter, getValuation);
router.get('/reports/generate/:id', tryAuth, smartLimiter, generateReport);

// Heatmap — public, light cache-friendly endpoint
router.get('/heatmap', freeLimiter, getHeatmap);

// Usage stats — personal stats for the dashboard
router.get('/usage', passport.authenticate('jwt', { session: false }), async (req: any, res: any) => {
  try {
    const { prisma } = await import('../config/prisma');
    const userId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [consultas, reportes] = await Promise.all([
      prisma.usageLog.count({ where: { userId, timestamp: { gte: startOfMonth } } }),
      prisma.usageLog.count({ where: { userId, endpoint: { contains: 'reports' }, timestamp: { gte: startOfMonth } } }),
    ]);
    res.json({ consultas, reportes });
  } catch { res.json({ consultas: 0, reportes: 0 }); }
});

// Protected Developer Routes — must be authenticated
router.post('/keys', passport.authenticate('jwt', { session: false }), generateApiKey);
router.get('/keys', passport.authenticate('jwt', { session: false }), getApiKeys);

export default router;
