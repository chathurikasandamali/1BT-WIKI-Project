'use client';

import { useCallback, useEffect, useState } from 'react';
import { TechTalkStatus } from '@repo/shared';
import { listAll } from '@/lib/api/techTalks';
import type { TechTalkStatusCounts } from '../constants/types';

/** Pulls every talk in a single request so the tiles can be counted locally. */
const COUNT_QUERY_LIMIT = 10000;

export interface TechTalkStatusCountsResult {
  /** Null while loading, or when the count request failed. */
  counts: TechTalkStatusCounts | null;
  reload: () => Promise<void>;
}

/**
 * Loads the summary tile totals. These are deliberately independent of the
 * table's filters so the tiles always show the full picture.
 */
export function useTechTalkStatusCounts(): TechTalkStatusCountsResult {
  const [counts, setCounts] = useState<TechTalkStatusCounts | null>(null);

  const reload = useCallback(async () => {
    try {
      const result = await listAll({ page: 1, limit: COUNT_QUERY_LIMIT });
      const talks = result.techTalks;
      const countByStatus = (status: TechTalkStatus): number =>
        talks.filter((talk) => talk.status === status).length;

      setCounts({
        [TechTalkStatus.all]: result.total,
        [TechTalkStatus.published]: countByStatus(TechTalkStatus.published),
        [TechTalkStatus.draft]: countByStatus(TechTalkStatus.draft),
        [TechTalkStatus.unpublished]: countByStatus(TechTalkStatus.unpublished),
        // Always 0 today — `deleted` is a UI-only sentinel with no backing
        // record status, kept here only so TechTalkStatusCounts stays exhaustive.
        [TechTalkStatus.deleted]: countByStatus(TechTalkStatus.deleted),
      });
    } catch {
      // Non-blocking — the table still works without the summary tiles.
      setCounts(null);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { counts, reload };
}
