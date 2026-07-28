/**
 * Domain types for Comment entity.
 */

export interface Comment {
  id: string;
  articleId: string;
  createdBy: string;
  body: string;
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
