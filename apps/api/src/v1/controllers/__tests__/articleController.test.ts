import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import type { ArticleService } from '../../services/articleService.js';
import { AppError } from '../../../errors/AppError.js';
import { makeMockReqResNext } from '../../__tests__/helpers/mockExpress.helpers.js';

// articleController.ts imports ArticleService by its named class export (for the
// constructor's default-parameter `new ArticleService()`); tests always inject a mock
// service directly, so the mock just needs to satisfy that export shape.
jest.unstable_mockModule('../../services/articleService.js', () => ({
  ArticleService: jest.fn(),
}));

const { ArticleController } = await import('../articleController.js');

// Build a typed mock service object — injected directly into the controller.
const makeMockService = (): jest.Mocked<
  Pick<
    ArticleService,
    | 'createArticle'
    | 'updateArticle'
    | 'submitForReview'
    | 'listPublished'
    | 'listAllArticles'
    | 'listMine'
    | 'getArticleById'
    | 'deleteArticle'
  >
> => ({
  createArticle: jest.fn(),
  updateArticle: jest.fn(),
  submitForReview: jest.fn(),
  listPublished: jest.fn(),
  listAllArticles: jest.fn(),
  listMine: jest.fn(),
  getArticleById: jest.fn(),
  deleteArticle: jest.fn(),
});

describe('ArticleController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;
  let mockService: ReturnType<typeof makeMockService>;
  let controller: InstanceType<typeof ArticleController>;

  beforeEach(() => {
    ({ req, res, next } = makeMockReqResNext());
    mockService = makeMockService();
    controller = new ArticleController(
      mockService as unknown as ArticleService
    );
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw AppError if data field is missing', async () => {
      await controller.create(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as any as AppError;
      expect(error.message).toBe('The "data" field is required');
      expect(error.statusCode).toBe(400);
    });

    it('should throw AppError if data field is not valid JSON', async () => {
      req.body = { data: 'invalid-json' };
      await controller.create(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as any as AppError;
      expect(error.message).toBe('Invalid JSON in "data" field');
      expect(error.statusCode).toBe(400);
    });

    it('should call ArticleService.createArticle and return 201 with success response', async () => {
      const inputData = { title: 'Test Article', body: { type: 'doc' } };
      req.body = { data: JSON.stringify(inputData) };

      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      req.files = [mockFile];

      const createdArticle = {
        id: 'article-123',
        title: 'Test Article',
        body: { type: 'doc' },
        tags: [],
        authorId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.createArticle.mockResolvedValue(createdArticle as never);

      await controller.create(req as Request, res as Response, next);

      expect(mockService.createArticle).toHaveBeenCalledWith(
        inputData,
        'user-123',
        [mockFile]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: createdArticle,
        message: 'Article created successfully',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass errors from ArticleService to next', async () => {
      const inputData = { title: 'Test Article', body: { type: 'doc' } };
      req.body = { data: JSON.stringify(inputData) };

      const error = new Error('Service error');
      mockService.createArticle.mockRejectedValue(error as never);

      await controller.create(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      req.params = { id: 'article-123' };
    });

    it('should call ArticleService.updateArticle with empty input if no data field is provided', async () => {
      const updatedArticle = {
        id: 'article-123',
        title: 'Updated Article',
        body: { type: 'doc' },
        tags: [],
        authorId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.updateArticle.mockResolvedValue(updatedArticle as never);

      await controller.update(req as Request, res as Response, next);

      expect(mockService.updateArticle).toHaveBeenCalledWith(
        'article-123',
        {},
        'user-123',
        []
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedArticle,
        message: 'Article updated successfully',
      });
    });

    it('should throw AppError if data field is not valid JSON', async () => {
      req.body = { data: 'invalid-json' };
      await controller.update(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as any as AppError;
      expect(error.message).toBe('Invalid JSON in "data" field');
      expect(error.statusCode).toBe(400);
    });

    it('should call ArticleService.updateArticle with parsed data and files', async () => {
      const inputData = { title: 'Updated Article' };
      req.body = { data: JSON.stringify(inputData) };

      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      req.files = [mockFile];

      const updatedArticle = {
        id: 'article-123',
        title: 'Updated Article',
        body: { type: 'doc' },
        tags: [],
        authorId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.updateArticle.mockResolvedValue(updatedArticle as never);

      await controller.update(req as Request, res as Response, next);

      expect(mockService.updateArticle).toHaveBeenCalledWith(
        'article-123',
        inputData,
        'user-123',
        [mockFile]
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should pass errors from ArticleService to next', async () => {
      req.body = { data: JSON.stringify({ title: 'Title' }) };

      const error = new Error('Service error');
      mockService.updateArticle.mockRejectedValue(error as never);

      await controller.update(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('submitForReview', () => {
    it('should call ArticleService.submitForReview', async () => {
      req.params = { id: 'article-123' };
      const updatedArticle = { id: 'article-123', status: 'Pending' };
      mockService.submitForReview.mockResolvedValue(updatedArticle as never);

      await controller.submitForReview(req as Request, res as Response, next);

      expect(mockService.submitForReview).toHaveBeenCalledWith(
        'article-123',
        'user-123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedArticle,
        message: 'Article submitted for review',
      });
    });
  });

  describe('listPublished', () => {
    it('should call ArticleService.listPublished with default pagination', async () => {
      const mockResult = { articles: [], total: 0, page: 1, limit: 20 };
      mockService.listPublished.mockResolvedValue(mockResult as never);

      await controller.listPublished(req as Request, res as Response, next);

      expect(mockService.listPublished).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Articles retrieved successfully',
      });
    });

    it('should respect custom page and limit', async () => {
      req.query = { page: '3', limit: '5' };
      const mockResult = { articles: [], total: 0, page: 3, limit: 5 };
      mockService.listPublished.mockResolvedValue(mockResult as never);

      await controller.listPublished(req as Request, res as Response, next);

      expect(mockService.listPublished).toHaveBeenCalledWith(3, 5, undefined, undefined, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should forward search, sort, and order query params to the service', async () => {
      req.query = { page: '1', limit: '10', search: 'react', sort: 'views', order: 'asc' };
      const mockResult = { articles: [], total: 0, page: 1, limit: 10 };
      mockService.listPublished.mockResolvedValue(mockResult as never);

      await controller.listPublished(req as Request, res as Response, next);

      expect(mockService.listPublished).toHaveBeenCalledWith(1, 10, 'react', 'views', 'asc');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should include likeCount and commentCount in the response payload', async () => {
      const mockResult = {
        articles: [
          { id: 'article-1', title: 'Title 1', likeCount: 5, commentCount: 2 },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockService.listPublished.mockResolvedValue(mockResult as never);

      await controller.listPublished(req as Request, res as Response, next);

      const jsonCall = (res.json as jest.Mock<any>).mock.calls[0][0] as any;
      expect(jsonCall.data.articles[0].likeCount).toBe(5);
      expect(jsonCall.data.articles[0].commentCount).toBe(2);
    });
  });

  describe('getById', () => {
    beforeEach(() => {
      req.params = { id: 'article-123' };
      req.user = { userId: 'user-123', role: 'User', email: 'test@test.com' };
    });

    it('should return the article', async () => {
      const mockArticle = {
        id: 'article-123',
        title: 'Test Article',
        status: 'Published',
        likeCount: 5,
        likedByMe: true,
      };
      mockService.getArticleById.mockResolvedValue(mockArticle as never);

      await controller.getById(req as Request, res as Response, next);

      expect(mockService.getArticleById).toHaveBeenCalledWith(
        'article-123',
        'user-123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockArticle,
        message: 'Article retrieved successfully',
      });
    });

    it('should pass service errors to next', async () => {
      const error = new Error('Service error');
      mockService.getArticleById.mockRejectedValue(error as never);

      await controller.getById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      req.params = { id: 'article-123' };
      req.user = { userId: 'user-123', role: 'User' } as any;
    });

    it('should call deleteArticle with hard=false by default', async () => {
      mockService.deleteArticle.mockResolvedValue(undefined as never);

      await controller.remove(req as Request, res as Response, next);

      expect(mockService.deleteArticle).toHaveBeenCalledWith(
        'article-123',
        'user-123',
        'User',
        false
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'Article deleted successfully',
      });
    });

    it('should parse hard=true query param', async () => {
      req.query = { hard: 'true' };
      req.user = { userId: 'admin-1', role: 'Admin' } as any;
      mockService.deleteArticle.mockResolvedValue(undefined as never);

      await controller.remove(req as Request, res as Response, next);

      expect(mockService.deleteArticle).toHaveBeenCalledWith(
        'article-123',
        'admin-1',
        'Admin',
        true
      );
    });

    it('should pass req.user.role through to the service', async () => {
      req.user = { userId: 'user-123', role: 'Reviewer' } as any;
      mockService.deleteArticle.mockResolvedValue(undefined as never);

      await controller.remove(req as Request, res as Response, next);

      expect(mockService.deleteArticle).toHaveBeenCalledWith(
        'article-123',
        'user-123',
        'Reviewer',
        false
      );
    });

    it('should pass errors to next', async () => {
      const error = new AppError('Not authorized', 403);
      mockService.deleteArticle.mockRejectedValue(error as never);

      await controller.remove(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

describe('ArticleController.listMine', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;
  let mockService: ReturnType<typeof makeMockService>;
  let controller: InstanceType<typeof ArticleController>;

  beforeEach(() => {
    req = {
      query: {},
      user: { userId: 'user-123' } as any,
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();
    mockService = makeMockService();
    controller = new ArticleController(
      mockService as unknown as ArticleService
    );
    jest.clearAllMocks();
  });

  it('should default to page 1 and limit 20 when no query params are provided', async () => {
    const result = { articles: [], total: 0, page: 1, limit: 20 };
    mockService.listMine.mockResolvedValue(result as never);

    await controller.listMine(req as Request, res as Response, next);

    expect(mockService.listMine).toHaveBeenCalledWith('user-123', 1, 20);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: result,
      message: 'Articles retrieved successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should parse custom page and limit query params', async () => {
    req.query = { page: '3', limit: '5' };
    const result = { articles: [], total: 0, page: 3, limit: 5 };
    mockService.listMine.mockResolvedValue(result as never);

    await controller.listMine(req as Request, res as Response, next);

    expect(mockService.listMine).toHaveBeenCalledWith('user-123', 3, 5);
  });

  it('should include articles across all statuses with likeCount and commentCount', async () => {
    const result = {
      articles: [
        {
          id: 'article-1',
          title: 'Title 1',
          status: 'Draft',
          likeCount: 5,
          commentCount: 2,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
    mockService.listMine.mockResolvedValue(result as never);

    await controller.listMine(req as Request, res as Response, next);

    const jsonCall = (res.json as jest.Mock<any>).mock.calls[0][0] as any;
    expect(jsonCall.data.articles[0].status).toBe('Draft');
    expect(jsonCall.data.articles[0].likeCount).toBe(5);
    expect(jsonCall.data.articles[0].commentCount).toBe(2);
  });

  it('should pass errors from ArticleService to next', async () => {
    const error = new Error('Service error');
    mockService.listMine.mockRejectedValue(error as never);

    await controller.listMine(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('ArticleController.listAllArticles', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;
  let mockService: ReturnType<typeof makeMockService>;
  let controller: InstanceType<typeof ArticleController>;

  beforeEach(() => {
    ({ req, res, next } = makeMockReqResNext());
    mockService = makeMockService();
    controller = new ArticleController(mockService as unknown as ArticleService);
    jest.clearAllMocks();
  });

  it('should call listAllArticles with default pagination and undefined filters', async () => {
    const mockResult = { articles: [], total: 0, page: 1, limit: 20 };
    mockService.listAllArticles.mockResolvedValue(mockResult as never);

    await controller.listAllArticles(req as Request, res as Response, next);

    expect(mockService.listAllArticles).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined, undefined);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('should parse custom page and limit query params', async () => {
    req.query = { page: '2', limit: '10' };
    mockService.listAllArticles.mockResolvedValue({ articles: [], total: 0, page: 2, limit: 10 } as never);

    await controller.listAllArticles(req as Request, res as Response, next);

    expect(mockService.listAllArticles).toHaveBeenCalledWith(2, 10, undefined, undefined, undefined, undefined);
  });

  it('should forward all query params — status, search, sort, order — to the service', async () => {
    req.query = { page: '1', limit: '5', status: 'Draft', search: 'react', sort: 'views', order: 'asc' };
    mockService.listAllArticles.mockResolvedValue({ articles: [], total: 0, page: 1, limit: 5 } as never);

    await controller.listAllArticles(req as Request, res as Response, next);

    expect(mockService.listAllArticles).toHaveBeenCalledWith(1, 5, 'Draft', 'react', 'views', 'asc');
  });

  it('should pass errors to next', async () => {
    const error = new AppError('Invalid status filter. Allowed: Draft, Pending, Published, Unpublished', 400);
    mockService.listAllArticles.mockRejectedValue(error as never);

    await controller.listAllArticles(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
