'use client';

import React from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { usePendingArticles } from '@/lib/hooks/useReviewer';
import { formatDate } from '@/lib/utils/date';

function ReviewerApprovalsContent(): React.JSX.Element {
  const { articles, loading, error } = usePendingArticles();
  const isListEmpty = articles.length === 0;

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center text-brand-text-secondary">
        Loading pending articles...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm"
        data-testid="pending-articles-error"
      >
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6" data-testid="reviewer-approvals-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text-primary font-display">
          Reviewer Approvals
        </h1>
        <p className="text-sm text-brand-text-secondary mt-1">
          Review and approve or reject pending article submissions.
        </p>
      </div>

      {isListEmpty ? (
        <div
          className="py-16 text-center text-brand-text-secondary text-sm bg-brand-surface border border-brand-border rounded"
          data-testid="pending-articles-empty"
        >
          No articles pending approval.
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="pending-articles-list">
          {articles.map((article) => {
            return (
              <div
                key={article.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-brand-surface border border-brand-border rounded"
                data-testid={`article-card-${article.id}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={article.status} />
                    <span className="text-xs text-brand-text-secondary">
                      Submitted: {formatDate(article.updatedAt)}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-brand-text-primary truncate">
                    {article.title}
                  </h2>
                  <p className="text-xs text-brand-text-secondary mt-1">
                    Author: <span className="font-medium text-brand-text-primary">{article.authorName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/reviewer/approvals/${article.id}`}
                    data-testid={`view-article-${article.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-red hover:bg-brand-red/90 text-white text-xs font-bold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReviewerApprovalsPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={['Reviewer', 'Admin']}>
      <ReviewerApprovalsContent />
    </RoleGuard>
  );
}
