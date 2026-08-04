import { prisma } from '@repo/db';
import type { TechTalk, TechTalkStatus } from '@models/techTalk.types.js';

export class TechTalkRepository {
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
}

export default new TechTalkRepository();