import { prisma } from '../utils/prisma';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { withLock, seatLockKey } from '../utils/lock';
import { scheduleWaitlistOfferExpiry, cancelWaitlistOfferExpiry } from '../jobs/queues';
import { emitSeatUpdate } from '../sockets/io';
import { sendMail } from '../utils/email';

export async function joinWaitlist(eventId: string, category: string, customerId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found', 404);

  const validCategory = await prisma.eventCategoryPrice.findUnique({
    where: { eventId_category: { eventId, category } },
  });
  if (!validCategory) throw new AppError(`Unknown category "${category}" for this event`, 400);

  const available = await prisma.showSeat.count({
    where: { eventId, status: 'AVAILABLE', seat: { category } },
  });
  if (available > 0) {
    throw new AppError('Seats are still available in this category; no need to join the waitlist', 400);
  }

  const existing = await prisma.waitlist.findFirst({
    where: { eventId, category, customerId, status: { in: ['WAITING', 'OFFERED'] } },
  });
  if (existing) throw new AppError('Already on the waitlist for this category', 409);

  return prisma.waitlist.create({ data: { eventId, category, customerId, status: 'WAITING' } });
}

/**
 * Called when a booking is cancelled and a seat becomes free. Finds the
 * next WAITING customer (FIFO by createdAt) for that seat's category and
 * makes them a time-limited offer, holding the seat for them in the
 * meantime. If no one is waiting, the seat is simply released to AVAILABLE.
 */
export async function offerSeatToNextInWaitlist(eventId: string, showSeatId: string, category: string) {
  await withLock(`lock:waitlist:${eventId}:${category}`, async () => {
    const next = await prisma.waitlist.findFirst({
      where: { eventId, category, status: 'WAITING' },
      orderBy: { createdAt: 'asc' },
    });

    if (!next) {
      // Nobody waiting — release seat normally
      await prisma.showSeat.updateMany({
        where: { id: showSeatId, status: { in: ['HELD', 'BOOKED'] } },
        data: { status: 'AVAILABLE', heldUntil: null, version: { increment: 1 } },
      });
      emitSeatUpdate(eventId, [{ showSeatId, status: 'AVAILABLE', heldUntil: null }]);
      return;
    }

    const ttlSeconds = config.waitlistOfferTtlSeconds;
    const offerExpiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await prisma.$transaction(async (tx) => {
      // Hold the specific seat for the offered customer (not a generic customer hold —
      // tie it to the waitlist offer so only they can complete it)
      await tx.showSeat.update({
        where: { id: showSeatId },
        data: { status: 'HELD', heldUntil: offerExpiresAt, version: { increment: 1 } },
      });
      await tx.waitlist.update({
        where: { id: next.id },
        data: { status: 'OFFERED', offeredShowSeatId: showSeatId, offerExpiresAt },
      });
    });

    await scheduleWaitlistOfferExpiry({ waitlistId: next.id }, ttlSeconds * 1000);
    emitSeatUpdate(eventId, [{ showSeatId, status: 'HELD', heldUntil: offerExpiresAt }]);

    const customer = await prisma.user.findUnique({ where: { id: next.customerId } });
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (customer && event) {
      await sendMail(
        customer.email,
        `A seat opened up for ${event.title}!`,
        `<p>Hi ${customer.name},</p>
         <p>A ${category} seat for <strong>${event.title}</strong> is now available for you.
         You have <strong>${Math.round(ttlSeconds / 60)} minutes</strong> to complete your booking
         before it's offered to the next person in line.</p>
         <p>Log in and complete checkout now to secure it.</p>`
      );
    }
  });
}

/** Called by the BullMQ worker when a waitlist offer's TTL expires without being completed. */
export async function expireWaitlistOffer(waitlistId: string) {
  const wl = await prisma.waitlist.findUnique({ where: { id: waitlistId } });
  if (!wl || wl.status !== 'OFFERED' || !wl.offeredShowSeatId) return;

  // Guard against racing a just-completed booking
  if (wl.offerExpiresAt && wl.offerExpiresAt.getTime() > Date.now()) return;

  const showSeat = await prisma.showSeat.findUnique({ where: { id: wl.offeredShowSeatId } });
  if (!showSeat) return;

  await prisma.waitlist.update({ where: { id: wl.id }, data: { status: 'EXPIRED' } });

  // Cascade: offer to the next person in line for the same category
  await offerSeatToNextInWaitlist(wl.eventId, showSeat.id, wl.category);
}

/** Marks a waitlist entry fulfilled once the offered booking is completed. */
export async function fulfillWaitlistOffer(customerId: string, showSeatId: string) {
  const wl = await prisma.waitlist.findFirst({
    where: { customerId, offeredShowSeatId: showSeatId, status: 'OFFERED' },
  });
  if (wl) {
    await prisma.waitlist.update({ where: { id: wl.id }, data: { status: 'FULFILLED' } });
    await cancelWaitlistOfferExpiry(wl.id);
  }
  return wl;
}

export async function listMyWaitlistEntries(customerId: string) {
  const entries = await prisma.waitlist.findMany({
    where: { customerId },
    include: { event: { include: { venue: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Attach the physical seatId for OFFERED entries so the client can go
  // straight to checkout without a separate hold step (the seat is already
  // held for this customer by the offer).
  const withSeatId = await Promise.all(
    entries.map(async (e) => {
      if (e.status === 'OFFERED' && e.offeredShowSeatId) {
        const showSeat = await prisma.showSeat.findUnique({ where: { id: e.offeredShowSeatId } });
        return { ...e, offeredSeatId: showSeat?.seatId };
      }
      return { ...e, offeredSeatId: null };
    })
  );

  return withSeatId;
}
