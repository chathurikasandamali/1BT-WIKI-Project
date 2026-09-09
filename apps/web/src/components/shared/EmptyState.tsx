import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  testId?: string;
  icon?: React.ReactNode;
}

/**
 * Placeholder used when a management list or section has no rows.
 */
export function EmptyState({
  title,
  description,
  testId,
  icon,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      data-testid={testId}
    >
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded border border-brand-border bg-brand-bg text-brand-text-secondary">
          {icon}
        </span>
      )}
      <p className="text-sm font-medium text-brand-text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-brand-text-secondary">
        {description}
      </p>
    </div>
  );
}
