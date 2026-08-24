import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { registerSchema, loginSchema } from '../utils/schemas';
import { AppError } from '../middleware/errorHandler';

export async function register(req: Request, res: Response) {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const hashed = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role || 'CUSTOMER',
    },
  });

  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function login(req: Request, res: Response) {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) throw new AppError('User not found', 404);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(6).max(100).optional(),
});

export async function updateProfile(req: Request, res: Response) {
  const data = updateProfileSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) throw new AppError('User not found', 404);

  const updates: { name?: string; email?: string; password?: string } = {};

  if (data.name) updates.name = data.name;

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already in use', 409);
    updates.email = data.email;
  }

  if (data.newPassword) {
    if (!data.currentPassword) throw new AppError('Current password is required to set a new password', 400);
    const valid = await bcrypt.compare(data.currentPassword, user.password);
    if (!valid) throw new AppError('Current password is incorrect', 401);
    updates.password = await bcrypt.hash(data.newPassword, 10);
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: updates });
  res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role });
}
