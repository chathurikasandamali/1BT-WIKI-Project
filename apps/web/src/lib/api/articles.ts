import { apiFetch } from '@/lib/api/client';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, type PaginationParams } from '@repo/shared';

export type ArticleStatus =
  | 'Draft'
  | 'Pending'
  | 'Published'
  | 'Unpublished'
  | 'Rejected';

export interface ArticleDetail {
  id: string;
  title: string;
  body: Record<string, unknown>;
  authorId: string;
  tags: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  views?: number;
  authorName?: string;
  authorEmail?: string | null;
  authorImage?: string | null;
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
  views: number;
  rejectionFeedback: string | null;
}

export interface ListMineResult {
  articles: ArticleListItem[];
  total: number;
  page: number;
  limit: number;
}

export type PublishedArticleListResult = ListMineResult;
/**
 * Statuses accepted by the admin list endpoint's `status` filter.
 * Drafts are private to their authors and never listed; 'Rejected' is a
 * review outcome, not an article status on the backend.
 */
export type AdminArticleStatusFilter = Exclude<ArticleStatus, 'Rejected' | 'Draft'>;

export interface AdminArticleListItem extends ArticleListItem {
  authorName: string;
  authorEmail: string | null;
}

export interface AdminArticleListResult {
  articles: AdminArticleListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface FetchAllArticlesParams {
  page?: number;
  limit?: number;
  status?: AdminArticleStatusFilter;
  search?: string;
  sort?: 'title' | 'createdAt' | 'views';
  order?: 'asc' | 'desc';
}

/**
 * Admin-only: fetch articles across all statuses with optional
 * status/search/sort filters (`GET /admin/articles`).
 */
export async function fetchAllArticles(
  params: FetchAllArticlesParams = {}
): Promise<AdminArticleListResult> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.status !== undefined) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.sort !== undefined) query.set('sort', params.sort);
  if (params.order !== undefined) query.set('order', params.order);

  const qs = query.toString();
  const result = await apiFetch<AdminArticleListResult>(
    `/admin/articles${qs ? `?${qs}` : ''}`
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load articles');
  }
  return result.data;
}

export type FetchPublishedArticlesOptions = PaginationParams & RequestInit;

export async function fetchPublishedArticles({
  page = DEFAULT_PAGE,
  limit = DEFAULT_PAGE_LIMIT,
  ...init
}: FetchPublishedArticlesOptions = {}): Promise<PublishedArticleListResult> {
  const result = await apiFetch<PublishedArticleListResult>(
    `/articles?page=${page}&limit=${limit}`,
    init
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load published articles');

  }

  return result.data;
}

export async function fetchMyArticles(
  page = DEFAULT_PAGE,
  limit = DEFAULT_PAGE_LIMIT
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
