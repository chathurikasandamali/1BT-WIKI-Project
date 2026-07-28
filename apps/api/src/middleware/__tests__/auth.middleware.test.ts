// apps/api/src/middleware/__tests__/auth.middleware.test.ts
//
// Unit tests for authenticate (A-01) and requireRole (A-02) middleware.
//
// Strategy:
//   1. Mock jose to simulate SDK responses.
//   2. Import middleware AFTER mocks are registered.
//   3. Use lightweight req/res/next fakes — no supertest (unit layer only).

import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import type { JWTVerifyResult, JWTPayload, JWK } from 'jose';

// ── 0. Mock dependencies ───────────
const mockFindById = jest.fn<
  (id: string) => Promise<{
    id?: string;
    email?: string;
    role?: string;
    banned?: boolean;
  } | null>
>();
jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    findById: mockFindById,
  },
}));

const mockCreateRemoteJWKSet =
  jest.fn<() => (protectedHeader?: any, token?: any) => Promise<JWK>>();
const mockJwtVerify =
  jest.fn<
    (
      jwt: string | Uint8Array,
      key: unknown,
      options?: unknown
    ) => Promise<JWTVerifyResult<JWTPayload>>
  >();

jest.unstable_mockModule('jose', () => ({
  createRemoteJWKSet: mockCreateRemoteJWKSet,
  jwtVerify: mockJwtVerify,
}));

process.env.NEON_AUTH_BASE_URL =
  'https://ep-green-breeze-aohz9nmm.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth';

// ── 1. Import middleware ───────────
const { authenticate } = await import('../auth.middleware.js');
const { requireRole } = await import('../rbac.middleware.js');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Minimal Express Request fake for unit tests. */
const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({
    headers: {},
    ...overrides,
  }) as unknown as import('express').Request;

/** Minimal Express Response fake — captures status and json calls. */
const makeRes = () => {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res as unknown as import('express').Response & {
    statusCode: number;
    body: unknown;
  };
};

const makeNext = () => jest.fn() as unknown as import('express').NextFunction;

/** A valid jose JWTVerifyResult payload. */
const makeJwtVerifyResult = (
  overrides: Record<string, unknown> = {}
): JWTVerifyResult<JWTPayload> => ({
  payload: {
    sub: 'user-abc',
    email: 'jwt-email@wrong.com', // To prove we ignore it
    role: 'authenticated', // To prove we ignore it
    ...overrides,
  },
  protectedHeader: { alg: 'RS256' },
});

// ---------------------------------------------------------------------------
// Tests — authenticate
// ---------------------------------------------------------------------------

describe('authenticate middleware', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindById.mockReset();
    mockCreateRemoteJWKSet.mockReset();
    mockJwtVerify.mockReset();
    // Override NODE_ENV so authenticate takes the production branch
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    // Restore NODE_ENV so other test suites are not affected.
    process.env.NODE_ENV = originalNodeEnv;
  });

  // ── a. Valid JWT + JWKS verification succeeds + DB user found ────────────

  it('calls next() and populates req.user from DB (ignoring JWT email/role claims)', async () => {
    // Arrange
    mockJwtVerify.mockResolvedValueOnce(makeJwtVerifyResult());
    mockFindById.mockResolvedValueOnce({
      id: 'user-abc',
      email: 'test@example.com',
      role: 'user',
      banned: false,
    });

    const req = makeReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = makeRes();
    const next = makeNext();

    // Act
    await authenticate(req, res, next);

    // Assert
    expect(mockJwtVerify).toHaveBeenCalledTimes(1);
    expect(mockFindById).toHaveBeenCalledTimes(1);
    expect(mockFindById).toHaveBeenCalledWith('user-abc');
    expect(next).toHaveBeenCalledTimes(1);
    // Explicitly assert req.user properties came from DB (test@example.com/User) and not the JWT (jwt-email@wrong.com/authenticated)
    expect(req.user).toEqual({
      userId: 'user-abc',
      email: 'test@example.com',
      role: 'User',
    });
  });

  // ── b. Regression test for the issuer bug ────────────────────────────────

  it('calls jwtVerify with issuer set to the origin, NOT the full path', async () => {
    // Arrange
    mockJwtVerify.mockResolvedValueOnce(makeJwtVerifyResult());
    mockFindById.mockResolvedValueOnce({
      id: 'user-abc',
      email: 'test@example.com',
      role: 'user',
      banned: false,
    });

    const req = makeReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = makeRes();
    const next = makeNext();

    // Act
    await authenticate(req, res, next);

    // Assert
    expect(mockJwtVerify).toHaveBeenCalledTimes(1);
    const options = mockJwtVerify.mock.calls[0][2] as { issuer?: string };

    // The exact regression test:
    const expectedOrigin = new URL(
      'https://ep-green-breeze-aohz9nmm.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth'
    ).origin;
    expect(options).toBeDefined();
    expect(options.issuer).toBe(expectedOrigin);
    // Write it so it fails if they use the raw string with the path
    expect(options.issuer).not.toBe(
      'https://ep-green-breeze-aohz9nmm.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth'
    );
  });

  // ── c. Missing Authorization header ──────────────────────────────────────

  it('returns 401 when Authorization header is missing', async () => {
    // Arrange
    const req = makeReq({ headers: {} });
    const res = makeRes();
    const next = makeNext();

    // Act
    await authenticate(req, res, next);

    // Assert
    expect(mockJwtVerify).not.toHaveBeenCalled();
    expect(mockFindById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect((res.body as { error: string }).error).toBe(
      'Authentication required'
    );
  });

  // ── d. jwtVerify throws (invalid/expired token) ──────────────────────────

  it('returns 401 when jwtVerify throws (invalid/expired token)', async () => {
    // Arrange
    mockJwtVerify.mockRejectedValueOnce(new Error('Invalid signature'));

    const req = makeReq({ headers: { authorization: 'Bearer bad-token' } });
    const res = makeRes();
    const next = makeNext();

    // Act
    await authenticate(req, res, next);

    // Assert
    expect(mockJwtVerify).toHaveBeenCalledTimes(1);
    expect(mockFindById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect((res.body as { error: string }).error).toBe(
      'Authentication required'
    );
  });

  // ── e. Valid JWT, mockFindById resolves null ─────────────────────────────

  it('returns 401 when user is not found in the database', async () => {
    // Arrange
    mockJwtVerify.mockResolvedValueOnce(makeJwtVerifyResult());
    mockFindById.mockResolvedValueOnce(null);

    const req = makeReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = makeRes();
    const next = makeNext();

    // Act
    await authenticate(req, res, next);

    // Assert
    expect(mockJwtVerify).toHaveBeenCalledTimes(1);
    expect(mockFindById).toHaveBeenCalledTimes(1);
    expect(mockFindById).toHaveBeenCalledWith('user-abc');
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect((res.body as { error: string }).error).toBe(
      'Authentication required'
    );
  });

  // ── f. Valid JWT, mockFindById resolves { banned: true } ─────────────────

  it('returns 403 when user.banned === true', async () => {
    // Arrange
    mockJwtVerify.mockResolvedValueOnce(makeJwtVerifyResult());
    mockFindById.mockResolvedValueOnce({ banned: true });

    const req = makeReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = makeRes();
    const next = makeNext();

    // Act
    await authenticate(req, res, next);

    // Assert
    expect(mockJwtVerify).toHaveBeenCalledTimes(1);
    expect(mockFindById).toHaveBeenCalledTimes(1);
    expect(mockFindById).toHaveBeenCalledWith('user-abc');
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect((res.body as { error: string }).error).toBe(
      'Your account has been deactivated'
    );
  });

  // ── g. Role capitalization ───────────────────────────────────────────────

  it('capitalizes roles from the database (admin -> Admin)', async () => {
    // Arrange
    mockJwtVerify.mockResolvedValueOnce(makeJwtVerifyResult());
    mockFindById.mockResolvedValueOnce({
      id: 'user-abc',
      email: 'test@example.com',
      role: 'admin',
      banned: false,
    });

    const req = makeReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = makeRes();
    const next = makeNext();

    // Act
    await authenticate(req, res, next);

    // Assert
    expect(mockJwtVerify).toHaveBeenCalledTimes(1);
    expect(mockFindById).toHaveBeenCalledTimes(1);
    expect(mockFindById).toHaveBeenCalledWith('user-abc');
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user?.role).toBe('Admin');
  });

  // ── h. NODE_ENV=test mode ────────────────────────────────────────────────

  it('allows integration tests to inject synthetic users via X-Test-User-* headers in test mode', async () => {
    // Arrange
    process.env.NODE_ENV = 'test';
    const req = makeReq({
      headers: {
        'x-test-user-id': 'test-id',
        'x-test-user-email': 'test-email@example.com',
        'x-test-user-role': 'Admin',
      },
    });
    const res = makeRes();
    const next = makeNext();

    // Act
    await authenticate(req, res, next);

    // Assert
    expect(mockJwtVerify).not.toHaveBeenCalled();
    expect(mockFindById).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      userId: 'test-id',
      email: 'test-email@example.com',
      role: 'Admin',
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — requireRole
// ---------------------------------------------------------------------------

describe('requireRole middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 7. Correct role → next() called ──────────────────────────────────────

  it('calls next() when user has a matching role', () => {
    // Arrange
    const req = makeReq({
      user: { userId: 'u1', email: 'a@b.com', role: 'Admin' },
    });
    const res = makeRes();
    const next = makeNext();

    // Act
    requireRole('Admin')(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(0); // no response sent
  });

  // ── 8. Wrong role → 403 ──────────────────────────────────────────────────

  it('returns 403 when user role is not in the allowed list', () => {
    // Arrange
    const req = makeReq({
      user: { userId: 'u1', email: 'a@b.com', role: 'User' },
    });
    const res = makeRes();
    const next = makeNext();

    // Act
    requireRole('Admin')(req, res, next);

    // Assert
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect((res.body as { error: string }).error).toBe(
      'Insufficient permissions'
    );
  });

  // ── 9. No req.user → 403 ─────────────────────────────────────────────────

  it('returns 403 when req.user is absent', () => {
    // Arrange
    const req = makeReq(); // no user property
    const res = makeRes();
    const next = makeNext();

    // Act
    requireRole('Admin')(req, res, next);

    // Assert
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect((res.body as { error: string }).error).toBe(
      'Insufficient permissions'
    );
  });
});
