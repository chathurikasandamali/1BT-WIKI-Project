import React from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/date';
import type { PendingArticleListItem } from '@/lib/api/reviewer.api';
import { DashboardPreviewTable } from '@/components/admin/DashboardPreviewTable';

const PENDING_REVIEW_HEADERS = ['Title', 'Status', 'Author', 'Submitted'] as const;

interface DashboardPendingReviewPreviewProps {
  articles: PendingArticleListItem[];
  loading: boolean;
}

/**
 * Compact pending-review preview for Admin Home.
 */
export function DashboardPendingReviewPreview({
  articles,
  loading,
}: DashboardPendingReviewPreviewProps): React.JSX.Element {
  return (
    <DashboardPreviewTable
      headers={PENDING_REVIEW_HEADERS}
      loading={loading}
      isEmpty={articles.length === 0}
      emptyMessage="No articles pending approval."
      testId="dashboard-pending-reviews-table"
    >
      {articles.map((article) => (
        <tr
          key={article.id}
          className="border-b border-brand-border last:border-b-0 transition-colors hover:bg-brand-hover"
          data-testid="dashboard-pending-review-row"
        >
          <td className="px-4 py-3">
            <Link
              href={`/reviewer/approvals/${article.id}`}
              className="font-medium text-brand-text-primary transition-colors hover:text-brand-red"
            >
              {article.title}
            </Link>
          </td>
          <td className="px-4 py-3">
            <StatusBadge status={article.status} />
          </td>
          <td className="px-4 py-3">
            <p className="text-brand-text-primary">{article.authorName}</p>
            {article.authorEmail && (
              <p className="text-xs text-brand-text-secondary">
                {article.authorEmail}
              </p>
            )}
          </td>
          <td className="px-4 py-3 text-brand-text-secondary">
            {formatDate(article.updatedAt)}
          </td>
        </tr>
      ))}
    </DashboardPreviewTable>
  );
}
