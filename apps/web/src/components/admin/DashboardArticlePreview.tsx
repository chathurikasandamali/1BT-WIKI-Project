import React from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/date';
import type { AdminArticleListItem } from '@/lib/api/articles';
import { DashboardPreviewTable } from '@/components/admin/DashboardPreviewTable';

const ARTICLE_HEADERS = ['Title', 'Status', 'Author', 'Created'] as const;

interface DashboardArticlePreviewProps {
  articles: AdminArticleListItem[];
  loading: boolean;
}

/**
 * Compact article preview for Admin Home.
 */
export function DashboardArticlePreview({
  articles,
  loading,
}: DashboardArticlePreviewProps): React.JSX.Element {
  return (
    <DashboardPreviewTable
      headers={ARTICLE_HEADERS}
      loading={loading}
      isEmpty={articles.length === 0}
      emptyMessage="No articles found."
      testId="dashboard-articles-table"
    >
      {articles.map((article) => (
        <tr
          key={article.id}
          className="border-b border-brand-border last:border-b-0 transition-colors hover:bg-brand-hover"
          data-testid="dashboard-article-row"
        >
          <td className="px-4 py-3">
            <Link
              href={`/admin/articles/${article.id}`}
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
            {formatDate(article.createdAt)}
          </td>
        </tr>
      ))}
    </DashboardPreviewTable>
  );
}
