import { Request, Response } from 'express';
import { bookingSchema } from '../utils/schemas';
import { confirmBooking, cancelBooking, listMyBookings, getBooking, listBookingsForEvent } from '../services/bookingService';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export async function postBooking(req: Request, res: Response) {
  const data = bookingSchema.parse(req.body);
  const eventId = req.params.eventId;
  const booking = await confirmBooking(eventId, data.seatIds, data.sessionId, req.user!.userId);
  res.status(201).json(booking);
}

export async function getMyBookings(req: Request, res: Response) {
  const bookings = await listMyBookings(req.user!.userId);
  res.json(bookings);
}

export async function getBookingById(req: Request, res: Response) {
  const booking = await getBooking(req.params.id, req.user!.userId, req.user!.role === 'ADMIN');
  res.json(booking);
}

export async function deleteBooking(req: Request, res: Response) {
  const booking = await cancelBooking(req.params.id, req.user!.userId, req.user!.role === 'ADMIN');
  res.json(booking);
}

// ---- Organiser/admin: bookings for one of their events ----

export async function getBookingsForEvent(req: Request, res: Response) {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) throw new AppError('Event not found', 404);
  if (event.organiserId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    throw new AppError('Not authorized to view bookings for this event', 403);
  }
  const bookings = await listBookingsForEvent(req.params.id);
  res.json(bookings);
}

export async function organiserCancelBooking(req: Request, res: Response) {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
  if (!booking) throw new AppError('Booking not found', 404);
  const event = await prisma.event.findUnique({ where: { id: booking.eventId } });
  if (!event) throw new AppError('Event not found', 404);
  if (event.organiserId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    throw new AppError('Not authorized to cancel bookings for this event', 403);
  }
  const cancelled = await cancelBooking(req.params.bookingId, req.user!.userId, true);
  res.json(cancelled);
}
