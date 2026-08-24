import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function listReviews(req: Request, res: Response) {
  const reviews = await prisma.review.findMany({
    where: { eventId: req.params.id },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  res.json({ reviews, avgRating, count: reviews.length });
}

export async function postReview(req: Request, res: Response) {
  const data = reviewSchema.parse(req.body);
  const eventId = req.params.id;
  const customerId = req.user!.userId;

  // Only customers who have a confirmed booking for this event may review it —
  // keeps reviews meaningful, same principle verified platforms like BookMyShow use.
  const hasBooking = await prisma.booking.findFirst({
    where: { eventId, customerId, status: 'CONFIRMED' },
  });
  if (!hasBooking) {
    throw new AppError('You can only review events you have a confirmed booking for', 403);
  }

  const existing = await prisma.review.findUnique({ where: { eventId_customerId: { eventId, customerId } } });
  if (existing) {
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: { rating: data.rating, comment: data.comment },
    });
    return res.json(updated);
  }

  const review = await prisma.review.create({
    data: { eventId, customerId, rating: data.rating, comment: data.comment },
  });
  res.status(201).json(review);
}
