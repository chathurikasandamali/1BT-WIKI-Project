// apps/api/src/__tests__/integration/users.me.integration.test.ts
//
// Integration tests for GET /api/v1/users/me  (UP-01)
//
// Strategy:
//   1. Mock db/index.js before importing app (ESM hoisting requirement)
//   2. Mock auth.middleware.js so tests can simulate authenticated/unauthenticated
//      requests without a real JWT — the mock honours X-Test-User-* headers.
//   3. await appReady in beforeAll so all routes are mounted before any request.

import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from '@jest/globals';

// ── 1. Mock the DB pool — must come before app import ──────────────────────

// ── Mock Prisma DB from @repo/db ───────────────────────────────────────────
await jest.unstable_mockModule('@repo/db', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    article: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    articleAttachment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    review: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

await jest.unstable_mockModule('@/db/index.js', () => ({
  default: {
    query: jest
      .fn<() => Promise<{ rows: unknown[] }>>()
      .mockResolvedValue({ rows: [] }),
    connect: jest.fn(),
    end: jest.fn(),
  },
  pool: {
    query: jest
      .fn<() => Promise<{ rows: unknown[] }>>()
      .mockResolvedValue({ rows: [] }),
    connect: jest.fn(),
    end: jest.fn(),
  },
}));

// ── 2. Mock auth middleware — controls req.user injection ──────────────────
//    The mock reads X-Test-User-* headers (same contract as the stub) so that
//    tests can drive authentication state without touching JWT logic.
await jest.unstable_mockModule('@/middleware/auth.middleware.js', () => ({
  authenticate: jest.fn(
    async (
      req: import('express').Request,
      res: import('express').Response,
      next: import('express').NextFunction
    ) => {
      const userId = req.headers['x-test-user-id'] as string | undefined;
      const email = req.headers['x-test-user-email'] as string | undefined;
      const role = req.headers['x-test-user-role'] as string | undefined;

      if (userId && email && role) {
        req.user = { userId, email, role };
        next();
        return;
      }

      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
    }
  ),
}));

// ── 3. Mock userRepository so we control DB responses ─────────────────────
await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    getAll: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    findByEmail: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    findById: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    createAdminUser: jest.fn(),
    updateById: jest.fn<() => Promise<null>>().mockResolvedValue(null),
  },
}));

// ── Import app AFTER all mocks are registered ─────────────────────────────
const { default: app, appReady } = await import('@/app.js');
const { default: request } = await import('supertest');
const { default: UserRepository } =
  await import('@repositories/userRepository.js');

const mockedFindById = UserRepository.findById as jest.Mock<
  (id: string) => Promise<unknown>
>;
const mockedUpdateById = UserRepository.updateById as jest.Mock<
  (id: string, updates: any) => Promise<unknown>
>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration — GET /api/v1/users/me (UP-01)', () => {
  beforeAll(async () => {
    await appReady; // wait for all routes to be mounted in app.ts
  });

  beforeEach(() => {
    // Only clear the repository mock between tests — do NOT use jest.clearAllMocks()
    // because that would wipe the authenticate mock implementation and cause
    // subsequent requests to hang (no next() and no response sent).
    mockedFindById.mockReset();
    mockedUpdateById.mockReset();
  });

  // ── Unauthenticated ───────────────────────────────────────────────────────

  it('should return 401 when no authentication headers are provided', async () => {
    // Arrange — no X-Test-User-* headers sent

    // Act
    const response = await request(app).get('/api/v1/users/me');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/authentication required/i);
  });

  // ── Authenticated — success ───────────────────────────────────────────────

  it('should return 200 with UserProfile envelope for an authenticated user', async () => {
    // Arrange
    const mockUser = {
      id: 'user-abc',
      name: 'Malindu Gurunada',
      email: 'malindu@1billiontech.com',
      emailVerified: true,
      image: 'https://example.com/avatar.png',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      role: 'User',
      banned: null,
      banReason: null,
      banExpires: null,
    };

    mockedFindById.mockResolvedValueOnce(mockUser);

    // Act — inject auth via X-Test-User-* headers
    const response = await request(app)
      .get('/api/v1/users/me')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User');

    // Assert — HTTP
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);

    // Assert — envelope
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();

    // Assert — profile shape (safe fields)
    const data = response.body.data as Record<string, unknown>;
    expect(data.id).toBe('user-abc');
    expect(data.name).toBe('Malindu Gurunada');
    expect(data.email).toBe('malindu@1billiontech.com');
    expect(data.avatarUrl).toBe('https://example.com/avatar.png');
    expect(data.role).toBe('User');
    expect(data.isActive).toBe(true);
    expect(data.createdAt).toBeDefined();

    // Assert — sensitive fields absent
    expect(data).not.toHaveProperty('emailVerified');
    expect(data).not.toHaveProperty('banned');
    expect(data).not.toHaveProperty('banReason');
    expect(data).not.toHaveProperty('banExpires');
    expect(data).not.toHaveProperty('updatedAt');

    // Assert — repository was called with the injected userId
    expect(mockedFindById).toHaveBeenCalledWith('user-abc');
  });

  // ── Authenticated — user record missing from DB ───────────────────────────

  it('should return 404 when the authenticated user has no DB record', async () => {
    // Arrange — findById returns null (e.g. user deleted between sessions)
    mockedFindById.mockResolvedValueOnce(null);

    // Act
    const response = await request(app)
      .get('/api/v1/users/me')
      .set('x-test-user-id', 'ghost-user')
      .set('x-test-user-email', 'ghost@1billiontech.com')
      .set('x-test-user-role', 'User');

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('User not found');
  });
});

describe('Integration — PATCH /api/v1/users/me (UP-02)', () => {
  // ── Unauthenticated ───────────────────────────────────────────────────────

  it('should return 401 when no authentication headers are provided', async () => {
    const response = await request(app)
      .patch('/api/v1/users/me')
      .send({ name: 'Test' });
    expect(response.status).toBe(401);
  });

  // ── Authenticated — success ───────────────────────────────────────────────

  it('should return 200 and update profile when authenticated', async () => {
    const mockUser = {
      id: 'user-abc',
      name: 'Updated Name',
      email: 'malindu@1billiontech.com',
      emailVerified: true,
      image: 'https://example.com/new.png',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      role: 'User',
      banned: null,
      banReason: null,
      banExpires: null,
    };

    mockedUpdateById.mockResolvedValueOnce(mockUser);

    const response = await request(app)
      .patch('/api/v1/users/me')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User')
      .send({
        name: 'Updated Name',
        avatarUrl: 'https://example.com/new.png',
        role: 'Admin', // Should be ignored by security stripping
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const data = response.body.data;
    expect(data.name).toBe('Updated Name');
    expect(data.avatarUrl).toBe('https://example.com/new.png');
    // Ensure role from DB is returned, not the injected Admin
    expect(data.role).toBe('User');

    expect(mockedUpdateById).toHaveBeenCalledWith('user-abc', {
      name: 'Updated Name',
      image: 'https://example.com/new.png',
    });
  });

  // ── Authenticated — validation error ──────────────────────────────────────

  it('should return 400 when name is empty', async () => {
    const response = await request(app)
      .patch('/api/v1/users/me')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User')
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Name cannot be empty');
  });
});
