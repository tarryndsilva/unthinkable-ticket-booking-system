import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { holdSeat } from '../services/seatHoldService';
import { confirmBooking, cancelBooking } from '../services/bookingService';
import { joinWaitlist } from '../services/waitlistService';
import { redis } from '../utils/redis';
import { seatReleaseQueue, waitlistOfferQueue } from '../jobs/queues';

let venueId: string;
let eventId: string;
let seatId: string;
let buyerId: string;
let waiterId: string;

beforeAll(async () => {
  const password = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.create({ data: { name: 'Admin', email: `admin2-${Date.now()}@t.com`, password, role: 'ADMIN' } });
  const organiser = await prisma.user.create({ data: { name: 'Org', email: `org2-${Date.now()}@t.com`, password, role: 'ORGANISER' } });
  const buyer = await prisma.user.create({ data: { name: 'Buyer', email: `buyer-${Date.now()}@t.com`, password, role: 'CUSTOMER' } });
  const waiter = await prisma.user.create({ data: { name: 'Waiter', email: `waiter-${Date.now()}@t.com`, password, role: 'CUSTOMER' } });
  buyerId = buyer.id;
  waiterId = waiter.id;

  const venue = await prisma.venue.create({
    data: {
      name: 'Waitlist Test Venue',
      address: 'Somewhere',
      adminId: admin.id,
      seats: { create: [{ row: 'A', column: 1, label: 'A1', category: 'Standard' }] },
    },
    include: { seats: true },
  });
  venueId = venue.id;
  seatId = venue.seats[0].id;

  const event = await prisma.event.create({
    data: {
      title: 'Waitlist Test Event',
      type: 'CONCERT',
      venueId,
      organiserId: organiser.id,
      date: new Date(),
      startTime: '20:00',
      pricing: { create: [{ category: 'Standard', price: 25 }] },
    },
  });
  eventId = event.id;
  await prisma.showSeat.create({ data: { eventId, seatId } });
});

afterAll(async () => {
  await seatReleaseQueue.close();
  await waitlistOfferQueue.close();
  await prisma.bookingSeat.deleteMany({ where: { showSeat: { eventId } } });
  await prisma.booking.deleteMany({ where: { eventId } });
  await prisma.waitlist.deleteMany({ where: { eventId } });
  await prisma.showSeat.deleteMany({ where: { eventId } });
  await prisma.eventCategoryPrice.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } });
  await prisma.seat.deleteMany({ where: { venueId } });
  await prisma.venue.delete({ where: { id: venueId } });
  await prisma.user.deleteMany({ where: { id: { in: [buyerId, waiterId] } } });
  await prisma.$disconnect();
  await redis.quit();
});

test('waitlisted customer is offered the seat automatically when the booking is cancelled', async () => {
  // Buyer books the only seat
  await holdSeat(eventId, seatId, buyerId, 'buyer-session');
  const booking = await confirmBooking(eventId, [seatId], 'buyer-session', buyerId);
  expect(booking.status).toBe('CONFIRMED');

  // Now the seat category is sold out - waiter joins the waitlist
  const entry = await joinWaitlist(eventId, 'Standard', waiterId);
  expect(entry.status).toBe('WAITING');

  // Buyer cancels -> waiter should be auto-offered the seat
  await cancelBooking(booking.id, buyerId);

  const updatedEntry = await prisma.waitlist.findUnique({ where: { id: entry.id } });
  expect(updatedEntry?.status).toBe('OFFERED');
  expect(updatedEntry?.offeredShowSeatId).toBeTruthy();
  expect(updatedEntry?.offerExpiresAt).toBeTruthy();

  const showSeat = await prisma.showSeat.findUnique({ where: { eventId_seatId: { eventId, seatId } } });
  expect(showSeat?.status).toBe('HELD'); // held for the waiter's time-limited offer
});
