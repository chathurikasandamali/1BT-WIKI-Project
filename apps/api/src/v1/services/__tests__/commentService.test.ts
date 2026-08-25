import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';

jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('@repositories/commentRepository.js', () => ({
  default: {
    create: jest.fn(),
    findByArticleId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findPending: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  },
}));

jest.unstable_mockModule('../notificationService.js', () => ({
  default: {
    send: jest.fn(),
  },
}));

const { default: CommentService } = await import('../commentService.js');
const { default: ArticleRepository } =
  await import('@repositories/articleRepository.js');
const { default: CommentRepository } =
  await import('@repositories/commentRepository.js');
const { default: NotificationService } =
  await import('../notificationService.js');

describe('CommentService.addComment', () => {
  const articleId = 'article-123';
  const authorId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (NotificationService.send as jest.Mock<any>).mockResolvedValue(undefined);
  });

  it('should throw AppError if body is missing or empty', async () => {
    await expect(
      CommentService.addComment(articleId, authorId, '   ')
    ).rejects.toThrow(
      new AppError('Comment body is required and cannot be empty', 400)
    );
  });

  it('should throw AppError if body exceeds 5000 characters', async () => {
    const body = 'a'.repeat(5001);
    await expect(
      CommentService.addComment(articleId, authorId, body)
    ).rejects.toThrow(
      new AppError('Comment cannot exceed 5000 characters', 400)
    );
  });

  it('should throw AppError if article is not found', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(
      CommentService.addComment(articleId, authorId, 'Nice article')
    ).rejects.toThrow(new AppError('Article not found', 404));
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

      await expect(
        CommentService.addComment(articleId, authorId, 'Nice article')
      ).rejects.toThrow(new AppError('Cannot comment on this article', 403));
    }
  );

  it('should create the comment as Pending without notifying anyone yet', async () => {
    const article = {
      id: articleId,
      authorId: 'other-user',
      title: 'Test Article',
      status: 'Published',
    };
    const createdComment = {
      id: 'comment-123',
      articleId,
      createdBy: authorId,
      body: 'Nice article',
      status: 'Pending',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);
    (CommentRepository.create as jest.Mock<any>).mockResolvedValue(
      createdComment
    );

    const result = await CommentService.addComment(
      articleId,
      authorId,
      '  Nice article  '
    );

    expect(CommentRepository.create).toHaveBeenCalledWith({
      articleId,
      createdBy: authorId,
      body: 'Nice article',
    });
    expect(NotificationService.send).not.toHaveBeenCalled();
    expect(result).toEqual(createdComment);
  });
});

describe('CommentService.listComments', () => {
  const articleId = 'article-123';
  const requesterId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw AppError if article is not found', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(
      CommentService.listComments(articleId, requesterId)
    ).rejects.toThrow(new AppError('Article not found', 404));
  });

  it('should throw AppError if article is not Published and requester is not its author', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: articleId,
      authorId: 'other-user',
      status: 'Draft',
    });

    await expect(
      CommentService.listComments(articleId, requesterId)
    ).rejects.toThrow(
      new AppError('Cannot view comments on this article', 403)
    );
  });

  it('should return comments if article is not Published but requester is its author', async () => {
    const comments = [
      { id: 'comment-1', authorName: 'Jane', authorImage: null },
    ];
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: articleId,
      authorId: requesterId,
      status: 'Draft',
    });
    (CommentRepository.findByArticleId as jest.Mock<any>).mockResolvedValue(
      comments
    );

    const result = await CommentService.listComments(articleId, requesterId);

    expect(CommentRepository.findByArticleId).toHaveBeenCalledWith(
      articleId,
      requesterId
    );
    expect(result).toEqual(comments);
  });

  it('should return comments for a Published article regardless of requester', async () => {
    const comments = [
      {
        id: 'comment-1',
        authorName: 'Jane',
        authorImage: 'https://example.com/pic.png',
      },
    ];
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: articleId,
      authorId: 'other-user',
      status: 'Published',
    });
    (CommentRepository.findByArticleId as jest.Mock<any>).mockResolvedValue(
      comments
    );

    const result = await CommentService.listComments(articleId, requesterId);

    expect(CommentRepository.findByArticleId).toHaveBeenCalledWith(
      articleId,
      requesterId
    );
    expect(result).toEqual(comments);
  });
});

describe('CommentService.updateComment', () => {
  const commentId = 'comment-123';
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw AppError if body is missing or empty', async () => {
    await expect(
      CommentService.updateComment(commentId, userId, '   ')
    ).rejects.toThrow(
      new AppError('Comment body is required and cannot be empty', 400)
    );
  });

  it('should throw AppError if body exceeds 5000 characters', async () => {
    const body = 'a'.repeat(5001);
    await expect(
      CommentService.updateComment(commentId, userId, body)
    ).rejects.toThrow(
      new AppError('Comment cannot exceed 5000 characters', 400)
    );
  });

  it('should throw AppError if comment is not found', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(
      CommentService.updateComment(commentId, userId, 'Updated body')
    ).rejects.toThrow(new AppError('Comment not found', 404));
  });

  it('should throw AppError if requester is not the comment owner', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: commentId,
      articleId: 'article-123',
      createdBy: 'other-user',
      body: 'Original body',
      status: 'Approved',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      CommentService.updateComment(commentId, userId, 'Updated body')
    ).rejects.toThrow(
      new AppError('Only the comment owner can edit this comment', 403)
    );
  });

  it('should update the comment and reset it to Pending when requester is its owner', async () => {
    const existingComment = {
      id: commentId,
      articleId: 'article-123',
      createdBy: userId,
      body: 'Original body',
      status: 'Approved',
      reviewedBy: 'admin-1',
      reviewedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updatedComment = {
      ...existingComment,
      body: 'Updated body',
      status: 'Pending',
      reviewedBy: null,
      reviewedAt: null,
    };

    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      existingComment
    );
    (CommentRepository.update as jest.Mock<any>).mockResolvedValue(
      updatedComment
    );

    const result = await CommentService.updateComment(
      commentId,
      userId,
      '  Updated body  '
    );

    expect(CommentRepository.update).toHaveBeenCalledWith(
      commentId,
      'Updated body'
    );
    expect(result).toEqual(updatedComment);
  });
});

describe('CommentService.deleteComment', () => {
  const commentId = 'comment-123';
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw AppError if comment is not found', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(
      CommentService.deleteComment(commentId, userId)
    ).rejects.toThrow(new AppError('Comment not found', 404));
  });

  it('should throw AppError if requester is not the comment owner', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: commentId,
      articleId: 'article-123',
      createdBy: 'other-user',
      body: 'Original body',
      status: 'Approved',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      CommentService.deleteComment(commentId, userId)
    ).rejects.toThrow(
      new AppError('Only the comment owner can delete this comment', 403)
    );

    expect(CommentRepository.remove).not.toHaveBeenCalled();
  });

  it('should delete the comment when requester is its owner', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: commentId,
      articleId: 'article-123',
      createdBy: userId,
      body: 'Original body',
      status: 'Approved',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (CommentRepository.remove as jest.Mock<any>).mockResolvedValue(undefined);

    await CommentService.deleteComment(commentId, userId);

    expect(CommentRepository.remove).toHaveBeenCalledWith(commentId);
  });
});

describe('CommentService.listPendingComments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return pending comments with pagination metadata', async () => {
    const comments = [{ id: 'comment-1', status: 'Pending' }];
    (CommentRepository.findPending as jest.Mock<any>).mockResolvedValue({
      comments,
      total: 1,
    });

    const result = await CommentService.listPendingComments(1, 20);

    expect(CommentRepository.findPending).toHaveBeenCalledWith(1, 20);
    expect(result).toEqual({ comments, total: 1, page: 1, limit: 20 });
  });
});

describe('CommentService.approveComment', () => {
  const commentId = 'comment-123';
  const reviewerId = 'admin-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (NotificationService.send as jest.Mock<any>).mockResolvedValue(undefined);
  });

  it('should throw AppError if comment is not found', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(
      CommentService.approveComment(commentId, reviewerId)
    ).rejects.toThrow(new AppError('Comment not found', 404));
  });

  it('should throw AppError if comment is not Pending', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: commentId,
      status: 'Approved',
    });

    await expect(
      CommentService.approveComment(commentId, reviewerId)
    ).rejects.toThrow(new AppError('Only Pending comments can be approved', 400));
  });

  it('should approve the comment and notify the comment author and article author', async () => {
    const pendingComment = {
      id: commentId,
      articleId: 'article-123',
      createdBy: 'comment-author',
      status: 'Pending',
    };
    const approvedComment = {
      ...pendingComment,
      status: 'Approved',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    };
    const article = {
      id: 'article-123',
      authorId: 'article-author',
      title: 'Test Article',
    };

    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      pendingComment
    );
    (CommentRepository.approve as jest.Mock<any>).mockResolvedValue(
      approvedComment
    );
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);

    const result = await CommentService.approveComment(commentId, reviewerId);

    expect(CommentRepository.approve).toHaveBeenCalledWith(
      commentId,
      reviewerId
    );
    expect(NotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'comment-author',
        notificationReferenceType: 'comment',
        referenceId: commentId,
      })
    );
    expect(NotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'article-author',
        notificationReferenceType: 'comment',
        referenceId: commentId,
      })
    );
    expect(result).toEqual(approvedComment);
  });

  it('should not notify the article author when they are also the comment author', async () => {
    const pendingComment = {
      id: commentId,
      articleId: 'article-123',
      createdBy: 'same-user',
      status: 'Pending',
    };
    const approvedComment = { ...pendingComment, status: 'Approved' };
    const article = {
      id: 'article-123',
      authorId: 'same-user',
      title: 'Test Article',
    };

    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      pendingComment
    );
    (CommentRepository.approve as jest.Mock<any>).mockResolvedValue(
      approvedComment
    );
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);

    await CommentService.approveComment(commentId, reviewerId);

    expect(NotificationService.send).toHaveBeenCalledTimes(1);
  });
});

describe('CommentService.rejectComment', () => {
  const commentId = 'comment-123';
  const reviewerId = 'admin-1';
  const reason = 'This comment violates community guidelines';

  beforeEach(() => {
    jest.clearAllMocks();
    (NotificationService.send as jest.Mock<any>).mockResolvedValue(undefined);
  });

  it('should throw AppError if reason is missing', async () => {
    await expect(
      CommentService.rejectComment(commentId, reviewerId, undefined)
    ).rejects.toThrow(new AppError('Rejection reason must be at least 10 characters', 400));
    expect(CommentRepository.findById).not.toHaveBeenCalled();
  });

  it('should throw AppError if reason is under 10 trimmed characters', async () => {
    await expect(
      CommentService.rejectComment(commentId, reviewerId, '   short  ')
    ).rejects.toThrow(new AppError('Rejection reason must be at least 10 characters', 400));
    expect(CommentRepository.findById).not.toHaveBeenCalled();
  });

  it('should throw AppError if comment is not found', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(
      CommentService.rejectComment(commentId, reviewerId, reason)
    ).rejects.toThrow(new AppError('Comment not found', 404));
  });

  it('should throw AppError if comment is not Pending', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: commentId,
      status: 'Rejected',
    });

    await expect(
      CommentService.rejectComment(commentId, reviewerId, reason)
    ).rejects.toThrow(new AppError('Only Pending comments can be rejected', 400));
  });

  it('should reject the comment and notify the comment author with the reason', async () => {
    const pendingComment = {
      id: commentId,
      articleId: 'article-123',
      createdBy: 'comment-author',
      status: 'Pending',
    };
    const rejectedComment = {
      ...pendingComment,
      status: 'Rejected',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    };

    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      pendingComment
    );
    (CommentRepository.reject as jest.Mock<any>).mockResolvedValue(
      rejectedComment
    );

    const result = await CommentService.rejectComment(commentId, reviewerId, `  ${reason}  `);

    expect(CommentRepository.reject).toHaveBeenCalledWith(
      commentId,
      reviewerId,
      reason
    );
    expect(NotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'comment-author',
        notificationReferenceType: 'comment',
        referenceId: commentId,
      })
    );
    expect(result).toEqual(rejectedComment);
  });
});
