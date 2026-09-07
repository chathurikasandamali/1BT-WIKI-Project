import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DashboardWidgetProps {
  label: string;
  description: string;
  value: number;
  href: string;
  icon: React.ReactNode;
  valueClassName?: string;
  iconClassName?: string;
  highlight?: boolean;
  testId: string;
}

/**
 * Clickable Admin Home statistic card. Navigates to the matching management page.
 */
export function DashboardWidget({
  label,
  description,
  value,
  href,
  icon,
  valueClassName = 'text-brand-text-primary',
  iconClassName = 'bg-brand-bg text-brand-text-secondary',
  highlight = false,
  testId,
}: DashboardWidgetProps): React.JSX.Element {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={cn(
        'flex items-start gap-3 rounded border border-brand-border bg-brand-surface px-4 py-3 shadow-sm transition-colors hover:bg-brand-hover',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30',
        highlight && 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'
      )}
    >
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
    </Link>
  );
}
