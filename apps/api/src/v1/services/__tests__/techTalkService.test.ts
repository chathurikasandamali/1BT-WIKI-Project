import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import type { TechTalkRepository } from '@repositories/techTalkRepository.js';
import type { CreateTechTalkInput } from '@models/techTalk.types.js';

jest.unstable_mockModule('@repositories/techTalkRepository.js', () => {
  const mockCreate = jest.fn();
  const mockFindById = jest.fn();
  const mockUpdateStatus = jest.fn();
  return {
    TechTalkRepository: jest.fn().mockImplementation(() => ({
      create: mockCreate,
      findById: mockFindById,
      updateStatus: mockUpdateStatus,
    })),
  };
});

jest.unstable_mockModule('@v1/lib/b2Client.js', () => ({
  default: {
    uploadFile: jest.fn(),
  },
}));

const { TechTalkService } = await import('../techTalkService.js');
const b2ClientModule = await import('@v1/lib/b2Client.js');
const b2Client = b2ClientModule.default;

describe('TechTalkService', () => {
  let service: InstanceType<typeof TechTalkService>;
  let mockRepo: {
    create: jest.MockedFunction<any>;
    findById: jest.MockedFunction<any>;
    updateStatus: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      create: jest.fn<any>(),
      findById: jest.fn<any>(),
      updateStatus: jest.fn<any>(),
    };
    service = new TechTalkService(
      mockRepo as unknown as TechTalkRepository
    );
  });

  const validPayload: CreateTechTalkInput = {
    title: 'Modern Architecture',
    presenters: ['Alice', 'Bob'],
    eventDate: '2026-09-01T10:00:00.000Z',
    description: 'A talk on modern web architecture.',
    youtubeVideoId: 'dQw4w9WgXcQ',
  };

  describe('createTechTalk - validation', () => {
    it('rejects missing or empty title', async () => {
      await expect(
        service.createTechTalk({ ...validPayload, title: '' }, 'admin-123')
      ).rejects.toThrow(new AppError('Title is required', 400));
    });

    it('rejects missing presenters', async () => {
      await expect(
        service.createTechTalk({ ...validPayload, presenters: [] }, 'admin-123')
      ).rejects.toThrow(new AppError('At least one presenter is required', 400));
    });

    it('rejects missing eventDate', async () => {
      await expect(
        service.createTechTalk({ ...validPayload, eventDate: '' }, 'admin-123')
      ).rejects.toThrow(new AppError('Event date is required', 400));
    });

    it('rejects invalid eventDate', async () => {
      await expect(
        service.createTechTalk({ ...validPayload, eventDate: 'not-a-date' }, 'admin-123')
      ).rejects.toThrow(new AppError('Invalid event date', 400));
    });

    it('validates youtubeVideoId - accepts valid 11-character ID', async () => {
      mockRepo.create.mockResolvedValue({ id: 'tt-1' });

      await service.createTechTalk(
        { ...validPayload, youtubeVideoId: 'dQw4w9WgXcQ' },
        'admin-123'
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          youtubeVideoId: 'dQw4w9WgXcQ',
        })
      );
    });

    it('validates youtubeVideoId - rejects too short or too long ID', async () => {
      await expect(
        service.createTechTalk(
          { ...validPayload, youtubeVideoId: 'short' },
          'admin-123'
        )
      ).rejects.toThrow(new AppError('Invalid YouTube video ID', 400));

      await expect(
        service.createTechTalk(
          { ...validPayload, youtubeVideoId: 'toolongvideoid123' },
          'admin-123'
        )
      ).rejects.toThrow(new AppError('Invalid YouTube video ID', 400));
    });

    it('validates youtubeVideoId - rejects ID with invalid characters', async () => {
      await expect(
        service.createTechTalk(
          { ...validPayload, youtubeVideoId: 'invalid ID!' },
          'admin-123'
        )
      ).rejects.toThrow(new AppError('Invalid YouTube video ID', 400));
    });

    it('validates youtubeVideoId - rejects full URL accidentally passed as ID', async () => {
      await expect(
        service.createTechTalk(
          { ...validPayload, youtubeVideoId: 'https://youtube.com/embed/dQw4w9WgXcQ' },
          'admin-123'
        )
      ).rejects.toThrow(new AppError('Invalid YouTube video ID', 400));
    });

    it('allows omitted youtubeVideoId and stores as null', async () => {
      const payloadWithoutVideo = { ...validPayload };
      delete payloadWithoutVideo.youtubeVideoId;

      mockRepo.create.mockResolvedValue({ id: 'tt-1' });

      await service.createTechTalk(payloadWithoutVideo, 'admin-123');

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          youtubeVideoId: null,
        })
      );
    });
  });

  describe('createTechTalk - execution & statuses', () => {
    it('creates with status: draft when publishImmediately is falsy or omitted', async () => {
      mockRepo.create.mockResolvedValue({
        id: 'tt-1',
        ...validPayload,
        tags: [],
        status: 'draft',
        slidesUrl: null,
        createdBy: 'admin-123',
      });

      await service.createTechTalk(validPayload, 'admin-123');

      expect(mockRepo.create).toHaveBeenCalledWith({
        title: 'Modern Architecture',
        description: 'A talk on modern web architecture.',
        presenters: ['Alice', 'Bob'],
        tags: [],
        eventDate: new Date('2026-09-01T10:00:00.000Z'),
        slidesUrl: null,
        youtubeVideoId: 'dQw4w9WgXcQ',
        status: 'draft',
        createdBy: 'admin-123',
      });
    });

    it('creates with status: published when publishImmediately: true', async () => {
      mockRepo.create.mockResolvedValue({
        id: 'tt-1',
        ...validPayload,
        tags: [],
        status: 'published',
        slidesUrl: null,
        createdBy: 'admin-123',
      });

      await service.createTechTalk(
        { ...validPayload, publishImmediately: true },
        'admin-123'
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
        })
      );
    });

    it('defaults tags to [] when omitted, and passes tags correctly when provided', async () => {
      mockRepo.create.mockResolvedValue({ id: 'tt-1' });

      await service.createTechTalk(
        { ...validPayload, tags: ['React', 'TypeScript'] },
        'admin-123'
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['React', 'TypeScript'],
        })
      );
    });

    it('handles slides upload success and invalid slide file types', async () => {
      const mockFile = {
        originalname: 'presentation.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        buffer: Buffer.from('pdf data'),
      } as Express.Multer.File;

      (b2Client.uploadFile as jest.MockedFunction<any>).mockResolvedValue({
        fileUrl: 'https://b2.example.com/tech-talks/slides.pdf',
      });
      mockRepo.create.mockResolvedValue({ id: 'tt-1' });

      await service.createTechTalk(validPayload, 'admin-123', mockFile);

      expect(b2Client.uploadFile).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slidesUrl: 'https://b2.example.com/tech-talks/slides.pdf',
        })
      );

      const invalidFile = {
        ...mockFile,
        mimetype: 'image/png',
      } as Express.Multer.File;

      await expect(
        service.createTechTalk(validPayload, 'admin-123', invalidFile)
      ).rejects.toThrow(
        new AppError('Only PDF, PPT, and PPTX files are allowed for slides', 400)
      );
    });
  });

  describe('publishTechTalk', () => {
    it('publishes a draft tech talk successfully', async () => {
      const draftTechTalk = { id: 'tt-1', status: 'draft', title: 'Test Talk' };
      const publishedTechTalk = { ...draftTechTalk, status: 'published' };

      mockRepo.findById.mockResolvedValue(draftTechTalk);
      mockRepo.updateStatus.mockResolvedValue(publishedTechTalk);

      const result = await service.publishTechTalk('tt-1');

      expect(mockRepo.findById).toHaveBeenCalledWith('tt-1');
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('tt-1', 'published');
      expect(result).toEqual(publishedTechTalk);
    });

    it('rejects publishing when tech talk is not found (404)', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.publishTechTalk('non-existent')).rejects.toThrow(
        new AppError('Tech Talk not found', 404)
      );
    });

    it('rejects publishing when tech talk is already published (400)', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'tt-1', status: 'published' });

      await expect(service.publishTechTalk('tt-1')).rejects.toThrow(
        new AppError(
          'Cannot publish a Tech Talk with status "published". Only Draft Tech Talks can be published.',
          400
        )
      );
    });

    it('rejects publishing when tech talk is unpublished (400)', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'tt-1', status: 'unpublished' });

      await expect(service.publishTechTalk('tt-1')).rejects.toThrow(
        new AppError(
          'Cannot publish a Tech Talk with status "unpublished". Only Draft Tech Talks can be published.',
          400
        )
      );
    });
  });
});
