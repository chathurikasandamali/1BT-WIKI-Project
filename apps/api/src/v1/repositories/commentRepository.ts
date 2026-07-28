import { prisma } from '@repo/db';
import type {
  Comment,
  CommentWithAuthor,
  CreateCommentInput,
} from '@models/comment.types.js';

const COMMENT_SELECT = {
  id: true,
  articleId: true,
  createdBy: true,
  body: true,
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
  articleId: string
): Promise<CommentWithAuthor[]> => {
  const results = await prisma.comment.findMany({
    where: { articleId, deletedAt: null },
    select: {
      ...COMMENT_SELECT,
      user: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return results.map(({ user, ...rest }) => ({
    ...rest,
    authorName: user.name,
    authorImage: user.image,
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
    data: { body },
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

export default { create, findByArticleId, findById, update, remove };
