// apps/api/src/__tests__/integration/notifications.integration.test.ts
//
// Integration tests for GET /api/v1/notifications  (NO-02)
//
// Strategy:
//   1. Mock db/index.js before importing app (ESM hoisting requirement)
//   2. Mock auth.middleware.js so tests can simulate authenticated/unauthenticated
//      requests without a real JWT — the mock honours X-Test-User-* headers.
//   3. Mock notificationRepository so we control DB responses.
//   4. await appReady in beforeAll so all routes are mounted before any request.

import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from '@jest/globals';

// ── 1. Mock Prisma DB from @repo/db ──────────────────────────────────────

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

await jest.unstable_mockModule('@repo/db', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// ── 2. Mock the DB pool — must come before app import ──────────────────────
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

// ── 3. Mock notificationRepository so we control DB responses ─────────────
await jest.unstable_mockModule(
  '@repositories/notificationRepository.js',
  () => ({
    default: {
      create: jest.fn(),
      findById: jest.fn(),
      list: jest
        .fn<(...args: unknown[]) => Promise<unknown[]>>()
        .mockResolvedValue([]),
      countUnread: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  })
);

// ── 4. Mock articlesRoutes — it imports multer which is not installed in
//    devDependencies. Without this mock the Promise.all in app.ts rejects
//    and no routes are mounted at all.
const { Router } = await import('express');
await jest.unstable_mockModule('@routes/articlesRoutes.js', () => ({
  default: Router(),
}));

// ── Import app AFTER all mocks are registered ─────────────────────────────
const { default: app, appReady } = await import('@/app.js');
const { default: request } = await import('supertest');
const { default: NotificationRepository } =
  await import('@repositories/notificationRepository.js');

const mockedList = NotificationRepository.list as jest.Mock<
  (...args: unknown[]) => Promise<unknown[]>
>;
const mockedCountUnread = NotificationRepository.countUnread as jest.Mock<
  (...args: unknown[]) => Promise<unknown>
>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration — GET /api/v1/notifications (NO-02)', () => {
  beforeAll(async () => {
    await appReady; // wait for all routes to be mounted in app.ts
  });

  beforeEach(() => {
    mockedList.mockReset();
    mockedList.mockResolvedValue([]);
  });

  // ── Unauthenticated ───────────────────────────────────────────────────────

  it('should return 401 when no authentication headers are provided', async () => {
    // Arrange — no X-Test-User-* headers sent

    // Act
    const response = await request(app).get('/api/v1/notifications');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/authentication required/i);
  });

  // ── Authenticated — success with data ─────────────────────────────────────

  it('should return 200 with { success: true, data: [...] } for an authenticated user', async () => {
    // Arrange
    const mockNotifications = [
      {
        id: 'notif-uuid-1',
        recipientId: 'user-abc',
        notificationTitle: 'Article approved',
        notificationReferenceType: 'article',
        referenceId: 'article-uuid-1',
        notificationType: 'success',
        message: 'Your article has been approved.',
        isRead: false,
        readAt: null,
        deletedAt: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ];
    mockedList.mockResolvedValueOnce(mockNotifications);

    // Act — inject auth via X-Test-User-* headers
    const response = await request(app)
      .get('/api/v1/notifications')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User');

    // Assert — HTTP
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);

    // Assert — envelope
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(1);

    // Assert — shape of first notification
    const first = response.body.data[0] as Record<string, unknown>;
    expect(first.id).toBe('notif-uuid-1');
    expect(first.recipientId).toBe('user-abc');
    expect(first.notificationTitle).toBe('Article approved');
    expect(first.isRead).toBe(false);
    expect(first.readAt).toBeNull();

    // Assert — repository was called with the injected userId
    expect(mockedList).toHaveBeenCalledTimes(1);
    expect(mockedList).toHaveBeenCalledWith('user-abc', {
      limit: 20,
      offset: 0,
    });
  });

  // ── Authenticated — empty list ────────────────────────────────────────────

  it('should return 200 with an empty data array when user has no notifications', async () => {
    // Arrange
    mockedList.mockResolvedValueOnce([]);

    // Act
    const response = await request(app)
      .get('/api/v1/notifications')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([]);
  });

  // ── Pagination parameters ─────────────────────────────────────────────────

  it('should pass parsed limit and offset to the service', async () => {
    // Arrange
    mockedList.mockResolvedValueOnce([]);

    // Act
    const response = await request(app)
      .get('/api/v1/notifications?limit=5&offset=10')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User');

    // Assert
    expect(response.status).toBe(200);
    expect(mockedList).toHaveBeenCalledWith('user-abc', {
      limit: 5,
      offset: 10,
    });
  });

  it('should clamp limit to 100 when a larger value is provided', async () => {
    // Arrange
    mockedList.mockResolvedValueOnce([]);

    // Act
    const response = await request(app)
      .get('/api/v1/notifications?limit=500')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User');

    // Assert
    expect(response.status).toBe(200);
    expect(mockedList).toHaveBeenCalledWith('user-abc', {
      limit: 100,
      offset: 0,
    });
  });

  it('should fall back to defaults for non-numeric query params', async () => {
    // Arrange
    mockedList.mockResolvedValueOnce([]);

    // Act
    const response = await request(app)
      .get('/api/v1/notifications?limit=abc&offset=xyz')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User');

    // Assert
    expect(response.status).toBe(200);
    expect(mockedList).toHaveBeenCalledWith('user-abc', {
      limit: 20,
      offset: 0,
    });
  });
});

describe('Integration — GET /api/v1/notifications/unread-count', () => {
  beforeEach(() => {
    mockedCountUnread.mockReset();
  });

  it('should return 401 when no authentication headers are provided', async () => {
    const response = await request(app).get('/api/v1/notifications/unread-count');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with { success: true, data: { count: number } }', async () => {
    mockedCountUnread.mockResolvedValueOnce(3);

    const response = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { count: 3 },
    });
    expect(mockedCountUnread).toHaveBeenCalledWith('user-abc');
    expect(mockedCountUnread).toHaveBeenCalledTimes(1);
  });

  it('should return 200 with count: 0 when there are no unread notifications', async () => {
    mockedCountUnread.mockResolvedValueOnce(0);

    const response = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { count: 0 },
    });
  });

  it('should return only the correct unread, non-deleted count (mock returns filtered count)', async () => {
    // The repository handles the SQL WHERE clause for read/unread/deleted.
    // In this integration test, we just ensure whatever the repo returns
    // is correctly passed through as the 'count' payload.
    mockedCountUnread.mockResolvedValueOnce(2);

    const response = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('x-test-user-id', 'user-abc')
      .set('x-test-user-email', 'malindu@1billiontech.com')
      .set('x-test-user-role', 'User');

    expect(response.status).toBe(200);
    expect(response.body.data.count).toBe(2);
  });
});
