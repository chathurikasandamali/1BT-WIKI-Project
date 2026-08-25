// apps/api/src/v1/__tests__/integration/likes.integration.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Prisma DB from @repo/db
await jest.unstable_mockModule('@repo/db', () => ({
  TechTalkStatus: { draft: 'draft', published: 'published', unpublished: 'unpublished' },
  ReviewStatus: { Pending: 'Pending', Approved: 'Approved', Rejected: 'Rejected' },
  ReviewCommentStatus: { Open: 'Open', Resolved: 'Resolved' },
  ArticleStatus: { Draft: 'Draft', Pending: 'Pending', Published: 'Published', Unpublished: 'Unpublished' },
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
    like: { upsert: jest.fn(), deleteMany: jest.fn() },
  },
}));

// Mock Auth Middleware
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

// Mock Repositories
const MockArticleRepository = {
  create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  findById: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
  update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
};

await jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  default: MockArticleRepository,
  ArticleRepository: jest.fn().mockImplementation(() => MockArticleRepository),
}));

await jest.unstable_mockModule('@repositories/likeRepository.js', () => ({
  default: {
    upsert: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    remove: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
  },
}));

await jest.unstable_mockModule(
  '@repositories/notificationRepository.js',
  () => ({
    default: {
      create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    },
  })
);

const { default: app } = await import('@/app.js');
const { default: request } = await import('supertest');
const { default: ArticleRepository } =
  await import('@repositories/articleRepository.js');
const { default: LikeRepository } =
  await import('@repositories/likeRepository.js');
const { default: NotificationRepository } =
  await import('@repositories/notificationRepository.js');

const mockFindById = ArticleRepository.findById as jest.Mock<any>;
const mockUpsertLike = LikeRepository.upsert as jest.Mock<any>;
const mockRemoveLike = LikeRepository.remove as jest.Mock<any>;
const mockCreateNotification = NotificationRepository.create as jest.Mock<any>;

const userHeaders = {
  'x-test-user-id': 'user-123',
  'x-test-user-email': 'user@example.com',
  'x-test-user-role': 'User',
};

describe('Likes API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/articles/:id/like', () => {
    const articleId = '12345678-1234-1234-1234-123456789012';

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).post(
        `/api/v1/articles/${articleId}/like`
      );

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should return 404 if article not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .post(`/api/v1/articles/${articleId}/like`)
        .set(userHeaders);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Article not found',
      });
    });

    it('should return 403 if article is not Published', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        authorId: 'other-user',
        status: 'Draft',
      });

      const response = await request(app)
        .post(`/api/v1/articles/${articleId}/like`)
        .set(userHeaders);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'Cannot like this article',
      });
    });

    it('should like the article and notify the article author on a Published article', async () => {
      const article = {
        id: articleId,
        authorId: 'other-user',
        title: 'Test Article',
        status: 'Published',
      };
      const like = {
        id: 'like-123',
        articleId,
        userId: 'user-123',
        createdAt: new Date(),
      };

      mockFindById.mockResolvedValueOnce(article);
      mockUpsertLike.mockResolvedValueOnce({ like, created: true });

      const response = await request(app)
        .post(`/api/v1/articles/${articleId}/like`)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: { liked: true },
        message: 'Article liked successfully',
      });
      expect(mockUpsertLike).toHaveBeenCalledWith(articleId, 'user-123');

      // Notification is fire-and-forget; flush microtasks before asserting.
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'other-user',
          notificationReferenceType: 'like',
        })
      );
    });

    it('should return 200 idempotently when the same user likes the article twice', async () => {
      const article = {
        id: articleId,
        authorId: 'other-user',
        title: 'Test Article',
        status: 'Published',
      };
      const like = {
        id: 'like-123',
        articleId,
        userId: 'user-123',
        createdAt: new Date(),
      };

      mockFindById.mockResolvedValue(article);
      mockUpsertLike.mockResolvedValueOnce({ like, created: true });
      mockUpsertLike.mockResolvedValueOnce({ like, created: false });

      const first = await request(app)
        .post(`/api/v1/articles/${articleId}/like`)
        .set(userHeaders);

      const second = await request(app)
        .post(`/api/v1/articles/${articleId}/like`)
        .set(userHeaders);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.message).toBe('Article liked successfully');
      expect(second.body.message).toBe('Article liked successfully');
      expect(mockUpsertLike).toHaveBeenCalledTimes(2);
    });
  });

  describe('DELETE /api/v1/articles/:id/like', () => {
    const articleId = '12345678-1234-1234-1234-123456789012';

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).delete(
        `/api/v1/articles/${articleId}/like`
      );

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should return 404 if article not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/v1/articles/${articleId}/like`)
        .set(userHeaders);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Article not found',
      });
    });

    it('should unlike the article', async () => {
      const article = {
        id: articleId,
        authorId: 'other-user',
        title: 'Test Article',
        status: 'Published',
      };

      mockFindById.mockResolvedValueOnce(article);
      mockRemoveLike.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .delete(`/api/v1/articles/${articleId}/like`)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: { liked: false },
        message: 'Article unliked successfully',
      });
      expect(mockRemoveLike).toHaveBeenCalledWith(articleId, 'user-123');
    });

    it('should return 200 idempotently when unliking twice in a row', async () => {
      const article = {
        id: articleId,
        authorId: 'other-user',
        title: 'Test Article',
        status: 'Published',
      };

      mockFindById.mockResolvedValue(article);
      mockRemoveLike.mockResolvedValue(undefined);

      const first = await request(app)
        .delete(`/api/v1/articles/${articleId}/like`)
        .set(userHeaders);

      const second = await request(app)
        .delete(`/api/v1/articles/${articleId}/like`)
        .set(userHeaders);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.message).toBe('Article unliked successfully');
      expect(second.body.message).toBe('Article unliked successfully');
      expect(mockRemoveLike).toHaveBeenCalledTimes(2);
    });
  });
});
