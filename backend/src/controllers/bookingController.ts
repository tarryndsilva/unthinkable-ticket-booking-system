import { Request, Response } from 'express';
import { bookingSchema } from '../utils/schemas';
import { confirmBooking, cancelBooking, listMyBookings, getBooking } from '../services/bookingService';

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
