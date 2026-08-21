import { CookieOptions } from 'express';
import { CONSTANTS } from '../config/constants';

// ─── Parse JWT expiry string to milliseconds ──────────────────────────────────

/**
 * Converts a JWT expiry string (e.g. "4h", "7d", "30m") to milliseconds.
 * Used to keep cookie maxAge in sync with JWT expiry.
 */
export function parseJwtExpiryMs(expiresIn: string): number {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  if (isNaN(value)) return 4 * 60 * 60 * 1000; // fallback: 4h

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default:  return 4 * 60 * 60 * 1000;
  }
}

// ─── Auth Cookie Options ──────────────────────────────────────────────────────

export const AUTH_COOKIE_NAME = CONSTANTS.JWT_COOKIE_NAME; // 'auth_token'

export function getAuthCookieOptions(expiresInMs: number): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,                          // Never accessible via JS
    secure: isProduction,                    // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    maxAge: expiresInMs,                     // Milliseconds
    path: '/',                               // Available on all paths
  };
}

export function getClearCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };
}
