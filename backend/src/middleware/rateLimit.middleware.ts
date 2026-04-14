import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

const IS_DEV = process.env.NODE_ENV !== 'production';

// Generic limiter for unauthenticated / FREE users (15 min window)
export const freeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? 9999 : 30,
  message: { error: 'Límite de consultas alcanzado. Actualiza tu plan para obtener más acceso.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Plan limits per 15-minute window
const PLAN_LIMITS: Record<string, number> = {
  FREE:         IS_DEV ? 9999 : 30,
  BASIC:        300,
  PROFESSIONAL: 1500,
  ENTERPRISE:   99999,
};

export const smartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: async (req: Request) => {
    if (IS_DEV) return 9999;
    const user = (req as any).user;
    const plan = user?.plan ?? 'FREE';
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
  },
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `user_${user.id}` : req.ip ?? 'anon';
  },
  handler: (req: Request, res: Response) => {
    const user = (req as any).user;
    const plan = user?.plan ?? 'FREE';
    res.status(429).json({
      error: `Límite de tu plan ${plan} alcanzado. Intenta en 15 minutos.`
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = (plan: string) => {
  const max = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    keyGenerator: (req) => {
      const user = (req as any).user;
      return user ? `user_${user.id}` : req.ip ?? 'anon';
    },
    message: { error: `Rate limit exceeded for plan ${plan}.` },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
