import React from 'react';
import { BRAND_NAME, BRAND_SUB_NAME } from '@/lib/constants/brand';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  /** Accessible status text shown under the animation. */
  message?: string;
  testId?: string;
  className?: string;
}

/**
 * Full-page (or section) loading state. Reuse this wherever a route waits on data
 * instead of rendering a plain "Loading..." label.
 */
export function PageLoader({
  message = 'Loading',
  testId = 'page-loader',
  className,
}: PageLoaderProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      data-testid={testId}
      className={cn(
        'flex min-h-[50vh] flex-col items-center justify-center px-6 py-16',
        className
      )}
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span
          className="absolute inset-0 animate-spin rounded-2xl border-2 border-brand-red/15 border-t-brand-red"
          aria-hidden="true"
        />
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-red text-xs font-black tracking-tight text-white shadow-[0_10px_28px_rgba(204,0,0,0.18)]">
          {BRAND_NAME}
        </span>
      </div>
      <p className="mt-4 font-display text-sm font-semibold uppercase tracking-[0.22em] text-brand-text-secondary">
        {BRAND_SUB_NAME}
      </p>
      <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-red [animation-delay:-0.32s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-red [animation-delay:-0.16s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-red" />
      </div>
      <p className="mt-3 text-sm text-brand-text-secondary">{message}</p>
    </div>
  );
}
