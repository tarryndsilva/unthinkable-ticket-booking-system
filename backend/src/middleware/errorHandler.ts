import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { LockError } from '../utils/lock';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.flatten() });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err instanceof LockError) {
    return res.status(409).json({ error: err.message });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'Resource already exists / conflict', meta: err.meta });
  }
  if (err?.code === 'P2021' || err?.code === 'P2022') {
    // Table or column referenced by Prisma doesn't exist in the actual database —
    // almost always means a migration hasn't been applied yet after a schema change.
    console.error('[schema mismatch]', err);
    return res.status(500).json({
      error: 'Database schema is out of date. Run `npx prisma migrate dev` (or `migrate deploy`) and restart the server.',
      code: err.code,
      meta: err.meta,
    });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  // eslint-disable-next-line no-console
  console.error('[unhandled error]', err);
  return res.status(500).json({ error: 'Internal server error' });
}
