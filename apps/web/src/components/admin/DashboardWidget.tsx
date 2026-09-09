import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DashboardWidgetProps {
  label: string;
  description: string;
  value: number;
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  valueClassName?: string;
  iconClassName?: string;
  borderClassName?: string;
  highlight?: boolean;
  selected?: boolean;
  testId: string;
}

/**
 * Statistic card used on Admin Home and management pages.
 */
export function DashboardWidget({
  label,
  description,
  value,
  href,
  onClick,
  icon,
  valueClassName = 'text-brand-text-primary',
  iconClassName = 'bg-brand-bg text-brand-text-secondary',
  borderClassName = 'border-brand-border',
  highlight = false,
  selected = false,
  testId,
}: DashboardWidgetProps): React.JSX.Element {
  const className = cn(
    'flex w-full items-start gap-3 rounded border bg-brand-surface px-4 py-3 text-left shadow-sm transition-colors hover:bg-brand-hover',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30',
    borderClassName,
    highlight && 'bg-amber-50/60 hover:bg-amber-50',
    selected && 'ring-1 ring-inset ring-black/5'
  );

  const body = (
    <>
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded',
          iconClassName
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-brand-text-secondary">
            {label}
          </span>
          {highlight && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Needs review
            </span>
          )}
        </span>
        <span className={cn('mt-1 block text-2xl font-bold', valueClassName)}>
          {value}
        </span>
        <span className="mt-0.5 block text-xs text-brand-text-secondary">
          {description}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} data-testid={testId} className={className}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        aria-pressed={selected}
        className={className}
      >
        {body}
      </button>
    );
  }

  return (
    <div data-testid={testId} className={className}>
      {body}
    </div>
  );
}
