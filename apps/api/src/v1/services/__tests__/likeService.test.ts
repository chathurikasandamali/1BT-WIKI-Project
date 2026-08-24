import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';

jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('@repositories/likeRepository.js', () => ({
  default: {
    upsert: jest.fn(),
    remove: jest.fn(),
    findByArticleId: jest.fn(),
  },
}));

jest.unstable_mockModule('../notificationService.js', () => ({
  default: {
    send: jest.fn(),
  },
}));

const { default: LikeService } = await import('../likeService.js');
const { default: ArticleRepository } =
  await import('@repositories/articleRepository.js');
const { default: LikeRepository } =
  await import('@repositories/likeRepository.js');
const { default: NotificationService } =
  await import('../notificationService.js');

describe('LikeService.likeArticle', () => {
  const articleId = 'article-123';
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (NotificationService.send as jest.Mock<any>).mockResolvedValue(undefined);
  });

  it('should throw AppError if article is not found', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(LikeService.likeArticle(articleId, userId)).rejects.toThrow(
      new AppError('Article not found', 404)
    );
  });

  it.each(['Draft', 'Pending', 'Rejected', 'Unpublished'])(
    'should throw AppError if article status is %s',
    async (status) => {
      (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue({
        id: articleId,
        authorId: 'other-user',
        title: 'Test Article',
        status,
      });

      await expect(LikeService.likeArticle(articleId, userId)).rejects.toThrow(
        new AppError('Cannot like this article', 403)
      );
    }
  );

  it('should like the article and notify the article author', async () => {
    const article = {
      id: articleId,
      authorId: 'other-user',
      title: 'Test Article',
      status: 'Published',
    };
    const like = { id: 'like-123', articleId, userId, createdAt: new Date() };

    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);
    (LikeRepository.upsert as jest.Mock<any>).mockResolvedValue({ like, created: true });

    await LikeService.likeArticle(articleId, userId);

    expect(LikeRepository.upsert).toHaveBeenCalledWith(articleId, userId);
    expect(NotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'other-user',
        notificationReferenceType: 'like',
        referenceId: 'like-123',
      })
    );
  });

  it('should not send a notification when the author likes their own article', async () => {
    const article = {
      id: articleId,
      authorId: userId,
      title: 'Test Article',
      status: 'Published',
    };
    const like = { id: 'like-123', articleId, userId, createdAt: new Date() };

    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);
    (LikeRepository.upsert as jest.Mock<any>).mockResolvedValue({ like, created: true });

    await LikeService.likeArticle(articleId, userId);

    expect(NotificationService.send).not.toHaveBeenCalled();
  });

  it('should not send a notification when liking an already-liked article', async () => {
    const article = {
      id: articleId,
      authorId: 'other-user',
      title: 'Test Article',
      status: 'Published',
    };
    const like = { id: 'like-123', articleId, userId, createdAt: new Date() };

    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);
    // created: false ensures no new notification is sent
    (LikeRepository.upsert as jest.Mock<any>).mockResolvedValue({ like, created: false });

    await LikeService.likeArticle(articleId, userId);

    expect(NotificationService.send).not.toHaveBeenCalled();
  });

  it('should not throw when liking the same article twice (idempotent)', async () => {
    const article = {
      id: articleId,
      authorId: 'other-user',
      title: 'Test Article',
      status: 'Published',
    };
    const like = { id: 'like-123', articleId, userId, createdAt: new Date() };

    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);
    
    // First call returns created: true
    (LikeRepository.upsert as jest.Mock<any>).mockResolvedValueOnce({ like, created: true });
    // Second call returns created: false
    (LikeRepository.upsert as jest.Mock<any>).mockResolvedValueOnce({ like, created: false });

    await LikeService.likeArticle(articleId, userId);
    await LikeService.likeArticle(articleId, userId);

    expect(LikeRepository.upsert).toHaveBeenCalledTimes(2);
    expect(LikeRepository.upsert).toHaveBeenNthCalledWith(1, articleId, userId);
    expect(LikeRepository.upsert).toHaveBeenNthCalledWith(2, articleId, userId);
    
    // Notification should only be sent ONCE
    expect(NotificationService.send).toHaveBeenCalledTimes(1);
  });
});

describe('LikeService.unlikeArticle', () => {
  const articleId = 'article-123';
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw AppError if article is not found', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(LikeService.unlikeArticle(articleId, userId)).rejects.toThrow(
      new AppError('Article not found', 404)
    );
  });

  it('should remove the like without sending a notification', async () => {
    const article = {
      id: articleId,
      authorId: 'other-user',
      title: 'Test Article',
      status: 'Published',
    };

    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);
    (LikeRepository.remove as jest.Mock<any>).mockResolvedValue(undefined);

    await LikeService.unlikeArticle(articleId, userId);

    expect(LikeRepository.remove).toHaveBeenCalledWith(articleId, userId);
    expect(NotificationService.send).not.toHaveBeenCalled();
  });

  it('should not throw when unliking the same article twice (idempotent)', async () => {
    const article = {
      id: articleId,
      authorId: 'other-user',
      title: 'Test Article',
      status: 'Published',
    };

    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);
    (LikeRepository.remove as jest.Mock<any>).mockResolvedValue(undefined);

    await LikeService.unlikeArticle(articleId, userId);
    await LikeService.unlikeArticle(articleId, userId);

    expect(LikeRepository.remove).toHaveBeenCalledTimes(2);
    expect(LikeRepository.remove).toHaveBeenNthCalledWith(1, articleId, userId);
    expect(LikeRepository.remove).toHaveBeenNthCalledWith(2, articleId, userId);
  });
});

describe('LikeService.getLikers', () => {
  const articleId = 'article-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw AppError if article is not found', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(LikeService.getLikers(articleId)).rejects.toThrow(
      new AppError('Article not found', 404)
    );
    expect(LikeRepository.findByArticleId).not.toHaveBeenCalled();
  });

  it('should return likers from the repository when the article exists', async () => {
    const article = {
      id: articleId,
      authorId: 'other-user',
      title: 'Test Article',
      status: 'Published',
    };
    const likers = [
      {
        id: 'like-1',
        articleId,
        userId: 'user-1',
        createdAt: new Date(),
        userName: 'Alice',
        userImage: null,
      },
    ];

    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);
    (LikeRepository.findByArticleId as jest.Mock<any>).mockResolvedValue(likers);

    const result = await LikeService.getLikers(articleId);

    expect(LikeRepository.findByArticleId).toHaveBeenCalledWith(articleId);
    expect(result).toEqual(likers);
  });
});
