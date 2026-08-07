import { prisma } from '@repo/db';
import type { TechTalk, TechTalkStatus } from '@models/techTalk.types.js';
import { TECH_TALK_SORT_FIELDS, TechTalkStatusValue } from '@models/techTalk.types.js';
import { buildSearchFilter, buildSortOrder } from '@utils/queryHelpers.js';

class TechTalkRepository {
  async findPublished(
    page: number,
    limit: number,
    options?: { search?: string; sort?: string; order?: string }
  ): Promise<{ techTalks: TechTalk[]; total: number }> {
    const where = {
      status: TechTalkStatusValue.Published,
      deletedAt: null,
      ...buildSearchFilter('title', options?.search),
    };
    const orderBy = buildSortOrder(
      TECH_TALK_SORT_FIELDS,
      options?.sort,
      options?.order,
      'eventDate'
    );

    const [techTalks, total] = await Promise.all([
      prisma.techTalk.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
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
}

const techTalkRepository = new TechTalkRepository();
export default techTalkRepository;