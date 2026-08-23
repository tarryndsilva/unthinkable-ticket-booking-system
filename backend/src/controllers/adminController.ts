import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
}

const roleSchema = z.object({ role: z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN']) });

export async function updateUserRole(req: Request, res: Response) {
  const data = roleSchema.parse(req.body);
  if (req.params.id === req.user!.userId && data.role !== 'ADMIN') {
    throw new AppError('You cannot remove your own admin access', 400);
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role: data.role },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json(user);
}

export async function listEventsForModeration(_req: Request, res: Response) {
  const events = await prisma.event.findMany({
    include: {
      venue: true,
      organiser: { select: { id: true, name: true, email: true } },
      _count: { select: { showSeats: true, bookings: true } },
    },
    orderBy: { date: 'asc' },
  });
  res.json(events);
}

/** Removes an event listing entirely — only allowed when it has no bookings on record. */
export async function removeEventListing(req: Request, res: Response) {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { bookings: true } } },
  });
  if (!event) throw new AppError('Event not found', 404);
  if (event._count.bookings > 0) {
    throw new AppError('Cannot remove a listing that has bookings — cancel all bookings first', 409);
  }

  await prisma.$transaction([
    prisma.waitlist.deleteMany({ where: { eventId: event.id } }),
    prisma.showSeat.deleteMany({ where: { eventId: event.id } }),
    prisma.eventCategoryPrice.deleteMany({ where: { eventId: event.id } }),
    prisma.event.delete({ where: { id: event.id } }),
  ]);

  res.status(204).send();
}
