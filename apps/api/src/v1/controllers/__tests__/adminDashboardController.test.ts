import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import type { AdminDashboardService } from '@services/adminDashboardService.js';
import { makeMockReqResNext } from '@v1/__tests__/helpers/mockExpress.helpers.js';
import { HttpStatusCode } from '@/v1/utils/httpStatus.js';
import type { DashboardSummary } from '@models/adminDashboard.types.js';

jest.unstable_mockModule('@services/adminDashboardService.js', () => ({
  AdminDashboardService: jest.fn(),
  adminDashboardService: {},
}));

const { AdminDashboardController } = await import(
  '../adminDashboardController.js'
);

const makeMockService = (): jest.Mocked<
  Pick<AdminDashboardService, 'getSummary'>
> => ({
  getSummary: jest.fn(),
});

describe('AdminDashboardController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;
  let mockService: ReturnType<typeof makeMockService>;
  let controller: InstanceType<typeof AdminDashboardController>;

  beforeEach(() => {
    ({ req, res, next } = makeMockReqResNext());
    mockService = makeMockService();
    controller = new AdminDashboardController(
      mockService as unknown as AdminDashboardService
    );
    jest.clearAllMocks();
  });

  it('returns the dashboard summary envelope', async () => {
    const summary: DashboardSummary = {
      totalUsers: 11,
      publishedArticles: 7,
      pendingReviews: 2,
      approvals: 3,
      techTalks: 4,
    };
    mockService.getSummary.mockResolvedValue(summary);

    await controller.getSummary(req as Request, res as Response, next);

    expect(mockService.getSummary).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: summary,
      message: 'Dashboard summary retrieved successfully',
    });
  });

  it('forwards service errors to next', async () => {
    const error = new Error('failed');
    mockService.getSummary.mockRejectedValue(error);

    await controller.getSummary(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
