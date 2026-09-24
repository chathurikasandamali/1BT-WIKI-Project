import { prisma } from '@repo/db';
import type {
  Comment,
  CommentWithAuthor,
  CreateCommentInput,
  PendingCommentListItem,
} from '@models/comment.types.js';
import { CommentStatusValue } from '@models/comment.types.js';

const COMMENT_SELECT = {
  id: true,
  articleId: true,
  createdBy: true,
  body: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
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

  return results.map(({ createdByUser, ...rest }) => ({
    ...rest,
    authorName: createdByUser.name,
    authorImage: createdByUser.image,
  })) as unknown as CommentWithAuthor[];
};

const findById = async (id: string): Promise<Comment | null> => {
  const result = await prisma.comment.findFirst({
    where: { id, deletedAt: null },
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment | null;
};

const update = async (id: string, body: string): Promise<Comment> => {
  const result = await prisma.comment.update({
    where: { id },
    data: {
      body,
      status: CommentStatusValue.Pending,
      reviewedBy: null,
      reviewedAt: null,
    },
    select: COMMENT_SELECT,
  });

  return result as unknown as Comment;
};

const remove = async (id: string): Promise<void> => {
  await prisma.comment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

const findPending = async (
  page: number,
  limit: number
): Promise<{ comments: PendingCommentListItem[]; total: number }> => {
  const where = {
    status: CommentStatusValue.Pending,
    deletedAt: null,
  } as const;

  const [results, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      select: {
        ...COMMENT_SELECT,
        createdByUser: { select: { name: true, image: true } },
        article: { select: { title: true } },
      },
      orderBy: { createdAt: 'asc' },
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

export default {
  create,
  findByArticleId,
  findById,
  update,
  remove,
  findPending,
  approve,
  reject,
};
