import crypto from 'node:crypto';
import b2Client from '@v1/lib/b2Client.js';
import { AppError } from '@errors/AppError.js';
import { TechTalkRepository } from '@repositories/techTalkRepository.js';
import type {
  TechTalk,
  CreateTechTalkInput,
} from '@models/techTalk.types.js';
import { TechTalkStatusValue } from '@models/techTalk.types.js';

export class TechTalkService {
  constructor(
    private repository: TechTalkRepository = new TechTalkRepository()
  ) {}

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
      this.validateSlidesFile(slidesFile);

      try {
        const sanitizedName = slidesFile.originalname.replace(
          /[^a-zA-Z0-9.-]/g,
          '_'
        );
        const fileName = `tech-talks/${crypto.randomUUID()}-${sanitizedName}`;
        const { fileUrl } = await b2Client.uploadFile(
          fileName,
          slidesFile.buffer,
          slidesFile.mimetype
        );
        slidesUrl = fileUrl;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        throw new AppError('Failed to upload slides file', 500);
      }
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
