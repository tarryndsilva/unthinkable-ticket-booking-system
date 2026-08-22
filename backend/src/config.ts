import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/ticket_booking'),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  seatHoldTtlSeconds: parseInt(process.env.SEAT_HOLD_TTL_SECONDS || '600', 10),
  waitlistOfferTtlSeconds: parseInt(process.env.WAITLIST_OFFER_TTL_SECONDS || '900', 10),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Ticket Booking <no-reply@ticketbooking.com>',
  },
};
