'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    fetchPublishedTechTalks,
    listAll,
    type TechTalkListItem,
    type AdminTechTalkListQuery,
    type AdminTechTalkListResult,
} from '@/lib/api/techTalks';

export function usePublishedTechTalks(
    page = 1,
    limit = 20,
    search?: string,
    sort?: string,
    order?: string
) {
    const [techTalks, setTechTalks] = useState<TechTalkListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Single source of truth for fetching published Tech Talks.
     * Re-created by React whenever any query parameter changes, which in turn
     * causes the useEffect below to re-run and trigger a new fetch.
     */
    const fetchTalks = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await fetchPublishedTechTalks({
                page,
                limit,
                search,
                sort,
                order
            });

            setTechTalks(result.techTalks);
            setTotal(result.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, sort, order]);

    useEffect(() => {
        fetchTalks();
    }, [fetchTalks]);

    return {
        techTalks,
        total,
        loading,
        error,
        refetch: fetchTalks,
    };
}

export interface UseAllTechTalksResult {
    techTalks: AdminTechTalkListResult['techTalks'];
    total: number;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Admin hook: fetch all Tech Talks across every status via `GET /techTalks/listAll`.
 * Uses a single consolidated fetch function — the same `fetchAllTalks` callback
 * is called from `useEffect` and exposed as `refetch()` to avoid the
 * duplicated-fetch-logic bug.
 */
export function useAllTechTalks(
    query: Omit<AdminTechTalkListQuery, 'status'> = {}
): UseAllTechTalksResult {
    const [techTalks, setTechTalks] = useState<AdminTechTalkListResult['techTalks']>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllTalks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await listAll(query);
            setTechTalks(result.techTalks);
            setTotal(result.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        query.page,
        query.limit,
        query.search,
        query.sort,
        query.order,
    ]);

    useEffect(() => {
        fetchAllTalks();
    }, [fetchAllTalks]);

    return { techTalks, total, loading, error, refetch: fetchAllTalks };
}
