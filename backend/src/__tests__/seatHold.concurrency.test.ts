import { prisma } from '../utils/prisma';
import { holdSeat, releaseSeatHold } from '../services/seatHoldService';
import bcrypt from 'bcryptjs';
import { redis } from '../utils/redis';
import { seatReleaseQueue, waitlistOfferQueue } from '../jobs/queues';

/**
 * These tests require a running Postgres + Redis instance reachable via
 * DATABASE_URL / REDIS_URL (see backend/.env.example). Run:
 *   docker compose up -d db redis
 *   npx prisma migrate deploy
 *   npm test
 */

let venueId: string;
let eventId: string;
let seatId: string;
let customerAId: string;
let customerBId: string;

beforeAll(async () => {
  const password = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.create({ data: { name: 'Admin', email: `admin-${Date.now()}@t.com`, password, role: 'ADMIN' } });
  const organiser = await prisma.user.create({ data: { name: 'Org', email: `org-${Date.now()}@t.com`, password, role: 'ORGANISER' } });
  const custA = await prisma.user.create({ data: { name: 'Cust A', email: `a-${Date.now()}@t.com`, password, role: 'CUSTOMER' } });
  const custB = await prisma.user.create({ data: { name: 'Cust B', email: `b-${Date.now()}@t.com`, password, role: 'CUSTOMER' } });
  customerAId = custA.id;
  customerBId = custB.id;

  const venue = await prisma.venue.create({
    data: {
      name: 'Test Venue',
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
      title: 'Concurrency Test Event',
      type: 'MOVIE',
      venueId,
      organiserId: organiser.id,
      date: new Date(),
      startTime: '18:00',
      pricing: { create: [{ category: 'Standard', price: 10 }] },
    },
  });
  eventId = event.id;

  await prisma.showSeat.create({ data: { eventId, seatId } });
});

afterAll(async () => {
  await seatReleaseQueue.close();
  await waitlistOfferQueue.close();
  await prisma.showSeat.deleteMany({ where: { eventId } });
  await prisma.eventCategoryPrice.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } });
  await prisma.seat.deleteMany({ where: { venueId } });
  await prisma.venue.delete({ where: { id: venueId } });
  await prisma.user.deleteMany({ where: { id: { in: [customerAId, customerBId] } } });
  await prisma.$disconnect();
  await redis.quit();
});

test('two customers holding the same seat simultaneously: exactly one succeeds', async () => {
  const results = await Promise.allSettled([
    holdSeat(eventId, seatId, customerAId, 'session-a'),
    holdSeat(eventId, seatId, customerBId, 'session-b'),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  expect(fulfilled.length).toBe(1);
  expect(rejected.length).toBe(1);

  const showSeat = await prisma.showSeat.findUnique({ where: { eventId_seatId: { eventId, seatId } } });
  expect(showSeat?.status).toBe('HELD');

  const holds = await prisma.seatHold.findMany({ where: { showSeatId: showSeat!.id } });
  expect(holds.length).toBe(1);
});

test('releasing a held seat makes it available again for another customer', async () => {
  await releaseSeatHold(eventId, seatId);
  const showSeat = await prisma.showSeat.findUnique({ where: { eventId_seatId: { eventId, seatId } } });
  expect(showSeat?.status).toBe('AVAILABLE');

  const hold = await holdSeat(eventId, seatId, customerBId, 'session-b2');
  expect(hold).toBeTruthy();
  await releaseSeatHold(eventId, seatId);
});

test('ten simultaneous hold attempts on one seat: exactly one wins', async () => {
  const attempts = Array.from({ length: 10 }, (_, i) =>
    holdSeat(eventId, seatId, i % 2 === 0 ? customerAId : customerBId, `burst-${i}`)
  );
  const results = await Promise.allSettled(attempts);
  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  expect(fulfilled.length).toBe(1);

  await releaseSeatHold(eventId, seatId);
});
