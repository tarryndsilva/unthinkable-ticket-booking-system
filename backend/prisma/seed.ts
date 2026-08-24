import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function makeSeats(rows: string[], seatsPerRow: number, premiumRows: string[]) {
  const seats = [];
  for (const row of rows) {
    for (let col = 1; col <= seatsPerRow; col++) {
      seats.push({
        row,
        column: col,
        label: `${row}${col}`,
        category: premiumRows.includes(row) ? 'Premium' : 'Standard',
      });
    }
  }
  return seats;
}

async function ensureVenue(
  name: string,
  address: string,
  city: string,
  adminId: string,
  rows: string[],
  seatsPerRow: number,
  premiumRows: string[]
) {
  const existing = await prisma.venue.findFirst({ where: { name } });
  if (existing) return prisma.venue.findUnique({ where: { id: existing.id }, include: { seats: true } });
  return prisma.venue.create({
    data: {
      name,
      address,
      city,
      adminId,
      seats: { create: makeSeats(rows, seatsPerRow, premiumRows) },
    },
    include: { seats: true },
  });
}

async function ensureEvent(
  title: string,
  type: 'MOVIE' | 'CONCERT',
  venue: { id: string; seats: { id: string; category: string }[] },
  organiserId: string,
  daysFromNow: number,
  startTime: string,
  premiumPrice: number,
  standardPrice: number
) {
  const existing = await prisma.event.findFirst({ where: { title } });
  if (existing) return;

  const event = await prisma.event.create({
    data: {
      title,
      type,
      venueId: venue.id,
      organiserId,
      date: new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000),
      startTime,
      pricing: {
        create: [
          { category: 'Premium', price: premiumPrice },
          { category: 'Standard', price: standardPrice },
        ],
      },
    },
  });

  await prisma.showSeat.createMany({
    data: venue.seats.map((seat) => ({ eventId: event.id, seatId: seat.id })),
  });

  console.log(`Seeded event "${title}" (${venue.seats.length} seats)`);
}

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'Venue Admin', email: 'admin@example.com', password, role: 'ADMIN' },
  });

  const organiser = await prisma.user.upsert({
    where: { email: 'organiser@example.com' },
    update: {},
    create: { name: 'Event Organiser', email: 'organiser@example.com', password, role: 'ORGANISER' },
  });

  await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: { name: 'Jane Customer', email: 'customer@example.com', password, role: 'CUSTOMER' },
  });

  const cinemaHall = await ensureVenue(
    'Grand Cinema Hall',
    '123 Main Street',
    'Chennai',
    admin.id,
    ['A', 'B', 'C', 'D', 'E', 'F'],
    10,
    ['A', 'B']
  );

  const arena = await ensureVenue(
    'Skyline Arena',
    '88 Riverside Boulevard',
    'Bengaluru',
    admin.id,
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    12,
    ['A', 'B', 'C']
  );

  const jazzClub = await ensureVenue(
    'The Blue Room Jazz Club',
    '17 Harbor Lane',
    'Mumbai',
    admin.id,
    ['A', 'B', 'C', 'D'],
    8,
    ['A']
  );

  if (cinemaHall) {
    await ensureEvent('Inception \u2014 IMAX Screening', 'MOVIE', cinemaHall, organiser.id, 7, '19:30', 15, 10);
    await ensureEvent('Dune: Part Two \u2014 Late Show', 'MOVIE', cinemaHall, organiser.id, 3, '22:00', 16, 11);
    await ensureEvent('Spirited Away \u2014 Anniversary Screening', 'MOVIE', cinemaHall, organiser.id, 12, '17:00', 14, 9);
    await ensureEvent('The Grand Budapest Hotel \u2014 Director\u2019s Cut', 'MOVIE', cinemaHall, organiser.id, 20, '20:15', 14, 9);
  }

  if (arena) {
    await ensureEvent('Neon Skyline World Tour', 'CONCERT', arena, organiser.id, 14, '20:00', 85, 45);
    await ensureEvent('Midnight Echoes Live', 'CONCERT', arena, organiser.id, 30, '19:00', 70, 38);
    await ensureEvent('Symphony Under the Stars', 'CONCERT', arena, organiser.id, 45, '18:30', 60, 32);
  }

  if (jazzClub) {
    await ensureEvent('Blue Note Sessions: Live Trio', 'CONCERT', jazzClub, organiser.id, 5, '21:00', 40, 25);
    await ensureEvent('Late Night Sax & Soul', 'CONCERT', jazzClub, organiser.id, 9, '21:30', 42, 26);
  }

  await prisma.coupon.upsert({
    where: { code: 'WELCOME20' },
    update: {},
    create: { code: 'WELCOME20', percentOff: 20, maxRedemptions: 100 },
  });
  await prisma.coupon.upsert({
    where: { code: 'FLASH10' },
    update: {},
    create: { code: 'FLASH10', percentOff: 10 },
  });

  console.log('\nSeed complete.');
  console.log('Login: admin@example.com / organiser@example.com / customer@example.com');
  console.log('Password: password123');
  console.log('Try coupon codes WELCOME20 (20% off) or FLASH10 (10% off) at checkout.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
