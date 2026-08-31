'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listPendingComments,
  approveComment,
  rejectComment,
  type PendingCommentListItem,
} from '@/lib/api/commentModeration.api';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } from '@repo/shared';

export function usePendingComments(page = DEFAULT_PAGE, limit = DEFAULT_PAGE_LIMIT) {
  const [comments, setComments] = useState<PendingCommentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPendingComments(page, limit);
      setComments(result.comments);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const approve = useCallback(async (commentId: string) => {
    await approveComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  const reject = useCallback(async (commentId: string) => {
    await rejectComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  return {
    comments,
    loading,
    error,
    refetch: fetchComments,
    approveComment: approve,
    rejectComment: reject,
  };
}
