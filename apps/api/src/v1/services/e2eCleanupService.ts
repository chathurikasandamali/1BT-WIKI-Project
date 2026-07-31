import { prisma } from '@repo/db';
import { AppError } from '@errors/AppError.js';

const E2E_AUTHOR_ID = '00000000-0000-4000-8000-000000000101';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CleanupResult {
  articleId: string;
  articleDeleteCount: number;
  notificationDeleteCount: number;
  alreadyAbsent: boolean;
  verifiedAbsent: boolean;
}

export class E2eCleanupService {
  async deleteArticle(id: string, userId: string | undefined): Promise<CleanupResult> {
    // 1. Guard Environment
    if (
      process.env.NODE_ENV !== 'test' ||
      process.env.E2E_TEST_MODE !== 'true' ||
      process.env.E2E_DATABASE_CONFIRMED !== 'true'
    ) {
      throw new AppError('Not Found', 404);
    }

    // Guard Connection Targets
    if (!process.env.DATABASE_URL || !process.env.VERCEL_DATABASE_URL) {
      throw new AppError('Database URLs not configured for E2E cleanup', 500);
    }
    if (process.env.DATABASE_URL !== process.env.VERCEL_DATABASE_URL) {
      throw new AppError('Database URLs mismatch', 500);
    }

    // 2. Guard Authentication
    if (userId !== E2E_AUTHOR_ID) {
      throw new AppError('Only the E2E author can perform E2E cleanup', 403);
    }

    // 3. Validate UUID
    if (!UUID_REGEX.test(id)) {
      throw new AppError('Invalid article ID format', 400);
    }

    // 4. Verify Article Constraints
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      return {
        articleId: id,
        articleDeleteCount: 0,
        notificationDeleteCount: 0,
        alreadyAbsent: true,
        verifiedAbsent: true,
      };
    }

    if (article.authorId !== E2E_AUTHOR_ID) {
      throw new AppError('Article does not belong to E2E Author', 403);
    }

    if (!article.title.startsWith('Cypress Draft ')) {
      throw new AppError('Article title does not match E2E prefix', 403);
    }

    // 5. Deletion Algorithm (Sequential)
    // Delete notifications manually since they don't cascade natively
    const { count: notificationDeleteCount } = await prisma.notification.deleteMany({
      where: {
        referenceType: 'article',
        referenceId: id,
      },
    });

    // Delete the article (Prisma cascades attachments, comments, likes, reviews)
    const { count: articleDeleteCount } = await prisma.article.deleteMany({
      where: { id },
    });

    // 6. Verify Deletion
    const verifyArticle = await prisma.article.findUnique({
      where: { id },
    });

    const verifyNotifications = await prisma.notification.count({
      where: {
        referenceType: 'article',
        referenceId: id,
      },
    });

    if (verifyArticle !== null || verifyNotifications > 0) {
      throw new AppError('Cleanup verification failed: records still exist', 500);
    }

    return {
      articleId: id,
      articleDeleteCount,
      notificationDeleteCount,
      alreadyAbsent: false,
      verifiedAbsent: true,
    };
  }
}
