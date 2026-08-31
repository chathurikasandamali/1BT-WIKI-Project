import { AppError } from '@errors/AppError.js';

/**
 * Builds a case-insensitive "contains" filter for a single text field.
 * Generic across any Prisma model — pass the field name and search term.
 */
export function buildSearchFilter<TField extends string>(
  field: TField,
  search?: string
): Partial<Record<TField, { contains: string; mode: 'insensitive' }>> {
  if (!search || !search.trim()) return {};
  return { [field]: { contains: search.trim(), mode: 'insensitive' } } as Partial<
    Record<TField, { contains: string; mode: 'insensitive' }>
  >;
}

/**
 * Builds a validated Prisma `orderBy` object from user-supplied sort/order params.
 * `allowedFields` is the allow-list — never accept an arbitrary client-supplied
 * column name directly, since Prisma won't sanitize a dynamic orderBy key.
 */
export function buildSortOrder<TField extends string>(
  allowedFields: readonly TField[],
  sort?: string,
  order?: string,
  defaultField: TField = allowedFields[0]
): Record<TField, 'asc' | 'desc'> {
  const field = allowedFields.includes(sort as TField) ? (sort as TField) : defaultField;
  const direction: 'asc' | 'desc' = order === 'asc' ? 'asc' : 'desc';
  return { [field]: direction } as Record<TField, 'asc' | 'desc'>;
}

/**
 * Validates a sort field against an allow-list, throwing AppError(400) if invalid.
 * Use this in the SERVICE layer (not here) when you want a hard rejection
 * instead of silently falling back to a default — buildSortOrder above is the
 * permissive/repository-layer version; this is the strict/service-layer version.
 */
export function assertValidSort<TField extends string>(
  allowedFields: readonly TField[],
  sort: string | undefined
): void {
  if (sort !== undefined && !allowedFields.includes(sort as TField)) {
    throw new AppError(`Invalid sort field. Allowed: ${allowedFields.join(', ')}`, 400);
  }
}
