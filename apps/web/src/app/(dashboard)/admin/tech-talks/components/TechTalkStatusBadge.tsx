import React from 'react';
import { TechTalkStatus } from '@repo/shared';
import { cn } from '@/lib/utils';

const BADGE_CLASSES: Record<TechTalkStatus, string> = {
  [TechTalkStatus.draft]: 'bg-brand-bg text-brand-text-secondary border-brand-border',
  [TechTalkStatus.published]: 'bg-green-50 text-green-700 border-green-200',
  [TechTalkStatus.unpublished]: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  // `all` and `deleted` are UI-only sentinels (the "no filter" option and the
  // delete-confirmation action identifier) — a real Tech Talk record's status
  // is never one of these, but TechTalkStatus covers both so this Record must
  // stay exhaustive.
  [TechTalkStatus.all]: 'bg-brand-bg text-brand-text-secondary border-brand-border',
  [TechTalkStatus.deleted]: 'bg-brand-red/10 text-brand-red border-brand-red/20',
};

/**
 * Inline status badge for Tech Talk statuses (lowercase: draft/published/
 * unpublished). Kept local to this domain because TechTalkStatus values are
 * lowercase and differ from ArticleStatus, so the shared StatusBadge does not
 * apply directly.
 */
export function TechTalkStatusBadge({
  status,
}: {
  status: TechTalkStatus;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border',
        BADGE_CLASSES[status]
      )}
      data-testid="techtalk-status-badge"
    >
      {status}
    </span>
  );
}
