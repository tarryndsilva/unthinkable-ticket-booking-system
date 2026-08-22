import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Reuse a single PrismaClient instance across hot reloads / tests to avoid
// exhausting the DB connection pool.
export const prisma = global.__prisma || new PrismaClient();

if (config_env() !== 'production') {
  global.__prisma = prisma;
}

function config_env() {
  return process.env.NODE_ENV;
}
