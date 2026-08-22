import { randomUUID } from 'crypto';
import { redis } from './redis';

/**
 * Distributed lock using Redis SET NX PX (atomic acquire) and a Lua script
 * for safe release (only the owner can release its own lock).
 *
 * This is the first line of defense against two customers concurrently
 * holding/booking the same seat. A second line of defense (DB-level
 * conditional update / row lock) is applied inside the same operation so
 * correctness does not depend on Redis alone.
 */

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export class LockError extends Error {
  constructor(message = 'Could not acquire lock, resource is busy') {
    super(message);
    this.name = 'LockError';
  }
}

export async function acquireLock(
  key: string,
  ttlMs = 5000,
  retries = 10,
  retryDelayMs = 100
): Promise<string> {
  const token = randomUUID();
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await redis.set(key, token, 'PX', ttlMs, 'NX');
    if (result === 'OK') {
      return token;
    }
    await new Promise((res) => setTimeout(res, retryDelayMs));
  }
  throw new LockError(`Failed to acquire lock for ${key} after ${retries} retries`);
}

export async function releaseLock(key: string, token: string): Promise<void> {
  await redis.eval(RELEASE_SCRIPT, 1, key, token);
}

/**
 * Runs `fn` while holding a lock on `key`. Always releases the lock
 * afterward, even if `fn` throws.
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = 5000
): Promise<T> {
  const token = await acquireLock(key, ttlMs);
  try {
    return await fn();
  } finally {
    await releaseLock(key, token);
  }
}

export function seatLockKey(eventId: string, seatId: string): string {
  return `lock:seat:${eventId}:${seatId}`;
}
