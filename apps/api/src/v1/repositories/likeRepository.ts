import { prisma } from '@repo/db';
import type { Like } from '@models/like.types.js';

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

export default { upsert, remove };
