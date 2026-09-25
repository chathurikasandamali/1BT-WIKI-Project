import ArticleRepository from '@repositories/articleRepository.js';
import CommentRepository from '@repositories/commentRepository.js';
import UserRepository from '@repositories/userRepository.js';
import NotificationService from './notificationService.js';
import { NotificationBuilder } from '@v1/lib/NotificationBuilder.js';
import { AppError } from '@errors/AppError.js';
import type {
  Comment,
  CommentWithAuthor,
  PendingCommentListItem,
} from '@models/comment.types.js';
import { CommentStatusValue } from '@models/comment.types.js';
import { UserRoleValue } from '@/types/userTypes.js';

const validateBody = (body: string | undefined): string => {
  if (!body || body.trim() === '') {
    throw new AppError('Comment body is required and cannot be empty', 400);
  }

  if (body.length > 5000) {
    throw new AppError('Comment cannot exceed 5000 characters', 400);
  }

  return body.trim();
};

type PendingCommentReason = 'created' | 'edited';

/**
 * Every new or edited comment waits in the Admin moderation queue, so tell the
 * Admins it is there. Fire-and-forget: a notification failure must never fail
 * the comment itself. The commenter is skipped when they are an Admin.
 */
const notifyAdminsOfPendingComment = async (
  comment: Comment,
  articleTitle: string,
  reason: PendingCommentReason
): Promise<void> => {
  try {
    const [admins, commenter] = await Promise.all([
      UserRepository.findActiveByRole(UserRoleValue.Admin),
      UserRepository.findById(comment.createdBy),
    ]);

    const commenterName = commenter?.name ?? 'A user';
    const action =
      reason === 'created' ? 'commented on' : 'edited their comment on';

    const notificationTasks = admins
      .filter((admin) => admin.id !== comment.createdBy)
      .map((admin) =>
        NotificationService.send(
          new NotificationBuilder()
            .forUser(admin.id)
            .regardingComment(comment.id)
            .withInfo(
              'New Comment Awaiting Approval',
              `${commenterName} ${action} the article "${articleTitle}". Please approve or reject this comment.`
            )
            .build()
        )
      );

    const results = await Promise.allSettled(notificationTasks);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error(
          '[CommentService] Failed to notify an Admin of a pending comment:',
          result.reason
        );
      }
    });
  } catch (error) {
    console.error(
      '[CommentService] Failed to notify Admins of a pending comment:',
      error
    );
  }
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

  void notifyAdminsOfPendingComment(comment, article.title, 'created');

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
 * A Pending comment is locked for its owner so the moderator always decides on
 * the exact text that was submitted.
 */
const assertNotPending = (comment: Comment, action: 'edited' | 'deleted'): void => {
  if (comment.status === CommentStatusValue.Pending) {
    throw new AppError(
      `This comment is awaiting approval and cannot be ${action}`,
      409
    );
  }
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

  assertNotPending(comment, 'edited');

  const updated = await CommentRepository.update(commentId, body);

  // The edit sends the comment back to Pending, so it needs moderating again.
  const article = await ArticleRepository.findById(updated.articleId);
  if (article) {
    void notifyAdminsOfPendingComment(updated, article.title, 'edited');
  }

  return updated;
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

  assertNotPending(comment, 'deleted');

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
  reviewerId: string
): Promise<Comment> => {
  const comment = await CommentRepository.findById(commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.status !== CommentStatusValue.Pending) {
    throw new AppError('Only Pending comments can be rejected', 400);
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
