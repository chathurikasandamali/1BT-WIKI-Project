import { apiFetch } from '@/lib/api/client';

export type ArticleStatus =
  | 'Draft'
  | 'Pending'
  | 'Published'
  | 'Unpublished'
  | 'Rejected';

export interface ArticleDetail {
  id: string;
  title: string;
  body: any;
  authorId: string;
  tags: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface ArticleListItem {
  id: string;
  title: string;
  authorId: string;
  tags: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  rejectionFeedback: string | null;
}

export interface ListMineResult {
  articles: ArticleListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchMyArticles(
  page = 1,
  limit = 20
): Promise<ListMineResult> {
  const result = await apiFetch<ListMineResult>(
    `/articles/mine?page=${page}&limit=${limit}`
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load articles');
  }
  return result.data;
}

export async function deleteArticle(id: string, hard = false): Promise<void> {
  const url = hard ? `/articles/${id}?hard=true` : `/articles/${id}`;
  const result = await apiFetch(url, { method: 'DELETE' });
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete article');
  }
}

export async function getArticle(id: string): Promise<ArticleDetail> {
  const result = await apiFetch<ArticleDetail>(`/articles/${id}`);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch article');
  }
  return result.data;
}
