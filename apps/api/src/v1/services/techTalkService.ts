import crypto from 'node:crypto';
import { TechTalkStatus } from '@repo/db';
import b2Client from '@v1/lib/b2Client.js';
import { AppError } from '@errors/AppError.js';
import {
  TechTalkRepository,
  techTalkRepository as techTalkRepositoryInstance,
} from '@repositories/techTalkRepository.js';
import type {
  TechTalk,
  TechTalkListItem,
  CreateTechTalkInput,
  UpdateTechTalkInput,
  TechTalkListQuery,
  PaginationMeta
} from '@models/techTalk.types.js';
import { UserRoleValue } from '@/types/userTypes.js';
import { HttpStatusCode } from '@utils/httpStatus.js';

export class TechTalkService {
  constructor(
    private readonly techTalkRepository: TechTalkRepository = techTalkRepositoryInstance
  ) {}

  async getTechTalkById(id: string, requesterRole?: string): Promise<TechTalk> {
    const techTalk = await this.techTalkRepository.findById(id);
    if (!techTalk) {
      throw new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND);
    }

    if (requesterRole === UserRoleValue.Admin || techTalk.status === TechTalkStatus.published) {
      return techTalk;
    }

    throw new AppError('Tech Talk not available', HttpStatusCode.FORBIDDEN);
  }

  /**
   * Lists published Tech Talks with optional search, sort, and pagination.
   *
   * Invalid `sort` or `order` values are silently ignored — `buildSortOrder`
   * in the repository falls back to the default (`eventDate desc`) rather than
   * throwing, intentionally keeping this public-facing endpoint permissive.
   */
  async listPublished(
    query: TechTalkListQuery
  ): Promise<{ techTalks: TechTalkListItem[] } & PaginationMeta> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { techTalks, total } = await this.techTalkRepository.findPublished({
      ...query,
      page,
      limit,
    });

    return { techTalks, total, page, limit };
  }

  async createTechTalk(
    input: CreateTechTalkInput,
    adminId: string,
    slidesFile?: Express.Multer.File
  ): Promise<TechTalk> {
    if (!input.title || input.title.trim() === '') {
      throw new AppError('Title is required', HttpStatusCode.BAD_REQUEST);
    }
    if (!input.presenters || input.presenters.length === 0) {
      throw new AppError('At least one presenter is required', HttpStatusCode.BAD_REQUEST);
    }
    if (!input.eventDate) {
      throw new AppError('Event date is required', HttpStatusCode.BAD_REQUEST);
    }
    const eventDate = new Date(input.eventDate);
    if (isNaN(eventDate.getTime())) {
      throw new AppError('Invalid event date', HttpStatusCode.BAD_REQUEST);
    }
    if (
      input.youtubeVideoId &&
      !this.isValidYoutubeVideoId(input.youtubeVideoId)
    ) {
      throw new AppError('Invalid YouTube video ID', HttpStatusCode.BAD_REQUEST);
    }

    let slidesUrl: string | null = null;
    if (slidesFile) {
      slidesUrl = await this.uploadSlides(crypto.randomUUID(), slidesFile);
    }

    const status: TechTalkStatus = input.publishImmediately
      ? TechTalkStatus.published
      : TechTalkStatus.draft;

    return this.techTalkRepository.create({
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
    const techTalk = await this.techTalkRepository.findById(id);
    if (!techTalk) {
      throw new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND);
    }
    if (techTalk.status !== TechTalkStatus.draft) {
      throw new AppError(
        `Cannot publish a Tech Talk with status "${techTalk.status}". Only Draft Tech Talks can be published.`,
        HttpStatusCode.BAD_REQUEST
      );
    }
    return this.techTalkRepository.updateStatus(id, TechTalkStatus.published);
  }

  async deleteTechTalk(id: string): Promise<void> {
    const techTalk = await this.techTalkRepository.findById(id);
    if (!techTalk) {
      throw new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND);
    }
    await this.techTalkRepository.softDelete(id);
  }

  async updateTechTalk(
    id: string,
    input: UpdateTechTalkInput,
    slidesFile?: Express.Multer.File
  ): Promise<TechTalk> {
    const existing = await this.techTalkRepository.findById(id);
    if (!existing) {
      throw new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND);
    }

    const updateFields: Partial<{
      title: string;
      description: string | null;
      presenters: string[];
      tags: string[];
      eventDate: Date;
      slidesUrl: string | null;
      youtubeVideoId: string | null;
      status: TechTalkStatus;
    }> = {};

    if (input.title !== undefined) {
      if (input.title.trim() === '') throw new AppError('Title is required', HttpStatusCode.BAD_REQUEST);
      updateFields.title = input.title.trim();
    }
    if (input.description !== undefined) {
      updateFields.description = input.description;
    }
    if (input.presenters !== undefined) {
      if (input.presenters.length === 0) {
        throw new AppError('At least one presenter is required', HttpStatusCode.BAD_REQUEST);
      }
      updateFields.presenters = input.presenters;
    }
    if (input.tags !== undefined) {
      updateFields.tags = input.tags;
    }
    if (input.eventDate !== undefined) {
      const eventDate = new Date(input.eventDate);
      if (isNaN(eventDate.getTime())) throw new AppError('Invalid event date', HttpStatusCode.BAD_REQUEST);
      updateFields.eventDate = eventDate;
    }
    if (input.youtubeVideoId !== undefined) {
      if (!this.isValidYoutubeVideoId(input.youtubeVideoId)) {
        throw new AppError('Invalid YouTube video ID', HttpStatusCode.BAD_REQUEST);
      }
      updateFields.youtubeVideoId = input.youtubeVideoId;
    }
    if (slidesFile) {
      updateFields.slidesUrl = await this.uploadSlides(id, slidesFile);
    }

    // Per SRS 3.5.2: editing always resets status to Draft, regardless of
    // the Tech Talk's current status (Draft, Published, or Unpublished).
    updateFields.status = TechTalkStatus.draft;

    return this.techTalkRepository.update(id, updateFields);
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
      throw new AppError('Failed to upload slides file', HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  private validateSlidesFile(file: Express.Multer.File): void {
    const maxSizeBytes = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSizeBytes) {
      throw new AppError('Slides file size cannot exceed 20MB', HttpStatusCode.BAD_REQUEST);
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

export const techTalkService = new TechTalkService();