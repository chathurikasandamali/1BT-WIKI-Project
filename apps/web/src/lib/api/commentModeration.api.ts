import { apiFetch } from '@/lib/api/client';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } from '@repo/shared';
import { type CommentStatus } from '@/lib/api/comments';

export interface PendingCommentListItem {
  id: string;
  articleId: string;
  articleTitle: string;
  createdBy: string;
  authorName: string;
  authorImage: string | null;
  body: string;
  status: CommentStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListPendingCommentsResult {
  comments: PendingCommentListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function listPendingComments(
  page = DEFAULT_PAGE,
  limit = DEFAULT_PAGE_LIMIT
): Promise<ListPendingCommentsResult> {
  const result = await apiFetch<ListPendingCommentsResult>(
    `/admin/comments/pending?page=${page}&limit=${limit}`
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load pending comments');
  }
  return result.data;
}

export async function approveComment(commentId: string): Promise<void> {
  const result = await apiFetch(`/admin/comments/${commentId}/approve`, {
    method: 'PATCH',
  });
  if (!result.success) {
    throw new Error(result.error || 'Failed to approve comment');
  }
}

export async function rejectComment(commentId: string): Promise<void> {
  const result = await apiFetch(`/admin/comments/${commentId}/reject`, {
    method: 'PATCH',
  });
  if (!result.success) {
    throw new Error(result.error || 'Failed to reject comment');
  }
}
