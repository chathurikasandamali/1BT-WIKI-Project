import React from 'react';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

/**
 * Pill toggle used by admin management filters.
 */
export function FilterChip({
  label,
  selected,
  onClick,
}: FilterChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        selected
          ? 'border-brand-red/20 bg-brand-red text-white'
          : 'border-brand-border bg-brand-surface text-brand-text-secondary hover:bg-brand-hover'
      )}
    >
      {label}
    </button>
  );
}
