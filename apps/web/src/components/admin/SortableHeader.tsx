import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUpIcon } from '@/components/shared/icons/ChevronUpIcon';

export type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps<TField extends string> {
  label: string;
  field: TField;
  activeField: TField;
  dir: SortDirection;
  onSort: (field: TField) => void;
  className?: string;
  align?: 'left' | 'right';
}

/**
 * Clickable table header that toggles sort field and direction.
 */
export function SortableHeader<TField extends string>({
  label,
  field,
  activeField,
  dir,
  onSort,
  className,
  align = 'left',
}: SortableHeaderProps<TField>): React.JSX.Element {
  const isActive = activeField === field;

  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium uppercase tracking-wider text-brand-text-secondary',
        align === 'right' ? 'text-right' : 'text-left',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        data-testid={`sort-btn-${field}`}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:text-brand-text-primary',
          isActive ? 'text-brand-red' : 'text-brand-text-secondary'
        )}
      >
        {label}
        <ChevronUpIcon
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            isActive ? 'text-brand-red' : 'text-brand-text-secondary/40',
            isActive && dir === 'desc' && 'rotate-180'
          )}
        />
      </button>
    </th>
  );
}
