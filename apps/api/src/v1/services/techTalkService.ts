import crypto from 'node:crypto';
import b2Client from '@v1/lib/b2Client.js';
import { AppError } from '@errors/AppError.js';
import techTalkRepository from '@repositories/techTalkRepository.js';
import type {
  TechTalk,
  TechTalkListItem,
  CreateTechTalkInput,
  UpdateTechTalkInput,
} from '@models/techTalk.types.js';
import { TECH_TALK_SORT_FIELDS, TechTalkStatusValue } from '@models/techTalk.types.js';
import { assertValidSort } from '../utils/queryHelpers.js';

export class TechTalkService {
  constructor(
    private repository: typeof techTalkRepository = techTalkRepository
  ) {}

  async listPublished(
    page: number = 1,
    limit: number = 20,
    search?: string,
    sort?: string,
    order?: string
  ): Promise<{ techTalks: TechTalkListItem[]; total: number; page: number; limit: number }> {
    assertValidSort(TECH_TALK_SORT_FIELDS, sort);
    if (order !== undefined && order !== 'asc' && order !== 'desc') {
      throw new AppError('Invalid sort order. Allowed: asc, desc', 400);
    }

    const { techTalks, total } = await this.repository.findPublished(page, limit, {
      search,
      sort,
      order,
    });

    return { techTalks, total, page, limit };
  }

  async createTechTalk(
    input: CreateTechTalkInput,
    adminId: string,
    slidesFile?: Express.Multer.File
  ): Promise<TechTalk> {
    if (!input.title || input.title.trim() === '') {
      throw new AppError('Title is required', 400);
    }
    if (!input.presenters || input.presenters.length === 0) {
      throw new AppError('At least one presenter is required', 400);
    }
    if (!input.eventDate) {
      throw new AppError('Event date is required', 400);
    }
    const eventDate = new Date(input.eventDate);
    if (isNaN(eventDate.getTime())) {
      throw new AppError('Invalid event date', 400);
    }
    if (
      input.youtubeVideoId &&
      !this.isValidYoutubeVideoId(input.youtubeVideoId)
    ) {
      throw new AppError('Invalid YouTube video ID', 400);
    }

    let slidesUrl: string | null = null;
    if (slidesFile) {
      slidesUrl = await this.uploadSlides(crypto.randomUUID(), slidesFile);
    }

    const status = input.publishImmediately
      ? TechTalkStatusValue.Published
      : TechTalkStatusValue.Draft;

    return this.repository.create({
      title: input.title.trim(),
      description: input.description ?? null,
      presenters: input.presenters,
      tags: input.tags ?? [],
      eventDate,
      slidesUrl,
      youtubeVideoId: input.youtubeVideoId ?? null,
      status,
      createdBy: adminId,
    });
  }

  async publishTechTalk(id: string): Promise<TechTalk> {
    const techTalk = await this.repository.findById(id);
    if (!techTalk) {
      throw new AppError('Tech Talk not found', 404);
    }
    if (techTalk.status !== TechTalkStatusValue.Draft) {
      throw new AppError(
        `Cannot publish a Tech Talk with status "${techTalk.status}". Only Draft Tech Talks can be published.`,
        400
      );
    }
    return this.repository.updateStatus(id, TechTalkStatusValue.Published);
  }

  async updateTechTalk(
    id: string,
    input: UpdateTechTalkInput,
    slidesFile?: Express.Multer.File
  ): Promise<TechTalk> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Tech Talk not found', 404);
    }

    const updateFields: Partial<{
      title: string;
      description: string | null;
      presenters: string[];
      tags: string[];
      eventDate: Date;
      slidesUrl: string | null;
      youtubeVideoId: string | null;
      status: (typeof TechTalkStatusValue)[keyof typeof TechTalkStatusValue];
    }> = {};

    if (input.title !== undefined) {
      if (input.title.trim() === '') throw new AppError('Title is required', 400);
      updateFields.title = input.title.trim();
    }
    if (input.description !== undefined) {
      updateFields.description = input.description;
    }
    if (input.presenters !== undefined) {
      if (input.presenters.length === 0) {
        throw new AppError('At least one presenter is required', 400);
      }
      updateFields.presenters = input.presenters;
    }
    if (input.tags !== undefined) {
      updateFields.tags = input.tags;
    }
    if (input.eventDate !== undefined) {
      const eventDate = new Date(input.eventDate);
      if (isNaN(eventDate.getTime())) throw new AppError('Invalid event date', 400);
      updateFields.eventDate = eventDate;
    }
    if (input.youtubeVideoId !== undefined) {
      if (!this.isValidYoutubeVideoId(input.youtubeVideoId)) {
        throw new AppError('Invalid YouTube video ID', 400);
      }
      updateFields.youtubeVideoId = input.youtubeVideoId;
    }
    if (slidesFile) {
      updateFields.slidesUrl = await this.uploadSlides(id, slidesFile);
    }

    // Per SRS 3.5.2: editing always resets status to Draft, regardless of
    // the Tech Talk's current status (Draft, Published, or Unpublished).
    updateFields.status = TechTalkStatusValue.Draft;

    return this.repository.update(id, updateFields);
  }

  private async uploadSlides(
    techTalkId: string,
    file: Express.Multer.File
  ): Promise<string> {
    this.validateSlidesFile(file);
    try {
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `tech-talks/${techTalkId}-${sanitizedName}`;
      const { fileUrl } = await b2Client.uploadFile(
        fileName,
        file.buffer,
        file.mimetype
      );
      return fileUrl;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to upload slides file', 500);
    }
  }

  private validateSlidesFile(file: Express.Multer.File): void {
    const maxSizeBytes = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSizeBytes) {
      throw new AppError('Slides file size cannot exceed 20MB', 400);
    }

    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(
        'Only PDF, PPT, and PPTX files are allowed for slides',
        400
      );
    }
  }

  private isValidYoutubeVideoId(id: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(id);
  }
}
