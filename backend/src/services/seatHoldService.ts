import { prisma } from '../utils/prisma';
import { withLock, seatLockKey } from '../utils/lock';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { scheduleSeatRelease, cancelSeatRelease } from '../jobs/queues';
import { emitSeatUpdate } from '../sockets/io';

/**
 * Attempts to hold a single seat for a customer.
 *
 * Concurrency strategy (two layers):
 *  1. Redis distributed lock keyed by (eventId, seatId) serializes concurrent
 *     attempts on the SAME seat so only one request proceeds at a time.
 *  2. Inside the lock, the DB update is still conditioned on
 *     status = AVAILABLE (a compare-and-swap via Prisma's updateMany), so
 *     even if the lock layer were ever bypassed, the DB is the source of
 *     truth and a stale read cannot win.
 *
 * Returns the created SeatHold record, or throws AppError if the seat is
 * unavailable.
 */
export async function holdSeat(eventId: string, seatId: string, customerId: string, sessionId: string) {
  return withLock(seatLockKey(eventId, seatId), async () => {
    const showSeat = await prisma.showSeat.findUnique({ where: { eventId_seatId: { eventId, seatId } } });
    if (!showSeat) throw new AppError('Seat does not belong to this event', 404);

    const ttlSeconds = config.seatHoldTtlSeconds;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // Compare-and-swap: only succeeds if seat is currently AVAILABLE
      const updated = await tx.showSeat.updateMany({
        where: { id: showSeat.id, status: 'AVAILABLE' },
        data: { status: 'HELD', heldUntil: expiresAt, version: { increment: 1 } },
      });

      if (updated.count === 0) {
        throw new AppError('Seat is no longer available', 409);
      }

      const hold = await tx.seatHold.create({
        data: {
          showSeatId: showSeat.id,
          customerId,
          sessionId,
          expiresAt,
        },
      });

      return hold;
    });

    await scheduleSeatRelease({ showSeatId: showSeat.id, holdId: result.id }, ttlSeconds * 1000);
    emitSeatUpdate(eventId, [{ showSeatId: showSeat.id, status: 'HELD', heldUntil: expiresAt }]);

    return result;
  });
}

/**
 * Holds multiple seats for a customer as a single logical action. Seats are
 * locked one at a time (in a stable sorted order to avoid deadlocks between
 * two multi-seat requests), and if any seat fails, all seats acquired so far
 * in this call are rolled back.
 */
export async function holdSeats(eventId: string, seatIds: string[], customerId: string, sessionId: string) {
  const sortedSeatIds = [...seatIds].sort();
  const acquired: string[] = [];

  try {
    for (const seatId of sortedSeatIds) {
      await holdSeat(eventId, seatId, customerId, sessionId);
      acquired.push(seatId);
    }
  } catch (err) {
    // Roll back any seats already held in this request
    for (const seatId of acquired) {
      await releaseSeatHold(eventId, seatId).catch(() => {
        /* best effort rollback */
      });
    }
    throw err;
  }

  return prisma.seatHold.findMany({
    where: { sessionId, customerId, showSeat: { eventId, seatId: { in: seatIds } } },
    include: { showSeat: { include: { seat: true } } },
  });
}

/**
 * Releases a held seat back to AVAILABLE. Used for: checkout abandonment
 * (called by the scheduled job on TTL expiry), explicit cancellation of a
 * hold, or rollback of a partially-held multi-seat request.
 */
export async function releaseSeatHold(eventId: string, seatId: string) {
  return withLock(seatLockKey(eventId, seatId), async () => {
    const showSeat = await prisma.showSeat.findUnique({ where: { eventId_seatId: { eventId, seatId } } });
    if (!showSeat) return;

    await prisma.$transaction(async (tx) => {
      const hold = await tx.seatHold.findUnique({ where: { showSeatId: showSeat.id } });
      if (hold) {
        await tx.seatHold.delete({ where: { id: hold.id } });
      }
      await tx.showSeat.updateMany({
        where: { id: showSeat.id, status: 'HELD' },
        data: { status: 'AVAILABLE', heldUntil: null, version: { increment: 1 } },
      });
    });

    await cancelSeatRelease(showSeat.id);
    emitSeatUpdate(eventId, [{ showSeatId: showSeat.id, status: 'AVAILABLE', heldUntil: null }]);
  });
}

/** Called by the BullMQ worker when a hold's TTL expires (checkout abandonment). */
export async function autoReleaseExpiredHold(showSeatId: string) {
  const showSeat = await prisma.showSeat.findUnique({ where: { id: showSeatId } });
  if (!showSeat || showSeat.status !== 'HELD') return; // already booked or released

  const hold = await prisma.seatHold.findUnique({ where: { showSeatId } });
  // Guard: only release if the hold actually expired (avoids racing a fresh hold)
  if (hold && hold.expiresAt.getTime() > Date.now()) return;

  await releaseSeatHold(showSeat.eventId, showSeat.seatId);
}
