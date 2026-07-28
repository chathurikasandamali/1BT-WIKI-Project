import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import { createTestUserHeaders } from '../helpers/auth.helpers.js';

// 1. Mock DB and Prisma
await jest.unstable_mockModule('@repo/db', () => ({
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
  findByStatus: jest.fn<any>(async () => ({ articles: Array.from(articleStore.values()), total: articleStore.size }))
};

await jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  default: MockArticleRepository,
  ArticleRepository: jest.fn().mockImplementation(() => MockArticleRepository),
}));

const MockArticleReviewRepository = {
  create: jest.fn<any>(async () => ({})),
};

await jest.unstable_mockModule('@repositories/articleReviewRepository.js', () => ({
  ArticleReviewRepository: jest.fn().mockImplementation(() => MockArticleReviewRepository),
  default: jest.fn().mockImplementation(() => MockArticleReviewRepository),
}));

const MockUserRepository = {
  findById: jest.fn<any>(async () => ({ id: 'author-1', name: 'Author', email: 'author@example.com' })),
};

await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  UserRepository: jest.fn().mockImplementation(() => MockUserRepository),
  default: jest.fn().mockImplementation(() => MockUserRepository),
}));

// Mock B2 Client
await jest.unstable_mockModule('@v1/lib/b2Client.js', () => ({
  default: {
    uploadFile: jest.fn<any>().mockResolvedValue({ fileId: 'test', fileUrl: 'test' }),
  },
}));

// Mock NotificationService to avoid Pusher
await jest.unstable_mockModule('@services/notificationService.js', () => ({
  default: {
    send: jest.fn<any>().mockResolvedValue(undefined),
  }
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
    role: 'User',
  });

  const reviewerHeaders = createTestUserHeaders({
    userId: 'reviewer-1',
    email: 'reviewer@example.com',
    role: 'Reviewer',
  });

  it('moves an article from Draft to Pending to Published', async () => {
    // 1. Author creates an article
    const createRes = await request(app)
      .post('/api/v1/articles')
      .set(authorHeaders)
      .field('data', JSON.stringify({ title: 'Lifecycle Test', body: { type: 'doc', content: [] }, tags: ['test'] }));

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    
    const articleId = createRes.body.data.id;
    expect(articleId).toBeDefined();
    expect(createRes.body.data.status).toBe('Draft');

    // 2. Author submits the article for review
    const submitRes = await request(app)
      .post(`/api/v1/articles/${articleId}/submit`)
      .set(authorHeaders);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.status).toBe('Pending');

    // 3. Reviewer approves the article
    const approveRes = await request(app)
      .patch(`/api/v1/reviewer/articles/${articleId}/approve`)
      .set(reviewerHeaders);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('Published');

    // 4. Fetch the article and verify its final Published state
    const getRes = await request(app)
      .get(`/api/v1/articles/${articleId}`)
      .set(authorHeaders);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.status).toBe('Published');
    expect(getRes.body.data.id).toBe(articleId);
  });
});
