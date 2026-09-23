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

/**
 * A change the author has requested on an Approved comment. The comment stays
 * publicly visible with its original body until a moderator decides.
 */
export const CommentPendingChangeValue = {
  Edit: 'Edit',
  Delete: 'Delete',
} as const;

export type CommentPendingChange =
  (typeof CommentPendingChangeValue)[keyof typeof CommentPendingChangeValue];

/** What a moderation queue item is asking the moderator to decide on. */
export const CommentModerationRequestValue = {
  New: 'New',
  Edit: 'Edit',
  Delete: 'Delete',
} as const;

export type CommentModerationRequest =
  (typeof CommentModerationRequestValue)[keyof typeof CommentModerationRequestValue];

export interface Comment {
  id: string;
  articleId: string;
  createdBy: string;
  body: string;
  status: CommentStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  pendingChange: CommentPendingChange | null;
  pendingBody: string | null;
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
  requestType: CommentModerationRequest;
}
