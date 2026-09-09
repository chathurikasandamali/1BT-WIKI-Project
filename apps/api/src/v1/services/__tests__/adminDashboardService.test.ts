import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { DashboardSummary } from '@models/adminDashboard.types.js';

const mockGetAggregatedStats = jest.fn<() => Promise<DashboardSummary>>();

jest.unstable_mockModule('@repositories/adminDashboardRepository.js', () => {
  const mockInstance = {
    getAggregatedStats: mockGetAggregatedStats,
  };

  return {
    AdminDashboardRepository: jest.fn().mockImplementation(() => mockInstance),
    adminDashboardRepository: mockInstance,
    default: mockInstance,
  };
});

const { AdminDashboardService } = await import(
  '../adminDashboardService.js'
);

describe('AdminDashboardService.getSummary', () => {
  let service: InstanceType<typeof AdminDashboardService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminDashboardService({
      getAggregatedStats: mockGetAggregatedStats,
    } as never);
  });

  it('returns aggregated stats from the repository', async () => {
    const summary: DashboardSummary = {
      totalUsers: 20,
      publishedArticles: 9,
      pendingReviews: 4,
      approvals: 1,
      techTalks: 6,
    };
    mockGetAggregatedStats.mockResolvedValue(summary);

    const result = await service.getSummary();

    expect(mockGetAggregatedStats).toHaveBeenCalledTimes(1);
    expect(result).toEqual(summary);
  });

  it('propagates repository errors', async () => {
    mockGetAggregatedStats.mockRejectedValue(new Error('db down'));

    await expect(service.getSummary()).rejects.toThrow('db down');
  });
});
