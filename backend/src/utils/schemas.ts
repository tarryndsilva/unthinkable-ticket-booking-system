import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const venueSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  city: z.string().min(2).default('Chennai'),
  seats: z
    .array(
      z.object({
        row: z.string().min(1),
        column: z.number().int().positive(),
        category: z.string().min(1),
      })
    )
    .min(1),
});

export const eventSchema = z.object({
  title: z.string().min(2),
  type: z.enum(['MOVIE', 'CONCERT']),
  venueId: z.string().uuid(),
  date: z.string(), // ISO date
  startTime: z.string().min(1),
  pricing: z
    .array(
      z.object({
        category: z.string().min(1),
        price: z.number().positive(),
      })
    )
    .min(1),
});

export const holdSeatsSchema = z.object({
  seatIds: z.array(z.string().uuid()).min(1).max(10),
  sessionId: z.string().min(1),
});

export const bookingSchema = z.object({
  sessionId: z.string().min(1),
  seatIds: z.array(z.string().uuid()).min(1).max(10),
  couponCode: z.string().min(1).max(30).optional(),
});

export const waitlistJoinSchema = z.object({
  category: z.string().min(1),
});
