// apps/api/src/v1/__tests__/integration/admin.integration.test.ts

import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
} from '@jest/globals';

// ─── Module mocks (must precede all dynamic imports) ─────────────────────────

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
      count: jest.fn(),
    },
  },
}));

await jest.unstable_mockModule('@middleware/auth.middleware.js', () => ({
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

      res.status(401).json({ success: false, error: 'Authentication required' });
    }
  ),
}));

// ArticleRepository mock — findByStatus is the key method under test.
const MockArticleRepository = {
  findByStatus: jest
    .fn<() => Promise<unknown>>()
    .mockResolvedValue({ articles: [], total: 0 }),
  findById: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
  updateStatus: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  softDelete: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  hardDelete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  findByAuthor: jest
    .fn<() => Promise<unknown>>()
    .mockResolvedValue({ articles: [], total: 0 }),
};

await jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  ArticleRepository: jest.fn().mockImplementation(() => MockArticleRepository),
  default: jest.fn().mockImplementation(() => MockArticleRepository),
}));

await jest.unstable_mockModule('@repositories/articleAttachmentRepository.js', () => {
  const mockCreate = jest.fn<() => Promise<unknown>>().mockResolvedValue({});
  return {
    default: { create: mockCreate },
    ArticleAttachmentRepository: jest.fn().mockImplementation(() => ({ create: mockCreate })),
  };
});

await jest.unstable_mockModule('@repositories/articleReviewRepository.js', () => {
  const mockFindLatest = jest.fn<() => Promise<unknown>>().mockResolvedValue(null);
  return {
    default: { findLatestByArticleId: mockFindLatest },
    ArticleReviewRepository: jest
      .fn()
      .mockImplementation(() => ({ findLatestByArticleId: mockFindLatest })),
  };
});

// UserRepository mock — findManyByIds is used by listAllArticles for author enrichment.
const MockUserRepository = {
  findById: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
  findManyByIds: jest.fn<() => Promise<unknown>>().mockResolvedValue([]),
};

const mockUserCtor = jest.fn().mockImplementation(() => MockUserRepository);
const MockUserRepositoryImpl = Object.assign(mockUserCtor, MockUserRepository);

await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  UserRepository: MockUserRepositoryImpl,
  default: MockUserRepositoryImpl,
}));

// AdminController / UserController are also loaded by adminRoutes — stub minimally.
await jest.unstable_mockModule('@controllers/adminController.js', () => ({
  default: {
    getAllUsers: jest.fn((_req: unknown, res: import('express').Response) => {
      res.status(200).json({ success: true, data: [] });
    }),
    adminCreateUser: jest.fn((_req: unknown, res: import('express').Response) => {
      res.status(201).json({ success: true, data: {} });
    }),
  },
}));

await jest.unstable_mockModule('@controllers/userController.js', () => ({
  default: {
    updateUserRole: jest.fn((_req: unknown, res: import('express').Response) => {
      res.status(200).json({ success: true, data: {} });
    }),
    updateUserBanStatus: jest.fn((_req: unknown, res: import('express').Response) => {
      res.status(200).json({ success: true, data: {} });
    }),
  },
}));

await jest.unstable_mockModule('@v1/lib/b2Client.js', () => ({
  default: {
    uploadFile: jest
      .fn<() => Promise<{ fileId: string; fileUrl: string }>>()
      .mockResolvedValue({ fileId: 'test-id', fileUrl: 'https://test.url' }),
  },
}));

// ─── Dynamic imports (after all mocks) ───────────────────────────────────────

const { default: app } = await import('@/app.js');
const { default: request } = await import('supertest');

// ─── Typed handles to mock functions ─────────────────────────────────────────

const mockFindByStatus = MockArticleRepository.findByStatus as jest.Mock<any>;
const mockUserFindManyByIds = MockUserRepository.findManyByIds as jest.Mock<any>;

const mockDate = new Date().toISOString();
const mockAuthor = {
  id: 'user-1',
  name: 'Author Name',
  email: 'author@example.com',
};

// ─── Role headers ─────────────────────────────────────────────────────────────

const adminHeaders = {
  'x-test-user-id': 'admin-1',
  'x-test-user-email': 'admin@example.com',
  'x-test-user-role': 'Admin',
};

const reviewerHeaders = {
  'x-test-user-id': 'reviewer-1',
  'x-test-user-email': 'reviewer@example.com',
  'x-test-user-role': 'Reviewer',
};

const userHeaders = {
  'x-test-user-id': 'user-1',
  'x-test-user-email': 'user@example.com',
  'x-test-user-role': 'User',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Admin API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/articles', () => {
    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).get('/api/v1/admin/articles');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for a Reviewer role (Admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/articles')
        .set(reviewerHeaders);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(mockFindByStatus).not.toHaveBeenCalled();
    });

    it('should return 403 for a plain User role', async () => {
      const response = await request(app)
        .get('/api/v1/admin/articles')
        .set(userHeaders);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(mockFindByStatus).not.toHaveBeenCalled();
    });

    it('should return 200 with mixed-status articles for an Admin (no status filter)', async () => {
      const mixedArticles = [
        {
          id: 'article-1',
          title: 'Pending Article',
          status: 'Pending',
          authorId: 'user-1',
          tags: [],
          createdAt: mockDate,
          updatedAt: mockDate,
        },
        {
          id: 'article-2',
          title: 'Published Article',
          status: 'Published',
          authorId: 'user-1',
          tags: [],
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];

      mockFindByStatus.mockResolvedValueOnce({ articles: mixedArticles, total: 2 });
      mockUserFindManyByIds.mockResolvedValueOnce([mockAuthor]);

      const response = await request(app)
        .get('/api/v1/admin/articles')
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Articles retrieved successfully');
      expect(response.body.data.articles).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(20);
      // findByStatus called with undefined status — all statuses except Draft
      expect(mockFindByStatus).toHaveBeenCalledWith(
        undefined,
        1,
        20,
        expect.objectContaining({ includeCounts: true, excludeStatus: 'Draft' })
      );
    });

    it('should return 200 filtered by ?status=Pending for Admin', async () => {
      const pendingArticles = [
        {
          id: 'article-3',
          title: 'My Pending',
          status: 'Pending',
          authorId: 'user-1',
          tags: [],
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];

      mockFindByStatus.mockResolvedValueOnce({ articles: pendingArticles, total: 1 });
      mockUserFindManyByIds.mockResolvedValueOnce([mockAuthor]);

      const response = await request(app)
        .get('/api/v1/admin/articles?status=Pending')
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.articles).toHaveLength(1);
      expect(response.body.data.articles[0].status).toBe('Pending');
      expect(mockFindByStatus).toHaveBeenCalledWith(
        'Pending',
        1,
        20,
        expect.objectContaining({ includeCounts: true })
      );
    });

    it('should return 400 for ?status=Draft (drafts are private to authors)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/articles?status=Draft')
        .set(adminHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Invalid status filter. Allowed: Pending, Published, Unpublished'
      );
      expect(mockFindByStatus).not.toHaveBeenCalled();
    });

    it('should return 400 for an invalid ?status=bogus', async () => {
      const response = await request(app)
        .get('/api/v1/admin/articles?status=bogus')
        .set(adminHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Invalid status filter. Allowed: Pending, Published, Unpublished'
      );
      expect(mockFindByStatus).not.toHaveBeenCalled();
    });

    it('should enrich articles with authorName and authorEmail from batch lookup', async () => {
      const articles = [
        {
          id: 'article-4',
          title: 'Enriched Article',
          status: 'Pending',
          authorId: 'user-1',
          tags: [],
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];

      mockFindByStatus.mockResolvedValueOnce({ articles, total: 1 });
      mockUserFindManyByIds.mockResolvedValueOnce([mockAuthor]);

      const response = await request(app)
        .get('/api/v1/admin/articles')
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.articles[0].authorName).toBe('Author Name');
      expect(response.body.data.articles[0].authorEmail).toBe('author@example.com');
    });

    it('should not leak body or _count in list rows and should map counts', async () => {
      const articles = [
        {
          id: 'article-5',
          title: 'Heavy Article',
          body: { type: 'doc', content: [] },
          status: 'Pending',
          authorId: 'user-1',
          views: 12,
          tags: [],
          createdAt: mockDate,
          updatedAt: mockDate,
          _count: { likes: 4, comments: 1 },
        },
      ];

      mockFindByStatus.mockResolvedValueOnce({ articles, total: 1 });
      mockUserFindManyByIds.mockResolvedValueOnce([mockAuthor]);

      const response = await request(app)
        .get('/api/v1/admin/articles')
        .set(adminHeaders);

      expect(response.status).toBe(200);
      const row = response.body.data.articles[0];
      expect(row).not.toHaveProperty('body');
      expect(row).not.toHaveProperty('_count');
      expect(row.likeCount).toBe(4);
      expect(row.commentCount).toBe(1);
      expect(row.views).toBe(12);
    });
  });
});
