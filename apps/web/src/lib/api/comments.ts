import { apiFetch } from '@/lib/api/client';

export interface Comment {
  id: string;
  articleId: string;
  createdBy: string;
  body: string;
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

export async function deleteComment(
  articleId: string,
  commentId: string
): Promise<void> {
  const result = await apiFetch<null>(
    `/articles/${articleId}/comments/${commentId}`,
    {
      method: 'DELETE',
    }
  );
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete comment');
  }
}
