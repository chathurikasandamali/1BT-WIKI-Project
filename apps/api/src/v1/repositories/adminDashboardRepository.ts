import { prisma, ArticleStatus } from '@repo/db';
import type { DashboardSummary } from '@models/adminDashboard.types.js';

export class AdminDashboardRepository {
  /**
   * Run all dashboard count queries in a single round trip.
   * Counts registered users, published/pending/approved articles, and
   * non-deleted Tech Talks (every status).
   */
  async getAggregatedStats(): Promise<DashboardSummary> {
    const [
      totalUsers,
      publishedArticles,
      pendingReviews,
      approvals,
      techTalks,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.article.count({
        where: { status: ArticleStatus.Published, deletedAt: null },
      }),
      prisma.article.count({
        where: { status: ArticleStatus.Pending, deletedAt: null },
      }),
      prisma.article.count({
        where: { status: ArticleStatus.Approved, deletedAt: null },
      }),
      prisma.techTalk.count({
        where: { deletedAt: null },
      }),
    ]);

    return {
      totalUsers,
      publishedArticles,
      pendingReviews,
      approvals,
      techTalks,
    };
  }
}

export const adminDashboardRepository = new AdminDashboardRepository();
export default adminDashboardRepository;
