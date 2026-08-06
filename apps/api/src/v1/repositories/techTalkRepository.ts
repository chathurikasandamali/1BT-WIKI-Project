import { prisma } from '@repo/db';
import type { TechTalk, TechTalkStatus } from '@models/techTalk.types.js';

class TechTalkRepository {
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