import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { DashboardSummary } from '@models/adminDashboard.types.js';

const mockTransaction = jest.fn<
  () => Promise<[number, number, number, number, number]>
>();
const mockUserCount = jest.fn();
const mockArticleCount = jest.fn();
const mockTechTalkCount = jest.fn();

await jest.unstable_mockModule('@repo/db', () => ({
  ArticleStatus: {
    Draft: 'Draft',
    Pending: 'Pending',
    Approved: 'Approved',
    Published: 'Published',
    Unpublished: 'Unpublished',
  },
  prisma: {
    $transaction: mockTransaction,
    user: { count: mockUserCount },
    article: { count: mockArticleCount },
    techTalk: { count: mockTechTalkCount },
  },
}));

const { AdminDashboardRepository } = await import(
  '../adminDashboardRepository.js'
);

describe('AdminDashboardRepository.getAggregatedStats', () => {
  let repository: InstanceType<typeof AdminDashboardRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AdminDashboardRepository();
  });

  it('returns batched counts from a single $transaction', async () => {
    const expected: DashboardSummary = {
      totalUsers: 12,
      publishedArticles: 8,
      pendingReviews: 3,
      approvals: 2,
      techTalks: 5,
    };
    mockTransaction.mockResolvedValue([
      expected.totalUsers,
      expected.publishedArticles,
      expected.pendingReviews,
      expected.approvals,
      expected.techTalks,
    ]);

    const result = await repository.getAggregatedStats();

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUserCount).toHaveBeenCalledTimes(1);
    expect(mockArticleCount).toHaveBeenCalledTimes(3);
    expect(mockTechTalkCount).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });

  it('counts published, pending, and approved articles separately', async () => {
    mockTransaction.mockResolvedValue([0, 0, 0, 0, 0]);

    await repository.getAggregatedStats();

    expect(mockArticleCount).toHaveBeenCalledWith({
      where: { status: 'Published', deletedAt: null },
    });
    expect(mockArticleCount).toHaveBeenCalledWith({
      where: { status: 'Pending', deletedAt: null },
    });
    expect(mockArticleCount).toHaveBeenCalledWith({
      where: { status: 'Approved', deletedAt: null },
    });
  });

  it('counts all non-deleted Tech Talks', async () => {
    mockTransaction.mockResolvedValue([0, 0, 0, 0, 0]);

    await repository.getAggregatedStats();

    expect(mockTechTalkCount).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });
  });
});
