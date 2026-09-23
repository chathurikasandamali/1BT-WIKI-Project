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
import {
  CommentPendingChangeValue,
  CommentStatusValue,
} from '@models/comment.types.js';

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

/**
 * Only an Approved comment with no outstanding request can be changed by its
 * author. Pending/Rejected comments and those already awaiting a moderated
 * edit/deletion are locked so the moderator always decides on a stable version.
 */
const assertCommentIsChangeable = (comment: Comment): void => {
  if (comment.status === CommentStatusValue.Pending) {
    throw new AppError('This comment is awaiting approval and cannot be changed', 409);
  }

  if (comment.status === CommentStatusValue.Rejected) {
    throw new AppError('A rejected comment cannot be changed', 409);
  }

  if (comment.pendingChange !== null) {
    throw new AppError(
      'This comment already has a change awaiting approval',
      409
    );
  }
};

/**
 * Submits an edit to an Approved comment for moderation. The original body
 * stays publicly visible until a moderator approves the new body.
 */
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

  assertCommentIsChangeable(comment);

  if (body === comment.body) {
    throw new AppError('Comment body is unchanged', 400);
  }

  return CommentRepository.requestEdit(commentId, body);
};

/**
 * Submits a deletion of an Approved comment for moderation. The comment stays
 * publicly visible until a moderator approves the deletion.
 */
const deleteComment = async (
  commentId: string,
  userId: string
): Promise<Comment> => {
  const comment = await CommentRepository.findById(commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.createdBy !== userId) {
    throw new AppError('Only the comment owner can delete this comment', 403);
  }

  assertCommentIsChangeable(comment);

  return CommentRepository.requestDeletion(commentId);
};

const isAwaitingModeration = (comment: Comment): boolean =>
  comment.status === CommentStatusValue.Pending ||
  (comment.status === CommentStatusValue.Approved && comment.pendingChange !== null);

/**
 * Loads a comment for a moderation decision, enforcing that it is actually in
 * the queue and that moderators never decide on their own comments.
 */
const findModeratableComment = async (
  commentId: string,
  reviewerId: string,
  action: 'approved' | 'rejected'
): Promise<Comment> => {
  const comment = await CommentRepository.findById(commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (!isAwaitingModeration(comment)) {
    throw new AppError(
      `Only comments awaiting moderation can be ${action}`,
      400
    );
  }

  if (comment.createdBy === reviewerId) {
    throw new AppError('You cannot moderate your own comment', 403);
  }

  return comment;
};

const notifyCommentAuthor = (
  builder: NotificationBuilder,
  context: string
): void => {
  NotificationService.send(builder.build()).catch((error: unknown) => {
    console.error(`Failed to send ${context} notification:`, error);
  });
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
  const comment = await findModeratableComment(commentId, reviewerId, 'approved');

  if (comment.pendingChange === CommentPendingChangeValue.Edit) {
    if (comment.pendingBody === null) {
      throw new AppError('Pending edit has no body to apply', 409);
    }

    const edited = await CommentRepository.approveEdit(
      commentId,
      reviewerId,
      comment.pendingBody
    );

    notifyCommentAuthor(
      new NotificationBuilder()
        .forUser(edited.createdBy)
        .regardingComment(edited.id)
        .withSuccess('Comment Edit Approved', 'Your comment edit has been approved and is now visible.'),
      'comment-edit-approved'
    );

    return edited;
  }

  if (comment.pendingChange === CommentPendingChangeValue.Delete) {
    const deleted = await CommentRepository.approveDeletion(commentId, reviewerId);

    notifyCommentAuthor(
      new NotificationBuilder()
        .forUser(deleted.createdBy)
        .regardingComment(deleted.id)
        .withSuccess('Comment Deletion Approved', 'Your comment has been deleted.'),
      'comment-deletion-approved'
    );

    return deleted;
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
  reviewerId: string
): Promise<Comment> => {
  const comment = await findModeratableComment(commentId, reviewerId, 'rejected');

  // An Approved comment in the queue is always an edit/delete request.
  if (comment.status === CommentStatusValue.Approved) {
    const isEdit = comment.pendingChange === CommentPendingChangeValue.Edit;
    const restored = await CommentRepository.discardPendingChange(commentId);

    notifyCommentAuthor(
      new NotificationBuilder()
        .forUser(restored.createdBy)
        .regardingComment(restored.id)
        .withFailure(
          isEdit ? 'Comment Edit Not Approved' : 'Comment Deletion Not Approved',
          isEdit
            ? 'Your comment edit was not approved. The original comment remains visible.'
            : 'Your request to delete this comment was not approved. The comment remains visible.'
        ),
      isEdit ? 'comment-edit-rejected' : 'comment-deletion-rejected'
    );

    return restored;
  }

  const rejected = await CommentRepository.reject(commentId, reviewerId);

  const notificationPayload = new NotificationBuilder()
    .forUser(rejected.createdBy)
    .regardingComment(rejected.id)
    .withFailure('Comment Not Approved', 'Your comment was not approved by a moderator.')
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
