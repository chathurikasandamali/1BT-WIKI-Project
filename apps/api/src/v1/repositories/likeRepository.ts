import { prisma } from '@repo/db';
import type { Like, LikeWithUser } from '@models/like.types.js';

const upsert = async (articleId: string, userId: string): Promise<{ like: Like; created: boolean }> => {
  try {
    const createdLike = await prisma.like.create({
      data: { articleId, userId },
    });

    return { like: createdLike as unknown as Like, created: true };
  } catch (error) {
    if (
      !(
        typeof error === 'object' &&
        error !== null &&
        (error as any).code === 'P2002'
      )
    ) {
      throw error;
    }

    const existing = await prisma.like.findUnique({
      where: {
        articleId_userId: {
          articleId,
          userId,
        },
      },
    });

    if (!existing) {
      throw error;
    }

    return { like: existing as unknown as Like, created: false };
  }
};

const remove = async (articleId: string, userId: string): Promise<void> => {
  await prisma.like.deleteMany({
    where: { articleId, userId },
  });
};

const findByArticleId = async (articleId: string): Promise<LikeWithUser[]> => {
  const results = await prisma.like.findMany({
    where: { articleId },
    select: {
      id: true,
      articleId: true,
      userId: true,
      createdAt: true,
      user: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return results.map(({ user, ...rest }) => ({
    ...rest,
    userName: user.name,
    userImage: user.image,
  })) as unknown as LikeWithUser[];
};

export default { upsert, remove, findByArticleId };
