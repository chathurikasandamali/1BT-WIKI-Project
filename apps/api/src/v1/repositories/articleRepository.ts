import { prisma } from '@repo/db';
import type { Article, CreateArticleInput, JSONContent } from '@models/article.types.js';
import { ARTICLE_SORT_FIELDS } from '@models/article.types.js';
import type { Prisma } from '@repo/db';
import { ArticleStatus, ReviewStatus } from '@repo/db/generated/prisma/index.js';
import { buildSearchFilter, buildSortOrder } from '@utils/queryHelpers.js';

const ARTICLE_SELECT = {
  id: true,
  title: true,
  body: true,
  status: true,
  authorId: true,
  views: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ArticleBody = {
  title: string;
  body: JSONContent;
  tags: string[];
  status: ArticleStatus;
  coverAttachmentId: string | null;
};

export type ArticleDetailRecord = Article & {
  _count?: {
    likes: number;
    comments: number;
  };
  likes?: Array<{ id: string }>;
  coverAttachment?: { fileUrl: string } | null;
};

export class ArticleRepository {
  /**
   * Persist a new article in `Draft` status.
   *
   * `body` and `tags` default to `{}` and `[]` respectively when omitted.
   * The `status` is always initialised to `'Draft'` — callers cannot override it at creation time.
   *
   * @param data - Article fields plus the `authorId` of the creating user.
   * @returns The newly created article row.
   */
  async create(
    data: CreateArticleInput & { authorId: string }
  ): Promise<Article> {
    const { title, body, tags, authorId } = data;

    // Default values
    const defaultBody = body ?? {};
    const defaultTags = tags ?? [];
    const status = 'Draft';

    const result = await prisma.article.create({
      data: {
        title,
        body: defaultBody as Prisma.InputJsonValue,
        status,
        authorId,
        tags: defaultTags,
      },
      select: ARTICLE_SELECT,
    });

    return result as unknown as Article;
  }

  /**
   * Fetch a single article by its primary key, excluding soft-deleted rows.
   *
   * @param id - The article's UUID.
   * @returns The article, or `null` if it does not exist or has been soft-deleted.
   */
  async findById(id: string, requesterId?: string | null): Promise<ArticleDetailRecord | null> {
    const result = await prisma.article.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...ARTICLE_SELECT,
        coverAttachmentId: true,
        coverAttachment: {
          select: {
            fileUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: { where: { deletedAt: null } },
          },
        },
        ...(requesterId && {
          likes: {
            where: { userId: requesterId },
            select: { id: true },
            take: 1,
          },
        }),
      },
    });

    return result ? (result as unknown as ArticleDetailRecord) : null;
  }

  /**
   * Partially update an article's mutable fields.
   *
   * Only the keys present in `fields` are written; omitted keys are left unchanged.
   * Prisma updates `updatedAt` automatically via the `@updatedAt` directive.
   *
   * @param id - The article's UUID.
   * @param fields - A subset of `title`, `body`, `tags`, and/or `status` to overwrite.
   * @returns The article row after the update.
   */
  async update(id: string, fields: Partial<ArticleBody>): Promise<Article> {
    // Prisma will update updatedAt automatically via @updatedAt
    const updateData: Prisma.articleUpdateInput = {
      ...(fields.title !== undefined && { title: fields.title }),
      ...(fields.body !== undefined && {
        body: fields.body as Prisma.InputJsonValue,
      }),
      ...(fields.tags !== undefined && { tags: fields.tags }),
      ...(fields.status !== undefined && { status: fields.status }),
      ...(fields.coverAttachmentId !== undefined && {
        coverAttachment:
          fields.coverAttachmentId === null
            ? { disconnect: true }
            : { connect: { id: fields.coverAttachmentId } },
      }),
    };

    const result = await prisma.article.update({
      where: { id },
      data: updateData,
      select: ARTICLE_SELECT,
    });

    return result as unknown as Article;
  }

  /**
   * Overwrite the article's `status` field atomically.
   *
   * This method does **not** validate the status transition — that responsibility
   * belongs to the service layer (`ArticleService`, `ReviewerService`).
   *
   * @param id - The article's UUID.
   * @param status - The target status to set.
   * @returns The article row after the status change.
   */
  async updateStatus(id: string, status: ArticleStatus): Promise<Article> {
    const result = await prisma.article.update({
      where: { id },
      data: { status },
      select: ARTICLE_SELECT,
    });

    return result as unknown as Article;
  }

  /**
   * Soft-delete an article by stamping `deletedAt` with the current timestamp.
   *
   * The row is **retained** in the database; `findById` and `findByStatus` both
   * filter on `deletedAt: null`, so the article becomes invisible to all normal
   * queries without being permanently lost.
   *
   * @param id - The article's UUID.
   * @returns The article row after the `deletedAt` stamp is applied.
   */
  async softDelete(id: string): Promise<Article> {
    const result = await prisma.article.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: ARTICLE_SELECT,
    });

    return result as unknown as Article;
  }

  /**
   * Permanently remove an article from the database.
   *
   * Unlike `softDelete`, this issues a SQL `DELETE` and the row is gone
   * immediately. Reserved for Admin-initiated purges.
   *
   * @param id - The article's UUID.
   */
  async hardDelete(id: string): Promise<void> {
    await prisma.article.delete({ where: { id } });
  }

  /**
   * Fetch articles by status, with optional search/sort/order/count options.
   *
   * Cross-role note (RV-06): `status` is optional — when omitted, no status
   * filter is applied and articles across all statuses are returned. Existing
   * callers (`ArticleService.listPublished`, `ReviewerService.listPending`)
   * are unaffected since they always pass an explicit status.
   *
   * @param status - Filter by this status, or omit to include all statuses.
   * @param page - 1-indexed page number.
   * @param limit - Page size.
   * @param options.includeCounts - Include like/comment counts via Prisma `_count`.
   * @param options.search - Case-insensitive title substring filter.
   * @param options.sort - Sort field, validated against an allow-list by the caller.
   * @param options.order - Sort direction, `'asc'` or `'desc'`.
   * @param options.excludeStatus - When `status` is omitted, exclude rows in this status.
   * @returns The matching articles for the requested page, plus the total count
   *          across all pages (for pagination metadata).
   */
  async findByStatus(
    status: ArticleStatus | undefined,
    page: number,
    limit: number,
    options?: {
      includeCounts?: boolean;
      search?: string;
      sort?: string;
      order?: string;
      excludeStatus?: ArticleStatus;
      includeCoverImage?: boolean;
    }
  ): Promise<{ articles: Article[]; total: number }> {
    const where = {
      ...(status !== undefined
        ? { status }
        : options?.excludeStatus !== undefined
          ? { status: { not: options.excludeStatus } }
          : {}),
      deletedAt: null,
      ...buildSearchFilter('title', options?.search),
    };
    const orderBy = buildSortOrder(ARTICLE_SORT_FIELDS, options?.sort, options?.order, 'createdAt');
    const includeCounts = options?.includeCounts ?? status === 'Published';
    const includeCoverImage = options?.includeCoverImage ?? false;
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        omit: { coverAttachmentId: true },
        ...((includeCounts || includeCoverImage) && {
          include: {
            ...(includeCounts && {
              _count: {
                select: {
                  likes: true,
                  comments: { where: { deletedAt: null } },
                },
              },
            }),
            ...(includeCoverImage && {
              coverAttachment: {
                select: {
                  fileUrl: true,
                },
              },
            }),
          },
        }),
      }),
      prisma.article.count({ where }),
    ]);
    return { articles: articles as unknown as Article[], total };
  }

  /**
   * Fetch all non-deleted articles written by a specific author, sorted newest-first.
   *
   * Always includes `_count` (likes/non-deleted comments) and the most recent
   * `Rejected` review's `feedback` field — used by the "My Articles" list to
   * surface rejection reasons without a separate request.
   *
   * @param authorId - The author's user UUID.
   * @param page - 1-indexed page number.
   * @param limit - Page size.
   * @returns The author's articles for the requested page, plus the total count.
   */
  async findByAuthor(authorId: string, page: number, limit: number): Promise<{ articles: Article[]; total: number }> {
    const where = { authorId, deletedAt: null };
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              likes: true,
              comments: { where: { deletedAt: null } },
            },
          },
          reviews: {
            where: {
              status: ReviewStatus.Rejected,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              feedback: true,
            },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);
    return { articles: articles as unknown as Article[], total };
  }
}

export default new ArticleRepository();
