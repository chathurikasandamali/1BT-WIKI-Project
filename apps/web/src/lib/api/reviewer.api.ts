import { apiFetch } from '@/lib/api/client';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, ReviewCommentStatus } from '@repo/shared';
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

export interface ReviewComment {
  id: string;
  reviewId: string;
  comment: string;
  selectedText: string | null;
  anchorData: { from: number; to: number } | null;
  status: ReviewCommentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewDetail {
  id: string;
  status: string;
  feedback: string | null;
  comments: ReviewComment[];
}

export interface ArticleForReviewResponse {
  article: ArticleDetail;
  review: ReviewDetail | null;
}

export interface ListPendingResult {
  articles: PendingArticleListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function listPending(page = DEFAULT_PAGE, limit = DEFAULT_PAGE_LIMIT): Promise<ListPendingResult> {
  const result = await apiFetch<ListPendingResult>(`/reviewer/articles/pending?page=${page}&limit=${limit}`);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load pending articles');
  }
  return result.data;
}

export async function getArticleForReview(articleId: string): Promise<ArticleForReviewResponse> {
  const result = await apiFetch<ArticleForReviewResponse>(`/reviewer/articles/${articleId}`);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load article');
  }
  return result.data;
}

export interface CreateReviewCommentInput {
  comment: string;
  selectedText: string | null;
  anchorData: { from: number; to: number };
}

export async function createReviewComment(
  articleId: string,
  data: CreateReviewCommentInput
): Promise<ReviewComment> {
  const result = await apiFetch<ReviewComment>(`/reviewer/approvals/${articleId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create comment');
  }
  return result.data;
}

export async function updateCommentStatus(
  articleId: string,
  commentId: string,
  status: 'Open' | 'Resolved'
): Promise<ReviewComment> {
  const result = await apiFetch<ReviewComment>(`/reviewer/approvals/${articleId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to update comment status');
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
