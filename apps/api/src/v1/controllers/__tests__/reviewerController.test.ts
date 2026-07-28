import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import type { ReviewerService } from '@services/reviewerService.js';
import { AppError } from '@errors/AppError.js';

jest.unstable_mockModule('@services/reviewerService.js', () => ({
  ReviewerService: jest.fn(),
}));

const { ReviewerController } = await import('../reviewerController.js');

const makeMockService = (): jest.Mocked<
  Pick<ReviewerService, 'listPending' | 'approveArticle' | 'rejectArticle' | 'getArticleForReview'>
> => ({
  listPending: jest.fn(),
  approveArticle: jest.fn(),
  rejectArticle: jest.fn(),
  getArticleForReview: jest.fn(),
});

describe('ReviewerController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;
  let mockService: ReturnType<typeof makeMockService>;
  let controller: InstanceType<typeof ReviewerController>;

  beforeEach(() => {
    req = { query: {}, params: {}, user: { userId: 'reviewer-1' } as any };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();
    mockService = makeMockService();
    controller = new ReviewerController(
      mockService as unknown as ReviewerService
    );
    jest.clearAllMocks();
  });

  describe('listPending', () => {
    it('should call listPending with default pagination', async () => {
      const mockResult = {
        articles: [],
        total: 0,
        page: 1,
        limit: 20,
      };
      mockService.listPending.mockResolvedValue(mockResult as never);

      await controller.listPending(req as Request, res as Response, next);

      expect(mockService.listPending).toHaveBeenCalledWith(1, 20);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Pending articles retrieved successfully',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should parse custom page and limit query params', async () => {
      req.query = { page: '3', limit: '5' };
      const mockResult = {
        articles: [],
        total: 0,
        page: 3,
        limit: 5,
      };
      mockService.listPending.mockResolvedValue(mockResult as never);

      await controller.listPending(req as Request, res as Response, next);

      expect(mockService.listPending).toHaveBeenCalledWith(3, 5);
    });

    it('should pass errors to next', async () => {
      const error = new AppError('Database error', 500);
      mockService.listPending.mockRejectedValue(error as never);

      await controller.listPending(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('approveArticle', () => {
    beforeEach(() => {
      req.params = { id: 'article-123' };
    });

    it('should call service.approveArticle with id and req.user.userId', async () => {
      const approvedArticle = {
        id: 'article-123',
        title: 'Approved Article',
        status: 'Published',
        authorId: 'user-1',
      };
      mockService.approveArticle.mockResolvedValue(approvedArticle as never);

      await controller.approveArticle(req as Request, res as Response, next);

      expect(mockService.approveArticle).toHaveBeenCalledWith(
        'article-123',
        'reviewer-1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: approvedArticle,
        message: 'Article approved and published',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass errors to next', async () => {
      const error = new AppError('Only Pending articles can be approved', 400);
      mockService.approveArticle.mockRejectedValue(error as never);

      await controller.approveArticle(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('rejectArticle', () => {
    beforeEach(() => {
      req.params = { id: 'article-123' };
      req.body = { feedback: 'valid feedback text' };
    });

    it('should call service.rejectArticle with id, req.user.userId, and feedback', async () => {
      const rejectedArticle = {
        id: 'article-123',
        title: 'Rejected Article',
        status: 'Rejected',
        authorId: 'user-1',
      };
      mockService.rejectArticle.mockResolvedValue(rejectedArticle as never);

      await controller.rejectArticle(req as Request, res as Response, next);

      expect(mockService.rejectArticle).toHaveBeenCalledWith(
        'article-123',
        'reviewer-1',
        'valid feedback text'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: rejectedArticle,
        message: 'Article rejected',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should default feedback to empty string if not provided in body', async () => {
      req.body = {};
      const rejectedArticle = {
        id: 'article-123',
        title: 'Rejected Article',
        status: 'Rejected',
        authorId: 'user-1',
      };
      mockService.rejectArticle.mockResolvedValue(rejectedArticle as never);

      await controller.rejectArticle(req as Request, res as Response, next);

      expect(mockService.rejectArticle).toHaveBeenCalledWith(
        'article-123',
        'reviewer-1',
        ''
      );
    });

    it('should pass errors to next', async () => {
      const error = new AppError('Only Pending articles can be rejected', 400);
      mockService.rejectArticle.mockRejectedValue(error as never);

      await controller.rejectArticle(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getArticleForReview', () => {
    beforeEach(() => {
      req.params = { id: 'article-123' };
    });

    it('should call service.getArticleForReview with id and return 200 with article', async () => {
      const pendingArticle = {
        id: 'article-123',
        title: 'Pending Article',
        body: { type: 'doc' },
        status: 'Pending',
        authorId: 'user-1',
      };
      mockService.getArticleForReview.mockResolvedValue(pendingArticle as never);

      await controller.getArticleForReview(req as Request, res as Response, next);

      expect(mockService.getArticleForReview).toHaveBeenCalledWith('article-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: pendingArticle,
        message: 'Article retrieved for review',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass errors to next', async () => {
      const error = new AppError('Only Pending articles can be reviewed', 400);
      mockService.getArticleForReview.mockRejectedValue(error as never);

      await controller.getArticleForReview(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
