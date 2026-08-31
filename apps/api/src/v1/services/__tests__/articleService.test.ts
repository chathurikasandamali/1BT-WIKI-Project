import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import { AppError } from '@errors/AppError.js';
import type { ArticleRepository, ArticleDetailRecord } from '@repositories/articleRepository.js';
import { ArticleStatusValue, type ArticleStatus } from '@models/article.types.js';
import type { CreateNotificationInput } from '@models/notificationTypes.js';
import type { QuizService } from '@services/quizService.js';
import type { User, UserRole } from '@/types/userTypes.js';
import { UserRoleValue } from '@/types/userTypes.js';
import { HttpStatusCode } from '@/v1/utils/httpStatus.js';

const mockFindActiveByRole = jest
  .fn<(role: UserRole) => Promise<User[]>>()
  .mockResolvedValue([]);
const mockNotificationSend = jest
  .fn<(payload: CreateNotificationInput) => Promise<void>>()
  .mockResolvedValue(undefined);

// Side-effect dependencies that aren't injected — still mock via module system
jest.unstable_mockModule('@repositories/articleRepository.js', () => {
  const mockCreate = jest.fn();
  const mockFindById = jest.fn();
  const mockUpdate = jest.fn();
  const mockUpdateStatus = jest.fn();
  const mockFindByStatus = jest.fn();
  const mockSoftDelete = jest.fn();
  const mockHardDelete = jest.fn();

  return {
    default: {
      create: mockCreate,
      findById: mockFindById,
      update: mockUpdate,
      updateStatus: mockUpdateStatus,
      findByStatus: mockFindByStatus,
      softDelete: mockSoftDelete,
      hardDelete: mockHardDelete,
    },
    ArticleRepository: jest.fn().mockImplementation(() => ({
      create: mockCreate,
      findById: mockFindById,
      update: mockUpdate,
      updateStatus: mockUpdateStatus,
      findByStatus: mockFindByStatus,
      softDelete: mockSoftDelete,
      hardDelete: mockHardDelete,
    })),
  };
});

jest.unstable_mockModule('@repositories/articleReviewRepository.js', () => {
  const mockFindLatest = jest.fn();
  return {
    default: { findLatestByArticleId: mockFindLatest },
    ArticleReviewRepository: jest
      .fn()
      .mockImplementation(() => ({ findLatestByArticleId: mockFindLatest })),
  };
});

jest.unstable_mockModule('@repositories/articleAttachmentRepository.js', () => {
  const mockCreate = jest.fn();
  return {
    default: { create: mockCreate },
    ArticleAttachmentRepository: jest
      .fn()
      .mockImplementation(() => ({ create: mockCreate })),
  };
});

jest.unstable_mockModule('@v1/lib/b2Client.js', () => ({
  default: {
    uploadFile: jest.fn(),
  },
}));

jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    findManyByIds: jest.fn(),
    findById: jest.fn(),
    findActiveByRole: mockFindActiveByRole,
  },
}));

jest.unstable_mockModule('@services/notificationService.js', () => ({
  default: {
    send: mockNotificationSend,
  },
}));

const { ArticleService } = await import('../articleService.js');
const { default: ArticleAttachmentRepository } =
  await import('@repositories/articleAttachmentRepository.js');
const { default: ArticleReviewRepository } =
  await import('@repositories/articleReviewRepository.js');
const { default: b2Client } = await import('../../lib/b2Client.js');

// Build a typed mock repository object — injected directly into the service.
const makeRepo = (): jest.Mocked<
  Pick<
    ArticleRepository,
    | 'create'
    | 'findById'
    | 'update'
    | 'updateStatus'
    | 'findByStatus'
    | 'findByAuthor'
    | 'softDelete'
    | 'hardDelete'
  >
> => ({
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  findByStatus: jest.fn(),
  findByAuthor: jest.fn(),
  softDelete: jest.fn(),
  hardDelete: jest.fn(),
});

const makeUserRepo = () => ({
  findManyByIds: jest.fn<() => Promise<unknown[]>>(),
  findActiveByRole: jest
    .fn<(role: UserRole) => Promise<User[]>>()
    .mockResolvedValue([]),
});

const makeQuizService = (): jest.Mocked<
  Pick<QuizService, 'pregenerateFallbackQuiz'>
> => ({
  pregenerateFallbackQuiz: jest
    .fn<(articleId: string) => Promise<void>>()
    .mockResolvedValue(undefined),
});

// Shared fixtures for author enrichment assertions
const AUTHOR_ALICE = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
const AUTHOR_BOB = { id: 'user-2', name: 'Bob', email: 'bob@example.com' };
const UNKNOWN_AUTHOR = { authorName: 'Unknown', authorEmail: null, authorImage: null };
const INVALID_STATUS_FILTER_ERROR = new AppError(
  'Invalid status filter. Allowed: Pending, Approved, Published, Unpublished',
  HttpStatusCode.BAD_REQUEST
);

/** Typed builder for repository article rows — override only what a test cares about. */
const makeArticleRecord = (
  overrides: Partial<ArticleDetailRecord> = {}
): ArticleDetailRecord => ({
  id: 'article-123',
  title: 'Test Article',
  body: { type: 'doc' },
  status: 'Published',
  authorId: AUTHOR_ALICE.id,
  views: 0,
  tags: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  authorName: AUTHOR_ALICE.name,
  ...overrides,
});

// Valid TipTap body whose meaningful plain-text length exceeds the shared
// MIN_ARTICLE_CONTENT_LENGTH — required for creation that must succeed.
const VALID_BODY = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'This is a sufficiently detailed article body containing more than fifty characters of meaningful content for validation.',
        },
      ],
    },
  ],
};

describe('ArticleService.createArticle', () => {
  const authorId = 'user-123';
  let mockRepo: ReturnType<typeof makeRepo>;
  let service: InstanceType<typeof ArticleService>;

  beforeEach(() => {
    mockRepo = makeRepo();
    service = new ArticleService(
      mockRepo as unknown as ArticleRepository,
      ArticleReviewRepository as any,
      ArticleAttachmentRepository as any
    );
    jest.clearAllMocks();
    process.env.B2_BUCKET_NAME = 'test-bucket';
  });

  afterEach(() => {
    delete process.env.B2_BUCKET_NAME;
  });

  describe('Validation', () => {
    it('should throw AppError if more than 10 images are provided', async () => {
      const input = { title: 'Test Title', body: { type: 'doc' } };
      const images = Array.from({ length: 11 }).map(
        () => ({}) as Express.Multer.File
      );

      await expect(
        service.createArticle(input, authorId, images)
      ).rejects.toThrow(new AppError('Maximum 10 images per article', HttpStatusCode.BAD_REQUEST));
    });

    it('should throw AppError if an image exceeds 5MB', async () => {
      const input = { title: 'Test Title', body: { type: 'doc' } };
      const images = [
        {
          size: 6 * 1024 * 1024,
          mimetype: 'image/jpeg',
        } as Express.Multer.File,
      ];

      await expect(
        service.createArticle(input, authorId, images)
      ).rejects.toThrow(new AppError('Image size cannot exceed 5MB', HttpStatusCode.BAD_REQUEST));
    });

    it('should throw AppError if an image has invalid mimetype', async () => {
      const input = { title: 'Test Title', body: { type: 'doc' } };
      const images = [
        { size: 1024, mimetype: 'application/pdf' } as Express.Multer.File,
      ];

      await expect(
        service.createArticle(input, authorId, images)
      ).rejects.toThrow(
        new AppError('Only jpeg, png, webp, and gif images are allowed', HttpStatusCode.BAD_REQUEST)
      );
    });

    it('should throw AppError if title is missing or empty', async () => {
      const input = { title: '   ', body: { type: 'doc' } };
      await expect(service.createArticle(input, authorId)).rejects.toThrow(
        new AppError('Title is required and cannot be empty', HttpStatusCode.BAD_REQUEST)
      );
    });

    it('should throw AppError if title exceeds 500 characters', async () => {
      const input = { title: 'a'.repeat(501), body: { type: 'doc' } };
      await expect(service.createArticle(input, authorId)).rejects.toThrow(
        new AppError('Title cannot exceed 500 characters', HttpStatusCode.BAD_REQUEST)
      );
    });

    it('should throw AppError if body is a string', async () => {
      const input = {
        title: 'Valid Title',
        body: '<p>HTML body</p>' as unknown as never,
      };
      await expect(service.createArticle(input, authorId)).rejects.toThrow(
        new AppError(
          'Body must be valid JSONContent, raw HTML is not allowed',
          HttpStatusCode.BAD_REQUEST
        )
      );
    });

    it('should throw AppError if body is an array', async () => {
      const input = { title: 'Valid Title', body: [] as unknown as never };
      await expect(service.createArticle(input, authorId)).rejects.toThrow(
        new AppError('Body must be a valid JSON object', HttpStatusCode.BAD_REQUEST)
      );
    });

    it('should throw AppError if body is not empty and lacks a "type" field', async () => {
      const input = {
        title: 'Valid Title',
        body: { content: 'hello' } as unknown as never,
      };
      await expect(service.createArticle(input, authorId)).rejects.toThrow(
        new AppError('Body must have a "type" field', HttpStatusCode.BAD_REQUEST)
      );
    });

    it('should throw AppError if body is missing or empty', async () => {
      const input = { title: 'Valid Title', body: undefined };
      await expect(service.createArticle(input, authorId)).rejects.toThrow(
        new AppError('Article content is required', HttpStatusCode.BAD_REQUEST)
      );
    });

    it('should throw AppError if the TipTap document has no content', async () => {
      const input = {
        title: 'Valid Title',
        body: { type: 'doc', content: [] },
      };
      await expect(service.createArticle(input, authorId)).rejects.toThrow(
        new AppError('Article content is required', HttpStatusCode.BAD_REQUEST)
      );
    });

    it('should throw AppError if the TipTap document has only empty paragraphs', async () => {
      const input = {
        title: 'Valid Title',
        body: {
          type: 'doc',
          content: [
            { type: 'paragraph' },
            { type: 'paragraph' },
            { type: 'paragraph' },
          ],
        },
      };
      await expect(service.createArticle(input, authorId)).rejects.toThrow(
        new AppError('Article content is required', HttpStatusCode.BAD_REQUEST)
      );
    });

    it('should throw AppError if the TipTap content is whitespace-only', async () => {
      const input = {
        title: 'Valid Title',
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '   ' }],
            },
          ],
        },
      };
      await expect(service.createArticle(input, authorId)).rejects.toThrow(
        new AppError('Article content is required', HttpStatusCode.BAD_REQUEST)
      );
    });

    it('should throw AppError if the content is below the minimum length', async () => {
      const input = {
        title: 'Valid Title',
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'short content' }],
            },
          ],
        },
      };
      await expect(service.createArticle(input, authorId)).rejects.toThrow(
        new AppError(
          'Article content must be at least 50 characters',
          HttpStatusCode.BAD_REQUEST
        )
      );
    });

    it('should accept content exactly at the minimum length', async () => {
      const exactText = 'x'.repeat(50);
      const input = {
        title: 'Valid Title',
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: exactText }],
            },
          ],
        },
      };
      mockRepo.create.mockResolvedValue({
        id: 'article-min',
        ...input,
        authorId,
      } as never);

      await expect(
        service.createArticle(input, authorId)
      ).resolves.toBeDefined();
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('should count only meaningful text, not markup', async () => {
      const input = {
        title: 'Valid Title',
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello ' },
                {
                  type: 'text',
                  marks: [{ type: 'strong' }],
                  text: 'world, this is a long formatted paragraph with sufficient length.',
                },
              ],
            },
          ],
        },
      };
      mockRepo.create.mockResolvedValue({
        id: 'article-markup',
        ...input,
        authorId,
      } as never);

      await expect(service.createArticle(input, authorId)).resolves.toBeDefined();
    });
  });

  describe('Creation', () => {
    it('should successfully create an article without images', async () => {
      const input = {
        title: 'Valid Title',
        body: VALID_BODY,
        tags: ['test'],
      };
      const createdArticle = { id: 'article-123', ...input, authorId };

      mockRepo.create.mockResolvedValue(createdArticle as never);

      const result = await service.createArticle(input, authorId);

      expect(mockRepo.create).toHaveBeenCalledWith({
        title: 'Valid Title',
        body: VALID_BODY,
        tags: ['test'],
        authorId,
      });
      expect(result).toEqual({ ...createdArticle, attachments: [] });
    });

    it('should successfully create an article and upload valid images', async () => {
      const input = { title: 'Valid Title', body: VALID_BODY };
      const images = [
        {
          originalname: 'test image.png',
          mimetype: 'image/png',
          size: 1024,
          buffer: Buffer.from('test'),
        } as Express.Multer.File,
      ];

      const createdArticle = { id: 'article-123', ...input, authorId };
      const uploadedFile = {
        fileId: 'file-123',
        fileUrl: 'http://example.com/file',
      };
      const createdAttachment = {
        id: 'attachment-123',
        fileName: 'test image.png',
      };

      mockRepo.create.mockResolvedValue(createdArticle as never);
      (b2Client.uploadFile as jest.Mock<any>).mockResolvedValue(uploadedFile);
      (ArticleAttachmentRepository.create as jest.Mock<any>).mockResolvedValue(
        createdAttachment
      );

      const result = await service.createArticle(input, authorId, images);

      expect(mockRepo.create).toHaveBeenCalled();
      expect(b2Client.uploadFile).toHaveBeenCalledWith(
        expect.stringMatching(
          /^articles\/article-123\/[a-f0-9\-]+-test_image\.png$/
        ),
        images[0].buffer,
        images[0].mimetype
      );
      expect(ArticleAttachmentRepository.create).toHaveBeenCalledWith({
        articleId: 'article-123',
        uploadedBy: authorId,
        fileName: 'test image.png',
        b2FileKey: expect.any(String),
        b2FileId: 'file-123',
        b2BucketName: 'test-bucket',
        fileUrl: 'http://example.com/file',
        mimeType: 'image/png',
        sizeBytes: 1024,
      });

      expect(result).toEqual({
        ...createdArticle,
        attachments: [createdAttachment],
      });
      expect(result.warnings).toBeUndefined();
    });

    it('should return warnings if image upload fails', async () => {
      const input = { title: 'Valid Title', body: VALID_BODY };
      const images = [
        {
          originalname: 'fail.png',
          mimetype: 'image/png',
          size: 1024,
          buffer: Buffer.from('test'),
        } as Express.Multer.File,
      ];

      const createdArticle = { id: 'article-123', ...input, authorId };

      mockRepo.create.mockResolvedValue(createdArticle as never);
      (b2Client.uploadFile as jest.Mock<any>).mockRejectedValue(
        new Error('Upload failed')
      );

      const result = await service.createArticle(input, authorId, images);

      expect(result).toEqual({
        ...createdArticle,
        attachments: [],
        warnings: ['Failed to upload fail.png: Upload failed'],
      });
    });
  });
});

describe('ArticleService.listAllArticles', () => {
  let mockRepo: ReturnType<typeof makeRepo>;
  let mockUserRepo: ReturnType<typeof makeUserRepo>;
  let service: InstanceType<typeof ArticleService>;

  beforeEach(() => {
    mockRepo = makeRepo();
    mockUserRepo = makeUserRepo();
    service = new ArticleService(
      mockRepo as unknown as ArticleRepository,
      ArticleReviewRepository as any,
      ArticleAttachmentRepository as any,
      mockUserRepo as any
    );
    jest.clearAllMocks();
  });

  it('should call findByStatus with undefined status and exclude Drafts when no status filter is given', async () => {
    mockRepo.findByStatus.mockResolvedValue({ articles: [], total: 0 } as never);
    mockUserRepo.findManyByIds.mockResolvedValue([]);

    const result = await service.listAllArticles(1, 20);

    expect(mockRepo.findByStatus).toHaveBeenCalledWith(
      undefined,
      1,
      20,
      {
        includeCounts: true,
        search: undefined,
        sort: undefined,
        order: undefined,
        excludeStatus: 'Draft',
      }
    );
    expect(result).toEqual({ articles: [], total: 0, page: 1, limit: 20 });
  });

  it('should pass the status filter through to findByStatus when a valid status is provided', async () => {
    mockRepo.findByStatus.mockResolvedValue({ articles: [], total: 0 } as never);
    mockUserRepo.findManyByIds.mockResolvedValue([]);

    await service.listAllArticles(1, 20, ArticleStatusValue.Approved);

    expect(mockRepo.findByStatus).toHaveBeenCalledWith(
      ArticleStatusValue.Approved,
      1,
      20,
      { includeCounts: true, search: undefined, sort: undefined, order: undefined }
    );
  });

  it('should throw 400 for an invalid status filter', async () => {
    await expect(
      service.listAllArticles(1, 20, 'bogus')
    ).rejects.toThrow(INVALID_STATUS_FILTER_ERROR);

    expect(mockRepo.findByStatus).not.toHaveBeenCalled();
  });

  it('should throw 400 for the Draft status filter (drafts are private to authors)', async () => {
    await expect(
      service.listAllArticles(1, 20, 'Draft')
    ).rejects.toThrow(INVALID_STATUS_FILTER_ERROR);

    expect(mockRepo.findByStatus).not.toHaveBeenCalled();
  });

  it('should throw 400 for an invalid sort field', async () => {
    await expect(
      service.listAllArticles(1, 20, undefined, undefined, 'hackedField')
    ).rejects.toThrow(new AppError('Invalid sort field. Allowed: title, createdAt, views', HttpStatusCode.BAD_REQUEST));

    expect(mockRepo.findByStatus).not.toHaveBeenCalled();
  });

  it('should throw 400 for an invalid order value', async () => {
    await expect(
      service.listAllArticles(1, 20, undefined, undefined, 'createdAt', 'sideways')
    ).rejects.toThrow(new AppError('Invalid sort order. Allowed: asc, desc', HttpStatusCode.BAD_REQUEST));

    expect(mockRepo.findByStatus).not.toHaveBeenCalled();
  });

  it('should enrich articles with authorName and authorEmail via batched findManyByIds', async () => {
    const mockArticles = [
      makeArticleRecord({
        id: 'article-1',
        title: 'Pending Article',
        status: 'Pending',
        authorId: AUTHOR_ALICE.id,
      }),
      makeArticleRecord({
        id: 'article-2',
        title: 'Published Article',
        status: 'Published',
        authorId: AUTHOR_BOB.id,
      }),
    ];
    const mockAuthors = [
      AUTHOR_ALICE,
      AUTHOR_BOB,
    ];

    mockRepo.findByStatus.mockResolvedValue({ articles: mockArticles, total: 2 } as never);
    mockUserRepo.findManyByIds.mockResolvedValue(mockAuthors as never);

    const result = await service.listAllArticles(1, 20);

    expect(mockUserRepo.findManyByIds).toHaveBeenCalledWith(['user-1', 'user-2']);
    expect(result.articles[0]).toMatchObject({ id: 'article-1', authorName: AUTHOR_ALICE.name, authorEmail: AUTHOR_ALICE.email });
    expect(result.articles[1]).toMatchObject({ id: 'article-2', authorName: AUTHOR_BOB.name, authorEmail: AUTHOR_BOB.email });
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should fall back to Unknown and null when an author is not found in the batch result', async () => {
    const mockArticles = [
      makeArticleRecord({
        id: 'article-1',
        title: 'Orphaned Article',
        status: 'Pending',
        authorId: 'user-missing',
      }),
    ];

    mockRepo.findByStatus.mockResolvedValue({ articles: mockArticles, total: 1 } as never);
    mockUserRepo.findManyByIds.mockResolvedValue([]);

    const result = await service.listAllArticles(1, 20);

    expect(result.articles[0]).toMatchObject({
      id: 'article-1',
      ...UNKNOWN_AUTHOR,
    });
  });

  it('should map rows to AdminArticleListItem without leaking body or _count', async () => {
    const mockArticles = [
      makeArticleRecord({
        id: 'article-1',
        title: 'Pending Article',
        status: 'Pending',
        authorId: AUTHOR_ALICE.id,
        views: 7,
        tags: ['a'],
        _count: { likes: 3, comments: 2 },
      }),
    ];

    mockRepo.findByStatus.mockResolvedValue({ articles: mockArticles, total: 1 } as never);
    mockUserRepo.findManyByIds.mockResolvedValue([
      AUTHOR_ALICE,
    ] as never);

    const result = await service.listAllArticles(1, 20);

    expect(result.articles[0]).not.toHaveProperty('body');
    expect(result.articles[0]).not.toHaveProperty('_count');
    expect(result.articles[0]).toMatchObject({
      id: 'article-1',
      views: 7,
      likeCount: 3,
      commentCount: 2,
      rejectionFeedback: null,
    });
  });

  it('should accept all valid status filter values without throwing', async () => {
    mockRepo.findByStatus.mockResolvedValue({ articles: [], total: 0 } as never);
    mockUserRepo.findManyByIds.mockResolvedValue([]);

    await expect(service.listAllArticles(1, 20, 'Pending')).resolves.not.toThrow();
    await expect(
      service.listAllArticles(1, 20, ArticleStatusValue.Approved)
    ).resolves.not.toThrow();
    await expect(service.listAllArticles(1, 20, 'Published')).resolves.not.toThrow();
    await expect(service.listAllArticles(1, 20, 'Unpublished')).resolves.not.toThrow();
  });
});

describe('ArticleService.updateArticle', () => {
  const authorId = 'user-123';
  const articleId = 'article-123';
  let mockRepo: ReturnType<typeof makeRepo>;
  let service: InstanceType<typeof ArticleService>;

  beforeEach(() => {
    mockRepo = makeRepo();
    service = new ArticleService(
      mockRepo as unknown as ArticleRepository,
      ArticleReviewRepository as any,
      ArticleAttachmentRepository as any
    );
    jest.clearAllMocks();
    process.env.B2_BUCKET_NAME = 'test-bucket';
  });

  afterEach(() => {
    delete process.env.B2_BUCKET_NAME;
  });

  it('should throw AppError if article is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      service.updateArticle(articleId, {}, authorId)
    ).rejects.toThrow(new AppError('Article not found', 404));
  });

  it('should throw AppError if user is not the author', async () => {
    mockRepo.findById.mockResolvedValue({ authorId: 'other-user' } as never);

    await expect(
      service.updateArticle(articleId, {}, authorId)
    ).rejects.toThrow(
      new AppError('Only the author can edit this article', HttpStatusCode.FORBIDDEN)
    );
  });

  it('should throw AppError if article is not Draft or Rejected', async () => {
    mockRepo.findById.mockResolvedValue({
      authorId,
      status: 'Published',
    } as never);
    (
      ArticleReviewRepository.findLatestByArticleId as jest.Mock<any>
    ).mockResolvedValue({ reviewStatus: 'Approved' });

    await expect(
      service.updateArticle(articleId, {}, authorId)
    ).rejects.toThrow(
      new AppError('Only Draft or Rejected articles can be edited', HttpStatusCode.BAD_REQUEST)
    );
  });

  it('should allow editing if article is Draft', async () => {
    const existingArticle = {
      id: articleId,
      authorId,
      status: 'Draft',
      title: 'Old Title',
    };
    mockRepo.findById.mockResolvedValue(existingArticle as never);

    const updatedArticle = { ...existingArticle, title: 'New Title' };
    mockRepo.update.mockResolvedValue(updatedArticle as never);

    const result = await service.updateArticle(
      articleId,
      { title: 'New Title' },
      authorId
    );

    expect(mockRepo.update).toHaveBeenCalledWith(articleId, {
      title: 'New Title',
    });
    expect(result).toEqual(updatedArticle);
  });

  it('should reset status to Draft if article was Rejected', async () => {
    const existingArticle = { id: articleId, authorId, status: 'In Review' };
    mockRepo.findById.mockResolvedValue(existingArticle as never);
    (
      ArticleReviewRepository.findLatestByArticleId as jest.Mock<any>
    ).mockResolvedValue({ reviewStatus: 'Rejected' });

    const updatedArticle = {
      ...existingArticle,
      status: 'Draft',
      title: 'New Title',
    };
    mockRepo.update.mockResolvedValue(updatedArticle as never);

    const result = await service.updateArticle(
      articleId,
      { title: 'New Title' },
      authorId
    );

    expect(mockRepo.update).toHaveBeenCalledWith(articleId, {
      title: 'New Title',
      status: 'Draft',
    });
    expect(result).toEqual(updatedArticle);
  });

  it('should return existing article if no updates and no images provided', async () => {
    const existingArticle = {
      id: articleId,
      authorId,
      status: 'Draft',
      title: 'Old Title',
    };
    mockRepo.findById.mockResolvedValue(existingArticle as never);

    const result = await service.updateArticle(articleId, {}, authorId);

    expect(mockRepo.update).not.toHaveBeenCalled();
    expect(result).toEqual(existingArticle);
  });

  it('should successfully upload new images', async () => {
    const existingArticle = {
      id: articleId,
      authorId,
      status: 'Draft',
      title: 'Old Title',
    };
    mockRepo.findById.mockResolvedValue(existingArticle as never);

    const images = [
      {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File,
    ];

    const uploadedFile = {
      fileId: 'file-123',
      fileUrl: 'http://example.com/file',
    };
    const createdAttachment = { id: 'attachment-123', fileName: 'test.png' };

    (b2Client.uploadFile as jest.Mock<any>).mockResolvedValue(uploadedFile);
    (ArticleAttachmentRepository.create as jest.Mock<any>).mockResolvedValue(
      createdAttachment
    );

    const result = await service.updateArticle(articleId, {}, authorId, images);

    expect(mockRepo.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      ...existingArticle,
      attachments: [createdAttachment],
    });
  });
});

describe('ArticleService.submitForReview', () => {
  const authorId = 'user-123';
  const articleId = 'article-123';
  const makeReviewer = (id: string): User => ({
    id,
    name: `Reviewer ${id}`,
    email: `${id}@example.com`,
    emailVerified: true,
    image: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    role: UserRoleValue.Reviewer,
    banned: false,
    banReason: null,
    banExpires: null,
  });
  let mockRepo: ReturnType<typeof makeRepo>;
  let service: InstanceType<typeof ArticleService>;

  beforeEach(() => {
    mockRepo = makeRepo();
    service = new ArticleService(
      mockRepo as unknown as ArticleRepository,
      ArticleReviewRepository as any,
      ArticleAttachmentRepository as any
    );
    jest.clearAllMocks();
  });

  it('should throw AppError if article is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.submitForReview(articleId, authorId)).rejects.toThrow(
      new AppError('Article not found', HttpStatusCode.NOT_FOUND)
    );
  });

  it('should throw AppError if user is not the author', async () => {
    mockRepo.findById.mockResolvedValue({ authorId: 'other-user' } as never);

    await expect(service.submitForReview(articleId, authorId)).rejects.toThrow(
      new AppError('Only the author can edit this article', HttpStatusCode.FORBIDDEN)
    );
  });

  it('should throw AppError if article status is not Draft', async () => {
    mockRepo.findById.mockResolvedValue({
      authorId,
      status: 'Pending',
    } as never);

    await expect(service.submitForReview(articleId, authorId)).rejects.toThrow(
      new AppError('Cannot transition from Pending to Pending', HttpStatusCode.BAD_REQUEST)
    );
  });

  it('should submit article for review successfully', async () => {
    const existingArticle = { id: articleId, authorId, status: 'Draft' };
    const updatedArticle = { ...existingArticle, status: 'Pending' };

    mockRepo.findById.mockResolvedValue(existingArticle as never);
    mockRepo.updateStatus.mockResolvedValue(updatedArticle as never);

    const result = await service.submitForReview(articleId, authorId);

    expect(mockRepo.updateStatus).toHaveBeenCalledWith(articleId, 'Pending');
    expect(result).toEqual(updatedArticle);
  });

  it('should notify an active Reviewer after successful submission', async () => {
    const reviewer = makeReviewer('reviewer-1');
    const existingArticle = {
      id: articleId,
      authorId,
      title: 'Notification Test Article',
      status: 'Draft',
    };
    const updatedArticle = { ...existingArticle, status: 'Pending' };

    mockRepo.findById.mockResolvedValue(existingArticle as never);
    mockRepo.updateStatus.mockResolvedValue(updatedArticle as never);
    mockFindActiveByRole.mockResolvedValueOnce([reviewer]);

    const result = await service.submitForReview(articleId, authorId);

    expect(result).toEqual(updatedArticle);
    expect(mockFindActiveByRole).toHaveBeenCalledWith(
      UserRoleValue.Reviewer
    );
    expect(mockNotificationSend).toHaveBeenCalledTimes(1);
    expect(mockNotificationSend).toHaveBeenCalledWith({
      recipientId: reviewer.id,
      notificationReferenceType: 'article',
      referenceId: articleId,
      notificationType: 'info',
      notificationTitle: 'New Article for Review',
      message: expect.stringContaining(existingArticle.title),
    });
    expect(mockRepo.updateStatus.mock.invocationCallOrder[0]).toBeLessThan(
      mockFindActiveByRole.mock.invocationCallOrder[0]
    );
  });

  it('should send one notification to each active Reviewer', async () => {
    const reviewers = [
      makeReviewer('reviewer-1'),
      makeReviewer('reviewer-2'),
    ];
    const existingArticle = {
      id: articleId,
      authorId,
      title: 'Multi-reviewer Article',
      status: 'Draft',
    };
    const updatedArticle = { ...existingArticle, status: 'Pending' };

    mockRepo.findById.mockResolvedValue(existingArticle as never);
    mockRepo.updateStatus.mockResolvedValue(updatedArticle as never);
    mockFindActiveByRole.mockResolvedValueOnce(reviewers);

    const result = await service.submitForReview(articleId, authorId);

    expect(result).toEqual(updatedArticle);
    expect(mockNotificationSend).toHaveBeenCalledTimes(reviewers.length);
    expect(
      mockNotificationSend.mock.calls.map(([payload]) => payload.recipientId)
    ).toEqual(reviewers.map((reviewer) => reviewer.id));
  });

  it('should succeed without sending notifications when there are no active Reviewers', async () => {
    const existingArticle = {
      id: articleId,
      authorId,
      title: 'No Reviewers Article',
      status: 'Draft',
    };
    const updatedArticle = { ...existingArticle, status: 'Pending' };

    mockRepo.findById.mockResolvedValue(existingArticle as never);
    mockRepo.updateStatus.mockResolvedValue(updatedArticle as never);
    mockFindActiveByRole.mockResolvedValueOnce([]);

    const result = await service.submitForReview(articleId, authorId);

    expect(result).toEqual(updatedArticle);
    expect(mockFindActiveByRole).toHaveBeenCalledWith(
      UserRoleValue.Reviewer
    );
    expect(mockNotificationSend).not.toHaveBeenCalled();
  });

  it('should succeed when active Reviewer lookup fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const existingArticle = {
      id: articleId,
      authorId,
      title: 'Lookup Failure Article',
      status: 'Draft',
    };
    const updatedArticle = { ...existingArticle, status: 'Pending' };

    mockRepo.findById.mockResolvedValue(existingArticle as never);
    mockRepo.updateStatus.mockResolvedValue(updatedArticle as never);
    mockFindActiveByRole.mockRejectedValueOnce(
      new Error('Reviewer lookup failed')
    );

    const result = await service.submitForReview(articleId, authorId);

    expect(result).toEqual(updatedArticle);
    expect(mockNotificationSend).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should succeed when sending a Reviewer notification fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const reviewer = makeReviewer('reviewer-1');
    const existingArticle = {
      id: articleId,
      authorId,
      title: 'Send Failure Article',
      status: 'Draft',
    };
    const updatedArticle = { ...existingArticle, status: 'Pending' };

    mockRepo.findById.mockResolvedValue(existingArticle as never);
    mockRepo.updateStatus.mockResolvedValue(updatedArticle as never);
    mockFindActiveByRole.mockResolvedValueOnce([reviewer]);
    mockNotificationSend.mockRejectedValueOnce(
      new Error('Notification send failed')
    );

    await expect(
      service.submitForReview(articleId, authorId)
    ).resolves.toEqual(updatedArticle);
    expect(mockNotificationSend).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    consoleErrorSpy.mockRestore();
  });
});

describe('ArticleService.publishArticle', () => {
  const articleId = 'article-123';
  const approvedArticle = makeArticleRecord({
    id: articleId,
    title: 'Approved Article',
    status: ArticleStatusValue.Approved,
    authorId: AUTHOR_ALICE.id,
  });
  const publishedArticle = {
    ...approvedArticle,
    status: ArticleStatusValue.Published,
  };
  let mockRepo: ReturnType<typeof makeRepo>;
  let mockQuizService: ReturnType<typeof makeQuizService>;
  let service: InstanceType<typeof ArticleService>;

  beforeEach(() => {
    mockRepo = makeRepo();
    mockQuizService = makeQuizService();
    service = new ArticleService(
      mockRepo as unknown as ArticleRepository,
      undefined,
      undefined,
      undefined,
      mockQuizService as unknown as QuizService
    );
    jest.clearAllMocks();
    mockNotificationSend.mockReset();
    mockNotificationSend.mockResolvedValue(undefined);
  });

  it('should allow an Admin to publish an Approved article', async () => {
    mockRepo.findById.mockResolvedValue(approvedArticle);
    mockRepo.updateStatus.mockResolvedValue(publishedArticle);

    const result = await service.publishArticle(
      articleId,
      UserRoleValue.Admin
    );

    expect(mockRepo.findById).toHaveBeenCalledWith(articleId);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      articleId,
      ArticleStatusValue.Published
    );
    expect(result).toEqual(publishedArticle);
    expect(result.status).toBe(ArticleStatusValue.Published);
    expect(mockNotificationSend).toHaveBeenCalledWith({
      recipientId: approvedArticle.authorId,
      notificationReferenceType: 'article',
      referenceId: articleId,
      notificationType: 'success',
      notificationTitle: 'Article Published',
      message: `Your article "${approvedArticle.title}" is now published.`,
    });
    expect(mockQuizService.pregenerateFallbackQuiz).toHaveBeenCalledWith(
      articleId
    );
  });

  it.each([UserRoleValue.Reviewer, UserRoleValue.User] as const)(
    'should forbid the %s role from publishing an Approved article',
    async (role) => {
      await expect(service.publishArticle(articleId, role)).rejects.toMatchObject({
        message: 'Only Admins can publish articles',
        statusCode: HttpStatusCode.FORBIDDEN,
      });

      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    }
  );

  it('should return 404 when an Admin publishes a missing article', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      service.publishArticle(articleId, UserRoleValue.Admin)
    ).rejects.toMatchObject({
      message: 'Article not found',
      statusCode: HttpStatusCode.NOT_FOUND,
    });

    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });

  it.each([
    ArticleStatusValue.Draft,
    ArticleStatusValue.Pending,
    ArticleStatusValue.Published,
    ArticleStatusValue.Unpublished,
  ] as const)(
    'should reject Admin publication when the article status is %s',
    async (status) => {
      mockRepo.findById.mockResolvedValue(
        makeArticleRecord({ id: articleId, status })
      );

      await expect(
        service.publishArticle(articleId, UserRoleValue.Admin)
      ).rejects.toMatchObject({
        message: 'Only Approved articles can be published',
        statusCode: HttpStatusCode.BAD_REQUEST,
      });

      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    }
  );

  it('should complete publication when the author notification fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockRepo.findById.mockResolvedValue(approvedArticle);
    mockRepo.updateStatus.mockResolvedValue(publishedArticle);
    mockNotificationSend.mockRejectedValueOnce(
      new Error('Notification failed')
    );

    await expect(
      service.publishArticle(articleId, UserRoleValue.Admin)
    ).resolves.toEqual(publishedArticle);
    await Promise.resolve();

    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      articleId,
      ArticleStatusValue.Published
    );
    consoleErrorSpy.mockRestore();
  });

  it('should complete publication when fallback quiz generation fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockRepo.findById.mockResolvedValue(approvedArticle);
    mockRepo.updateStatus.mockResolvedValue(publishedArticle);
    mockQuizService.pregenerateFallbackQuiz.mockRejectedValueOnce(
      new Error('Quiz generation failed')
    );

    await expect(
      service.publishArticle(articleId, UserRoleValue.Admin)
    ).resolves.toEqual(publishedArticle);
    await Promise.resolve();

    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      articleId,
      ArticleStatusValue.Published
    );
    consoleErrorSpy.mockRestore();
  });
});

describe('ArticleService.listPublished', () => {
  let mockRepo: ReturnType<typeof makeRepo>;
  let service: InstanceType<typeof ArticleService>;

  beforeEach(() => {
    mockRepo = makeRepo();
    service = new ArticleService(
      mockRepo as unknown as ArticleRepository,
      ArticleReviewRepository as any,
      ArticleAttachmentRepository as any
    );
    jest.clearAllMocks();
  });

  it('should return mapped published articles and total count', async () => {
    const mockArticles = [
      {
        id: '1',
        title: 'Title 1',
        authorId: 'user1',
        tags: ['test'],
        status: 'Published',
        views: 120,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        _count: { likes: 5, comments: 2 },
      },
      {
        id: '2',
        title: 'Title 2',
        authorId: 'user2',
        tags: [],
        status: 'Published',
        views: 0,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
        _count: { likes: 0, comments: 0 },
      },
    ];

    mockRepo.findByStatus.mockResolvedValue({
      articles: mockArticles,
      total: 2,
    } as never);

    const result = await service.listPublished(1, 10);

    expect(mockRepo.findByStatus).toHaveBeenCalledWith(
      'Published',
      1,
      10,
      {
        includeCounts: true,
        includeCoverImage: true,
        search: undefined,
        sort: undefined,
        order: undefined,
      }
    );
    expect(result).toEqual({
      articles: [
        {
          id: '1',
          title: 'Title 1',
          authorId: 'user1',
          tags: ['test'],
          status: 'Published',
          views: 120,
          createdAt: mockArticles[0].createdAt,
          updatedAt: mockArticles[0].updatedAt,
          likeCount: 5,
          commentCount: 2,
          rejectionFeedback: null,
          coverImageUrl: null,
        },
        {
          id: '2',
          title: 'Title 2',
          authorId: 'user2',
          tags: [],
          status: 'Published',
          views: 0,
          createdAt: mockArticles[1].createdAt,
          updatedAt: mockArticles[1].updatedAt,
          likeCount: 0,
          commentCount: 0,
          rejectionFeedback: null,
          coverImageUrl: null,
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });
  });

  it('should handle undefined _count gracefully', async () => {
    const mockArticles = [
      {
        id: '1',
        title: 'Title 1',
        authorId: 'user1',
        tags: [],
        status: 'Published',
        views: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockRepo.findByStatus.mockResolvedValue({
      articles: mockArticles,
      total: 1,
    } as never);

    const result = await service.listPublished(1, 10);

    expect(result.articles[0].likeCount).toBe(0);
    expect(result.articles[0].commentCount).toBe(0);
    expect(result.articles[0].views).toBe(5);
  });

  it('should throw AppError 400 when an invalid sort parameter is provided', async () => {
    await expect(service.listPublished(1, 10, undefined, 'invalidField', 'asc'))
      .rejects.toThrow(new AppError('Invalid sort field. Allowed: title, createdAt, views', HttpStatusCode.BAD_REQUEST));
  });

  it('should throw AppError 400 when an invalid order parameter is provided', async () => {
    await expect(service.listPublished(1, 10, undefined, 'views', 'invalidOrder'))
      .rejects.toThrow(new AppError('Invalid sort order. Allowed: asc, desc', HttpStatusCode.BAD_REQUEST));
  });

  it('should pass search, sort, and order parameters to repository findByStatus', async () => {
    mockRepo.findByStatus.mockResolvedValue({ articles: [], total: 0 } as never);

    await service.listPublished(1, 10, 'search-term', 'views', 'asc');

    expect(mockRepo.findByStatus).toHaveBeenCalledWith(
      'Published',
      1,
      10,
      {
        includeCounts: true,
        includeCoverImage: true,
        search: 'search-term',
        sort: 'views',
        order: 'asc',
      }
    );
  });
});

describe('ArticleService.getArticleById', () => {
  const articleId = 'article-123';
  const authorId = 'user-123';
  let mockRepo: ReturnType<typeof makeRepo>;
  let mockUserRepo: ReturnType<typeof makeUserRepo>;
  let service: InstanceType<typeof ArticleService>;

  beforeEach(() => {
    mockRepo = makeRepo();
    mockUserRepo = makeUserRepo();
    service = new ArticleService(
      mockRepo as unknown as ArticleRepository,
      ArticleReviewRepository as any,
      ArticleAttachmentRepository as any,
      mockUserRepo as any
    );
    jest.clearAllMocks();
    mockUserRepo.findManyByIds.mockResolvedValue([]);
  });

  it('should return the article with mapped likeCount and likedByMe when it exists and is Published', async () => {
    const record = makeArticleRecord({
      id: articleId,
      status: 'Published',
      title: 'My Article',
      _count: { likes: 5, comments: 2 },
      likes: [{ id: 'like-1' }],
    });
    mockRepo.findById.mockResolvedValue(record);

    const result = await service.getArticleById(articleId, authorId);

    const { _count, likes, ...base } = record;
    expect(mockRepo.findById).toHaveBeenCalledWith(articleId, authorId);
    expect(result).toEqual({
      ...base,
      coverAttachmentId: null,
      coverImageUrl: null,
      likeCount: 5,
      commentCount: 2,
      likedByMe: true,
      ...UNKNOWN_AUTHOR,
    });
  });

  it('should return likeCount 0 and likedByMe false when no relations exist', async () => {
    const record = makeArticleRecord({
      id: articleId,
      status: 'Published',
      title: 'My Article',
    });
    mockRepo.findById.mockResolvedValue(record);

    const result = await service.getArticleById(articleId);

    expect(mockRepo.findById).toHaveBeenCalledWith(articleId, null);
    expect(result).toEqual({
      ...record,
      coverAttachmentId: null,
      coverImageUrl: null,
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      ...UNKNOWN_AUTHOR,
    });
  });

  it('should throw 404 if article does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.getArticleById(articleId)).rejects.toThrow(
      new AppError('Article not found', HttpStatusCode.NOT_FOUND)
    );
  });

  it.each(['Draft', 'Pending', 'Unpublished'] as const)(
    'should throw 403 if article is %s and no requesterId',
    async (status) => {
      mockRepo.findById.mockResolvedValue(
        makeArticleRecord({ id: articleId, status, authorId })
      );

      await expect(service.getArticleById(articleId)).rejects.toThrow(
        new AppError('Article not available', HttpStatusCode.FORBIDDEN)
      );
    }
  );

  it('should return the article when the author requests their own Draft article', async () => {
    const record = makeArticleRecord({
      id: articleId,
      status: 'Draft',
      title: 'My Draft',
      authorId,
      tags: ['test'],
    });
    mockRepo.findById.mockResolvedValue(record);

    const result = await service.getArticleById(articleId, authorId);

    expect(mockRepo.findById).toHaveBeenCalledWith(articleId, authorId);
    expect(result).toEqual({
      ...record,
      coverAttachmentId: null,
      coverImageUrl: null,
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      ...UNKNOWN_AUTHOR,
    });
  });

  it('should return the article when the author requests their own Rejected article', async () => {
    const record = makeArticleRecord({
      id: articleId,
      status: 'Rejected' as ArticleStatus,
      title: 'My Rejected',
      authorId,
    });
    mockRepo.findById.mockResolvedValue(record);

    const result = await service.getArticleById(articleId, authorId);

    expect(mockRepo.findById).toHaveBeenCalledWith(articleId, authorId);
    expect(result).toEqual({
      ...record,
      coverAttachmentId: null,
      coverImageUrl: null,
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      ...UNKNOWN_AUTHOR,
    });
  });

  it("should throw 403 when a different user requests someone else's Draft article", async () => {
    mockRepo.findById.mockResolvedValue(
      makeArticleRecord({
        id: articleId,
        status: 'Draft',
        title: 'Someone Else Draft',
        authorId: 'other-author',
      })
    );

    await expect(service.getArticleById(articleId, authorId)).rejects.toThrow(
      new AppError('Article not available', HttpStatusCode.FORBIDDEN)
    );
  });

  it('should throw 403 when unauthenticated (null requesterId) for a Draft article', async () => {
    mockRepo.findById.mockResolvedValue(
      makeArticleRecord({ id: articleId, status: 'Draft', authorId })
    );

    await expect(service.getArticleById(articleId, null)).rejects.toThrow(
      new AppError('Article not available', HttpStatusCode.FORBIDDEN)
    );
  });

  it.each(['Draft', 'Pending', 'Unpublished'] as const)(
    "should allow an Admin to view someone else's %s article",
    async (status) => {
      mockRepo.findById.mockResolvedValue(
        makeArticleRecord({
          id: articleId,
          status,
          title: 'Oversight Target',
          authorId: 'other-author',
        })
      );

      const result = await service.getArticleById(articleId, authorId, 'Admin');

      expect(result).toMatchObject({ id: articleId, status });
    }
  );

  it("should still throw 403 for a non-admin role viewing someone else's Draft article", async () => {
    mockRepo.findById.mockResolvedValue(
      makeArticleRecord({
        id: articleId,
        status: 'Draft',
        title: 'Someone Else Draft',
        authorId: 'other-author',
      })
    );

    await expect(
      service.getArticleById(articleId, authorId, 'Employee' as never)
    ).rejects.toThrow(new AppError('Article not available', HttpStatusCode.FORBIDDEN));
  });

  it('should enrich the article with authorName and authorEmail when the author exists', async () => {
    mockRepo.findById.mockResolvedValue(
      makeArticleRecord({ id: articleId, authorId: AUTHOR_ALICE.id })
    );
    mockUserRepo.findManyByIds.mockResolvedValue([AUTHOR_ALICE]);

    const result = await service.getArticleById(articleId);

    expect(mockUserRepo.findManyByIds).toHaveBeenCalledWith([AUTHOR_ALICE.id]);
    expect(result).toMatchObject({
      authorName: AUTHOR_ALICE.name,
      authorEmail: AUTHOR_ALICE.email,
    });
  });
});

describe('ArticleService.deleteArticle', () => {
  const authorId = 'user-123';
  const otherUserId = 'user-456';
  const articleId = 'article-123';
  let mockRepo: ReturnType<typeof makeRepo>;
  let service: InstanceType<typeof ArticleService>;

  beforeEach(() => {
    mockRepo = makeRepo();
    service = new ArticleService(
      mockRepo as unknown as ArticleRepository,
      ArticleReviewRepository as any,
      ArticleAttachmentRepository as any
    );
    jest.clearAllMocks();
  });

  it('should soft-delete own Draft article as author', async () => {
    const article = { id: articleId, authorId, status: 'Draft' };
    mockRepo.findById.mockResolvedValue(article as never);
    mockRepo.softDelete.mockResolvedValue({
      ...article,
      deletedAt: new Date(),
    } as never);

    await service.deleteArticle(articleId, authorId, 'User');

    expect(mockRepo.softDelete).toHaveBeenCalledWith(articleId);
    expect(mockRepo.hardDelete).not.toHaveBeenCalled();
  });

  it.each(['Pending', 'Published', 'Rejected'] as const)(
    'should throw 400 when author tries to delete own %s article',
    async (status) => {
      mockRepo.findById.mockResolvedValue({
        id: articleId,
        authorId,
        status,
      } as never);

      await expect(
        service.deleteArticle(articleId, authorId, 'User')
      ).rejects.toThrow(
        new AppError('Only Draft articles can be deleted', HttpStatusCode.BAD_REQUEST)
      );

      expect(mockRepo.softDelete).not.toHaveBeenCalled();
      expect(mockRepo.hardDelete).not.toHaveBeenCalled();
    }
  );

  it("should throw 403 when author tries to delete another user's Draft", async () => {
    mockRepo.findById.mockResolvedValue({
      id: articleId,
      authorId: otherUserId,
      status: 'Draft',
    } as never);

    await expect(
      service.deleteArticle(articleId, authorId, 'User')
    ).rejects.toThrow(new AppError('Not authorized', HttpStatusCode.FORBIDDEN));

    expect(mockRepo.softDelete).not.toHaveBeenCalled();
    expect(mockRepo.hardDelete).not.toHaveBeenCalled();
  });

  it('should throw 403 when author attempts hard delete', async () => {
    mockRepo.findById.mockResolvedValue({
      id: articleId,
      authorId,
      status: 'Draft',
    } as never);

    await expect(
      service.deleteArticle(articleId, authorId, 'User', true)
    ).rejects.toThrow(
      new AppError('Only Admins can permanently delete articles', HttpStatusCode.FORBIDDEN)
    );

    expect(mockRepo.softDelete).not.toHaveBeenCalled();
    expect(mockRepo.hardDelete).not.toHaveBeenCalled();
  });

  it('should soft-delete any status article as Admin', async () => {
    const article = {
      id: articleId,
      authorId: otherUserId,
      status: 'Published',
    };
    mockRepo.findById.mockResolvedValue(article as never);
    mockRepo.softDelete.mockResolvedValue({
      ...article,
      deletedAt: new Date(),
    } as never);

    await service.deleteArticle(articleId, authorId, 'Admin');

    expect(mockRepo.softDelete).toHaveBeenCalledWith(articleId);
    expect(mockRepo.hardDelete).not.toHaveBeenCalled();
  });

  it('should hard-delete as Admin when hard=true', async () => {
    const article = {
      id: articleId,
      authorId: otherUserId,
      status: 'Published',
    };
    mockRepo.findById.mockResolvedValue(article as never);
    mockRepo.hardDelete.mockResolvedValue(undefined);

    await service.deleteArticle(articleId, authorId, 'Admin', true);

    expect(mockRepo.hardDelete).toHaveBeenCalledWith(articleId);
    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });

  it('should throw 404 when article does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      service.deleteArticle(articleId, authorId, 'User')
    ).rejects.toThrow(new AppError('Article not found', HttpStatusCode.NOT_FOUND));

    expect(mockRepo.softDelete).not.toHaveBeenCalled();
    expect(mockRepo.hardDelete).not.toHaveBeenCalled();
  });
});

describe('ArticleService.listMine', () => {
  let mockRepo: ReturnType<typeof makeRepo>;
  let service: InstanceType<typeof ArticleService>;
  const authorId = 'user-123';

  beforeEach(() => {
    mockRepo = makeRepo();
    service = new ArticleService(
      mockRepo as unknown as ArticleRepository,
      ArticleReviewRepository as any,
      ArticleAttachmentRepository as any
    );
    jest.clearAllMocks();
  });

  // Type definition for test data to match what the repository returns
  type MockPublishedArticleRow = {
    id: string;
    title: string;
    authorId: string;
    tags: string[];
    status: string;
    views: number;
    createdAt: Date;
    updatedAt: Date;
    _count?: { likes: number; comments: number };
    reviews?: { feedback: string | null }[];
  };

  it('should map returned articles correctly and not expose reviews array', async () => {
    const mockArticles: MockPublishedArticleRow[] = [
      {
        id: '1',
        title: 'Draft Article',
        authorId,
        tags: [],
        status: 'Draft',
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { likes: 0, comments: 0 },
      },
    ];

    mockRepo.findByAuthor.mockResolvedValue({
      articles: mockArticles,
      total: 1,
    } as never);

    const result = await service.listMine(authorId, 1, 20);
    
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]).not.toHaveProperty('reviews');
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should return rejectionFeedback if article is Unpublished and has a review', async () => {
    const mockArticles: MockPublishedArticleRow[] = [
      {
        id: '2',
        title: 'Rejected Article',
        authorId,
        tags: [],
        status: 'Unpublished',
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { likes: 1, comments: 2 },
        reviews: [{ feedback: 'Needs more technical depth' }],
      },
    ];

    mockRepo.findByAuthor.mockResolvedValue({
      articles: mockArticles,
      total: 1,
    } as never);

    const result = await service.listMine(authorId, 1, 20);
    expect(result.articles[0].rejectionFeedback).toBe('Needs more technical depth');
  });

  it('should map the first review if multiple review data is returned (though repo should take 1)', async () => {
    const mockArticles: MockPublishedArticleRow[] = [
      {
        id: '2',
        title: 'Rejected Article',
        authorId,
        tags: [],
        status: 'Unpublished',
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviews: [{ feedback: 'Latest feedback' }, { feedback: 'Old feedback' }],
      },
    ];

    mockRepo.findByAuthor.mockResolvedValue({
      articles: mockArticles,
      total: 1,
    } as never);

    const result = await service.listMine(authorId, 1, 20);
    expect(result.articles[0].rejectionFeedback).toBe('Latest feedback');
  });

  it('should return null rejectionFeedback if article is Unpublished but has no review', async () => {
    const mockArticles: MockPublishedArticleRow[] = [
      {
        id: '3',
        title: 'Rejected Article No Review',
        authorId,
        tags: [],
        status: 'Unpublished',
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviews: [],
      },
    ];

    mockRepo.findByAuthor.mockResolvedValue({
      articles: mockArticles,
      total: 1,
    } as never);

    const result = await service.listMine(authorId, 1, 20);
    expect(result.articles[0].rejectionFeedback).toBeNull();
  });

  it('should return null rejectionFeedback if article is Unpublished but review feedback is null', async () => {
    const mockArticles: MockPublishedArticleRow[] = [
      {
        id: '3',
        title: 'Rejected Article Null Feedback',
        authorId,
        tags: [],
        status: 'Unpublished',
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviews: [{ feedback: null }],
      },
    ];

    mockRepo.findByAuthor.mockResolvedValue({
      articles: mockArticles,
      total: 1,
    } as never);

    const result = await service.listMine(authorId, 1, 20);
    expect(result.articles[0].rejectionFeedback).toBeNull();
  });

  it.each(['Draft', 'Pending', 'Published'])('should return null rejectionFeedback if article is %s even if reviews exist', async (status) => {
    const mockArticles: MockPublishedArticleRow[] = [
      {
        id: '4',
        title: `${status} Article`,
        authorId,
        tags: [],
        status: status,
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviews: [{ feedback: 'Historical feedback' }],
      },
    ];

    mockRepo.findByAuthor.mockResolvedValue({
      articles: mockArticles,
      total: 1,
    } as never);

    const result = await service.listMine(authorId, 1, 20);
    expect(result.articles[0].rejectionFeedback).toBeNull();
  });
});
