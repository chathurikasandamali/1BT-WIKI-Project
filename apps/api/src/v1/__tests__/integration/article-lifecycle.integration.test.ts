import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import { createTestUserHeaders } from '../helpers/auth.helpers.js';
import type { CreateNotificationInput } from '@models/notificationTypes.js';
import { ArticleStatusValue } from '@models/article.types.js';
import type { UserRole } from '@/types/userTypes.js';
import { UserRoleValue } from '@/types/userTypes.js';
import { HttpStatusCode } from '@/v1/utils/httpStatus.js';

const REVIEWER_ID = 'reviewer-1';
const ADMIN_ID = 'admin-1';

// 1. Mock DB and Prisma
await jest.unstable_mockModule('@repo/db', () => ({
  TechTalkStatus: { draft: 'draft', published: 'published', unpublished: 'unpublished' },
  ReviewStatus: { Pending: 'Pending', Approved: 'Approved', Rejected: 'Rejected' },
  ReviewCommentStatus: { Open: 'Open', Resolved: 'Resolved' },
  ArticleStatus: { Draft: 'Draft', Pending: 'Pending', Published: 'Published', Unpublished: 'Unpublished' },
  prisma: {
    user: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    article: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn(), count: jest.fn() },
    articleAttachment: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    review: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    articleReview: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    notification: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
  },
}));

await jest.unstable_mockModule('@/db/index.js', () => ({
  default: { query: jest.fn<any>().mockResolvedValue({ rows: [] }), connect: jest.fn(), end: jest.fn() },
  pool: { query: jest.fn<any>().mockResolvedValue({ rows: [] }), connect: jest.fn(), end: jest.fn() },
}));

// 2. Mock Auth Middleware
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

// 3. Stateful Mocking for Article Repository
const articleStore = new Map<string, any>();

const MockArticleRepository = {
  create: jest.fn<any>(async (data: any) => {
    const id = 'article-' + Date.now();
    const article = {
      id,
      ...data,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      _count: { likes: 0, comments: 0 }
    };
    articleStore.set(id, article);
    return article;
  }),
  findById: jest.fn<any>(async (id: string) => {
    return articleStore.get(id) || null;
  }),
  updateStatus: jest.fn<any>(async (id: string, status: string) => {
    const article = articleStore.get(id);
    if (!article) return null;
    article.status = status;
    articleStore.set(id, article);
    return article;
  }),
  findByStatus: jest.fn<any>(async (status?: string) => {
    const articles = Array.from(articleStore.values()).filter(
      (article) => status === undefined || article.status === status
    );
    return { articles, total: articles.length };
  })
};

await jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  default: MockArticleRepository,
  ArticleRepository: jest.fn().mockImplementation(() => MockArticleRepository),
}));

const MockArticleReviewRepository = {
  create: jest.fn<any>(async () => ({})),
  findPendingWithComments: jest.fn<any>().mockResolvedValue(null),
  updateStatus: jest.fn<any>().mockResolvedValue({}),
  findById: jest.fn<any>().mockResolvedValue(null),
};

const mockReviewCreate = MockArticleReviewRepository.create;

await jest.unstable_mockModule('@repositories/articleReviewRepository.js', () => ({
  ArticleReviewRepository: jest.fn().mockImplementation(() => MockArticleReviewRepository),
  default: jest.fn().mockImplementation(() => MockArticleReviewRepository),
}));

// The real userRepository default-exports a plain object of functions (no class),
// so the mock must be a plain object too — a constructor-style mock leaves the
// methods undefined at call sites like UserRepository.findManyByIds().
const mockFindActiveByRole = jest
  .fn<(role: UserRole) => Promise<unknown[]>>()
  .mockResolvedValue([]);

const MockUserRepository = {
  findById: jest.fn<any>(async () => ({ id: 'author-1', name: 'Author', email: 'author@example.com' })),
  findManyByIds: jest.fn<any>(async () => [
    { id: 'author-1', name: 'Author', email: 'author@example.com' },
  ]),
  findActiveByRole: mockFindActiveByRole,
};

await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: MockUserRepository,
}));

// Mock B2 Client
await jest.unstable_mockModule('@v1/lib/b2Client.js', () => ({
  default: {
    uploadFile: jest.fn<any>().mockResolvedValue({ fileId: 'test', fileUrl: 'test' }),
  },
}));

// Mock NotificationService to avoid Pusher
const mockNotificationSend = jest
  .fn<(payload: CreateNotificationInput) => Promise<void>>()
  .mockResolvedValue(undefined);

await jest.unstable_mockModule('@services/notificationService.js', () => ({
  default: {
    send: mockNotificationSend,
  }
}));

const mockPregenerateFallbackQuiz = jest
  .fn<(articleId: string) => Promise<void>>()
  .mockResolvedValue(undefined);

await jest.unstable_mockModule('@services/quizService.js', () => ({
  default: {
    pregenerateFallbackQuiz: mockPregenerateFallbackQuiz,
  },
}));

const { default: app, appReady } = await import('@/app.js');
const { default: request } = await import('supertest');

describe('Article Lifecycle Integration', () => {
  beforeAll(async () => {
    await appReady;
  });

  const authorHeaders = createTestUserHeaders({
    userId: 'author-1',
    email: 'author@example.com',
    role: UserRoleValue.User,
  });

  const reviewerHeaders = createTestUserHeaders({
    userId: REVIEWER_ID,
    email: 'reviewer@example.com',
    role: UserRoleValue.Reviewer,
  });

  const adminHeaders = createTestUserHeaders({
    userId: ADMIN_ID,
    email: 'admin@example.com',
    role: UserRoleValue.Admin,
  });

  const readerHeaders = createTestUserHeaders({
    userId: 'reader-1',
    email: 'reader@example.com',
    role: UserRoleValue.User,
  });

  it('moves an article from Draft to Pending to Approved to Published', async () => {
    const createRes = await request(app)
      .post('/api/v1/articles')
      .set(authorHeaders)
      .field('data', JSON.stringify({ title: 'Lifecycle Test', body: { type: 'doc', content: [] }, tags: ['test'] }));

    expect(createRes.status).toBe(HttpStatusCode.CREATED);
    expect(createRes.body.success).toBe(true);

    const articleId = createRes.body.data.id;
    expect(articleId).toBeDefined();
    expect(createRes.body.data.status).toBe(ArticleStatusValue.Draft);

    mockFindActiveByRole.mockResolvedValueOnce([{ id: REVIEWER_ID }]);

    const submitRes = await request(app)
      .post(`/api/v1/articles/${articleId}/submit`)
      .set(authorHeaders);

    expect(submitRes.status).toBe(HttpStatusCode.OK);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.status).toBe(ArticleStatusValue.Pending);
    expect(mockFindActiveByRole).toHaveBeenCalledWith(
      UserRoleValue.Reviewer
    );
    expect(mockNotificationSend).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: REVIEWER_ID,
        referenceId: articleId,
        notificationType: 'info',
        notificationTitle: 'New Article for Review',
      })
    );

    const approveRes = await request(app)
      .patch(`/api/v1/reviewer/articles/${articleId}/approve`)
      .set(reviewerHeaders);

    expect(approveRes.status).toBe(HttpStatusCode.OK);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe(ArticleStatusValue.Approved);
    expect(mockReviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId,
        reviewerId: REVIEWER_ID,
        status: 'Approved',
      })
    );
    expect(mockPregenerateFallbackQuiz).not.toHaveBeenCalled();

    const approvedListRes = await request(app)
      .get('/api/v1/articles')
      .set(readerHeaders);

    expect(approvedListRes.status).toBe(200);
    expect(approvedListRes.body.data.articles).toHaveLength(0);

    const approvedDetailRes = await request(app)
      .get(`/api/v1/articles/${articleId}`)
      .set(readerHeaders);

    expect(approvedDetailRes.status).toBe(403);
    expect(approvedDetailRes.body.error).toBe('Article not available');

    const reviewerPublishRes = await request(app)
      .patch(`/api/v1/admin/articles/${articleId}/publish`)
      .set(reviewerHeaders);

    expect(reviewerPublishRes.status).toBe(403);
    expect(reviewerPublishRes.body.error).toBe('Insufficient permissions');
    expect(articleStore.get(articleId)?.status).toBe(
      ArticleStatusValue.Approved
    );
    expect(mockPregenerateFallbackQuiz).not.toHaveBeenCalled();

    const publishRes = await request(app)
      .patch(`/api/v1/admin/articles/${articleId}/publish`)
      .set(adminHeaders);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.success).toBe(true);
    expect(publishRes.body.data.status).toBe(ArticleStatusValue.Published);
    expect(publishRes.body.message).toBe('Article published successfully.');
    expect(mockPregenerateFallbackQuiz).toHaveBeenCalledWith(articleId);

    const publishedListRes = await request(app)
      .get('/api/v1/articles')
      .set(readerHeaders);

    expect(publishedListRes.status).toBe(200);
    expect(publishedListRes.body.data.articles).toHaveLength(1);
    expect(publishedListRes.body.data.articles[0].id).toBe(articleId);
    expect(publishedListRes.body.data.articles[0].status).toBe(
      ArticleStatusValue.Published
    );

    const getRes = await request(app)
      .get(`/api/v1/articles/${articleId}`)
      .set(readerHeaders);

    expect(getRes.status).toBe(HttpStatusCode.OK);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.status).toBe(ArticleStatusValue.Published);
    expect(getRes.body.data.id).toBe(articleId);
  });
});
