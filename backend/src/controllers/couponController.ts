import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const createCouponSchema = z.object({
  code: z.string().min(3).max(30),
  percentOff: z.number().int().min(1).max(90),
  maxRedemptions: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

const validateSchema = z.object({ code: z.string().min(1) });

export async function validateCoupon(req: Request, res: Response) {
  const data = validateSchema.parse(req.body);
  const coupon = await prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } });

  if (!coupon || !coupon.active) throw new AppError('Invalid coupon code', 404);
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new AppError('This coupon has expired', 400);
  }
  if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions) {
    throw new AppError('This coupon has reached its redemption limit', 400);
  }

  res.json({ code: coupon.code, percentOff: coupon.percentOff });
}

export async function listCoupons(_req: Request, res: Response) {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(coupons);
}

export async function createCoupon(req: Request, res: Response) {
  const data = createCouponSchema.parse(req.body);
  const coupon = await prisma.coupon.create({
    data: {
      code: data.code.toUpperCase(),
      percentOff: data.percentOff,
      maxRedemptions: data.maxRedemptions,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });
  res.status(201).json(coupon);
}

export async function deactivateCoupon(req: Request, res: Response) {
  const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data: { active: false } });
  res.json(coupon);
}
