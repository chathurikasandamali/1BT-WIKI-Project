import ArticleRepository from '@repositories/articleRepository.js';
import CommentRepository from '@repositories/commentRepository.js';
import NotificationService from './notificationService.js';
import { NotificationBuilder } from '@v1/lib/NotificationBuilder.js';
import { AppError } from '@errors/AppError.js';
import type {
  Comment,
  CommentWithAuthor,
  PendingCommentListItem,
} from '@models/comment.types.js';
import { CommentStatusValue } from '@models/comment.types.js';

const validateBody = (body: string | undefined): string => {
  if (!body || body.trim() === '') {
    throw new AppError('Comment body is required and cannot be empty', 400);
  }

  if (body.length > 5000) {
    throw new AppError('Comment cannot exceed 5000 characters', 400);
  }

  return body.trim();
};

const addComment = async (
  articleId: string,
  authorId: string,
  input: string | undefined
): Promise<Comment> => {
  const body = validateBody(input);

  const article = await ArticleRepository.findById(articleId);

  if (!article) {
    throw new AppError('Article not found', 404);
  }

  if (article.status !== 'Published') {
    throw new AppError('Cannot comment on this article', 403);
  }

  const comment = await CommentRepository.create({
    articleId,
    createdBy: authorId,
    body,
  });

  return comment;
};

const listComments = async (
  articleId: string,
  requesterId: string
): Promise<CommentWithAuthor[]> => {
  const article = await ArticleRepository.findById(articleId);

  if (!article) {
    throw new AppError('Article not found', 404);
  }

  if (article.status !== 'Published' && article.authorId !== requesterId) {
    throw new AppError('Cannot view comments on this article', 403);
  }

  return CommentRepository.findByArticleId(articleId, requesterId);
};

const updateComment = async (
  commentId: string,
  userId: string,
  input: string | undefined
): Promise<Comment> => {
  const body = validateBody(input);

  const comment = await CommentRepository.findById(commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.createdBy !== userId) {
    throw new AppError('Only the comment owner can edit this comment', 403);
  }

  return CommentRepository.update(commentId, body);
};

const deleteComment = async (
  commentId: string,
  userId: string
): Promise<void> => {
  const comment = await CommentRepository.findById(commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.createdBy !== userId) {
    throw new AppError('Only the comment owner can delete this comment', 403);
  }

  await CommentRepository.remove(commentId);
};

const listPendingComments = async (
  page: number,
  limit: number
): Promise<{ comments: PendingCommentListItem[]; total: number; page: number; limit: number }> => {
  const { comments, total } = await CommentRepository.findPending(page, limit);

  return { comments, total, page, limit };
};

const approveComment = async (
  commentId: string,
  reviewerId: string
): Promise<Comment> => {
  const comment = await CommentRepository.findById(commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.status !== CommentStatusValue.Pending) {
    throw new AppError('Only Pending comments can be approved', 400);
  }

  const approved = await CommentRepository.approve(commentId, reviewerId);

  const authorNotification = new NotificationBuilder()
    .forUser(approved.createdBy)
    .regardingComment(approved.id)
    .withSuccess('Comment Approved', 'Your comment has been approved and is now visible.')
    .build();

  NotificationService.send(authorNotification).catch((error: unknown) => {
    console.error('Failed to send comment-approved notification:', error);
  });

  const article = await ArticleRepository.findById(approved.articleId);

  if (article && article.authorId !== approved.createdBy && article.authorId !== reviewerId) {
    const articleAuthorNotification = new NotificationBuilder()
      .forUser(article.authorId)
      .regardingComment(approved.id)
      .withInfo('New comment on your article', `Someone commented on your article "${article.title}"`)
      .build();

    NotificationService.send(articleAuthorNotification).catch((error: unknown) => {
      console.error('Failed to send new_comment notification:', error);
    });
  }

  return approved;
};

const rejectComment = async (
  commentId: string,
  reviewerId: string,
  reason: string | undefined
): Promise<Comment> => {
  if (!reason || reason.trim().length < 10) {
    throw new AppError('Rejection reason must be at least 10 characters', 400);
  }

  const comment = await CommentRepository.findById(commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.status !== CommentStatusValue.Pending) {
    throw new AppError('Only Pending comments can be rejected', 400);
  }

  const trimmedReason = reason.trim();
  const rejected = await CommentRepository.reject(commentId, reviewerId, trimmedReason);

  const notificationPayload = new NotificationBuilder()
    .forUser(rejected.createdBy)
    .regardingComment(rejected.id)
    .withFailure('Comment Not Approved', `Your comment was not approved. Reason: ${trimmedReason}`)
    .build();

  NotificationService.send(notificationPayload).catch((error: unknown) => {
    console.error('Failed to send comment-rejected notification:', error);
  });

  return rejected;
};

export default {
  addComment,
  listComments,
  updateComment,
  deleteComment,
  listPendingComments,
  approveComment,
  rejectComment,
};
