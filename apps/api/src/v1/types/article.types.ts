/**
 * Domain types for Article entity.
 * Domain owner: Malindu (Flag for review when back from leave)
 */

export type ArticleStatus = 'Draft' | 'Pending' | 'Published' | 'Unpublished';

export const ArticleStatusValue = {
  Draft: 'Draft',
  Pending: 'Pending',
  Published: 'Published',
  Unpublished: 'Unpublished',
} as const satisfies Record<ArticleStatus, ArticleStatus>;

export interface JSONContent {
  type?: string;
  [key: string]: unknown;
}

export const ARTICLE_SORT_FIELDS = ['title', 'createdAt', 'views'] as const;

export interface Article {
  id: string;
  title: string;
  body: JSONContent;
  status: ArticleStatus;
  authorId: string;
  views: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  attachments?: ArticleAttachment[];
  warnings?: string[];
}

export interface ArticleDetail extends Article {
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  authorName?: string;
  authorEmail?: string | null;
}

export interface ArticleListItem {
  id: string;
  title: string;
  authorId: string;
  tags: string[];
  status: ArticleStatus;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  commentCount: number;
  views: number;
  rejectionFeedback: string | null;
}

/**
 * Row shape for the admin all-statuses article list (`GET /admin/articles`).
 * Extends the public list item with author identity for oversight views.
 */
export interface AdminArticleListItem extends ArticleListItem {
  authorName: string;
  authorEmail: string | null;
}

export interface CreateArticleInput {
  title: string;
  body?: JSONContent;
  tags?: string[];
}

export interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const successResponse = <T>(
  data: T,
  message?: string
): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

export interface CreateAttachmentInput {
  articleId: string;
  uploadedBy: string;
  fileName: string;
  b2FileKey: string;
  b2FileId: string;
  b2BucketName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ArticleAttachment {
  id: string;
  articleId: string;
  uploadedBy: string;
  fileName: string;
  b2FileKey: string;
  b2FileId: string;
  b2BucketName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface UpdateArticleInput {
  title?: string;
  body?: JSONContent;
  tags?: string[];
}

export interface ArticleReview {
  id: string;
  articleId: string;
  reviewerId: string;
  reviewStatus: string;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected';

export const ReviewStatusValue = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
} as const satisfies Record<ReviewStatus, ReviewStatus>;

export interface CreateArticleReviewInput {
  articleId: string;
  reviewerId: string;
  status: ReviewStatus;
  feedback: string | null;
  createdBy: string;
}
