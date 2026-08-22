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
  // eslint-disable-next-line no-console
  console.error('[unhandled error]', err);
  return res.status(500).json({ error: 'Internal server error' });
}
