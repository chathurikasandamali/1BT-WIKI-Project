export interface SkeletonItem {
  key: string;
}

/**
 * Generates an array of stable, unique string keys for rendering skeleton
 * loading placeholders, avoiding React's array-index-as-key anti-pattern.
 *
 * @param prefix - A short, context-specific prefix (e.g. 'tech_talks_') so
 *                 keys are unique even if multiple skeleton lists render
 *                 on the same page.
 * @param count - Number of skeleton placeholders to generate.
 */
export function skeletonKeys(prefix: string, count: number): SkeletonItem[] {
  return Array.from({ length: count }, (_, i) => ({ key: `${prefix}${i}` }));
}
