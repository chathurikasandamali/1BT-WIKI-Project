// apps/api/src/__tests__/integration/auth.integration.test.ts
//
// Integration tests for A-05 — auth + RBAC guards on all API routes.
// Covers:
//   • GET  /api/v1/users/getAllUsers         → authenticate only
//   • POST /api/v1/admin/createUsers      → authenticate + requireRole('Admin')
//   • PATCH /api/v1/admin/users/:id/role → authenticate + requireRole('Admin')
//   • PATCH /api/v1/admin/users/:id/ban  → authenticate + requireRole('Admin')

import { jest, describe, it, expect, beforeAll } from '@jest/globals';

// ── 1. Mock the DB pool ───────────────────────────────────────────────────

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

// ── 2. Mock auth middleware — X-Test-User-* header contract ───────────────
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

// ── 3. Mock userRepository ────────────────────────────────────────────────
await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    getAllUsers: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    findByEmail: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    findById: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    updateRole: jest.fn(),
    updateBanStatus: jest.fn(),
    updateById: jest.fn(),
  },
}));

// ── 4. Mock adminRepository ───────────────────────────────────────────────
await jest.unstable_mockModule('@repositories/adminRepository.js', () => ({
  default: {
    getAllUsers: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    createAdminUser: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  },
}));

// ── Import app and supertest AFTER all mocks are registered ───────────────
const { default: app, appReady } = await import('@/app.js');
const { default: request } = await import('supertest');
const { default: AdminRepository } =
  await import('@repositories/adminRepository.js');

// ── Auth header helpers ───────────────────────────────────────────────────

const adminHeaders = {
  'x-test-user-id': 'admin-001',
  'x-test-user-email': 'admin@1billiontech.com',
  'x-test-user-role': 'Admin',
};

const userHeaders = {
  'x-test-user-id': 'user-001',
  'x-test-user-email': 'user@1billiontech.com',
  'x-test-user-role': 'User',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration — A-05: auth guard on GET /api/v1/admin/getAllUsers', () => {
  beforeAll(async () => {
    await appReady;
  });

  it('no auth headers → 401', async () => {
    const res = await request(app).get('/api/v1/admin/getAllUsers');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Authentication required',
    });
  });

  it('valid User-role headers → 200', async () => {
    const res = await request(app)
      .get('/api/v1/admin/getAllUsers')
      .set(userHeaders);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Integration — A-05: auth + RBAC on POST /api/v1/admin/createUsers', () => {
  beforeAll(async () => {
    await appReady;
  });

  it('no auth → 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/createUsers')
      .send({ name: 'Test', email: 'test@example.com' });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Authentication required',
    });
  });

  it('User role → 403', async () => {
    const res = await request(app)
      .post('/api/v1/admin/createUsers')
      .set(userHeaders)
      .send({ name: 'Test', email: 'test@example.com' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Insufficient permissions',
    });
  });

  it('Admin role with valid payload → 201', async () => {
    // findByEmail returns null (no duplicate), createAdminUser returns the new user
    const { default: UserRepository } =
      await import('@repositories/userRepository.js');
    (
      UserRepository.findByEmail as jest.Mock<() => Promise<null>>
    ).mockResolvedValueOnce(null);
    (
      AdminRepository.createAdminUser as jest.Mock<() => Promise<unknown>>
    ).mockResolvedValueOnce({
      id: 'new-1',
      name: 'New Admin',
      email: 'newadmin@1billiontech.com',
      role: 'Admin',
    });

    const res = await request(app)
      .post('/api/v1/admin/createUsers')
      .set(adminHeaders)
      .send({
        name: 'New Admin',
        email: 'newadmin@1billiontech.com',
        role: 'Admin',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('Integration — A-05: auth + RBAC on PATCH /api/v1/admin/users/:userId/role', () => {
  beforeAll(async () => {
    await appReady;
  });

  it('no auth → 401', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/users/user-1/role')
      .send({ role: 'Reviewer' });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Authentication required',
    });
  });

  it('User role → 403', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/users/user-1/role')
      .set(userHeaders)
      .send({ role: 'Reviewer' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Insufficient permissions',
    });
  });

  it('Admin role with valid payload → 200', async () => {
    const { default: UserRepository } =
      await import('@repositories/userRepository.js');
    (
      UserRepository.findById as jest.Mock<() => Promise<unknown>>
    ).mockResolvedValueOnce({
      id: 'user-1',
      role: 'User',
    });
    (
      UserRepository.updateRole as jest.Mock<() => Promise<unknown>>
    ).mockResolvedValueOnce({
      id: 'user-1',
      role: 'Reviewer',
    });

    const res = await request(app)
      .patch('/api/v1/admin/users/user-1/role')
      .set(adminHeaders)
      .send({ role: 'Reviewer' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Integration — A-05: auth + RBAC on PATCH /api/v1/admin/users/:userId/ban', () => {
  beforeAll(async () => {
    await appReady;
  });

  it('no auth → 401', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/users/user-1/ban')
      .send({ banned: true, banReason: 'spam' });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Authentication required',
    });
  });

  it('User role → 403', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/users/user-1/ban')
      .set(userHeaders)
      .send({ banned: true, banReason: 'spam' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Insufficient permissions',
    });
  });

  it('Admin role → 200 (ban)', async () => {
    const { default: UserRepository } =
      await import('@repositories/userRepository.js');
    const existing = { id: 'user-1', banned: false, banReason: null };
    const updated = { id: 'user-1', banned: true, banReason: 'spam' };
    (
      UserRepository.findById as jest.Mock<() => Promise<unknown>>
    ).mockResolvedValueOnce(existing);
    (
      UserRepository.updateBanStatus as jest.Mock<() => Promise<unknown>>
    ).mockResolvedValueOnce(updated);

    const res = await request(app)
      .patch('/api/v1/admin/users/user-1/ban')
      .set(adminHeaders)
      .send({ banned: true, banReason: 'spam' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
