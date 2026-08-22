import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { eventSchema } from '../utils/schemas';
import { AppError } from '../middleware/errorHandler';

export async function createEvent(req: Request, res: Response) {
  const data = eventSchema.parse(req.body);

  const venue = await prisma.venue.findUnique({ where: { id: data.venueId }, include: { seats: true } });
  if (!venue) throw new AppError('Venue not found', 404);

  const venueCategories = new Set(venue.seats.map((s) => s.category));
  for (const p of data.pricing) {
    if (!venueCategories.has(p.category)) {
      throw new AppError(`Pricing references unknown category "${p.category}" for this venue`, 400);
    }
  }

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        title: data.title,
        type: data.type,
        venueId: data.venueId,
        organiserId: req.user!.userId,
        date: new Date(data.date),
        startTime: data.startTime,
        pricing: { create: data.pricing.map((p) => ({ category: p.category, price: p.price })) },
      },
    });

    // Materialize a ShowSeat row per venue seat for this event (AVAILABLE by default)
    await tx.showSeat.createMany({
      data: venue.seats.map((seat) => ({ eventId: created.id, seatId: seat.id })),
    });

    return created;
  });

  res.status(201).json(event);
}

export async function listEvents(req: Request, res: Response) {
  const { type, from, to } = req.query;
  const events = await prisma.event.findMany({
    where: {
      type: type ? (type as any) : undefined,
      date: {
        gte: from ? new Date(from as string) : undefined,
        lte: to ? new Date(to as string) : undefined,
      },
    },
    include: { venue: true, pricing: true },
    orderBy: { date: 'asc' },
  });
  res.json(events);
}

export async function getEvent(req: Request, res: Response) {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { venue: true, pricing: true, organiser: { select: { id: true, name: true } } },
  });
  if (!event) throw new AppError('Event not found', 404);
  res.json(event);
}

// Visual seat map with live status for a given event/show
export async function getSeatMap(req: Request, res: Response) {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) throw new AppError('Event not found', 404);

  const showSeats = await prisma.showSeat.findMany({
    where: { eventId: req.params.id },
    include: { seat: true },
    orderBy: [{ seat: { row: 'asc' } }, { seat: { column: 'asc' } }],
  });

  res.json(
    showSeats.map((ss) => ({
      showSeatId: ss.id,
      seatId: ss.seatId,
      row: ss.seat.row,
      column: ss.seat.column,
      label: ss.seat.label,
      category: ss.seat.category,
      status: ss.status,
      heldUntil: ss.heldUntil,
    }))
  );
}

export async function eventRevenue(req: Request, res: Response) {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) throw new AppError('Event not found', 404);
  if (event.organiserId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    throw new AppError('Not authorized to view this event summary', 403);
  }

  const bookings = await prisma.booking.findMany({
    where: { eventId: req.params.id, status: 'CONFIRMED' },
    include: { seats: true },
  });

  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
  const seatsSold = bookings.reduce((sum, b) => sum + b.seats.length, 0);

  const byCategory: Record<string, { count: number; revenue: number }> = {};
  for (const b of bookings) {
    for (const s of b.seats) {
      byCategory[s.category] = byCategory[s.category] || { count: 0, revenue: 0 };
      byCategory[s.category].count += 1;
      byCategory[s.category].revenue += Number(s.price);
    }
  }

  res.json({ eventId: event.id, totalBookings: bookings.length, seatsSold, totalRevenue, byCategory });
}
