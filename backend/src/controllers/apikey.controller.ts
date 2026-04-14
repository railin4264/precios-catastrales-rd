import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const generateApiKey = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const user = req.user as any;

    if (!name) {
      return res.status(400).json({ error: 'Name is required for the API Key' });
    }

    // Generate a secure random key
    const rawKey = `precios_rd_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = await bcrypt.hash(rawKey, 10);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key: hashedKey,
        userId: user.id,
      },
    });

    // We only show the raw key once
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      note: 'Save this key now. It will not be shown again.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

export const listApiKeys = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, createdAt: true }
    });
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;

    await prisma.apiKey.delete({
      where: { id, userId: user.id }
    });

    res.json({ message: 'API Key deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};
