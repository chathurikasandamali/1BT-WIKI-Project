import crypto from 'node:crypto';
import { ArticleRepository } from '@repositories/articleRepository.js';
import { ArticleAttachmentRepository } from '@repositories/articleAttachmentRepository.js';
import { ArticleReviewRepository } from '@repositories/articleReviewRepository.js';
import UserRepository from '@repositories/userRepository.js';
import b2Client from '@v1/lib/b2Client.js';
import notificationService from '@services/notificationService.js';
import { NotificationBuilder } from '@v1/lib/NotificationBuilder.js';
import { AppError } from '@errors/AppError.js';
import type { UserRole } from '@/types/userTypes.js';
import { UserRoleValue } from '@/types/userTypes.js';
import type {
  Article,
  ArticleDetail,
  ArticleStatus,
  CreateArticleInput,
  UpdateArticleInput,
  ArticleAttachment,
  JSONContent,
  ArticleListItem,
  PublishedArticleListItem,
  AdminArticleListItem,
} from '@models/article.types.js';
import { ArticleStatusValue, ARTICLE_SORT_FIELDS } from '@models/article.types.js';
import { assertValidSort } from '../utils/queryHelpers.js';
import { MAX_ARTICLE_IMAGE_SIZE_BYTES, MAX_ARTICLE_IMAGES } from '@/constants/upload.constants.js';

// Derives update-field shapes from the app-level Article interface — no Prisma types cross into the service layer.
type ArticleUpdateFields = Partial<
  Pick<Article, 'title' | 'tags' | 'status'>
> & { body?: JSONContent; coverAttachmentId?: string | null };

type PublishedArticleRow = Article & {
  _count?: { likes: number; comments: number };
  reviews?: { feedback: string | null }[];
  coverAttachment?: { fileUrl: string } | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getHttpImageUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? trimmedValue
      : null;
  } catch {
    return null;
  }
};

const getFirstArticleImageUrl = (body: JSONContent): string | null => {
  const nodes: unknown[] = [body];

  while (nodes.length > 0) {
    const node = nodes.pop();

    if (!isRecord(node)) {
      continue;
    }

    if (node.type === 'image' && isRecord(node.attrs)) {
      const imageUrl = getHttpImageUrl(node.attrs.src);

      if (imageUrl) {
        return imageUrl;
      }
    }

    if (Array.isArray(node.content)) {
      for (let index = node.content.length - 1; index >= 0; index -= 1) {
        nodes.push(node.content[index]);
      }
    }
  }

  return null;
};

const validateImages = (images: Express.Multer.File[]) => {
  if (images.length > MAX_ARTICLE_IMAGES) {
    throw new AppError('Maximum 10 images per article', 400);
  }

  for (const img of images) {
    if (img.size > MAX_ARTICLE_IMAGE_SIZE_BYTES) {
      throw new AppError('Image size cannot exceed 5MB', 400);
    }
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedMimeTypes.includes(img.mimetype)) {
      throw new AppError(
        'Only jpeg, png, webp, and gif images are allowed',
        400
      );
    }
  }
};

const validateTitle = (title: string | undefined): string => {
  if (!title || title.trim() === '') {
    throw new AppError('Title is required and cannot be empty', 400);
  }

  if (title.length > 500) {
    throw new AppError('Title cannot exceed 500 characters', 400);
  }

  return title.trim();
};

const validateBody = (body: JSONContent | undefined): JSONContent => {
  const safeBody = body ?? {};
  if (typeof safeBody === 'string') {
    throw new AppError(
      'Body must be valid JSONContent, raw HTML is not allowed',
      400
    );
  }

  if (
    typeof safeBody !== 'object' ||
    safeBody === null ||
    Array.isArray(safeBody)
  ) {
    throw new AppError('Body must be a valid JSON object', 400);
  }

  if (Object.keys(safeBody).length > 0 && typeof safeBody.type !== 'string') {
    throw new AppError('Body must have a "type" field', 400);
  }

  return safeBody;
};

const assertTransition = (
  currentStatus: ArticleStatus,
  targetStatus: ArticleStatus
): void => {
  if (
    currentStatus === ArticleStatusValue.Draft &&
    targetStatus === ArticleStatusValue.Pending
  ) {
    return;
  }

  throw new AppError(
    `Cannot transition from ${currentStatus} to ${targetStatus}`,
    400
  );
};

// Draft articles are private to their authors and never appear in the admin
// oversight list, so 'Draft' is not an accepted filter value.
const ALLOWED_STATUS_FILTERS = ['Pending', 'Published', 'Unpublished'] as const;

export class ArticleService {
  constructor(
    private repository: ArticleRepository = new ArticleRepository(),
    private reviewRepository: ArticleReviewRepository = new ArticleReviewRepository(),
    private attachmentRepository: ArticleAttachmentRepository = new ArticleAttachmentRepository(),
    private userRepository: typeof UserRepository = UserRepository
  ) { }

  private async uploadArticleImages(
    articleId: string,
    authorId: string,
    images: Express.Multer.File[]
  ): Promise<{ attachments: ArticleAttachment[]; warnings: string[] }> {
    const attachments: ArticleAttachment[] = [];
    const warnings: string[] = [];
    const b2BucketName = process.env.B2_BUCKET_NAME ?? '';

    for (const img of images) {
      const fileUuid = crypto.randomUUID();
      const sanitizedName = img.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
      const b2FileKey = `articles/${articleId}/${fileUuid}-${sanitizedName}`;

      try {
        const { fileId, fileUrl } = await b2Client.uploadFile(
          b2FileKey,
          img.buffer,
          img.mimetype
        );

        const attachment = await this.attachmentRepository.create({
          articleId,
          uploadedBy: authorId,
          fileName: img.originalname,
          b2FileKey,
          b2FileId: fileId,
          b2BucketName,
          fileUrl,
          mimeType: img.mimetype,
          sizeBytes: img.size,
        });

        attachments.push(attachment);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`Failed to upload ${img.originalname}: ${message}`);
      }
    }

    return { attachments, warnings };
  }

  async createArticle(
    input: CreateArticleInput,
    authorId: string,
    images: Express.Multer.File[] = []
  ): Promise<Article> {
    // Validate images
    validateImages(images);

    // Validate title
    const title = validateTitle(input.title);

    // Validate body
    const body = validateBody(input.body);

    // Create article via repository
    const article = await this.repository.create({
      title,
      body,
      tags: input.tags ?? [],
      authorId,
    });

    // Upload valid images to B2 and track in DB
    const { attachments, warnings } = await this.uploadArticleImages(
      article.id,
      authorId,
      images
    );

    return {
      ...article,
      attachments,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async updateArticle(
    id: string,
    input: UpdateArticleInput,
    userId: string,
    images: Express.Multer.File[] = []
  ): Promise<Article> {
    // Validate images if provided
    if (images.length > 0) {
      validateImages(images);
    }

    const article = await this.findOwned(id, userId);

    let resetToDraft = false;

    if (article.status !== ArticleStatusValue.Draft) {
      const latestReview =
        await this.reviewRepository.findLatestByArticleId(id);
      if (!latestReview || latestReview.reviewStatus !== 'Rejected') {
        throw new AppError('Only Draft or Rejected articles can be edited', 400);
      }
      resetToDraft = true;
    }

    if (
      input.coverAttachmentId !== undefined &&
      input.coverAttachmentId !== null
    ) {
      const coverAttachment = await this.attachmentRepository.findActiveById(
        input.coverAttachmentId
      );

      if (!coverAttachment) {
        throw new AppError('Cover attachment not found', 400);
      }

      if (coverAttachment.articleId !== id) {
        throw new AppError(
          'Cover attachment does not belong to this article',
          400
        );
      }

      if (!coverAttachment.mimeType.startsWith('image/')) {
        throw new AppError('Cover attachment must be an image', 400);
      }
    }

    const hasUpdates =
      input.title !== undefined ||
      input.body !== undefined ||
      input.tags !== undefined ||
      input.coverAttachmentId !== undefined;
    let updatedArticle = article;

    if (hasUpdates || resetToDraft) {
      const updateFields: ArticleUpdateFields = {};

      if (input.title !== undefined)
        updateFields.title = validateTitle(input.title);
      if (input.body !== undefined)
        updateFields.body = validateBody(input.body);
      if (input.tags !== undefined) updateFields.tags = input.tags;
      if (input.coverAttachmentId !== undefined)
        updateFields.coverAttachmentId = input.coverAttachmentId;
      if (resetToDraft) updateFields.status = ArticleStatusValue.Draft;

      updatedArticle = await this.repository.update(id, updateFields);
    }

    // Only consider it a total no-op if there are no data updates AND no new images
    if (!hasUpdates && !resetToDraft && images.length === 0) {
      return article;
    }

    // Upload any new images
    const { attachments, warnings } = await this.uploadArticleImages(
      updatedArticle.id,
      userId,
      images
    );

    return {
      ...updatedArticle,
      attachments: attachments.length > 0 ? attachments : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async submitForReview(articleId: string, userId: string): Promise<Article> {
    const article = await this.findOwned(articleId, userId);

    assertTransition(article.status, ArticleStatusValue.Pending);

    const updatedArticle = await this.repository.updateStatus(
      articleId,
      ArticleStatusValue.Pending
    );

    try {
      const reviewers = await this.userRepository.findActiveByRole(
        UserRoleValue.Reviewer
      );

      for (const reviewer of reviewers) {
        try {
          const notificationPayload = new NotificationBuilder()
            .forUser(reviewer.id)
            .regardingArticle(articleId)
            .withInfo(
              'New Article for Review',
              `The article ${article.title} has been submitted for review.`
            )
            .build();

          notificationService
            .send(notificationPayload)
            .catch((error: unknown) => {
              console.error(
                '[NotificationService] Failed to send article review notification:',
                error
              );
            });
        } catch (error) {
          console.error(
            '[NotificationService] Failed to build article review notification:',
            error
          );
        }
      }
    } catch (error) {
      console.error(
        '[ArticleService] Failed to find active Reviewers for article review notification:',
        error
      );
    }

    return updatedArticle;
  }

  async listPublished(
    page: number = 1,
    limit: number = 20,
    search?: string,
    sort?: string,
    order?: string
  ): Promise<{ articles: PublishedArticleListItem[]; total: number; page: number; limit: number }> {
    assertValidSort(ARTICLE_SORT_FIELDS, sort);
    if (order !== undefined && order !== 'asc' && order !== 'desc') {
      throw new AppError('Invalid sort order. Allowed: asc, desc', 400);
    }

    const { articles, total } = await this.repository.findByStatus(
      ArticleStatusValue.Published,
      page,
      limit,
      {
        includeCounts: true,
        includeCoverImage: true,
        search,
        sort,
        order,
      }
    );

    const mappedArticles: PublishedArticleListItem[] = articles.map((article: PublishedArticleRow) => ({
      id: article.id,
      title: article.title,
      authorId: article.authorId,
      tags: article.tags,
      status: article.status as ArticleStatus,
      views: article.views,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      likeCount: article._count?.likes ?? 0,
      commentCount: article._count?.comments ?? 0,
      rejectionFeedback: null,
      coverImageUrl: article.coverAttachment?.fileUrl ?? null,
    }));

    return { articles: mappedArticles, total, page, limit };
  }

  async listAllArticles(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string,
    sort?: string,
    order?: string
  ): Promise<{ articles: AdminArticleListItem[]; total: number; page: number; limit: number }> {
    if (
      status !== undefined &&
      !(ALLOWED_STATUS_FILTERS as readonly string[]).includes(status)
    ) {
      throw new AppError(`Invalid status filter. Allowed: ${ALLOWED_STATUS_FILTERS.join(', ')}`, 400);
    }
    assertValidSort(ARTICLE_SORT_FIELDS, sort);
    if (order !== undefined && order !== 'asc' && order !== 'desc') {
      throw new AppError('Invalid sort order. Allowed: asc, desc', 400);
    }

    const { articles, total } = await this.repository.findByStatus(
      status as ArticleStatus | undefined,
      page,
      limit,
      {
        includeCounts: true,
        search,
        sort,
        order,
        // No explicit status → all statuses except private Drafts.
        ...(status === undefined && {
          excludeStatus: ArticleStatusValue.Draft,
        }),
      }
    );

    const authorIds = articles.map((a) => a.authorId);
    const authors = await this.userRepository.findManyByIds(authorIds);
    const authorMap = new Map(authors.map((u) => [u.id, u]));

    // Map to a DTO so heavy/internal columns (body, _count) never leave the service.
    const enrichedArticles: AdminArticleListItem[] = articles.map(
      (article: PublishedArticleRow) => ({
        id: article.id,
        title: article.title,
        authorId: article.authorId,
        tags: article.tags,
        status: article.status as ArticleStatus,
        views: article.views,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        likeCount: article._count?.likes ?? 0,
        commentCount: article._count?.comments ?? 0,
        rejectionFeedback: null,
        authorName: authorMap.get(article.authorId)?.name ?? 'Unknown',
        authorEmail: authorMap.get(article.authorId)?.email ?? null,
        authorImage: authorMap.get(article.authorId)?.image ?? null,
      })
    );

    return { articles: enrichedArticles, total, page, limit };
  }

  async deleteArticle(
    articleId: string,
    userId: string,
    role: UserRole,
    hard: boolean = false
  ): Promise<void> {
    const article = await this.repository.findById(articleId);
    if (!article) throw new AppError('Article not found', 404);

    const isAdmin = role === UserRoleValue.Admin;
    const isAuthor = article.authorId === userId;

    if (!isAdmin && !isAuthor) {
      throw new AppError('Not authorized', 403);
    }

    if (!isAdmin && article.status !== ArticleStatusValue.Draft) {
      throw new AppError('Only Draft articles can be deleted', 400);
    }

    if (hard && !isAdmin) {
      throw new AppError('Only Admins can permanently delete articles', 403);
    }

    if (hard) {
      await this.repository.hardDelete(articleId);
    } else {
      await this.repository.softDelete(articleId);
    }
  }

  async getArticleById(
    id: string,
    requesterId: string | null = null,
    role: UserRole | null = null
  ): Promise<ArticleDetail> {
    const articleRecord = await this.repository.findById(id, requesterId);
    if (!articleRecord) {
      throw new AppError('Article not found', 404);
    }

    // Admins may inspect articles in any status (oversight view).
    const isAvailable =
      articleRecord.status === ArticleStatusValue.Published ||
      (requesterId && requesterId === articleRecord.authorId) ||
      role === UserRoleValue.Admin;

    if (!isAvailable) {
      throw new AppError('Article not available', 403);
    }

    const { _count, likes, coverAttachment, ...baseArticle } = articleRecord;

    const [author] = await this.userRepository.findManyByIds([
      articleRecord.authorId,
    ]);

    return {
      ...baseArticle,
      coverAttachmentId: baseArticle.coverAttachmentId ?? null,
      coverImageUrl: coverAttachment?.fileUrl ?? null,
      likeCount: _count?.likes ?? 0,
      commentCount: _count?.comments ?? 0,
      likedByMe: likes ? likes.length > 0 : false,
      authorName: author?.name ?? 'Unknown',
      authorEmail: author?.email ?? null,
      authorImage: author?.image ?? null,
    };
  }

  private async findOwned(articleId: string, userId: string): Promise<Article> {
    const article = await this.repository.findById(articleId);

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    if (article.authorId !== userId) {
      throw new AppError('Only the author can edit this article', 403);
    }

    return article;
  }

  async listMine(
    authorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    articles: ArticleListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { articles, total } = await this.repository.findByAuthor(
      authorId,
      page,
      limit
    );

    const mappedArticles: ArticleListItem[] = articles.map((article: PublishedArticleRow) => ({
      id: article.id,
      title: article.title,
      authorId: article.authorId,
      tags: article.tags,
      status: article.status as ArticleStatus,
      views: article.views,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      likeCount: article._count?.likes ?? 0,
      commentCount: article._count?.comments ?? 0,
      rejectionFeedback:
        article.status === ArticleStatusValue.Unpublished
          ? article.reviews?.[0]?.feedback ?? null
          : null,
    }));

    return { articles: mappedArticles, total, page, limit };
  }
}

export default ArticleService;
