import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.CRON_SECRET;

if (!SESSION_SECRET) {
  console.error('[Session] FATAL: No SESSION_SECRET or CRON_SECRET configured. Sessions are insecure.');
}

/**
 * Signs a session value with HMAC-SHA256
 */
export function signSession(value: string): string {
  const secret = SESSION_SECRET || 'fallback-insecure-secret';
  const signature = createHmac('sha256', secret)
    .update(value)
    .digest('hex');
  return `${value}.${signature}`;
}

/**
 * Verifies a signed session value
 * Returns the original value if valid, null if invalid
 */
export function verifySession(signed: string): string | null {
  const dotIndex = signed.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const value = signed.substring(0, dotIndex);
  const signature = signed.substring(dotIndex + 1);

  const secret = SESSION_SECRET || 'fallback-insecure-secret';
  const expected = createHmac('sha256', secret)
    .update(value)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    
    if (sigBuffer.length !== expectedBuffer.length) return null;
    
    if (timingSafeEqual(sigBuffer, expectedBuffer)) {
      return value;
    }
  } catch {
    return null;
  }

  return null;
}
