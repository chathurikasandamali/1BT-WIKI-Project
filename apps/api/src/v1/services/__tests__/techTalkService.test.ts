import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import techTalkRepository from '@repositories/techTalkRepository.js';
import type { CreateTechTalkInput, UpdateTechTalkInput } from '@models/techTalk.types.js';

jest.unstable_mockModule('@repositories/techTalkRepository.js', () => {
  const mockCreate = jest.fn();
  const mockFindById = jest.fn();
  const mockUpdateStatus = jest.fn();
  const mockUpdate = jest.fn();
  const mockFindPublished = jest.fn();

  const mockInstance = {
    create: mockCreate,
    findById: mockFindById,
    updateStatus: mockUpdateStatus,
    update: mockUpdate,
    findPublished: mockFindPublished,
  };

  return {
    // Mocks the named class blueprint export
    techTalkRepository: jest.fn().mockImplementation(() => mockInstance),
    // Mocks the default camelCase object instance export
    default: mockInstance,
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
    update: jest.MockedFunction<any>;
    findPublished: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      create: jest.fn<any>(),
      findById: jest.fn<any>(),
      updateStatus: jest.fn<any>(),
      update: jest.fn<any>(),
      findPublished: jest.fn<any>(),
    };
    service = new TechTalkService(
      mockRepo as unknown as typeof techTalkRepository
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

  describe('updateTechTalk', () => {
    const existingTechTalk = {
      id: 'tt-1',
      title: 'Old Title',
      description: 'Old description',
      presenters: ['Alice'],
      tags: ['React'],
      eventDate: new Date('2026-06-01T10:00:00.000Z'),
      slidesUrl: null,
      youtubeVideoId: null,
      status: 'draft' as const,
      createdBy: 'admin-1',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('returns 404 when tech talk does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateTechTalk('non-existent', {})
      ).rejects.toThrow(new AppError('Tech Talk not found', 404));
    });

    it('always resets status to draft when prior status is draft', async () => {
      mockRepo.findById.mockResolvedValue({ ...existingTechTalk, status: 'draft' });
      mockRepo.update.mockResolvedValue({ ...existingTechTalk, status: 'draft' });

      await service.updateTechTalk('tt-1', { title: 'New Title' });

      expect(mockRepo.update).toHaveBeenCalledWith(
        'tt-1',
        expect.objectContaining({ status: 'draft' })
      );
    });

    it('always resets status to draft when prior status is published', async () => {
      mockRepo.findById.mockResolvedValue({ ...existingTechTalk, status: 'published' });
      mockRepo.update.mockResolvedValue({ ...existingTechTalk, status: 'draft' });

      await service.updateTechTalk('tt-1', { title: 'Updated' });

      expect(mockRepo.update).toHaveBeenCalledWith(
        'tt-1',
        expect.objectContaining({ status: 'draft' })
      );
    });

    it('always resets status to draft when prior status is unpublished', async () => {
      mockRepo.findById.mockResolvedValue({ ...existingTechTalk, status: 'unpublished' });
      mockRepo.update.mockResolvedValue({ ...existingTechTalk, status: 'draft' });

      await service.updateTechTalk('tt-1', {});

      expect(mockRepo.update).toHaveBeenCalledWith(
        'tt-1',
        expect.objectContaining({ status: 'draft' })
      );
    });

    it('updates only provided fields (partial update)', async () => {
      mockRepo.findById.mockResolvedValue(existingTechTalk);
      mockRepo.update.mockResolvedValue({ ...existingTechTalk, title: 'New Title', status: 'draft' });

      await service.updateTechTalk('tt-1', { title: 'New Title' });

      const callArg = mockRepo.update.mock.calls[0][1] as Record<string, unknown>;
      expect(callArg).toHaveProperty('title', 'New Title');
      expect(callArg).toHaveProperty('status', 'draft');
      // Fields not in input should not be in the update payload
      expect(callArg).not.toHaveProperty('description');
      expect(callArg).not.toHaveProperty('presenters');
      expect(callArg).not.toHaveProperty('tags');
    });

    it('rejects empty title', async () => {
      mockRepo.findById.mockResolvedValue(existingTechTalk);

      await expect(
        service.updateTechTalk('tt-1', { title: '   ' })
      ).rejects.toThrow(new AppError('Title is required', 400));
    });

    it('rejects empty presenters array', async () => {
      mockRepo.findById.mockResolvedValue(existingTechTalk);

      await expect(
        service.updateTechTalk('tt-1', { presenters: [] })
      ).rejects.toThrow(new AppError('At least one presenter is required', 400));
    });

    it('rejects invalid event date', async () => {
      mockRepo.findById.mockResolvedValue(existingTechTalk);

      await expect(
        service.updateTechTalk('tt-1', { eventDate: 'not-a-date' })
      ).rejects.toThrow(new AppError('Invalid event date', 400));
    });

    it('rejects invalid YouTube video ID', async () => {
      mockRepo.findById.mockResolvedValue(existingTechTalk);

      await expect(
        service.updateTechTalk('tt-1', { youtubeVideoId: 'short' })
      ).rejects.toThrow(new AppError('Invalid YouTube video ID', 400));
    });

    it('handles new slides upload and sets slidesUrl', async () => {
      const mockFile = {
        originalname: 'updated.pdf',
        mimetype: 'application/pdf',
        size: 512 * 1024,
        buffer: Buffer.from('pdf content'),
      } as Express.Multer.File;

      (b2Client.uploadFile as jest.MockedFunction<any>).mockResolvedValue({
        fileUrl: 'https://b2.example.com/tech-talks/updated.pdf',
      });
      mockRepo.findById.mockResolvedValue(existingTechTalk);
      mockRepo.update.mockResolvedValue({
        ...existingTechTalk,
        slidesUrl: 'https://b2.example.com/tech-talks/updated.pdf',
        status: 'draft',
      });

      await service.updateTechTalk('tt-1', {}, mockFile);

      expect(b2Client.uploadFile).toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith(
        'tt-1',
        expect.objectContaining({
          slidesUrl: 'https://b2.example.com/tech-talks/updated.pdf',
        })
      );
    });
  });

  describe('listPublished', () => {
    it('defaults to page 1, limit 20 and no search/sort/order', async () => {
      const mockTalks = [
        {
          id: 'tt-1',
          title: 'React 19 Features',
          description: 'Overview of React 19',
          presenters: ['Alice'],
          tags: ['React'],
          eventDate: new Date('2026-08-01T00:00:00.000Z'),
          slidesUrl: null,
          youtubeVideoId: null,
          status: 'published',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ];
      mockRepo.findPublished.mockResolvedValue({ techTalks: mockTalks, total: 1 });

      const query = { page: 1, limit: 20 };
      const result = await service.listPublished(query);

      expect(mockRepo.findPublished).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        techTalks: mockTalks,
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('passes search, sort, and order parameters to repository', async () => {
      mockRepo.findPublished.mockResolvedValue({ techTalks: [], total: 0 });

      const query = { page: 2, limit: 10, search: 'React', sort: 'title', order: 'asc' };
      await service.listPublished(query);

      expect(mockRepo.findPublished).toHaveBeenCalledWith(query);
    });

    it('supports eventDate sort in desc direction', async () => {
      mockRepo.findPublished.mockResolvedValue({ techTalks: [], total: 0 });

      const query = { page: 1, limit: 20, sort: 'eventDate', order: 'desc' };
      await service.listPublished(query);

      expect(mockRepo.findPublished).toHaveBeenCalledWith(query);
    });

    it('rejects invalid sort field with AppError 400', async () => {
      const query = { page: 1, limit: 20, sort: 'invalidField', order: 'asc' };
      await expect(
        service.listPublished(query)
      ).rejects.toThrow(
        new AppError('Invalid sort field. Allowed: title, eventDate', 400)
      );
    });

    it('rejects invalid sort order with AppError 400', async () => {
      const query = { page: 1, limit: 20, sort: 'title', order: 'invalidOrder' };
      await expect(
        service.listPublished(query)
      ).rejects.toThrow(
        new AppError('Invalid sort order. Allowed: asc, desc', 400)
      );
    });
  });
});
