import { prisma } from '@repo/db';
import type {
  Comment,
  CommentModerationRequest,
  CommentWithAuthor,
  CreateCommentInput,
  PendingCommentListItem,
} from '@models/comment.types.js';
import {
  CommentModerationRequestValue,
  CommentPendingChangeValue,
  CommentStatusValue,
} from '@models/comment.types.js';

const COMMENT_SELECT = {
  id: true,
  articleId: true,
  createdBy: true,
  body: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  pendingChange: true,
  pendingBody: true,
  createdAt: true,
  updatedAt: true,
} as const;

const create = async (data: CreateCommentInput): Promise<Comment> => {
  const result = await prisma.comment.create({
    data,
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment;
};

const findByArticleId = async (
  articleId: string,
  viewerId: string
): Promise<CommentWithAuthor[]> => {
  const results = await prisma.comment.findMany({
    where: {
      articleId,
      deletedAt: null,
      OR: [{ status: CommentStatusValue.Approved }, { createdBy: viewerId }],
    },
    select: {
      ...COMMENT_SELECT,
      createdByUser: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return results.map(({ createdByUser, ...rest }) => {
    // A requested edit/deletion is unmoderated content — only its author may see it.
    const isOwner = rest.createdBy === viewerId;
    return {
      ...rest,
      pendingChange: isOwner ? rest.pendingChange : null,
      pendingBody: isOwner ? rest.pendingBody : null,
      authorName: createdByUser.name,
      authorImage: createdByUser.image,
    };
  }) as unknown as CommentWithAuthor[];
};

const findById = async (id: string): Promise<Comment | null> => {
  const result = await prisma.comment.findFirst({
    where: { id, deletedAt: null },
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment | null;
};

const requestEdit = async (id: string, body: string): Promise<Comment> => {
  const result = await prisma.comment.update({
    where: { id },
    data: {
      pendingChange: CommentPendingChangeValue.Edit,
      pendingBody: body,
    },
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment;
};

const requestDeletion = async (id: string): Promise<Comment> => {
  const result = await prisma.comment.update({
    where: { id },
    data: {
      pendingChange: CommentPendingChangeValue.Delete,
      pendingBody: null,
    },
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment;
};

const toRequestType = (
  status: string,
  pendingChange: string | null
): CommentModerationRequest => {
  if (status === CommentStatusValue.Pending) {
    return CommentModerationRequestValue.New;
  }
  return pendingChange === CommentPendingChangeValue.Delete
    ? CommentModerationRequestValue.Delete
    : CommentModerationRequestValue.Edit;
};

const findPending = async (
  page: number,
  limit: number
): Promise<{ comments: PendingCommentListItem[]; total: number }> => {
  const where = {
    deletedAt: null,
    OR: [
      { status: CommentStatusValue.Pending },
      {
        status: CommentStatusValue.Approved,
        pendingChange: { not: null },
      },
    ],
  };

  const [results, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      select: {
        ...COMMENT_SELECT,
        createdByUser: { select: { name: true, image: true } },
        article: { select: { title: true } },
      },
      // updatedAt, not createdAt: an edit/delete request on an old comment
      // should queue behind requests made before it, not jump to the front.
      orderBy: { updatedAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.comment.count({ where }),
  ]);

  const comments = results.map(({ createdByUser, article, ...rest }) => ({
    ...rest,
    authorName: createdByUser.name,
    authorImage: createdByUser.image,
    articleTitle: article.title,
    requestType: toRequestType(rest.status, rest.pendingChange),
  })) as unknown as PendingCommentListItem[];

  return { comments, total };
};

const approve = async (id: string, reviewerId: string): Promise<Comment> => {
  const result = await prisma.comment.update({
    where: { id },
    data: {
      status: CommentStatusValue.Approved,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment;
};

const reject = async (id: string, reviewerId: string): Promise<Comment> => {
  const result = await prisma.comment.update({
    where: { id },
    data: {
      status: CommentStatusValue.Rejected,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment;
};

const approveEdit = async (
  id: string,
  reviewerId: string,
  body: string
): Promise<Comment> => {
  const result = await prisma.comment.update({
    where: { id },
    data: {
      body,
      pendingChange: null,
      pendingBody: null,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment;
};

const approveDeletion = async (
  id: string,
  reviewerId: string
): Promise<Comment> => {
  const result = await prisma.comment.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      pendingChange: null,
      pendingBody: null,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment;
};

// Rejecting an edit/delete request leaves the Approved comment exactly as it
// was, so reviewedBy/reviewedAt keep pointing at the original approval.
const discardPendingChange = async (id: string): Promise<Comment> => {
  const result = await prisma.comment.update({
    where: { id },
    data: {
      pendingChange: null,
      pendingBody: null,
    },
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment;
};

export default {
  create,
  findByArticleId,
  findById,
  requestEdit,
  requestDeletion,
  findPending,
  approve,
  reject,
  approveEdit,
  approveDeletion,
  discardPendingChange,
};
