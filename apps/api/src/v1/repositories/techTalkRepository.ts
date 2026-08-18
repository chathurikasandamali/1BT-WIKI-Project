import { prisma, TechTalkStatus } from '@repo/db';
import type { TechTalk } from '@models/techTalk.types.js';
import { TECH_TALK_SORT_FIELDS } from '@models/techTalk.types.js';
import { buildSearchFilter, buildSortOrder } from '@utils/queryHelpers.js';
import type { TechTalkListQuery } from '@models/techTalk.types.js';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } from '@repo/shared';

export class TechTalkRepository {
  async findPublished(
    query: TechTalkListQuery
  ): Promise<{ techTalks: TechTalk[]; total: number }> {
    const { page, limit, search, sort, order } = query;
    const where = {
      status: TechTalkStatus.published,
      deletedAt: null,
      ...buildSearchFilter('title', search),
    };
    const orderBy = buildSortOrder(
      TECH_TALK_SORT_FIELDS,
      sort,
      order,
      'eventDate'
    );

    const [techTalks, total] = await Promise.all([
      prisma.techTalk.findMany({
        where,
        orderBy,
        skip: ((page ?? DEFAULT_PAGE) - 1) * (limit ?? DEFAULT_PAGE_LIMIT),
        take: limit ?? DEFAULT_PAGE_LIMIT,
      }),
      prisma.techTalk.count({ where }),
    ]);
    return { techTalks, total };
  }

  /**
   * Lists all non-deleted Tech Talks across every status (draft, published,
   * unpublished) with optional search, sort, and pagination. Admin-facing.
   */
  async listAll(
    query: TechTalkListQuery
  ): Promise<{ techTalks: TechTalk[]; total: number }> {
    const { page, limit, search, sort, order } = query;
    const where = {
      deletedAt: null,
      ...buildSearchFilter('title', search),
    };
    const orderBy = buildSortOrder(
      TECH_TALK_SORT_FIELDS,
      sort,
      order,
      'eventDate'
    );

    const [techTalks, total] = await Promise.all([
      prisma.techTalk.findMany({
        where,
        orderBy,
        skip: ((page ?? DEFAULT_PAGE) - 1) * (limit ?? DEFAULT_PAGE_LIMIT),
        take: limit ?? DEFAULT_PAGE_LIMIT,
      }),
      prisma.techTalk.count({ where }),
    ]);
    return { techTalks, total };
  }

  async create(data: {
    title: string;
    description: string | null;
    presenters: string[];
    tags: string[];
    eventDate: Date;
    slidesUrl: string | null;
    youtubeVideoId: string | null;
    status: TechTalkStatus;
    createdBy: string;
  }): Promise<TechTalk> {
    return prisma.techTalk.create({ data });
  }

  async findById(id: string): Promise<TechTalk | null> {
    return prisma.techTalk.findFirst({ where: { id, deletedAt: null } });
  }

  async updateStatus(id: string, status: TechTalkStatus): Promise<TechTalk> {
    return prisma.techTalk.update({ where: { id }, data: { status } });
  }

  /**
   * Unpublishes a Tech Talk in a single conditional update: only a currently
   * `published` Tech Talk is changed to `unpublished`. If the id does not exist
   * or the record is not `published`, Prisma throws P2025 (no row matched the
   * `where`), which the service converts into an AppError.
   */
  async unpublish(id: string): Promise<TechTalk> {
    return prisma.techTalk.update({
      where: {
        id,
        status: TechTalkStatus.published,
      },
      data: { status: TechTalkStatus.unpublished },
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      presenters: string[];
      tags: string[];
      eventDate: Date;
      slidesUrl: string | null;
      youtubeVideoId: string | null;
      status: TechTalkStatus;
    }>
  ): Promise<TechTalk> {
    return prisma.techTalk.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<TechTalk> {
    return prisma.techTalk.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const techTalkRepository = new TechTalkRepository();
export default techTalkRepository;
