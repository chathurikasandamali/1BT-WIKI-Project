import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@errors/AppError.js';

jest.unstable_mockModule('@services/commentService.js', () => ({
  default: {
    addComment: jest.fn(),
    listComments: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
  },
}));

const { default: controller } = await import('../commentController.js');
const { default: mockCommentService } =
  await import('@services/commentService.js');

describe('CommentController.create', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;

  beforeEach(() => {
    req = {
      params: { id: 'article-123' },
      body: {},
      user: { userId: 'user-123' } as any,
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call CommentService.addComment and return 201 with success response', async () => {
    req.body = { body: 'Nice article' };

    const createdComment = {
      id: 'comment-123',
      articleId: 'article-123',
      createdBy: 'user-123',
      body: 'Nice article',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (mockCommentService.addComment as jest.Mock<any>).mockResolvedValue(
      createdComment
    );

    await controller.create(req as Request, res as Response, next);

    expect(mockCommentService.addComment).toHaveBeenCalledWith(
      'article-123',
      'user-123',
      'Nice article'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: createdComment,
      message: 'Comment added successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass errors from CommentService to next', async () => {
    req.body = { body: 'Nice article' };

    const error = new AppError('Cannot comment on this article', 403);
    (mockCommentService.addComment as jest.Mock<any>).mockRejectedValue(error);

    await controller.create(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('CommentController.list', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;

  beforeEach(() => {
    req = {
      params: { id: 'article-123' },
      user: { userId: 'user-123' } as any,
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call CommentService.listComments and return 200 with success response', async () => {
    const comments = [
      {
        id: 'comment-123',
        articleId: 'article-123',
        createdBy: 'user-456',
        body: 'Nice article',
        createdAt: new Date(),
        updatedAt: new Date(),
        authorName: 'Jane',
        authorImage: null,
      },
    ];

    (mockCommentService.listComments as jest.Mock<any>).mockResolvedValue(
      comments
    );

    await controller.list(req as Request, res as Response, next);

    expect(mockCommentService.listComments).toHaveBeenCalledWith(
      'article-123',
      'user-123'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: comments,
      message: 'Comments retrieved successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass errors from CommentService to next', async () => {
    const error = new AppError('Cannot view comments on this article', 403);
    (mockCommentService.listComments as jest.Mock<any>).mockRejectedValue(
      error
    );

    await controller.list(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('CommentController.update', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;

  beforeEach(() => {
    req = {
      params: { commentId: 'comment-123' },
      body: {},
      user: { userId: 'user-123' } as any,
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call CommentService.updateComment and return 200 with success response', async () => {
    req.body = { body: 'Updated body' };

    const updatedComment = {
      id: 'comment-123',
      articleId: 'article-123',
      createdBy: 'user-123',
      body: 'Updated body',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (mockCommentService.updateComment as jest.Mock<any>).mockResolvedValue(
      updatedComment
    );

    await controller.update(req as Request, res as Response, next);

    expect(mockCommentService.updateComment).toHaveBeenCalledWith(
      'comment-123',
      'user-123',
      'Updated body'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass errors from CommentService to next', async () => {
    req.body = { body: 'Updated body' };

    const error = new AppError(
      'Only the comment owner can edit this comment',
      403
    );
    (mockCommentService.updateComment as jest.Mock<any>).mockRejectedValue(
      error
    );

    await controller.update(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('CommentController.remove', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;

  beforeEach(() => {
    req = {
      params: { commentId: 'comment-123' },
      user: { userId: 'user-123' } as any,
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call CommentService.deleteComment and return 200 with success response', async () => {
    (mockCommentService.deleteComment as jest.Mock<any>).mockResolvedValue(
      undefined
    );

    await controller.remove(req as Request, res as Response, next);

    expect(mockCommentService.deleteComment).toHaveBeenCalledWith(
      'comment-123',
      'user-123'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: null,
      message: 'Comment deleted successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass errors from CommentService to next', async () => {
    const error = new AppError(
      'Only the comment owner can delete this comment',
      403
    );
    (mockCommentService.deleteComment as jest.Mock<any>).mockRejectedValue(
      error
    );

    await controller.remove(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
