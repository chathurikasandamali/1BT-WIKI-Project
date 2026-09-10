/**
 * Domain types for Comment entity.
 */

export const CommentStatusValue = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
} as const;

export type CommentStatus =
  (typeof CommentStatusValue)[keyof typeof CommentStatusValue];

export interface Comment {
  id: string;
  articleId: string;
  createdBy: string;
  body: string;
  status: CommentStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommentInput {
  articleId: string;
  createdBy: string;
  body: string;
}

export interface CommentWithAuthor extends Comment {
  authorName: string;
  authorImage: string | null;
}

export interface PendingCommentListItem extends CommentWithAuthor {
  articleTitle: string;
}
