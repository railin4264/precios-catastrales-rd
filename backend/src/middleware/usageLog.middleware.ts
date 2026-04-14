import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * Logs every API request to UsageLog so the dashboard can show real usage stats.
 * Runs after the response is sent — non-blocking fire-and-forget.
 */
export const usageLogger = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    const user = (req as any).user as { id?: string } | undefined;
    prisma.usageLog.create({
      data: {
        userId: user?.id ?? null,
        endpoint: req.path,
        method: req.method,
        status: res.statusCode,
      },
    }).catch(() => {}); // never block the response
  });
  next();
};
