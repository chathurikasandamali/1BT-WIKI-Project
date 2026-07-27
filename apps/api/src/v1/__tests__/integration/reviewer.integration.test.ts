// apps/api/src/v1/__tests__/integration/reviewer.integration.test.ts

import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from '@jest/globals';

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
    articleReview: { create: jest.fn(), findFirst: jest.fn() },
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

      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
    }
  ),
}));

const MockArticleRepository = {
  findByStatus: jest
    .fn<() => Promise<unknown>>()
    .mockResolvedValue({ articles: [], total: 0 }),
  findById: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
  updateStatus: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
};

const MockArticleReviewRepository = {
  create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
};

const MockUserRepository = {
  findById: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
  findManyByIds: jest.fn<() => Promise<unknown>>().mockResolvedValue([]),
};

const mockUserCtor = jest.fn().mockImplementation(() => MockUserRepository);
const MockUserRepositoryImpl = Object.assign(
  mockUserCtor,
  MockUserRepository
);

await jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  ArticleRepository: jest.fn().mockImplementation(() => MockArticleRepository),
  default: jest.fn().mockImplementation(() => MockArticleRepository),
}));

await jest.unstable_mockModule(
  '@repositories/articleReviewRepository.js',
  () => ({
    ArticleReviewRepository: jest
      .fn()
      .mockImplementation(() => MockArticleReviewRepository),
    default: jest.fn().mockImplementation(() => MockArticleReviewRepository),
  })
);

await jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  UserRepository: MockUserRepositoryImpl,
  default: MockUserRepositoryImpl,
}));

const { default: app, appReady } = await import('../../../app.js');
const { default: request } = await import('supertest');

const mockFindByStatus = MockArticleRepository.findByStatus as jest.Mock<any>;
const mockFindById = MockArticleRepository.findById as jest.Mock<any>;
const mockUpdateStatus = MockArticleRepository.updateStatus as jest.Mock<any>;
const mockReviewCreate = MockArticleReviewRepository.create as jest.Mock<any>;
const mockUserFindById = MockUserRepository.findById as jest.Mock<any>;
const mockUserFindManyByIds =
  MockUserRepository.findManyByIds as jest.Mock<any>;
const mockDate = new Date().toISOString();
const mockAuthor = {
  id: 'user-1',
  name: 'Author Name',
  email: 'author@example.com',
};

const reviewerHeaders = {
  'x-test-user-id': 'reviewer-1',
  'x-test-user-email': 'reviewer@example.com',
  'x-test-user-role': 'Reviewer',
};

const userHeaders = {
  'x-test-user-id': 'user-123',
  'x-test-user-email': 'user@example.com',
  'x-test-user-role': 'User',
};

describe('Reviewer API Integration', () => {
  beforeAll(async () => {
    await appReady;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByStatus.mockResolvedValue({ articles: [], total: 0 });
    mockFindById.mockResolvedValue(null);
    mockUpdateStatus.mockResolvedValue({});
    mockReviewCreate.mockResolvedValue({});
    mockUserFindById.mockResolvedValue(mockAuthor);
    mockUserFindManyByIds.mockResolvedValue([mockAuthor]);
  });

  describe('GET /api/v1/reviewer/articles/pending', () => {
    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).get(
        '/api/v1/reviewer/articles/pending'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for a non-Reviewer role', async () => {
      const response = await request(app)
        .get('/api/v1/reviewer/articles/pending')
        .set(userHeaders);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(mockFindByStatus).not.toHaveBeenCalled();
    });

    it('should return 200 with pending articles for a Reviewer', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Pending Article',
          body: { type: 'doc' },
          status: 'Pending',
          authorId: 'user-1',
          tags: ['review'],
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];

      mockFindByStatus.mockResolvedValueOnce({
        articles: mockArticles,
        total: 1,
      });

      const response = await request(app)
        .get('/api/v1/reviewer/articles/pending')
        .set(reviewerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Pending articles retrieved successfully'
      );
      expect(response.body.data.articles).toHaveLength(1);
      expect(response.body.data.articles[0].status).toBe('Pending');
      expect(response.body.data.articles[0].authorName).toBe('Author Name');
      expect(response.body.data.articles[0].authorEmail).toBe('author@example.com');
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(20);
      expect(mockFindByStatus).toHaveBeenCalledWith('Pending', 1, 20);
    });
  });

  describe('PATCH /api/v1/reviewer/articles/:id/approve', () => {
    const articleId = 'article-123';
    const approvePath = `/api/v1/reviewer/articles/${articleId}/approve`;

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).patch(approvePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for a non-Reviewer non-Admin role', async () => {
      const response = await request(app).patch(approvePath).set(userHeaders);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('should return 404 when article does not exist', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(approvePath)
        .set(reviewerHeaders);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Article not found');
      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(mockReviewCreate).not.toHaveBeenCalled();
    });

    it('should return 400 when article is not Pending', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        title: 'Draft Article',
        status: 'Draft',
        authorId: 'user-1',
      });

      const response = await request(app)
        .patch(approvePath)
        .set(reviewerHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Only Pending articles can be approved');
      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(mockReviewCreate).not.toHaveBeenCalled();
    });

    it('should return 200 and publish a Pending article for a Reviewer', async () => {
      const pendingArticle = {
        id: articleId,
        title: 'Pending Article',
        body: { type: 'doc' },
        status: 'Pending',
        authorId: 'user-1',
        tags: [],
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      const publishedArticle = { ...pendingArticle, status: 'Published' };

      mockFindById.mockResolvedValueOnce(pendingArticle);
      mockUpdateStatus.mockResolvedValueOnce(publishedArticle);
      mockReviewCreate.mockResolvedValueOnce({
        id: 'review-1',
        articleId,
        reviewerId: 'reviewer-1',
        reviewStatus: 'Approved',
      });

      const response = await request(app)
        .patch(approvePath)
        .set(reviewerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Article approved and published');
      expect(response.body.data.status).toBe('Published');
      expect(mockUpdateStatus).toHaveBeenCalledWith(articleId, 'Published');
      expect(mockReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          articleId,
          reviewerId: 'reviewer-1',
          status: 'Approved',
          feedback: null,
          createdBy: 'reviewer-1',
        })
      );
    });
  });

  describe('PATCH /api/v1/reviewer/articles/:id/reject', () => {
    const articleId = 'article-123';
    const rejectPath = `/api/v1/reviewer/articles/${articleId}/reject`;

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).patch(rejectPath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for a non-Reviewer non-Admin role', async () => {
      const response = await request(app)
        .patch(rejectPath)
        .set(userHeaders)
        .send({ feedback: 'this is a valid reject feedback' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('should return 400 when feedback is missing or under 10 characters', async () => {
      const response = await request(app)
        .patch(rejectPath)
        .set(reviewerHeaders)
        .send({ feedback: 'short' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Rejection feedback must be at least 10 characters'
      );
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('should return 404 when article does not exist', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(rejectPath)
        .set(reviewerHeaders)
        .send({ feedback: 'this is a valid reject feedback' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Article not found');
      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(mockReviewCreate).not.toHaveBeenCalled();
    });

    it('should return 400 when article is not Pending', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        title: 'Draft Article',
        status: 'Draft',
        authorId: 'user-1',
      });

      const response = await request(app)
        .patch(rejectPath)
        .set(reviewerHeaders)
        .send({ feedback: 'this is a valid reject feedback' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Only Pending articles can be rejected');
      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(mockReviewCreate).not.toHaveBeenCalled();
    });

    it('should return 200 and reject a Pending article for a Reviewer', async () => {
      const pendingArticle = {
        id: articleId,
        title: 'Pending Article',
        body: { type: 'doc' },
        status: 'Pending',
        authorId: 'user-1',
        tags: [],
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      const rejectedArticle = { ...pendingArticle, status: 'Unpublished' };

      mockFindById.mockResolvedValueOnce(pendingArticle);
      mockUpdateStatus.mockResolvedValueOnce(rejectedArticle);
      mockReviewCreate.mockResolvedValueOnce({
        id: 'review-1',
        articleId,
        reviewerId: 'reviewer-1',
        reviewStatus: 'Rejected',
      });

      const response = await request(app)
        .patch(rejectPath)
        .set(reviewerHeaders)
        .send({ feedback: 'this is a valid reject feedback' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Article rejected');
      expect(response.body.data.status).toBe('Unpublished');
      expect(mockUpdateStatus).toHaveBeenCalledWith(articleId, 'Unpublished');
      expect(mockReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          articleId,
          reviewerId: 'reviewer-1',
          status: 'Rejected',
          feedback: 'this is a valid reject feedback',
          createdBy: 'reviewer-1',
        })
      );
    });
  });

  describe('GET /api/v1/reviewer/articles/:id', () => {
    const articleId = 'article-123';
    const viewPath = `/api/v1/reviewer/articles/${articleId}`;

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).get(viewPath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for a non-Reviewer non-Admin role', async () => {
      const response = await request(app)
        .get(viewPath)
        .set(userHeaders);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('should return 404 when article does not exist', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(viewPath)
        .set(reviewerHeaders);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Article not found');
    });

    it('should return 400 when article is not Pending', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        title: 'Draft Article',
        status: 'Draft',
        authorId: 'user-1',
      });

      const response = await request(app)
        .get(viewPath)
        .set(reviewerHeaders);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Only Pending articles can be reviewed');
    });

    it('should return 200 with full article for a Pending article', async () => {
      const pendingArticle = {
        id: articleId,
        title: 'Pending Article',
        body: { type: 'doc', content: [{ type: 'paragraph', text: 'Full article body content' }] },
        status: 'Pending',
        authorId: 'user-1',
        tags: ['tech', 'wiki'],
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      mockFindById.mockResolvedValueOnce(pendingArticle);

      const response = await request(app)
        .get(viewPath)
        .set(reviewerHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Article retrieved for review');
      expect(response.body.data.id).toBe(articleId);
      expect(response.body.data.title).toBe('Pending Article');
      expect(response.body.data.body).toEqual(pendingArticle.body);
      expect(response.body.data.tags).toEqual(['tech', 'wiki']);
      expect(response.body.data.status).toBe('Pending');
      expect(response.body.data.authorName).toBe('Author Name');
      expect(response.body.data.authorEmail).toBe('author@example.com');
      expect(mockFindById).toHaveBeenCalledWith(articleId);
    });
  });
});
