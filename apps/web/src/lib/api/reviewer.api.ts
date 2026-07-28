import { apiFetch } from '@/lib/api/client';
import { type ArticleStatus } from '@/lib/api/articles';

import type { JSONContent } from '@tiptap/react';

export interface PendingArticleListItem {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  authorEmail: string | null;
  tags: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  likeCount?: number;
  commentCount?: number;
}

export interface ArticleDetail {
  id: string;
  title: string;
  body: JSONContent;
  authorId: string;
  authorName: string;
  authorEmail: string | null;
  tags: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  likeCount?: number;
  commentCount?: number;
}

export interface ListPendingResult {
  articles: PendingArticleListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function listPending(page = 1, limit = 20): Promise<ListPendingResult> {
  const result = await apiFetch<ListPendingResult>(`/reviewer/articles/pending?page=${page}&limit=${limit}`);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load pending articles');
  }
  return result.data;
}

export async function getArticleForReview(articleId: string): Promise<ArticleDetail> {
  const result = await apiFetch<ArticleDetail>(`/reviewer/articles/${articleId}`);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load article');
  }
  return result.data;
}

export async function approve(articleId: string): Promise<void> {
  const result = await apiFetch(`/reviewer/articles/${articleId}/approve`, {
    method: 'PATCH',
  });
  if (!result.success) {
    throw new Error(result.error || 'Failed to approve article');
  }
}

export async function reject(articleId: string, feedback: string): Promise<void> {
  const result = await apiFetch(`/reviewer/articles/${articleId}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ feedback }),
  });
  if (!result.success) {
    throw new Error(result.error || 'Failed to reject article');
  }
}
