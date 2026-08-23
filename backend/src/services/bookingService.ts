import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { generateBookingRef } from '../utils/bookingRef';
import { generateQrCodeDataUrl, generateQrCodeBuffer } from '../utils/qr';
import { sendMail } from '../utils/email';
import { cancelSeatRelease } from '../jobs/queues';
import { emitSeatUpdate } from '../sockets/io';
import { offerSeatToNextInWaitlist, fulfillWaitlistOffer } from './waitlistService';

/**
 * Confirms a booking from a set of seats the customer currently holds
 * (either via a normal hold, or via a waitlist offer hold).
 *
 * Correctness relies on the seat already being in HELD status, owned by
 * this customer/session — the hold step already applied the concurrency
 * protection, so this step just does an atomic HELD -> BOOKED transition.
 */
export async function confirmBooking(eventId: string, seatIds: string[], sessionId: string, customerId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { pricing: true } });
  if (!event) throw new AppError('Event not found', 404);

  const showSeats = await prisma.showSeat.findMany({
    where: { eventId, seatId: { in: seatIds } },
    include: { seat: true, seatHold: true },
  });

  if (showSeats.length !== seatIds.length) {
    throw new AppError('One or more seats do not belong to this event', 400);
  }

  for (const ss of showSeats) {
    if (ss.status !== 'HELD') {
      throw new AppError(`Seat ${ss.seat.label} is not currently held and cannot be booked`, 409);
    }
    const isOwnHold = ss.seatHold && ss.seatHold.customerId === customerId && ss.seatHold.sessionId === sessionId;
    const isWaitlistOffer = !ss.seatHold; // waitlist-offered seats don't have a SeatHold row
    if (!isOwnHold && !isWaitlistOffer) {
      throw new AppError(`Seat ${ss.seat.label} is held by another session`, 409);
    }
  }

  const priceByCategory = new Map(event.pricing.map((p) => [p.category, Number(p.price)]));
  for (const ss of showSeats) {
    if (!priceByCategory.has(ss.seat.category)) {
      throw new AppError(`No price configured for category ${ss.seat.category}`, 500);
    }
  }

  const bookingRef = generateBookingRef();
  const totalAmount = showSeats.reduce((sum, ss) => sum + priceByCategory.get(ss.seat.category)!, 0);

  const booking = await prisma.$transaction(async (tx) => {
    // Atomic CAS: HELD -> BOOKED, only succeeds for seats still HELD
    for (const ss of showSeats) {
      const updated = await tx.showSeat.updateMany({
        where: { id: ss.id, status: 'HELD' },
        data: { status: 'BOOKED', heldUntil: null, version: { increment: 1 } },
      });
      if (updated.count === 0) {
        throw new AppError(`Seat ${ss.seat.label} was booked by someone else, please retry`, 409);
      }
    }

    // Remove hold records since the seat is now booked, not held
    await tx.seatHold.deleteMany({ where: { showSeatId: { in: showSeats.map((s) => s.id) } } });

    const created = await tx.booking.create({
      data: {
        bookingRef,
        eventId,
        customerId,
        totalAmount,
        seats: {
          create: showSeats.map((ss) => ({
            showSeatId: ss.id,
            category: ss.seat.category,
            price: priceByCategory.get(ss.seat.category)!,
          })),
        },
      },
      include: { seats: { include: { showSeat: { include: { seat: true } } } }, event: { include: { venue: true } } },
    });

    return created;
  });

  // Cancel any pending auto-release jobs for these seats (booking succeeded)
  await Promise.all(showSeats.map((ss) => cancelSeatRelease(ss.id)));

  // If any of these seats were fulfilled via a waitlist offer, mark it fulfilled
  await Promise.all(showSeats.map((ss) => fulfillWaitlistOffer(customerId, ss.id)));

  emitSeatUpdate(
    eventId,
    showSeats.map((ss) => ({ showSeatId: ss.id, status: 'BOOKED', heldUntil: null }))
  );

  await sendConfirmationEmail(booking);

  return booking;
}

async function sendConfirmationEmail(booking: any) {
  const customer = await prisma.user.findUnique({ where: { id: booking.customerId } });
  if (!customer) return;

  const qrDataUrl = await generateQrCodeDataUrl(booking.bookingRef);
  const qrBuffer = await generateQrCodeBuffer(booking.bookingRef);

  await prisma.booking.update({ where: { id: booking.id }, data: { qrCodeData: qrDataUrl } });

  const seatLabels = booking.seats.map((s: any) => s.showSeat.seat.label).join(', ');

  await sendMail(
    customer.email,
    `Booking Confirmed: ${booking.event.title} (${booking.bookingRef})`,
    `<h2>Booking Confirmed!</h2>
     <p>Hi ${customer.name},</p>
     <p><strong>${booking.event.title}</strong> at ${booking.event.venue.name}</p>
     <p>Date: ${new Date(booking.event.date).toDateString()} · Time: ${booking.event.startTime}</p>
     <p>Seats: ${seatLabels}</p>
     <p>Booking Reference: <strong>${booking.bookingRef}</strong></p>
     <p>Total: $${Number(booking.totalAmount).toFixed(2)}</p>
     <p>Your QR ticket is attached. Present it at entry.</p>`,
    [{ filename: `ticket-${booking.bookingRef}.png`, content: qrBuffer, cid: 'qrcode' }]
  );
}

export async function cancelBooking(bookingId: string, customerId: string, isAdmin = false) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { seats: { include: { showSeat: true } } },
  });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.customerId !== customerId && !isAdmin) throw new AppError('Not authorized to cancel this booking', 403);
  if (booking.status === 'CANCELLED') throw new AppError('Booking already cancelled', 400);

  await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED', cancelledAt: new Date() } });

  // For each cancelled seat: offer it to the next person on the waitlist for
  // its category (or release it to AVAILABLE if nobody is waiting).
  for (const bs of booking.seats) {
    const seat = await prisma.seat.findUnique({ where: { id: bs.showSeat.seatId } });
    if (!seat) continue;
    await offerSeatToNextInWaitlist(booking.eventId, bs.showSeatId, seat.category);
  }

  return prisma.booking.findUnique({ where: { id: bookingId } });
}

export async function listMyBookings(customerId: string) {
  return prisma.booking.findMany({
    where: { customerId },
    include: { event: { include: { venue: true } }, seats: { include: { showSeat: { include: { seat: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
}

/** Organiser/admin view: all bookings for a given event, with customer details. */
export async function listBookingsForEvent(eventId: string) {
  return prisma.booking.findMany({
    where: { eventId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      seats: { include: { showSeat: { include: { seat: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBooking(bookingId: string, customerId: string, isAdmin = false) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { event: { include: { venue: true } }, seats: { include: { showSeat: { include: { seat: true } } } } },
  });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.customerId !== customerId && !isAdmin) throw new AppError('Not authorized', 403);
  return booking;
}
