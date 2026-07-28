import React from 'react';
import { cn } from '@/lib/utils';
import { type ArticleStatus } from '@/lib/api/articles';

const statusBadgeClass: Record<ArticleStatus, string> = {
  Draft: 'bg-brand-bg text-brand-text-secondary border-brand-border',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Published: 'bg-green-50 text-green-700 border-green-200',
  Unpublished: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  Rejected: 'bg-brand-red/10 text-brand-red border-brand-red/20',
};

export function StatusBadge({
  status,
}: {
  status: ArticleStatus;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border',
        statusBadgeClass[status]
      )}
      data-testid="article-status-badge"
    >
      {status}
    </span>
  );
}
