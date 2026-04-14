import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

declare global { var __prisma: PrismaClient | undefined; }
const prisma: PrismaClient = global.__prisma ?? new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_key_change_me';

// Helper to sign token — includes plan so rate limiters can read it without a DB hit
const signToken = (user: { id: string; email: string; role: string; plan: string }) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, plan: user.plan },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'FREE',
        plan: 'FREE',
      },
    });

    const token = signToken(user);
    res.status(201).json({ user: { id: user.id, email: user.email, role: user.role, plan: user.plan }, token });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);
    res.json({ user: { id: user.id, email: user.email, role: user.role, plan: user.plan }, token });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  // User will be attached by passport middleware
  const user = req.user as any;
  res.json({ id: user.id, email: user.email, role: user.role, plan: user.plan });
};
