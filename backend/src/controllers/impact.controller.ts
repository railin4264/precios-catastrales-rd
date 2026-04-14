import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const getAllImpactFactors = async (req: Request, res: Response) => {
  try {
    const factors = await prisma.impactFactor.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(factors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createImpactFactor = async (req: Request, res: Response) => {
  try {
    const { name, type, description, latitude, longitude, radiusKm, impactScore } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name y type son obligatorios' });
    }

    const factor = await prisma.impactFactor.create({
      data: {
        name,
        type,
        description: description || null,
        latitude:    latitude    ? parseFloat(latitude)    : null,
        longitude:   longitude   ? parseFloat(longitude)   : null,
        radiusKm:    radiusKm    ? parseFloat(radiusKm)    : 1.0,
        impactScore: impactScore ? parseFloat(impactScore) : 1.0,
      },
    });
    res.status(201).json(factor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateImpactFactor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, description, latitude, longitude, radiusKm, impactScore } = req.body;

    const factor = await prisma.impactFactor.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name }),
        ...(type        !== undefined && { type }),
        ...(description !== undefined && { description }),
        ...(latitude    !== undefined && { latitude:    latitude    ? parseFloat(latitude)    : null }),
        ...(longitude   !== undefined && { longitude:   longitude   ? parseFloat(longitude)   : null }),
        ...(radiusKm    !== undefined && { radiusKm:    parseFloat(radiusKm)    }),
        ...(impactScore !== undefined && { impactScore: parseFloat(impactScore) }),
      },
    });
    res.json(factor);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Factor no encontrado' });
    res.status(400).json({ error: error.message });
  }
};

export const deleteImpactFactor = async (req: Request, res: Response) => {
  try {
    await prisma.impactFactor.delete({ where: { id: req.params.id } });
    res.json({ message: 'Factor eliminado' });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Factor no encontrado' });
    res.status(400).json({ error: error.message });
  }
};
