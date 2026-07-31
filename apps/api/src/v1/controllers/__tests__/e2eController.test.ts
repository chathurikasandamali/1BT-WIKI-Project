import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

const mockService = {
  deleteArticle: jest.fn(),
};

jest.unstable_mockModule('../../services/e2eCleanupService.js', () => ({
  E2eCleanupService: jest.fn().mockImplementation(() => mockService),
}));

const { E2eController } = await import('../e2eController.js');

describe('E2eController', () => {
  let controller: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new E2eController();
    req = {
      params: { id: '123' },
      user: { userId: 'user1' } as any,
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    next = jest.fn();
  });

  it('calls service and returns success for new deletion', async () => {
    (mockService.deleteArticle as jest.Mock).mockResolvedValue({
      articleId: '123',
      alreadyAbsent: false,
    });

    await controller.deleteArticle(req as Request, res as Response, next);

    expect(mockService.deleteArticle).toHaveBeenCalledWith('123', 'user1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { articleId: '123', alreadyAbsent: false },
      message: 'E2E article and dependencies successfully deleted',
    });
  });

  it('calls service and returns success for already absent', async () => {
    (mockService.deleteArticle as jest.Mock).mockResolvedValue({
      articleId: '123',
      alreadyAbsent: true,
    });

    await controller.deleteArticle(req as Request, res as Response, next);

    expect(mockService.deleteArticle).toHaveBeenCalledWith('123', 'user1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { articleId: '123', alreadyAbsent: true },
      message: 'Article is already absent',
    });
  });

  it('calls next with error if service throws', async () => {
    const error = new Error('Service Error');
    (mockService.deleteArticle as jest.Mock).mockRejectedValue(error);

    await controller.deleteArticle(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
