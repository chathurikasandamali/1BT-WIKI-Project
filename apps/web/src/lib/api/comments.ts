import { apiFetch } from '@/lib/api/client';

export type CommentStatus = 'Pending' | 'Approved' | 'Rejected';

/** An edit/deletion the author requested on an Approved comment, awaiting moderation. */
export type CommentPendingChange = 'Edit' | 'Delete';

export interface Comment {
  id: string;
  articleId: string;
  createdBy: string;
  body: string;
  status: CommentStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  /** Only populated for the comment's own author; null for everyone else. */
  pendingChange: CommentPendingChange | null;
  /** Proposed body of a pending Edit; only populated for the comment's own author. */
  pendingBody: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentWithAuthor extends Comment {
  authorName: string;
  authorImage: string | null;
}

export async function fetchComments(
  articleId: string
): Promise<CommentWithAuthor[]> {
  const result = await apiFetch<CommentWithAuthor[]>(
    `/articles/${articleId}/comments`
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load comments');
  }
  return result.data;
}

export async function postComment(
  articleId: string,
  body: string
): Promise<Comment> {
  const result = await apiFetch<Comment>(`/articles/${articleId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to post comment');
  }
  return result.data;
}

export async function updateComment(
  articleId: string,
  commentId: string,
  body: string
): Promise<Comment> {
  const result = await apiFetch<Comment>(
    `/articles/${articleId}/comments/${commentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    }
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to update comment');
  }
  return result.data;
}

/**
 * Requests deletion of an Approved comment. The comment is not removed until an
 * admin approves the request, so this resolves with the comment as it now stands.
 */
export async function deleteComment(
  articleId: string,
  commentId: string
): Promise<Comment> {
  const result = await apiFetch<Comment>(
    `/articles/${articleId}/comments/${commentId}`,
    {
      method: 'DELETE',
    }
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to delete comment');
  }
  return result.data;
}
