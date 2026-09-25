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

jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    findById: jest.fn(),
    findActiveByRole: jest.fn(),
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
const { default: UserRepository } =
  await import('@repositories/userRepository.js');

// Admin notifications are fire-and-forget, so let them settle before asserting.
const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const ADMIN_NOTIFICATION_TITLE = 'New Comment Awaiting Approval';

const mockAdminsAndCommenter = (
  adminIds: string[],
  commenterName: string | null = 'Jane Doe'
): void => {
  (UserRepository.findActiveByRole as jest.Mock<any>).mockResolvedValue(
    adminIds.map((id) => ({ id }))
  );
  (UserRepository.findById as jest.Mock<any>).mockResolvedValue(
    commenterName === null ? null : { id: 'user-123', name: commenterName }
  );
};

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

  describe('when the comment is created on a Published article', () => {
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

    beforeEach(() => {
      (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(article);
      (CommentRepository.create as jest.Mock<any>).mockResolvedValue(
        createdComment
      );
    });

    it('should create the comment as Pending', async () => {
      mockAdminsAndCommenter([]);

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
      expect(result).toEqual(createdComment);
    });

    it('should notify every active Admin to approve or reject the comment', async () => {
      mockAdminsAndCommenter(['admin-1', 'admin-2']);

      await CommentService.addComment(articleId, authorId, 'Nice article');
      await flushPromises();

      expect(UserRepository.findActiveByRole).toHaveBeenCalledWith('Admin');
      expect(NotificationService.send).toHaveBeenCalledTimes(2);
      for (const adminId of ['admin-1', 'admin-2']) {
        expect(NotificationService.send).toHaveBeenCalledWith({
          recipientId: adminId,
          notificationReferenceType: 'comment',
          referenceId: 'comment-123',
          notificationType: 'info',
          notificationTitle: ADMIN_NOTIFICATION_TITLE,
          message:
            'Jane Doe commented on the article "Test Article". Please approve or reject this comment.',
        });
      }
    });

    it('should not notify the commenter when they are an Admin themselves', async () => {
      mockAdminsAndCommenter([authorId, 'admin-2']);

      await CommentService.addComment(articleId, authorId, 'Nice article');
      await flushPromises();

      expect(NotificationService.send).toHaveBeenCalledTimes(1);
      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: 'admin-2' })
      );
    });

    it('should fall back to a generic name when the commenter cannot be found', async () => {
      mockAdminsAndCommenter(['admin-1'], null);

      await CommentService.addComment(articleId, authorId, 'Nice article');
      await flushPromises();

      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'A user commented on the article "Test Article". Please approve or reject this comment.',
        })
      );
    });

    it('should still create the comment when notifying the Admins fails', async () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      (UserRepository.findActiveByRole as jest.Mock<any>).mockRejectedValue(
        new Error('DB down')
      );
      (UserRepository.findById as jest.Mock<any>).mockResolvedValue(null);

      const result = await CommentService.addComment(
        articleId,
        authorId,
        'Nice article'
      );
      await flushPromises();

      expect(result).toEqual(createdComment);
      expect(NotificationService.send).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should log and carry on when sending to one Admin fails', async () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockAdminsAndCommenter(['admin-1', 'admin-2']);
      (NotificationService.send as jest.Mock<any>)
        .mockRejectedValueOnce(new Error('send failed'))
        .mockResolvedValueOnce(undefined);

      const result = await CommentService.addComment(
        articleId,
        authorId,
        'Nice article'
      );
      await flushPromises();

      expect(result).toEqual(createdComment);
      expect(NotificationService.send).toHaveBeenCalledTimes(2);
      expect(consoleError).toHaveBeenCalledTimes(1);
      consoleError.mockRestore();
    });
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

  it('should throw AppError and not update if the comment is Pending approval', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: commentId,
      articleId: 'article-123',
      createdBy: userId,
      body: 'Original body',
      status: 'Pending',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      CommentService.updateComment(commentId, userId, 'Updated body')
    ).rejects.toThrow(
      new AppError('This comment is awaiting approval and cannot be edited', 409)
    );

    expect(CommentRepository.update).not.toHaveBeenCalled();
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
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: 'article-123',
      title: 'Test Article',
    });
    mockAdminsAndCommenter(['admin-1']);

    const result = await CommentService.updateComment(
      commentId,
      userId,
      '  Updated body  '
    );
    await flushPromises();

    expect(CommentRepository.update).toHaveBeenCalledWith(
      commentId,
      'Updated body'
    );
    expect(result).toEqual(updatedComment);
    // Back in the queue, so the Admins must moderate it again.
    expect(NotificationService.send).toHaveBeenCalledWith({
      recipientId: 'admin-1',
      notificationReferenceType: 'comment',
      referenceId: commentId,
      notificationType: 'info',
      notificationTitle: ADMIN_NOTIFICATION_TITLE,
      message:
        'Jane Doe edited their comment on the article "Test Article". Please approve or reject this comment.',
    });
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

  it('should throw AppError and not delete if the comment is Pending approval', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: commentId,
      articleId: 'article-123',
      createdBy: userId,
      body: 'Original body',
      status: 'Pending',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      CommentService.deleteComment(commentId, userId)
    ).rejects.toThrow(
      new AppError('This comment is awaiting approval and cannot be deleted', 409)
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

  beforeEach(() => {
    jest.clearAllMocks();
    (NotificationService.send as jest.Mock<any>).mockResolvedValue(undefined);
  });

  it('should throw AppError if comment is not found', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(
      CommentService.rejectComment(commentId, reviewerId)
    ).rejects.toThrow(new AppError('Comment not found', 404));
  });

  it('should throw AppError if comment is not Pending', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue({
      id: commentId,
      status: 'Rejected',
    });

    await expect(
      CommentService.rejectComment(commentId, reviewerId)
    ).rejects.toThrow(new AppError('Only Pending comments can be rejected', 400));
  });

  it('should reject the comment and notify the comment author', async () => {
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
    };

    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      pendingComment
    );
    (CommentRepository.reject as jest.Mock<any>).mockResolvedValue(
      rejectedComment
    );

    const result = await CommentService.rejectComment(commentId, reviewerId);

    expect(CommentRepository.reject).toHaveBeenCalledWith(
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
    expect(result).toEqual(rejectedComment);
  });
});
