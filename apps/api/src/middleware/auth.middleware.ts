// apps/api/src/middleware/auth.middleware.ts

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser, UserRole } from '@/types/userTypes.js';
import { errorResponse, capitalizeRole } from '@/types/userTypes.js';
import UserRepository from '@repositories/userRepository.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// ── NEON AUTH CONFIG ─────────────────────────────────────────────────────────
// ⚠️ CONFIGURE: Add NEON_AUTH_BASE_URL to apps/api/.env
const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL ?? '';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const getJWKS = (): ReturnType<typeof createRemoteJWKSet> => {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${NEON_AUTH_BASE_URL}/.well-known/jwks.json`)
    );
  }
  return jwks;
};
// ─────────────────────────────────────────────────────────────────────────────

// Extend Express Request so TypeScript knows about req.user everywhere
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ---------------------------------------------------------------------------
// authenticate middleware
// ---------------------------------------------------------------------------

/**
 * Validates the Neon Auth session token and enforces the deactivated account check.
 *
 * Flow:
 *  1. TEST MODE guard — allows integration tests to inject synthetic users via
 *     X-Test-User-* headers without hitting the Neon Auth API.
 *  2. Extract Bearer token from Authorization header → 401 if missing.
 *  3. Validate token via Neon Auth JWKS → 401 if invalid/expired.
 *  4. Enforce deactivated account check → 403 if banned (via DB lookup).
 *  5. Attach req.user = { userId, email, role } and call next().
 *
 * Response envelopes:
 *   401 { success: false, error: 'Authentication required' }
 *   403 { success: false, error: 'Your account has been deactivated' }
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // ── TEST MODE: allow integration tests to inject a synthetic user ──────────
  // Tests mock this module via jest.unstable_mockModule(), so this branch is
  // only reached in integration tests that deliberately skip the mock.
  if (process.env.NODE_ENV === 'test') {
    const userId = req.headers['x-test-user-id'] as string | undefined;
    const email = req.headers['x-test-user-email'] as string | undefined;
    const role = req.headers['x-test-user-role'] as string | undefined;

    if (userId && email && role) {
      req.user = { userId, email, role };
      next();
      return;
    }

    res.status(401).json(errorResponse('Authentication required'));
    return;
  }

  // ── PRODUCTION: validate via Neon Auth ────────────────────────────────────

  // 1. Extract Bearer token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json(errorResponse('Authentication required'));
    return;
  }

  // 2. Validate token with Neon Auth JWKS locally
  let payload;
  try {
    const result = await jwtVerify(token, getJWKS(), {
      issuer: new URL(NEON_AUTH_BASE_URL).origin,
      audience: new URL(NEON_AUTH_BASE_URL).origin,
    });
    payload = result.payload;
  } catch {
    res.status(401).json(errorResponse('Authentication required'));
    return;
  }

  const userId = payload.sub as string;

  // 3. Fetch DB record and enforce deactivated account check
  const dbUser = await UserRepository.findById(userId);

  if (!dbUser) {
    res.status(401).json(errorResponse('Authentication required'));
    return;
  }

  if (dbUser.banned === true) {
    res.status(403).json(errorResponse('Your account has been deactivated'));
    return;
  }

  // 4. Attach req.user
  const role = capitalizeRole(dbUser.role);

  req.user = {
    userId: dbUser.id,
    email: dbUser.email,
    role: role,
  };

  next();
};
