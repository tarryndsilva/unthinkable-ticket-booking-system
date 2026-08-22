import { Request, Response } from 'express';
import { holdSeatsSchema } from '../utils/schemas';
import { holdSeats, releaseSeatHold } from '../services/seatHoldService';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';

export async function postHoldSeats(req: Request, res: Response) {
  const data = holdSeatsSchema.parse(req.body);
  const eventId = req.params.eventId;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found', 404);

  const holds = await holdSeats(eventId, data.seatIds, req.user!.userId, data.sessionId);
  res.status(201).json({
    holds: holds.map((h) => ({
      showSeatId: h.showSeatId,
      seatLabel: h.showSeat.seat.label,
      expiresAt: h.expiresAt,
    })),
  });
}

export async function deleteHoldSeat(req: Request, res: Response) {
  const { eventId, seatId } = req.params;
  await releaseSeatHold(eventId, seatId);
  res.status(204).send();
}
