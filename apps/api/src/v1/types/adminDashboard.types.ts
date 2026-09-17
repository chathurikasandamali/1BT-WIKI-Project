/**
 * Domain types for the Admin Dashboard summary.
 * Domain owner: analytics-dashboard-engineer
 */

/**
 * Aggregated counts shown as the Admin Home widgets.
 * `approvals` is Approved articles waiting for an Admin to publish.
 */
export interface DashboardSummary {
  totalUsers: number;
  publishedArticles: number;
  pendingReviews: number;
  approvals: number;
  techTalks: number;
}
