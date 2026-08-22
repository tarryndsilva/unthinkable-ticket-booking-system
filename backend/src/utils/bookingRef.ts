import { randomBytes } from 'crypto';

/** Generates a human-friendly, unique-enough booking reference, e.g. "TB-9K3F7Q2A". */
export function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0,O,1,I)
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `TB-${code}`;
}
