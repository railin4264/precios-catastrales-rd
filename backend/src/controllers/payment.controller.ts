import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

// Singleton Prisma
declare global { var __prisma: PrismaClient | undefined; }
const prisma: PrismaClient = global.__prisma ?? new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

/**
 * Stripe está deshabilitado — no opera en América Latina todavía.
 * El upgrade de plan se gestiona manualmente por el admin via:
 *   PUT /admin/users/:id  { plan: 'BASIC', role: 'PRO' }
 *
 * Este endpoint queda como placeholder para cuando se active un
 * procesador de pagos local (Cardnet, Azul, PayRetailers, etc.).
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  res.status(503).json({
    error: 'Pagos en línea no disponibles aún en esta región.',
    message: 'Para actualizar tu plan, contacta al administrador o escríbenos por WhatsApp.',
    contact: process.env.CONTACT_WHATSAPP || '+1-809-000-0000',
  });
};

/**
 * Webhook placeholder — no opera hasta que se configure un procesador local.
 * El body debe verificarse con la firma del proveedor antes de procesar.
 */
export const handleWebhook = async (req: Request, res: Response) => {
  // TODO: cuando se active un procesador de pagos, verificar firma aqui
  // y llamar a upgradePlan(userId, plan)
  res.json({ received: true, status: 'noop — payments not active' });
};

/**
 * Upgrade manual de plan — llamado por el admin controller o internamente
 * cuando se confirme un pago fuera de banda.
 */
export const upgradePlan = async (userId: string, plan: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE') => {
  const roleMap: Record<string, 'FREE' | 'PRO' | 'ADMIN'> = {
    FREE:         'FREE',
    BASIC:        'PRO',
    PROFESSIONAL: 'PRO',
    ENTERPRISE:   'PRO',
  };
  return prisma.user.update({
    where: { id: userId },
    data: { plan, role: roleMap[plan] ?? 'PRO' },
  });
};

