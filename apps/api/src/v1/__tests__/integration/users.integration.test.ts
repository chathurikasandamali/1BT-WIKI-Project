// apps/api/src/__tests__/integration/users.integration.test.ts

import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from '@jest/globals';

// ESM requires unstable_mockModule — jest.mock() doesn't hoist in ESM

// ── Mock Prisma DB from @repo/db ───────────────────────────────────────────
await jest.unstable_mockModule('@repo/db', () => ({
  TechTalkStatus: { draft: 'draft', published: 'published', unpublished: 'unpublished' },
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

// Mock auth middleware — honours X-Test-User-* headers
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

// Mock userRepository — controls all DB calls made by the service layer
await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    findByEmail: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    findById: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    findManyByIds: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    createAdminUser: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    updateRole: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    updateBanStatus: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    updateById: jest.fn<() => Promise<null>>().mockResolvedValue(null),
  },
}));

// Mock adminRepository — controls DB calls made by adminService
await jest.unstable_mockModule('@repositories/adminRepository.js', () => ({
  default: {
    getAllUsers: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    createAdminUser: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  },
}));

// Mock rbac middleware — passthrough for any role (role assertions tested separately)
await jest.unstable_mockModule('@/middleware/rbac.middleware.js', () => ({
  requireRole:
    (_role: string) =>
    async (
      _req: import('express').Request,
      _res: import('express').Response,
      next: import('express').NextFunction
    ) =>
      next(),
}));

// Import AFTER all mocks are registered
const { default: app, appReady } = await import('@/app.js');
const { default: request } = await import('supertest');
const { default: UserRepository } =
  await import('@repositories/userRepository.js');
const { default: AdminRepository } =
  await import('@repositories/adminRepository.js');

// Typed mock helpers
const mockGetAll = AdminRepository.getAllUsers as jest.Mock<
  () => Promise<unknown[]>
>;
const mockFindByEmail = UserRepository.findByEmail as jest.Mock<
  () => Promise<unknown>
>;
const mockFindById = UserRepository.findById as jest.Mock<
  () => Promise<unknown>
>;
const mockCreateAdminUser = AdminRepository.createAdminUser as jest.Mock<
  () => Promise<unknown>
>;
const mockUpdateBanStatus = UserRepository.updateBanStatus as jest.Mock<
  () => Promise<unknown>
>;

// ── Auth header helpers ───────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration — Users API', () => {
  beforeAll(async () => {
    await appReady;
  });

  beforeEach(() => {
    // Reset only the repository mocks; preserve authenticate mock implementation
    mockGetAll.mockReset();
    mockFindByEmail.mockReset();
    mockFindById.mockReset();
    mockCreateAdminUser.mockReset();
    mockUpdateBanStatus.mockReset();
  });

  // ── GET /api/v1/admin/getAllUsers — A-05 auth guard ───────────────────────────

  it('GET /api/v1/admin/getAllUsers without auth headers → 401', async () => {
    const response = await request(app).get('/api/v1/admin/getAllUsers');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/authentication required/i);
  });

  it('GET /api/v1/admin/getAllUsers with valid auth headers → 200', async () => {
    const mockUsers = [
      {
        id: '1',
        name: 'Malindu',
        email: 'malindu@1billiontech.com',
        emailVerified: false,
        image: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: 'User',
        banned: null,
        banReason: null,
        banExpires: null,
      },
    ];

    mockGetAll.mockResolvedValueOnce(mockUsers);

    const response = await request(app)
      .get('/api/v1/admin/getAllUsers')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toEqual({ success: true, data: mockUsers });
  });

  // ── POST /api/v1/admin/createUsers ───────────────────────────────────────

  it('POST /api/v1/admin/createUsers should create a user and return 201', async () => {
    const mockCreatedUser = {
      id: '2',
      name: 'Chathurika',
      email: 'chathurika@1billiontech.com',
      emailVerified: false,
      image: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'User',
      banned: null,
      banReason: null,
      banExpires: null,
    };

    // No duplicate email
    mockFindByEmail.mockResolvedValueOnce(null);
    // Repo returns the newly created user
    mockCreateAdminUser.mockResolvedValueOnce(mockCreatedUser);

    const response = await request(app)
      .post('/api/v1/admin/createUsers')
      .set(adminHeaders)
      .send({
        name: 'Chathurika',
        email: 'chathurika@1billiontech.com',
        role: 'User',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockCreatedUser);
    expect(response.body.message).toBe('User created successfully');
  });

  it('POST /api/v1/admin/createUsers without name should return 400', async () => {
    const response = await request(app)
      .post('/api/v1/admin/createUsers')
      .set(adminHeaders)
      .send({ email: 'missingname@1billiontech.com' });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Name is required');
  });

  // ── PATCH /api/v1/admin/users/:userId/ban ─────────────────────────────────

  it('PATCH /api/v1/admin/users/:userId/ban should deactivate a user', async () => {
    const mockExistingUser = {
      id: '3',
      name: 'Deactivated User',
      email: 'deactivated@1billiontech.com',
      emailVerified: false,
      image: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'User',
      banned: false,
      banReason: null,
      banExpires: null,
    };
    const mockUpdatedUser = {
      ...mockExistingUser,
      banned: true,
      banReason: 'violated terms',
      updatedAt: new Date().toISOString(),
    };

    mockFindById.mockResolvedValueOnce(mockExistingUser);
    mockUpdateBanStatus.mockResolvedValueOnce(mockUpdatedUser);

    const response = await request(app)
      .patch('/api/v1/admin/users/3/ban')
      .set(adminHeaders)
      .send({ banned: true, banReason: 'violated terms' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockUpdatedUser);
    expect(response.body.message).toBe('User deactivated successfully');
  });

  it('PATCH /api/v1/admin/users/:userId/ban should reactivate a user', async () => {
    const mockExistingUser = {
      id: '3',
      name: 'Deactivated User',
      email: 'deactivated@1billiontech.com',
      emailVerified: false,
      image: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'User',
      banned: true,
      banReason: 'violated terms',
      banExpires: null,
    };
    const mockUpdatedUser = {
      ...mockExistingUser,
      banned: false,
      banReason: null,
      updatedAt: new Date().toISOString(),
    };

    mockFindById.mockResolvedValueOnce(mockExistingUser);
    mockUpdateBanStatus.mockResolvedValueOnce(mockUpdatedUser);

    const response = await request(app)
      .patch('/api/v1/admin/users/3/ban')
      .set(adminHeaders)
      .send({ banned: false });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockUpdatedUser);
    expect(response.body.message).toBe('User reactivated successfully');
  });

  it('PATCH /api/v1/admin/users/:userId/ban should return 400 when banning without reason', async () => {
    const mockExistingUser = {
      id: '3',
      name: 'Deactivated User',
      email: 'deactivated@1billiontech.com',
      emailVerified: false,
      image: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'User',
      banned: false,
      banReason: null,
      banExpires: null,
    };

    mockFindById.mockResolvedValueOnce(mockExistingUser);

    const response = await request(app)
      .patch('/api/v1/admin/users/3/ban')
      .set(adminHeaders)
      .send({ banned: true });

    expect(response.status).toBe(400);
    expect(response.text).toContain(
      'Ban reason is required when banning a user'
    );
  });
});
