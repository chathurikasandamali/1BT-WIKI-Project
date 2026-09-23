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
    requestEdit: jest.fn(),
    requestDeletion: jest.fn(),
    findPending: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    approveEdit: jest.fn(),
    approveDeletion: jest.fn(),
    discardPendingChange: jest.fn(),
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

const buildComment = (overrides: Record<string, unknown> = {}) => ({
  id: 'comment-123',
  articleId: 'article-123',
  createdBy: 'user-123',
  body: 'Original body',
  status: 'Approved',
  reviewedBy: 'admin-1',
  reviewedAt: new Date(),
  pendingChange: null,
  pendingBody: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
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
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ createdBy: 'other-user' })
    );

    await expect(
      CommentService.updateComment(commentId, userId, 'Updated body')
    ).rejects.toThrow(
      new AppError('Only the comment owner can edit this comment', 403)
    );
  });

  it('should block editing a Pending comment', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ status: 'Pending', reviewedBy: null, reviewedAt: null })
    );

    await expect(
      CommentService.updateComment(commentId, userId, 'Updated body')
    ).rejects.toThrow(
      new AppError('This comment is awaiting approval and cannot be changed', 409)
    );
    expect(CommentRepository.requestEdit).not.toHaveBeenCalled();
  });

  it('should block editing a Rejected comment', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ status: 'Rejected' })
    );

    await expect(
      CommentService.updateComment(commentId, userId, 'Updated body')
    ).rejects.toThrow(new AppError('A rejected comment cannot be changed', 409));
    expect(CommentRepository.requestEdit).not.toHaveBeenCalled();
  });

  it.each(['Edit', 'Delete'])(
    'should block editing an Approved comment that already has a pending %s request',
    async (pendingChange) => {
      (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
        buildComment({ pendingChange })
      );

      await expect(
        CommentService.updateComment(commentId, userId, 'Updated body')
      ).rejects.toThrow(
        new AppError('This comment already has a change awaiting approval', 409)
      );
      expect(CommentRepository.requestEdit).not.toHaveBeenCalled();
    }
  );

  it('should reject an edit that does not change the body', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment()
    );

    await expect(
      CommentService.updateComment(commentId, userId, '  Original body  ')
    ).rejects.toThrow(new AppError('Comment body is unchanged', 400));
    expect(CommentRepository.requestEdit).not.toHaveBeenCalled();
  });

  it('should submit an edit request for an Approved comment, keeping it Approved', async () => {
    const existingComment = buildComment();
    const requestedComment = {
      ...existingComment,
      pendingChange: 'Edit',
      pendingBody: 'Updated body',
    };

    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      existingComment
    );
    (CommentRepository.requestEdit as jest.Mock<any>).mockResolvedValue(
      requestedComment
    );

    const result = await CommentService.updateComment(
      commentId,
      userId,
      '  Updated body  '
    );

    expect(CommentRepository.requestEdit).toHaveBeenCalledWith(
      commentId,
      'Updated body'
    );
    expect(result).toEqual(requestedComment);
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
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ createdBy: 'other-user' })
    );

    await expect(
      CommentService.deleteComment(commentId, userId)
    ).rejects.toThrow(
      new AppError('Only the comment owner can delete this comment', 403)
    );

    expect(CommentRepository.requestDeletion).not.toHaveBeenCalled();
  });

  it('should block deleting a Pending comment', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ status: 'Pending', reviewedBy: null, reviewedAt: null })
    );

    await expect(
      CommentService.deleteComment(commentId, userId)
    ).rejects.toThrow(
      new AppError('This comment is awaiting approval and cannot be changed', 409)
    );
    expect(CommentRepository.requestDeletion).not.toHaveBeenCalled();
  });

  it('should block deleting a Rejected comment', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ status: 'Rejected' })
    );

    await expect(
      CommentService.deleteComment(commentId, userId)
    ).rejects.toThrow(new AppError('A rejected comment cannot be changed', 409));
    expect(CommentRepository.requestDeletion).not.toHaveBeenCalled();
  });

  it('should block deleting an Approved comment that already has a pending request', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ pendingChange: 'Delete' })
    );

    await expect(
      CommentService.deleteComment(commentId, userId)
    ).rejects.toThrow(
      new AppError('This comment already has a change awaiting approval', 409)
    );
    expect(CommentRepository.requestDeletion).not.toHaveBeenCalled();
  });

  it('should submit a deletion request for an Approved comment instead of deleting it', async () => {
    const requestedComment = buildComment({ pendingChange: 'Delete' });
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment()
    );
    (CommentRepository.requestDeletion as jest.Mock<any>).mockResolvedValue(
      requestedComment
    );

    const result = await CommentService.deleteComment(commentId, userId);

    expect(CommentRepository.requestDeletion).toHaveBeenCalledWith(commentId);
    expect(result).toEqual(requestedComment);
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

  it('should throw AppError if comment is not awaiting moderation', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ createdBy: 'comment-author' })
    );

    await expect(
      CommentService.approveComment(commentId, reviewerId)
    ).rejects.toThrow(
      new AppError('Only comments awaiting moderation can be approved', 400)
    );
  });

  it.each([
    ['a new comment', { status: 'Pending' }],
    ['an edit request', { pendingChange: 'Edit', pendingBody: 'New body' }],
    ['a deletion request', { pendingChange: 'Delete' }],
  ])('should block an admin from approving their own %s', async (_label, overrides) => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ createdBy: reviewerId, ...overrides })
    );

    await expect(
      CommentService.approveComment(commentId, reviewerId)
    ).rejects.toThrow(new AppError('You cannot moderate your own comment', 403));
    expect(CommentRepository.approve).not.toHaveBeenCalled();
    expect(CommentRepository.approveEdit).not.toHaveBeenCalled();
    expect(CommentRepository.approveDeletion).not.toHaveBeenCalled();
  });

  it('should approve the comment and notify the comment author and article author', async () => {
    const pendingComment = buildComment({
      createdBy: 'comment-author',
      status: 'Pending',
    });
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
    const pendingComment = buildComment({
      createdBy: 'same-user',
      status: 'Pending',
    });
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

  it('should apply a pending edit and notify only the comment author', async () => {
    const requested = buildComment({
      createdBy: 'comment-author',
      pendingChange: 'Edit',
      pendingBody: 'New body',
    });
    const edited = {
      ...requested,
      body: 'New body',
      pendingChange: null,
      pendingBody: null,
    };

    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(requested);
    (CommentRepository.approveEdit as jest.Mock<any>).mockResolvedValue(edited);

    const result = await CommentService.approveComment(commentId, reviewerId);

    expect(CommentRepository.approveEdit).toHaveBeenCalledWith(
      commentId,
      reviewerId,
      'New body'
    );
    expect(CommentRepository.approve).not.toHaveBeenCalled();
    expect(NotificationService.send).toHaveBeenCalledTimes(1);
    expect(NotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'comment-author' })
    );
    expect(result).toEqual(edited);
  });

  it('should delete the comment when a pending deletion is approved', async () => {
    const requested = buildComment({
      createdBy: 'comment-author',
      pendingChange: 'Delete',
    });
    const deleted = { ...requested, pendingChange: null };

    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(requested);
    (CommentRepository.approveDeletion as jest.Mock<any>).mockResolvedValue(
      deleted
    );

    const result = await CommentService.approveComment(commentId, reviewerId);

    expect(CommentRepository.approveDeletion).toHaveBeenCalledWith(
      commentId,
      reviewerId
    );
    expect(NotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'comment-author' })
    );
    expect(result).toEqual(deleted);
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

  it('should throw AppError if comment is not awaiting moderation', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ createdBy: 'comment-author', status: 'Rejected' })
    );

    await expect(
      CommentService.rejectComment(commentId, reviewerId)
    ).rejects.toThrow(
      new AppError('Only comments awaiting moderation can be rejected', 400)
    );
  });

  it('should block an admin from rejecting their own comment', async () => {
    (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
      buildComment({ createdBy: reviewerId, status: 'Pending' })
    );

    await expect(
      CommentService.rejectComment(commentId, reviewerId)
    ).rejects.toThrow(new AppError('You cannot moderate your own comment', 403));
    expect(CommentRepository.reject).not.toHaveBeenCalled();
  });

  it('should reject the comment and notify the comment author', async () => {
    const pendingComment = buildComment({
      createdBy: 'comment-author',
      status: 'Pending',
    });
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

  it.each(['Edit', 'Delete'])(
    'should discard a pending %s request and keep the comment Approved',
    async (pendingChange) => {
      const requested = buildComment({
        createdBy: 'comment-author',
        pendingChange,
        pendingBody: pendingChange === 'Edit' ? 'New body' : null,
      });
      const restored = { ...requested, pendingChange: null, pendingBody: null };

      (CommentRepository.findById as jest.Mock<any>).mockResolvedValue(
        requested
      );
      (CommentRepository.discardPendingChange as jest.Mock<any>).mockResolvedValue(
        restored
      );

      const result = await CommentService.rejectComment(commentId, reviewerId);

      expect(CommentRepository.discardPendingChange).toHaveBeenCalledWith(
        commentId
      );
      expect(CommentRepository.reject).not.toHaveBeenCalled();
      expect(NotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: 'comment-author' })
      );
      expect(result).toEqual(restored);
    }
  );
});
