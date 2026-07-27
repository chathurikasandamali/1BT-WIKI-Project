'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listPending,
  approve,
  reject,
  getArticleForReview,
  type PendingArticleListItem,
  type ArticleDetail,
} from '@/lib/api/reviewer.api';

export function usePendingArticles(page = 1, limit = 20) {
  const [articles, setArticles] = useState<PendingArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPending(page, limit);
      setArticles(result.articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await listPending(page, limit);
        if (!cancelled) {
          setArticles(result.articles);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, limit]);

  const approveArticle = useCallback(async (articleId: string) => {
    await approve(articleId);
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
  }, []);

  const rejectArticle = useCallback(async (articleId: string, feedback: string) => {
    await reject(articleId, feedback);
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
  }, []);

  return {
    articles,
    loading,
    error,
    refetch: fetchArticles,
    approveArticle,
    rejectArticle,
  };
}

export function useArticleForReview(articleId: string) {
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getArticleForReview(articleId)
      .then((data) => {
        if (!cancelled) {
          setArticle(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load article');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  return { article, isLoading, error };
}

export async function approveArticle(articleId: string): Promise<void> {
  return approve(articleId);
}

export async function rejectArticle(articleId: string, feedback: string): Promise<void> {
  return reject(articleId, feedback);
}

