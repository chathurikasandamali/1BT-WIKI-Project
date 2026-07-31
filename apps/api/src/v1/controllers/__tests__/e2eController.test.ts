import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import type { E2eCleanupService } from '../../services/e2eCleanupService.js';

const mockService = {
  deleteArticle: jest.fn() as jest.MockedFunction<E2eCleanupService['deleteArticle']>,
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
    mockService.deleteArticle.mockResolvedValue({
      articleId: '123',
      articleDeleteCount: 1,
      notificationDeleteCount: 0,
      alreadyAbsent: false,
      verifiedAbsent: true,
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
    mockService.deleteArticle.mockResolvedValue({
      articleId: '123',
      articleDeleteCount: 0,
      notificationDeleteCount: 0,
      alreadyAbsent: true,
      verifiedAbsent: true,
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
    mockService.deleteArticle.mockRejectedValue(error);

    await controller.deleteArticle(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
