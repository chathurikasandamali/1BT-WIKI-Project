import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@errors/AppError.js';

jest.unstable_mockModule('@services/likeService.js', () => ({
  default: {
    likeArticle: jest.fn(),
    unlikeArticle: jest.fn(),
    getLikers: jest.fn(),
  },
}));

const { default: controller } = await import('../likeController.js');
const { default: mockLikeService } = await import('@services/likeService.js');

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const INVALID_UUID = 'invalid-123';

describe('LikeController.like', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;

  beforeEach(() => {
    req = {
      params: { id: VALID_UUID },
      user: { userId: 'user-123' } as any,
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call LikeService.likeArticle and return 200 with success response', async () => {
    (mockLikeService.likeArticle as jest.Mock<any>).mockResolvedValue(
      undefined
    );

    await controller.like(req as Request, res as Response, next);

    expect(mockLikeService.likeArticle).toHaveBeenCalledWith(
      VALID_UUID,
      'user-123'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { liked: true },
      message: 'Article liked successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass errors from LikeService to next', async () => {
    const error = new AppError('Cannot like this article', 403);
    (mockLikeService.likeArticle as jest.Mock<any>).mockRejectedValue(error);

    await controller.like(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should return 400 Bad Request if article ID is not a valid UUID', async () => {
    req.params = { id: INVALID_UUID };

    await controller.like(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid article ID format');
    expect(mockLikeService.likeArticle).not.toHaveBeenCalled();
  });
});

describe('LikeController.unlike', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;

  beforeEach(() => {
    req = {
      params: { id: VALID_UUID },
      user: { userId: 'user-123' } as any,
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call LikeService.unlikeArticle and return 200 with success response', async () => {
    (mockLikeService.unlikeArticle as jest.Mock<any>).mockResolvedValue(
      undefined
    );

    await controller.unlike(req as Request, res as Response, next);

    expect(mockLikeService.unlikeArticle).toHaveBeenCalledWith(
      VALID_UUID,
      'user-123'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { liked: false },
      message: 'Article unliked successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass errors from LikeService to next', async () => {
    const error = new AppError('Article not found', 404);
    (mockLikeService.unlikeArticle as jest.Mock<any>).mockRejectedValue(error);

    await controller.unlike(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should return 400 Bad Request if article ID is not a valid UUID', async () => {
    req.params = { id: INVALID_UUID };

    await controller.unlike(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid article ID format');
    expect(mockLikeService.unlikeArticle).not.toHaveBeenCalled();
  });
});

describe('LikeController.list', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;

  beforeEach(() => {
    req = {
      params: { id: VALID_UUID },
      user: { userId: 'user-123' } as any,
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call LikeService.getLikers and return 200 with the likers list', async () => {
    const likers = [
      {
        id: 'like-1',
        articleId: VALID_UUID,
        userId: 'user-1',
        createdAt: new Date(),
        userName: 'Alice',
        userImage: null,
      },
    ];
    (mockLikeService.getLikers as jest.Mock<any>).mockResolvedValue(likers);

    await controller.list(req as Request, res as Response, next);

    expect(mockLikeService.getLikers).toHaveBeenCalledWith(VALID_UUID);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: likers,
      message: 'Likers retrieved successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass errors from LikeService to next', async () => {
    const error = new AppError('Article not found', 404);
    (mockLikeService.getLikers as jest.Mock<any>).mockRejectedValue(error);

    await controller.list(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should return 400 Bad Request if article ID is not a valid UUID', async () => {
    req.params = { id: INVALID_UUID };

    await controller.list(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid article ID format');
    expect(mockLikeService.getLikers).not.toHaveBeenCalled();
  });
});
