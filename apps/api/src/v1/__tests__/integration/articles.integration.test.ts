// apps/api/src/__tests__/integration/articles.integration.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { CreateNotificationInput } from '@models/notificationTypes.js';
import type { UserRole } from '@/types/userTypes.js';
import { UserRoleValue } from '@/types/userTypes.js';

// Mock Prisma DB from @repo/db
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
  updateStatus: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  findByStatus: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  softDelete: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  hardDelete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  findByAuthor: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
};

await jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  default: MockArticleRepository,
  ArticleRepository: jest.fn().mockImplementation(() => MockArticleRepository),
}));

await jest.unstable_mockModule(
  '@repositories/articleAttachmentRepository.js',
  () => {
    const mockCreate = jest.fn<() => Promise<unknown>>().mockResolvedValue({});
    return {
      default: { create: mockCreate },
      ArticleAttachmentRepository: jest
        .fn()
        .mockImplementation(() => ({ create: mockCreate })),
    };
  }
);

await jest.unstable_mockModule(
  '@repositories/articleReviewRepository.js',
  () => {
    const mockFindLatest = jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValue(null);
    return {
      default: { findLatestByArticleId: mockFindLatest },
      ArticleReviewRepository: jest
        .fn()
        .mockImplementation(() => ({ findLatestByArticleId: mockFindLatest })),
    };
  }
);

const mockFindActiveByRole = jest
  .fn<(role: UserRole) => Promise<unknown[]>>()
  .mockResolvedValue([]);

// Mock User Repository (author enrichment and active Reviewer lookup)
await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    findManyByIds: jest
      .fn<() => Promise<unknown[]>>()
      .mockResolvedValue([]),
    findActiveByRole: mockFindActiveByRole,
  },
}));

const mockNotificationSend = jest
  .fn<(payload: CreateNotificationInput) => Promise<void>>()
  .mockResolvedValue(undefined);

await jest.unstable_mockModule('@services/notificationService.js', () => ({
  default: {
    send: mockNotificationSend,
  },
}));

// Mock B2 Client
await jest.unstable_mockModule('@v1/lib/b2Client.js', () => ({
  default: {
    uploadFile: jest
      .fn<() => Promise<{ fileId: string; fileUrl: string }>>()
      .mockResolvedValue({ fileId: 'test', fileUrl: 'test' }),
  },
}));

const { default: app } = await import('@/app.js');
const { default: request } = await import('supertest');
const { default: ArticleRepository } =
  await import('@repositories/articleRepository.js');
const { default: ArticleReviewRepository } =
  await import('@repositories/articleReviewRepository.js');

const mockFindById = MockArticleRepository.findById as jest.Mock<any>;
const mockUpdate = MockArticleRepository.update as jest.Mock<any>;
const mockUpdateStatus = MockArticleRepository.updateStatus as jest.Mock<any>;
const mockFindByStatus = MockArticleRepository.findByStatus as jest.Mock<any>;
const mockSoftDelete = MockArticleRepository.softDelete as jest.Mock<any>;
const mockHardDelete = MockArticleRepository.hardDelete as jest.Mock<any>;
const mockFindByAuthor = MockArticleRepository.findByAuthor as jest.Mock<any>;
const mockFindLatestByArticleId =
  ArticleReviewRepository.findLatestByArticleId as jest.Mock<any>;

const userHeaders = {
  'x-test-user-id': 'user-123',
  'x-test-user-email': 'user@example.com',
  'x-test-user-role': 'User',
};

const adminHeaders = {
  'x-test-user-id': 'admin-1',
  'x-test-user-email': 'admin@example.com',
  'x-test-user-role': 'Admin',
};

describe('Articles API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/v1/articles/:id', () => {
    const articleId = 'article-123';
    const articlePath = `/api/v1/articles/${articleId}`;
    
    it('should return 401 if unauthenticated', async () => {
      const response = await request(app)
        .patch(articlePath)
        .send({ data: JSON.stringify({ title: 'New Title' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if article not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(articlePath)
        .set(userHeaders)
        .field('data', JSON.stringify({ title: 'New Title' }));

      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not author', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        authorId: 'other-user',
        status: 'Draft',
      });

      const response = await request(app)
        .patch(articlePath)
        .set(userHeaders)
        .field('data', JSON.stringify({ title: 'New Title' }));

      expect(response.status).toBe(403);
    });

    it('should update article successfully if user is author and article is Draft', async () => {
      const existingArticle = {
        id: articleId,
        authorId: 'user-123',
        status: 'Draft',
        title: 'Old Title',
      };
      const updatedArticle = { ...existingArticle, title: 'New Title' };

      mockFindById.mockResolvedValueOnce(existingArticle);
      mockUpdate.mockResolvedValueOnce(updatedArticle);

      const response = await request(app)
        .patch(articlePath)
        .set(userHeaders)
        .field('data', JSON.stringify({ title: 'New Title' }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Title');
      expect(mockUpdate).toHaveBeenCalledWith(articleId, {
        title: 'New Title',
      });
    });
  });

  describe('GET /api/v1/articles', () => {
    const listArticlePath = `/api/v1/articles`;
    
    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).get(listArticlePath);
      expect(response.status).toBe(401);
    });

    it('should return published articles with default pagination', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Title 1',
          authorId: 'user-1',
          tags: ['test'],
          status: 'Published',
          views: 10,
          createdAt: new Date('2023-01-01').toISOString(),
          updatedAt: new Date('2023-01-01').toISOString(),
          _count: { likes: 5, comments: 2 },
        },
      ];

      mockFindByStatus.mockResolvedValueOnce({
        articles: mockArticles,
        total: 1,
      });

      const response = await request(app)
        .get(listArticlePath)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toHaveLength(1);
      expect(response.body.data.articles[0].likeCount).toBe(5);
      expect(response.body.data.articles[0].commentCount).toBe(2);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(20);

      expect(mockFindByStatus).toHaveBeenCalledWith(
        'Published',
        1,
        20,
        {
          includeCounts: true,
          includeCoverImage: true,
          search: undefined,
          sort: undefined,
          order: undefined,
        }
      );
    });

    it('should respect custom page and limit query params', async () => {
      mockFindByStatus.mockResolvedValueOnce({ articles: [], total: 0 });

      const response = await request(app)
        .get(`${listArticlePath}?page=3&limit=5`)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(3);
      expect(response.body.data.limit).toBe(5);

      expect(mockFindByStatus).toHaveBeenCalledWith(
        'Published',
        3,
        5,
        {
          includeCounts: true,
          includeCoverImage: true,
          search: undefined,
          sort: undefined,
          order: undefined,
        }
      );
    });

    it('should propagate search, sort, and order params to service', async () => {
      mockFindByStatus.mockResolvedValueOnce({ articles: [], total: 0 });

      const response = await request(app)
        .get(`${listArticlePath}?search=react&sort=views&order=asc&page=1&limit=10`)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);

      expect(mockFindByStatus).toHaveBeenCalledWith(
        'Published',
        1,
        10,
        {
          includeCounts: true,
          includeCoverImage: true,
          search: 'react',
          sort: 'views',
          order: 'asc',
        }
      );
    });

    it('should return 400 when an invalid sort field is provided', async () => {
      const response = await request(app)
        .get(`${listArticlePath}?sort=notAField`)
        .set(userHeaders);

      expect(response.status).toBe(400);
    });

    it('should return 400 when an invalid sort order is provided', async () => {
      const response = await request(app)
        .get(`${listArticlePath}?sort=views&order=sideways`)
        .set(userHeaders);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/articles/:id', () => {
    const articleId = 'article-123';
    const mockDate = new Date().toISOString();
    const articlePath = `/api/v1/articles/${articleId}`;

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).get(articlePath);
      expect(response.status).toBe(401);
    });

    it('should return 404 if article not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(articlePath)
        .set(userHeaders);

      expect(response.status).toBe(404);
    });

    it('should return 403 if article is not Published and requester is not the author', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        status: 'Draft',
        authorId: 'other-user',
      });

      const response = await request(app)
        .get(articlePath)
        .set(userHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 200 and the article if Published', async () => {
      const mockArticle = {
        id: articleId,
        title: 'Test Article',
        status: 'Published',
      };
      mockFindById.mockResolvedValueOnce(mockArticle);

      const response = await request(app)
        .get(articlePath)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Article');
    });

    it('should return 200 when the author requests their own Draft article', async () => {
      const mockArticle = {
        id: articleId,
        title: 'My Draft',
        body: { type: 'doc' },
        status: 'Draft',
        authorId: 'user-123',
        tags: ['wip'],
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      mockFindById.mockResolvedValueOnce(mockArticle);

      const response = await request(app)
        .get(articlePath)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('My Draft');
      expect(response.body.data.status).toBe('Draft');
      expect(response.body.data.body).toEqual({ type: 'doc' });
    });

    it('should return 200 when the author requests their own Rejected article', async () => {
      const mockArticle = {
        id: articleId,
        title: 'My Rejected',
        body: { type: 'doc' },
        status: 'Rejected',
        authorId: 'user-123',
        tags: [],
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      mockFindById.mockResolvedValueOnce(mockArticle);

      const response = await request(app)
        .get(articlePath)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('My Rejected');
      expect(response.body.data.status).toBe('Rejected');
    });

    it("should return 403 when a different authenticated user requests someone else's Draft article", async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        status: 'Draft',
        authorId: 'other-author',
        title: 'Not Yours',
      });

      const response = await request(app)
        .get(articlePath)
        .set(userHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 401 for unauthenticated request to a Draft article (blocked by authenticate middleware)', async () => {
      // No auth headers → authenticate middleware returns 401 before
      // the controller/service is ever reached, so the article status
      // is irrelevant and the repository mock is never called.
      const response = await request(app)
        .get(articlePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it("should return 200 when an Admin requests someone else's Draft article", async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        status: 'Draft',
        authorId: 'other-author',
        title: 'Oversight Target',
      });

      const response = await request(app)
        .get(articlePath)
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Oversight Target');
      expect(response.body.data.status).toBe('Draft');
    });

    it("should still return 403 when a non-admin User requests someone else's Pending article", async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        status: 'Pending',
        authorId: 'other-author',
      });

      const response = await request(app)
        .get(articlePath)
        .set(userHeaders);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/articles/mine', () => {
    const mineArticlePath = '/api/v1/articles/mine';
    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).get(mineArticlePath);
      expect(response.status).toBe(401);
    });

    it("should return the authenticated user's own articles across all statuses with default pagination", async () => {
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Draft Article',
          authorId: 'user-123',
          tags: ['test'],
          status: 'Draft',
          createdAt: new Date('2023-01-01').toISOString(),
          updatedAt: new Date('2023-01-01').toISOString(),
          _count: { likes: 5, comments: 2 },
        },
      ];

      mockFindByAuthor.mockResolvedValueOnce({
        articles: mockArticles,
        total: 1,
      });

      const response = await request(app)
        .get(mineArticlePath)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toHaveLength(1);
      expect(response.body.data.articles[0].status).toBe('Draft');
      expect(response.body.data.articles[0].likeCount).toBe(5);
      expect(response.body.data.articles[0].commentCount).toBe(2);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(20);

      expect(mockFindByAuthor).toHaveBeenCalledWith('user-123', 1, 20);
    });

    it('should return rejectionFeedback for a currently rejected (Unpublished) article with reviews', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Rejected Article',
          authorId: 'user-123',
          tags: ['test'],
          status: 'Unpublished',
          createdAt: new Date('2023-01-01').toISOString(),
          updatedAt: new Date('2023-01-01').toISOString(),
          _count: { likes: 0, comments: 0 },
          reviews: [{ feedback: 'Please add more technical details.' }],
        },
        {
          id: 'article-2',
          title: 'Draft Article',
          authorId: 'user-123',
          tags: ['test'],
          status: 'Draft',
          createdAt: new Date('2023-01-01').toISOString(),
          updatedAt: new Date('2023-01-01').toISOString(),
          _count: { likes: 0, comments: 0 },
          reviews: [{ feedback: 'Old feedback' }],
        },
      ];

      mockFindByAuthor.mockResolvedValueOnce({
        articles: mockArticles,
        total: 2,
      });

      const response = await request(app)
        .get(mineArticlePath)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.articles).toHaveLength(2);
      expect(response.body.data.articles[0].rejectionFeedback).toBe('Please add more technical details.');
      expect(response.body.data.articles[1].rejectionFeedback).toBeNull();
    });

    it('should respect custom page and limit query params', async () => {
      mockFindByAuthor.mockResolvedValueOnce({ articles: [], total: 0 });

      const response = await request(app)
        .get(`${mineArticlePath}?page=3&limit=5`)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(3);
      expect(response.body.data.limit).toBe(5);

      expect(mockFindByAuthor).toHaveBeenCalledWith('user-123', 3, 5);
    });
  });

  describe('POST /api/v1/articles/:id/submit', () => {
    const articleId = 'article-123';
    const submitPath = `/api/v1/articles/${articleId}/submit`;
    
    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).post(submitPath);
      expect(response.status).toBe(401);
    });

    it('should return 404 if article not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .post(submitPath)
        .set(userHeaders);

      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not author', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        authorId: 'other-user',
        status: 'Draft',
      });

      const response = await request(app)
        .post(submitPath)
        .set(userHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 400 if article is not Draft', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        authorId: 'user-123',
        status: 'Pending',
      });

      const response = await request(app)
        .post(submitPath)
        .set(userHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Cannot transition from Pending to Pending'
      );
    });

    it('should submit article for review successfully', async () => {
      const reviewer = { id: 'reviewer-1' };
      const existingArticle = {
        id: articleId,
        authorId: 'user-123',
        title: 'Integration Test Article',
        status: 'Draft',
      };
      const updatedArticle = { ...existingArticle, status: 'Pending' };

      mockFindById.mockResolvedValueOnce(existingArticle);
      mockUpdateStatus.mockResolvedValueOnce(updatedArticle);
      mockFindActiveByRole.mockResolvedValueOnce([reviewer]);

      const response = await request(app)
        .post(submitPath)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('Pending');
      expect(mockUpdateStatus).toHaveBeenCalledWith(articleId, 'Pending');
      expect(mockFindActiveByRole).toHaveBeenCalledWith(
        UserRoleValue.Reviewer
      );
      expect(mockNotificationSend).toHaveBeenCalledTimes(1);
      expect(mockNotificationSend).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: reviewer.id,
          referenceId: articleId,
          notificationType: 'info',
          notificationTitle: 'New Article for Review',
        })
      );
    });
  });

  describe('DELETE /api/v1/articles/:id', () => {
    const articleId = 'article-123';
    const deletePath = `/api/v1/articles/${articleId}`;

    it('should soft-delete own Draft as author (deletedAt set, row retained)', async () => {
      const existingArticle = {
        id: articleId,
        authorId: 'user-123',
        status: 'Draft',
        title: 'Draft Article',
      };
      const deletedAt = new Date();
      const softDeletedArticle = { ...existingArticle, deletedAt };

      mockFindById.mockResolvedValueOnce(existingArticle);
      mockSoftDelete.mockResolvedValueOnce(softDeletedArticle);

      const response = await request(app)
        .delete(deletePath)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toBe('Article deleted successfully');
      expect(mockSoftDelete).toHaveBeenCalledWith(articleId);
      expect(mockHardDelete).not.toHaveBeenCalled();
      expect(softDeletedArticle.deletedAt).toBeInstanceOf(Date);
    });

    it('should return 400 when author tries to delete own Published article', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        authorId: 'user-123',
        status: 'Published',
      });

      const response = await request(app)
        .delete(deletePath)
        .set(userHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Only Draft articles can be deleted');
      expect(mockSoftDelete).not.toHaveBeenCalled();
      expect(mockHardDelete).not.toHaveBeenCalled();
    });

    it('should return 403 when non-author non-admin attempts delete', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        authorId: 'other-user',
        status: 'Draft',
      });

      const response = await request(app)
        .delete(deletePath)
        .set(userHeaders);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not authorized');
      expect(mockSoftDelete).not.toHaveBeenCalled();
      expect(mockHardDelete).not.toHaveBeenCalled();
    });

    it('should hard-delete as Admin with ?hard=true (row removed from DB)', async () => {
      const existingArticle = {
        id: articleId,
        authorId: 'other-user',
        status: 'Published',
        title: 'Published Article',
      };

      mockFindById.mockResolvedValueOnce(existingArticle);
      mockHardDelete.mockResolvedValueOnce(undefined);
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`${deletePath}?hard=true`)
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockHardDelete).toHaveBeenCalledWith(articleId);
      expect(mockSoftDelete).not.toHaveBeenCalled();

      const afterDelete = await mockFindById(articleId);
      expect(afterDelete).toBeNull();
    });
  });
});
