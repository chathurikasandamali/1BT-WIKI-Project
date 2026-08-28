// apps/api/src/v1/__tests__/integration/comments.integration.test.ts

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
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
};

await jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  default: MockArticleRepository,
  ArticleRepository: jest.fn().mockImplementation(() => MockArticleRepository),
}));

await jest.unstable_mockModule('@repositories/commentRepository.js', () => ({
  default: {
    create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    findByArticleId: jest.fn<() => Promise<unknown>>().mockResolvedValue([]),
    findById: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
    update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    remove: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    findPending: jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({ comments: [], total: 0 }),
    approve: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    reject: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
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
const { default: CommentRepository } =
  await import('@repositories/commentRepository.js');
const { default: NotificationRepository } =
  await import('@repositories/notificationRepository.js');

const mockFindById = ArticleRepository.findById as jest.Mock<any>;
const mockCreateComment = CommentRepository.create as jest.Mock<any>;
const mockFindByArticleId = CommentRepository.findByArticleId as jest.Mock<any>;
const mockFindCommentById = CommentRepository.findById as jest.Mock<any>;
const mockUpdateComment = CommentRepository.update as jest.Mock<any>;
const mockRemoveComment = CommentRepository.remove as jest.Mock<any>;
const mockFindPendingComments = CommentRepository.findPending as jest.Mock<any>;
const mockApproveComment = CommentRepository.approve as jest.Mock<any>;
const mockRejectComment = CommentRepository.reject as jest.Mock<any>;
const mockCreateNotification = NotificationRepository.create as jest.Mock<any>;

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

describe('Comments API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/articles/:id/comments', () => {
    const articleId = 'article-123';

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app)
        .post(`/api/v1/articles/${articleId}/comments`)
        .send({ body: 'Nice article' });

      expect(response.status).toBe(401);
    });

    it('should return 400 if body is empty', async () => {
      const response = await request(app)
        .post(`/api/v1/articles/${articleId}/comments`)
        .set(userHeaders)
        .send({ body: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 404 if article not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .post(`/api/v1/articles/${articleId}/comments`)
        .set(userHeaders)
        .send({ body: 'Nice article' });

      expect(response.status).toBe(404);
    });

    it('should return 403 if article is not Published', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        authorId: 'other-user',
        status: 'Draft',
      });

      const response = await request(app)
        .post(`/api/v1/articles/${articleId}/comments`)
        .set(userHeaders)
        .send({ body: 'Nice article' });

      expect(response.status).toBe(403);
    });

    it('should create the comment as Pending without notifying anyone on a Published article', async () => {
      const article = {
        id: articleId,
        authorId: 'other-user',
        title: 'Test Article',
        status: 'Published',
      };
      const createdComment = {
        id: 'comment-123',
        articleId,
        createdBy: 'user-123',
        body: 'Nice article',
        status: 'Pending',
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindById.mockResolvedValueOnce(article);
      mockCreateComment.mockResolvedValueOnce(createdComment);

      const response = await request(app)
        .post(`/api/v1/articles/${articleId}/comments`)
        .set(userHeaders)
        .send({ body: 'Nice article' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.body).toBe('Nice article');
      expect(response.body.data.status).toBe('Pending');
      expect(mockCreateComment).toHaveBeenCalledWith({
        articleId,
        createdBy: 'user-123',
        body: 'Nice article',
      });

      // No notification fires at creation time — only once an Admin approves.
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/articles/:id/comments', () => {
    const articleId = 'article-123';

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).get(
        `/api/v1/articles/${articleId}/comments`
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 if article not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/v1/articles/${articleId}/comments`)
        .set(userHeaders);

      expect(response.status).toBe(404);
    });

    it('should return 403 if article is not Published and requester is not its author', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        authorId: 'other-user',
        status: 'Draft',
      });

      const response = await request(app)
        .get(`/api/v1/articles/${articleId}/comments`)
        .set(userHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 200 if article is not Published but requester is its author', async () => {
      mockFindById.mockResolvedValueOnce({
        id: articleId,
        authorId: 'user-123',
        status: 'Draft',
      });
      mockFindByArticleId.mockResolvedValueOnce([]);

      const response = await request(app)
        .get(`/api/v1/articles/${articleId}/comments`)
        .set(userHeaders);

      expect(response.status).toBe(200);
    });

    it('should return 200 with comments in chronological order including author name and image', async () => {
      const article = {
        id: articleId,
        authorId: 'other-user',
        title: 'Test Article',
        status: 'Published',
      };
      const comments = [
        {
          id: 'comment-1',
          articleId,
          createdBy: 'user-123',
          body: 'First comment',
          createdAt: new Date('2026-07-01T00:00:00Z'),
          updatedAt: new Date('2026-07-01T00:00:00Z'),
          authorName: 'Jane Doe',
          authorImage: 'https://example.com/pic.png',
        },
        {
          id: 'comment-2',
          articleId,
          createdBy: 'other-user',
          body: 'Second comment',
          createdAt: new Date('2026-07-02T00:00:00Z'),
          updatedAt: new Date('2026-07-02T00:00:00Z'),
          authorName: 'No Picture User',
          authorImage: null,
        },
      ];

      mockFindById.mockResolvedValueOnce(article);
      mockFindByArticleId.mockResolvedValueOnce(comments);

      const response = await request(app)
        .get(`/api/v1/articles/${articleId}/comments`)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].authorName).toBe('Jane Doe');
      expect(response.body.data[0].authorImage).toBe(
        'https://example.com/pic.png'
      );
      expect(response.body.data[1].authorName).toBe('No Picture User');
      expect(response.body.data[1].authorImage).toBeNull();
    });
  });

  describe('PATCH /api/v1/articles/:id/comments/:commentId', () => {
    const articleId = 'article-123';
    const commentId = 'comment-123';

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app)
        .patch(`/api/v1/articles/${articleId}/comments/${commentId}`)
        .send({ body: 'Updated body' });

      expect(response.status).toBe(401);
    });

    it('should return 400 if body is empty', async () => {
      const response = await request(app)
        .patch(`/api/v1/articles/${articleId}/comments/${commentId}`)
        .set(userHeaders)
        .send({ body: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 400 if body exceeds 5000 characters', async () => {
      const response = await request(app)
        .patch(`/api/v1/articles/${articleId}/comments/${commentId}`)
        .set(userHeaders)
        .send({ body: 'a'.repeat(5001) });

      expect(response.status).toBe(400);
    });

    it('should return 404 if comment is not found', async () => {
      mockFindCommentById.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(`/api/v1/articles/${articleId}/comments/${commentId}`)
        .set(userHeaders)
        .send({ body: 'Updated body' });

      expect(response.status).toBe(404);
    });

    it('should return 403 if requester is not the comment owner', async () => {
      mockFindCommentById.mockResolvedValueOnce({
        id: commentId,
        articleId,
        createdBy: 'other-user',
        body: 'Original body',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .patch(`/api/v1/articles/${articleId}/comments/${commentId}`)
        .set(userHeaders)
        .send({ body: 'Updated body' });

      expect(response.status).toBe(403);
    });

    it('should update the comment when requester is its owner', async () => {
      const existingComment = {
        id: commentId,
        articleId,
        createdBy: 'user-123',
        body: 'Original body',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedComment = { ...existingComment, body: 'Updated body' };

      mockFindCommentById.mockResolvedValueOnce(existingComment);
      mockUpdateComment.mockResolvedValueOnce(updatedComment);

      const response = await request(app)
        .patch(`/api/v1/articles/${articleId}/comments/${commentId}`)
        .set(userHeaders)
        .send({ body: 'Updated body' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.body).toBe('Updated body');
      expect(mockUpdateComment).toHaveBeenCalledWith(commentId, 'Updated body');
    });
  });

  describe('DELETE /api/v1/articles/:id/comments/:commentId', () => {
    const articleId = 'article-123';
    const commentId = 'comment-123';

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).delete(
        `/api/v1/articles/${articleId}/comments/${commentId}`
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 if comment is not found', async () => {
      mockFindCommentById.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/v1/articles/${articleId}/comments/${commentId}`)
        .set(userHeaders);

      expect(response.status).toBe(404);
    });

    it('should return 403 if requester is not the comment owner', async () => {
      mockFindCommentById.mockResolvedValueOnce({
        id: commentId,
        articleId,
        createdBy: 'other-user',
        body: 'Original body',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .delete(`/api/v1/articles/${articleId}/comments/${commentId}`)
        .set(userHeaders);

      expect(response.status).toBe(403);
      expect(mockRemoveComment).not.toHaveBeenCalled();
    });

    it('should delete the comment when requester is its owner', async () => {
      mockFindCommentById.mockResolvedValueOnce({
        id: commentId,
        articleId,
        createdBy: 'user-123',
        body: 'Original body',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .delete(`/api/v1/articles/${articleId}/comments/${commentId}`)
        .set(userHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: null,
        message: 'Comment deleted successfully',
      });
      expect(mockRemoveComment).toHaveBeenCalledWith(commentId);
    });
  });

  describe('GET /api/v1/admin/comments/pending', () => {
    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).get('/api/v1/admin/comments/pending');

      expect(response.status).toBe(401);
    });

    it('should return 403 if requester is not an Admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/comments/pending')
        .set(userHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 200 with pending comments for an Admin', async () => {
      const pendingComments = [
        {
          id: 'comment-1',
          articleId: 'article-123',
          articleTitle: 'Test Article',
          createdBy: 'user-123',
          authorName: 'Jane Doe',
          authorImage: null,
          body: 'Nice article',
          status: 'Pending',
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockFindPendingComments.mockResolvedValueOnce({
        comments: pendingComments,
        total: 1,
      });

      const response = await request(app)
        .get('/api/v1/admin/comments/pending')
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
    });
  });

  describe('PATCH /api/v1/admin/comments/:commentId/approve', () => {
    const commentId = 'comment-123';

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).patch(
        `/api/v1/admin/comments/${commentId}/approve`
      );

      expect(response.status).toBe(401);
    });

    it('should return 403 if requester is not an Admin', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/comments/${commentId}/approve`)
        .set(userHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 400 if comment is not Pending', async () => {
      mockFindCommentById.mockResolvedValueOnce({
        id: commentId,
        status: 'Approved',
      });

      const response = await request(app)
        .patch(`/api/v1/admin/comments/${commentId}/approve`)
        .set(adminHeaders);

      expect(response.status).toBe(400);
    });

    it('should approve the comment and notify the comment author', async () => {
      const pendingComment = {
        id: commentId,
        articleId: 'article-123',
        createdBy: 'user-123',
        status: 'Pending',
      };
      const approvedComment = {
        ...pendingComment,
        status: 'Approved',
        reviewedBy: 'admin-1',
        reviewedAt: new Date(),
      };
      const article = {
        id: 'article-123',
        authorId: 'article-author',
        title: 'Test Article',
      };

      mockFindCommentById.mockResolvedValueOnce(pendingComment);
      mockApproveComment.mockResolvedValueOnce(approvedComment);
      mockFindById.mockResolvedValueOnce(article);

      const response = await request(app)
        .patch(`/api/v1/admin/comments/${commentId}/approve`)
        .set(adminHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('Approved');
      expect(mockApproveComment).toHaveBeenCalledWith(commentId, 'admin-1');

      await new Promise((resolve) => setImmediate(resolve));
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-123',
          notificationReferenceType: 'comment',
        })
      );
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'article-author',
          notificationReferenceType: 'comment',
        })
      );
    });
  });

  describe('PATCH /api/v1/admin/comments/:commentId/reject', () => {
    const commentId = 'comment-123';

    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).patch(
        `/api/v1/admin/comments/${commentId}/reject`
      );

      expect(response.status).toBe(401);
    });

    it('should return 403 if requester is not an Admin', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/comments/${commentId}/reject`)
        .set(userHeaders);

      expect(response.status).toBe(403);
    });

    it('should return 400 if reason is missing', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/comments/${commentId}/reject`)
        .set(adminHeaders);

      expect(response.status).toBe(400);
    });

    it('should return 400 if comment is not Pending', async () => {
      mockFindCommentById.mockResolvedValueOnce({
        id: commentId,
        status: 'Rejected',
      });

      const response = await request(app)
        .patch(`/api/v1/admin/comments/${commentId}/reject`)
        .set(adminHeaders)
        .send({ reason: 'This comment violates community guidelines' });

      expect(response.status).toBe(400);
    });

    it('should reject the comment and notify the comment author', async () => {
      const pendingComment = {
        id: commentId,
        articleId: 'article-123',
        createdBy: 'user-123',
        status: 'Pending',
      };
      const rejectedComment = {
        ...pendingComment,
        status: 'Rejected',
        reviewedBy: 'admin-1',
        reviewedAt: new Date(),
        rejectionReason: 'This comment violates community guidelines',
      };

      mockFindCommentById.mockResolvedValueOnce(pendingComment);
      mockRejectComment.mockResolvedValueOnce(rejectedComment);

      const response = await request(app)
        .patch(`/api/v1/admin/comments/${commentId}/reject`)
        .set(adminHeaders)
        .send({ reason: 'This comment violates community guidelines' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('Rejected');
      expect(mockRejectComment).toHaveBeenCalledWith(
        commentId,
        'admin-1',
        'This comment violates community guidelines'
      );

      await new Promise((resolve) => setImmediate(resolve));
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-123',
          notificationReferenceType: 'comment',
        })
      );
    });
  });
});
