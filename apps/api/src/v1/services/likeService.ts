import ArticleRepository from '@repositories/articleRepository.js';
import LikeRepository from '@repositories/likeRepository.js';
import NotificationService from '@services/notificationService.js';
import { NotificationBuilder } from '@v1/lib/NotificationBuilder.js';
import { AppError } from '@/errors/AppError.js';

const likeArticle = async (
  articleId: string,
  userId: string
): Promise<void> => {
  const article = await ArticleRepository.findById(articleId);

  if (!article) {
    throw new AppError('Article not found', 404);
  }

  if (article.status !== 'Published') {
    throw new AppError('Cannot like this article', 403);
  }

  const { like, created } = await LikeRepository.upsert(articleId, userId);

  if (created && article.authorId !== userId) {
    const notificationPayload = new NotificationBuilder()
      .forUser(article.authorId)
      .regardingLike(like.id)
      .withInfo('New like on your article', `Someone liked your article "${article.title}"`)
      .build();

    NotificationService.send(notificationPayload).catch((error: unknown) => {
      console.error('Failed to send new_like notification:', error);
    });
  }
};

const unlikeArticle = async (
  articleId: string,
  userId: string
): Promise<void> => {
  const article = await ArticleRepository.findById(articleId);

  if (!article) {
    throw new AppError('Article not found', 404);
  }

  await LikeRepository.remove(articleId, userId);
};

export default { likeArticle, unlikeArticle };
