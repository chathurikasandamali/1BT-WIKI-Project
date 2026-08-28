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
  coverAttachmentId: string | null;
  coverImageUrl: string | null;
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

export interface PublishedArticleListItem extends ArticleListItem {
  coverImageUrl: string | null;
}

export interface ArticleUpdateInput {
  title?: string;
  body?: Record<string, unknown>;
  tags?: string[];
  coverAttachmentId?: string | null;
}

export interface ListMineResult {
  articles: ArticleListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PublishedArticleListResult {
  articles: PublishedArticleListItem[];
  total: number;
  page: number;
  limit: number;
}
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

export type FetchPublishedArticlesOptions = PaginationParams & RequestInit & {
  search?: string;
};

export async function fetchPublishedArticles({
  page = DEFAULT_PAGE,
  limit = DEFAULT_PAGE_LIMIT,
  search,
  ...init
}: FetchPublishedArticlesOptions = {}): Promise<PublishedArticleListResult> {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (search) {
    params.append('search', search);
  }

  const result = await apiFetch<PublishedArticleListResult>(
    `/articles?${params.toString()}`,
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

export type QuestionType = 'mcq' | 'single_choice' | 'multiple_choice';

export interface QuizQuestionPublic {
  id: string;
  question: string;
  type: QuestionType;
  options: string[];
}

export interface GenerateQuizResponse {
  quizId: string;
  articleId: string;
  isFallback: boolean;
  questions: QuizQuestionPublic[];
}

export async function generateQuiz(
  articleId: string
): Promise<GenerateQuizResponse> {
  const result = await apiFetch<GenerateQuizResponse>(
    `/articles/${articleId}/quiz/generate`,
    { method: 'POST' }
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate quiz');
  }
  return result.data;
}

/** Author-only: saves a reviewed generated quiz as the article's stored fallback quiz. */
export async function saveQuizAsFallback(
  articleId: string,
  quizId: string
): Promise<GenerateQuizResponse> {
  const result = await apiFetch<GenerateQuizResponse>(
    `/articles/${articleId}/quiz/${quizId}/fallback`,
    { method: 'POST' }
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to save quiz as fallback');
  }
  return result.data;
}

export interface QuizQuestionResult {
  id: string;
  question: string;
  type: QuestionType;
  options: string[];
  selected: number[];
  correctIndexes: number[];
  isCorrect: boolean;
}

export interface QuizSubmitResponse {
  quizId: string;
  articleId: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  scorePercent: number;
  results: QuizQuestionResult[];
}

/** Submits a reader's answers and returns the graded result. */
export async function submitQuiz(
  articleId: string,
  quizId: string,
  answers: Record<string, number[]>
): Promise<QuizSubmitResponse> {
  const result = await apiFetch<QuizSubmitResponse>(
    `/articles/${articleId}/quiz/${quizId}/submit`,
    { method: 'POST', body: JSON.stringify({ answers }) }
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to submit quiz');
  }
  return result.data;
}

/** Author-only: reads the saved quiz focus-aspects hint for an article. */
export async function getFocusAspects(articleId: string): Promise<string | null> {
  const result = await apiFetch<{ aspects: string | null }>(
    `/articles/${articleId}/quiz/focus-aspects`
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch quiz focus aspects');
  }
  return result.data.aspects;
}

/** Author-only: sets the reusable quiz focus-aspects hint for an article. */
export async function setFocusAspects(
  articleId: string,
  aspects: string
): Promise<string> {
  const result = await apiFetch<{ aspects: string }>(
    `/articles/${articleId}/quiz/focus-aspects`,
    {
      method: 'PUT',
      body: JSON.stringify({ aspects }),
    }
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to save quiz focus aspects');
  }
  return result.data.aspects;
}
