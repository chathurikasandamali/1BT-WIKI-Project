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
};

export type ArticleDetailRecord = Article & {
  _count?: {
    likes: number;
    comments: number;
  };
  likes?: Array<{ id: string }>;
};

export class ArticleRepository {
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

  async findById(id: string, requesterId?: string | null): Promise<ArticleDetailRecord | null> {
    const result = await prisma.article.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...ARTICLE_SELECT,
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

  async update(id: string, fields: Partial<ArticleBody>): Promise<Article> {
    // Prisma will update updatedAt automatically via @updatedAt
    const updateData: Prisma.articleUpdateInput = {
      ...(fields.title !== undefined && { title: fields.title }),
      ...(fields.body !== undefined && {
        body: fields.body as Prisma.InputJsonValue,
      }),
      ...(fields.tags !== undefined && { tags: fields.tags }),
      ...(fields.status !== undefined && { status: fields.status }),
    };

    const result = await prisma.article.update({
      where: { id },
      data: updateData,
      select: ARTICLE_SELECT,
    });

    return result as unknown as Article;
  }

  async updateStatus(id: string, status: ArticleStatus): Promise<Article> {
    const result = await prisma.article.update({
      where: { id },
      data: { status },
      select: ARTICLE_SELECT,
    });

    return result as unknown as Article;
  }

  async softDelete(id: string): Promise<Article> {
    const result = await prisma.article.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: ARTICLE_SELECT,
    });

    return result as unknown as Article;
  }

  async hardDelete(id: string): Promise<void> {
    await prisma.article.delete({ where: { id } });
  }

  async findByStatus(
    status: ArticleStatus,
    page: number,
    limit: number,
    options?: {
      includeCounts?: boolean;
      search?: string;
      sort?: string;
      order?: string;
    }
  ): Promise<{ articles: Article[]; total: number }> {
    const where = {
      status,
      deletedAt: null,
      ...buildSearchFilter('title', options?.search),
    };
    const orderBy = buildSortOrder(ARTICLE_SORT_FIELDS, options?.sort, options?.order, 'createdAt');
    const includeCounts = options?.includeCounts ?? status === 'Published';
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        ...(includeCounts && {
          include: {
            _count: {
              select: {
                likes: true,
                comments: { where: { deletedAt: null } },
              },
            },
          },
        }),
      }),
      prisma.article.count({ where }),
    ]);
    return { articles: articles as unknown as Article[], total };
  }

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
