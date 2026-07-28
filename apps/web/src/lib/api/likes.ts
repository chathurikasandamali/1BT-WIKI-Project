import { apiFetch } from '@/lib/api/client';

export interface LikeStatus {
  liked: boolean;
}

/** Likes an article on behalf of the current user. Idempotent on the backend. */
export async function likeArticle(articleId: string): Promise<LikeStatus> {
  const result = await apiFetch<LikeStatus>(`/articles/${articleId}/like`, {
    method: 'POST',
  });
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to like article');
  }
  return result.data;
}

/** Unlikes an article on behalf of the current user. Idempotent on the backend. */
export async function unlikeArticle(articleId: string): Promise<LikeStatus> {
  const result = await apiFetch<LikeStatus>(`/articles/${articleId}/like`, {
    method: 'DELETE',
  });
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to unlike article');
  }
  return result.data;
}
