import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';

export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKeyHeader = req.header('X-API-Key');

  if (!apiKeyHeader) {
    return res.status(401).json({ error: 'API Key is missing' });
  }

  try {
    const keys = await prisma.apiKey.findMany();

    let validKey = null;
    for (const keyDoc of keys) {
      const isMatch = await bcrypt.compare(apiKeyHeader, keyDoc.key);
      if (isMatch) {
        validKey = keyDoc;
        break;
      }
    }

    if (!validKey) {
      return res.status(403).json({ error: 'Invalid API Key' });
    }

    const user = await prisma.user.findUnique({ where: { id: validKey.userId } });

    (req as any).user = user;
    (req as any).isApiKey = true;

    next();
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
