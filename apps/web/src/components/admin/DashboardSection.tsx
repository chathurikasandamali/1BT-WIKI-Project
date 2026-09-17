import React from 'react';
import Link from 'next/link';

interface DashboardSectionProps {
  title: string;
  description: string;
  showMoreHref: string;
  showMoreLabel?: string;
  testId: string;
  children: React.ReactNode;
}

/**
 * Admin Home preview block with a title and a "Show more" link to the
 * dedicated management page.
 */
export function DashboardSection({
  title,
  description,
  showMoreHref,
  showMoreLabel = 'Show more',
  testId,
  children,
}: DashboardSectionProps): React.JSX.Element {
  return (
    <section
      className="overflow-hidden rounded border border-brand-border bg-brand-surface shadow-sm"
      data-testid={testId}
    >
      <div className="flex flex-col gap-3 border-b border-brand-border bg-brand-bg/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-brand-text-primary">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-brand-text-secondary">
            {description}
          </p>
        </div>
        <Link
          href={showMoreHref}
          data-testid={`${testId}-show-more`}
          className="shrink-0 text-sm font-medium text-brand-red transition-colors hover:text-brand-red-hover"
        >
          {showMoreLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}
