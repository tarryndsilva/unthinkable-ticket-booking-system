import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

  const existingVenue = await prisma.venue.findFirst({ where: { name: 'Grand Cinema Hall' } });
  const venue =
    existingVenue ||
    (await prisma.venue.create({
      data: {
        name: 'Grand Cinema Hall',
        address: '123 Main Street, Chennai',
        adminId: admin.id,
        seats: {
          create: (() => {
            const seats = [];
            const rows = ['A', 'B', 'C', 'D'];
            for (const row of rows) {
              for (let col = 1; col <= 8; col++) {
                seats.push({
                  row,
                  column: col,
                  label: `${row}${col}`,
                  category: row === 'A' || row === 'B' ? 'Premium' : 'Standard',
                });
              }
            }
            return seats;
          })(),
        },
      },
      include: { seats: true },
    }));

  const venueWithSeats = await prisma.venue.findUnique({ where: { id: venue.id }, include: { seats: true } });

  const existingEvent = await prisma.event.findFirst({ where: { title: 'Inception - IMAX Screening' } });
  if (!existingEvent && venueWithSeats) {
    const event = await prisma.event.create({
      data: {
        title: 'Inception - IMAX Screening',
        type: 'MOVIE',
        venueId: venue.id,
        organiserId: organiser.id,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        startTime: '19:30',
        pricing: {
          create: [
            { category: 'Premium', price: 15.0 },
            { category: 'Standard', price: 10.0 },
          ],
        },
      },
    });

    await prisma.showSeat.createMany({
      data: venueWithSeats.seats.map((seat) => ({ eventId: event.id, seatId: seat.id })),
    });

    console.log(`Seeded event ${event.id} with ${venueWithSeats.seats.length} seats`);
  }

  console.log('Seed complete. Login with admin@example.com / organiser@example.com / customer@example.com, password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
