import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { holdSeat } from '../services/seatHoldService';
import { confirmBooking } from '../services/bookingService';
import { redis } from '../utils/redis';
import { seatReleaseQueue, waitlistOfferQueue } from '../jobs/queues';

let venueId: string;
let eventId: string;
let seatIds: string[];
let customerAId: string;
let customerBId: string;
let couponCode: string;

beforeAll(async () => {
  const password = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.create({ data: { name: 'Admin', email: `admin-cp-${Date.now()}@t.com`, password, role: 'ADMIN' } });
  const organiser = await prisma.user.create({ data: { name: 'Org', email: `org-cp-${Date.now()}@t.com`, password, role: 'ORGANISER' } });
  const custA = await prisma.user.create({ data: { name: 'Cust A', email: `cpa-${Date.now()}@t.com`, password, role: 'CUSTOMER' } });
  const custB = await prisma.user.create({ data: { name: 'Cust B', email: `cpb-${Date.now()}@t.com`, password, role: 'CUSTOMER' } });
  customerAId = custA.id;
  customerBId = custB.id;

  const venue = await prisma.venue.create({
    data: {
      name: 'Coupon Test Venue',
      address: 'Somewhere',
      adminId: admin.id,
      seats: {
        create: [
          { row: 'A', column: 1, label: 'A1', category: 'Standard' },
          { row: 'A', column: 2, label: 'A2', category: 'Standard' },
        ],
      },
    },
    include: { seats: true },
  });
  venueId = venue.id;
  seatIds = venue.seats.map((s) => s.id);

  const event = await prisma.event.create({
    data: {
      title: 'Coupon Test Event',
      type: 'CONCERT',
      venueId,
      organiserId: organiser.id,
      date: new Date(),
      startTime: '19:00',
      pricing: { create: [{ category: 'Standard', price: 100 }] },
    },
  });
  eventId = event.id;
  await prisma.showSeat.createMany({ data: seatIds.map((seatId) => ({ eventId, seatId })) });

  couponCode = `TESTCOUPON${Date.now()}`;
  await prisma.coupon.create({ data: { code: couponCode, percentOff: 20, maxRedemptions: 1 } });
});

afterAll(async () => {
  await seatReleaseQueue.close();
  await waitlistOfferQueue.close();
  await prisma.bookingSeat.deleteMany({ where: { showSeat: { eventId } } });
  await prisma.booking.deleteMany({ where: { eventId } });
  await prisma.showSeat.deleteMany({ where: { eventId } });
  await prisma.eventCategoryPrice.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } });
  await prisma.seat.deleteMany({ where: { venueId } });
  await prisma.venue.delete({ where: { id: venueId } });
  await prisma.coupon.deleteMany({ where: { code: couponCode } });
  await prisma.user.deleteMany({ where: { id: { in: [customerAId, customerBId] } } });
  await prisma.$disconnect();
  await redis.quit();
});

test('a valid coupon discounts the booking total correctly', async () => {
  await holdSeat(eventId, seatIds[0], customerAId, 'coupon-session-a');
  const booking = await confirmBooking(eventId, [seatIds[0]], 'coupon-session-a', customerAId, couponCode);

  expect(Number(booking.totalAmount)).toBeCloseTo(80); // 100 - 20%
  expect(booking.couponCode).toBe(couponCode.toUpperCase());
  expect(Number(booking.discountAmount)).toBeCloseTo(20);
});

test('a coupon past its redemption limit is rejected on a second use', async () => {
  await holdSeat(eventId, seatIds[1], customerBId, 'coupon-session-b');
  await expect(confirmBooking(eventId, [seatIds[1]], 'coupon-session-b', customerBId, couponCode)).rejects.toThrow(
    /redemption limit/i
  );
});
