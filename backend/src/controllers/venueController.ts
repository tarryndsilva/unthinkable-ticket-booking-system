import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { venueSchema } from '../utils/schemas';
import { AppError } from '../middleware/errorHandler';

export async function createVenue(req: Request, res: Response) {
  const data = venueSchema.parse(req.body);

  // Guard against duplicate (row, column) pairs in the payload itself
  const seen = new Set<string>();
  for (const s of data.seats) {
    const key = `${s.row}-${s.column}`;
    if (seen.has(key)) {
      throw new AppError(`Duplicate seat position in payload: row ${s.row}, column ${s.column}`, 400);
    }
    seen.add(key);
  }

  const venue = await prisma.venue.create({
    data: {
      name: data.name,
      address: data.address,
      adminId: req.user!.userId,
      seats: {
        create: data.seats.map((s) => ({
          row: s.row,
          column: s.column,
          category: s.category,
          label: `${s.row}${s.column}`,
        })),
      },
    },
    include: { seats: true },
  });

  res.status(201).json(venue);
}

export async function listVenues(req: Request, res: Response) {
  const venues = await prisma.venue.findMany({
    where: req.user!.role === 'ADMIN' ? { adminId: req.user!.userId } : undefined,
    include: { _count: { select: { seats: true } } },
  });
  res.json(venues);
}

export async function getVenue(req: Request, res: Response) {
  const venue = await prisma.venue.findUnique({
    where: { id: req.params.id },
    include: { seats: true },
  });
  if (!venue) throw new AppError('Venue not found', 404);
  res.json(venue);
}
