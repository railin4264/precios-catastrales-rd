import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

declare global { var __prisma: PrismaClient | undefined; }
const prisma: PrismaClient = global.__prisma ?? new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

// ─── ZONES CRUD ───────────────────────────────────────────────────────────────

export const listZones = async (req: Request, res: Response) => {
  try {
    const { provincia, municipio, zona, q, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));

    const where: any = {};
    if (provincia) where.provincia = { contains: String(provincia), mode: 'insensitive' };
    if (municipio) where.municipio = { contains: String(municipio), mode: 'insensitive' };
    if (zona) where.zona = String(zona);
    if (q) {
      where.OR = [
        { sector: { contains: String(q), mode: 'insensitive' } },
        { seccion: { contains: String(q), mode: 'insensitive' } },
        { municipio: { contains: String(q), mode: 'insensitive' } },
      ];
    }

    const [zones, total] = await Promise.all([
      prisma.zone.findMany({ where, skip, take: parseInt(String(limit)), orderBy: [{ provincia: 'asc' }, { municipio: 'asc' }] }),
      prisma.zone.count({ where }),
    ]);

    res.json({ zones, total, page: parseInt(String(page)), pages: Math.ceil(total / parseInt(String(limit))) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar zonas' });
  }
};

export const getZone = async (req: Request, res: Response) => {
  try {
    const zone = await prisma.zone.findUnique({ where: { id: req.params.id } });
    if (!zone) return res.status(404).json({ error: 'Zona no encontrada' });
    res.json(zone);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener zona' });
  }
};

export const createZone = async (req: Request, res: Response) => {
  try {
    const { provincia, municipio, zona, codigo, sector, valorPromedio, seccion, subsectores, limites, viasPrincipales, parajes } = req.body;

    if (!provincia || !municipio || !zona) {
      return res.status(400).json({ error: 'provincia, municipio y zona son obligatorios' });
    }

    const zone = await prisma.zone.create({
      data: {
        provincia,
        municipio,
        zona,
        codigo: codigo || null,
        sector: sector || null,
        valorPromedio: valorPromedio ? parseFloat(valorPromedio) : null,
        seccion: seccion || null,
        subsectores: subsectores || [],
        limites: limites || {},
        viasPrincipales: viasPrincipales || [],
        parajes: parajes || [],
      },
    });

    res.status(201).json(zone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear zona' });
  }
};

export const updateZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { valorPromedio, sector, seccion, subsectores, limites, viasPrincipales, parajes, provincia, municipio, zona, codigo } = req.body;

    const zone = await prisma.zone.update({
      where: { id },
      data: {
        ...(provincia !== undefined && { provincia }),
        ...(municipio !== undefined && { municipio }),
        ...(zona !== undefined && { zona }),
        ...(codigo !== undefined && { codigo }),
        ...(sector !== undefined && { sector }),
        ...(seccion !== undefined && { seccion }),
        ...(valorPromedio !== undefined && { valorPromedio: valorPromedio === null ? null : parseFloat(valorPromedio) }),
        ...(subsectores !== undefined && { subsectores }),
        ...(limites !== undefined && { limites }),
        ...(viasPrincipales !== undefined && { viasPrincipales }),
        ...(parajes !== undefined && { parajes }),
      },
    });

    res.json(zone);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Zona no encontrada' });
    res.status(500).json({ error: 'Error al actualizar zona' });
  }
};

export const deleteZone = async (req: Request, res: Response) => {
  try {
    await prisma.zone.delete({ where: { id: req.params.id } });
    res.json({ message: 'Zona eliminada correctamente' });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Zona no encontrada' });
    res.status(500).json({ error: 'Error al eliminar zona' });
  }
};

// ─── STATS ────────────────────────────────────────────────────────────────────

export const getStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalZones, totalUsers, urbanas, rurales, byProvincia, consultasEsteMes, reportesEsteMes, impactFactors] = await Promise.all([
      prisma.zone.count(),
      prisma.user.count(),
      prisma.zone.count({ where: { zona: 'Urbana' } }),
      prisma.zone.count({ where: { zona: 'Rural' } }),
      prisma.zone.groupBy({ by: ['provincia'], _count: { _all: true }, orderBy: { _count: { provincia: 'desc' } }, take: 10 }),
      prisma.usageLog.count({ where: { timestamp: { gte: startOfMonth } } }),
      prisma.usageLog.count({ where: { endpoint: { contains: 'reports' }, timestamp: { gte: startOfMonth } } }),
      prisma.impactFactor.count(),
    ]);

    res.json({ totalZones, totalUsers, urbanas, rurales, byProvincia, consultasEsteMes, reportesEsteMes, impactFactors });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, plan: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

export const promoteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, plan } = req.body;

    const validRoles = ['FREE', 'PRO', 'ADMIN'];
    const validPlans = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'];

    if (role && !validRoles.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
    if (plan && !validPlans.includes(plan)) return res.status(400).json({ error: 'Plan inválido' });

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(plan && { plan }),
      },
      select: { id: true, email: true, role: true, plan: true },
    });

    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// ─── FIRST ADMIN BOOTSTRAP ────────────────────────────────────────────────────
// Protected by ADMIN_BOOTSTRAP_SECRET env var. Use once to create the first admin.

export const bootstrapAdmin = async (req: Request, res: Response) => {
  try {
    const { email, secret } = req.body;
    const ADMIN_SECRET = process.env.ADMIN_BOOTSTRAP_SECRET || 'cadastral_admin_bootstrap';

    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Secreto inválido' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado. Regístrate primero.' });

    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN', plan: 'ENTERPRISE' },
      select: { id: true, email: true, role: true, plan: true },
    });

    res.json({ message: 'Usuario promovido a ADMIN', user: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error al promover admin' });
  }
};
