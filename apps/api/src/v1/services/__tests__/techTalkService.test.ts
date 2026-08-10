import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import techTalkRepository from '@repositories/techTalkRepository.js';
import type { CreateTechTalkInput, UpdateTechTalkInput } from '@models/techTalk.types.js';
import { HttpStatusCode } from '@v1/utils/httpStatus.js';

jest.unstable_mockModule('@repositories/techTalkRepository.js', () => {
  const mockCreate = jest.fn();
  const mockFindById = jest.fn();
  const mockUpdateStatus = jest.fn();
  const mockUpdate = jest.fn();
  const mockFindPublished = jest.fn();
  const mockSoftDelete = jest.fn();

  const mockInstance = {
    create: mockCreate,
    findById: mockFindById,
    updateStatus: mockUpdateStatus,
    update: mockUpdate,
    findPublished: mockFindPublished,
    softDelete: mockSoftDelete,
  };

  return {
    TechTalkRepository: jest.fn().mockImplementation(() => mockInstance),
    techTalkRepository: mockInstance,
    default: mockInstance,
  };
});

jest.unstable_mockModule('@v1/lib/b2Client.js', () => ({
  default: {
    uploadFile: jest.fn(),
  },
}));

// Prevent real Prisma client from initialising (no DATABASE_URL in unit tests)
jest.unstable_mockModule('@repo/db', () => ({
  prisma: {}, // not used directly by the service — goes through the repository
  TechTalkStatus: {
    draft: 'draft',
    published: 'published',
    unpublished: 'unpublished',
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
    softDelete: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      create: jest.fn<any>(),
      findById: jest.fn<any>(),
      updateStatus: jest.fn<any>(),
      update: jest.fn<any>(),
      findPublished: jest.fn<any>(),
      softDelete: jest.fn<any>(),
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
      ).rejects.toThrow(new AppError('Title is required', HttpStatusCode.BAD_REQUEST));
    });

    it('rejects missing presenters', async () => {
      await expect(
        service.createTechTalk({ ...validPayload, presenters: [] }, 'admin-123')
      ).rejects.toThrow(new AppError('At least one presenter is required', HttpStatusCode.BAD_REQUEST));
    });

    it('rejects missing eventDate', async () => {
      await expect(
        service.createTechTalk({ ...validPayload, eventDate: '' }, 'admin-123')
      ).rejects.toThrow(new AppError('Event date is required', HttpStatusCode.BAD_REQUEST));
    });

    it('rejects invalid eventDate', async () => {
      await expect(
        service.createTechTalk({ ...validPayload, eventDate: 'not-a-date' }, 'admin-123')
      ).rejects.toThrow(new AppError('Invalid event date', HttpStatusCode.BAD_REQUEST));
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
      ).rejects.toThrow(new AppError('Invalid YouTube video ID', HttpStatusCode.BAD_REQUEST));

      await expect(
        service.createTechTalk(
          { ...validPayload, youtubeVideoId: 'toolongvideoid123' },
          'admin-123'
        )
      ).rejects.toThrow(new AppError('Invalid YouTube video ID', HttpStatusCode.BAD_REQUEST));
    });

    it('validates youtubeVideoId - rejects ID with invalid characters', async () => {
      await expect(
        service.createTechTalk(
          { ...validPayload, youtubeVideoId: 'invalid ID!' },
          'admin-123'
        )
      ).rejects.toThrow(new AppError('Invalid YouTube video ID', HttpStatusCode.BAD_REQUEST));
    });

    it('validates youtubeVideoId - rejects full URL accidentally passed as ID', async () => {
      await expect(
        service.createTechTalk(
          { ...validPayload, youtubeVideoId: 'https://youtube.com/embed/dQw4w9WgXcQ' },
          'admin-123'
        )
      ).rejects.toThrow(new AppError('Invalid YouTube video ID', HttpStatusCode.BAD_REQUEST));
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
        new AppError('Only PDF, PPT, and PPTX files are allowed for slides', HttpStatusCode.BAD_REQUEST)
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
        new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND)
      );
    });

    it('rejects publishing when tech talk is already published (400)', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'tt-1', status: 'published' });

      await expect(service.publishTechTalk('tt-1')).rejects.toThrow(
        new AppError(
          'Cannot publish a Tech Talk with status "published". Only Draft Tech Talks can be published.',
          HttpStatusCode.BAD_REQUEST
        )
      );
    });

    it('rejects publishing when tech talk is unpublished (400)', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'tt-1', status: 'unpublished' });

      await expect(service.publishTechTalk('tt-1')).rejects.toThrow(
        new AppError(
          'Cannot publish a Tech Talk with status "unpublished". Only Draft Tech Talks can be published.',
          HttpStatusCode.BAD_REQUEST
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
      ).rejects.toThrow(new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND));
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
      ).rejects.toThrow(new AppError('Title is required', HttpStatusCode.BAD_REQUEST));
    });

    it('rejects empty presenters array', async () => {
      mockRepo.findById.mockResolvedValue(existingTechTalk);

      await expect(
        service.updateTechTalk('tt-1', { presenters: [] })
      ).rejects.toThrow(new AppError('At least one presenter is required', HttpStatusCode.BAD_REQUEST));
    });

    it('rejects invalid event date', async () => {
      mockRepo.findById.mockResolvedValue(existingTechTalk);

      await expect(
        service.updateTechTalk('tt-1', { eventDate: 'not-a-date' })
      ).rejects.toThrow(new AppError('Invalid event date', HttpStatusCode.BAD_REQUEST));
    });

    it('rejects invalid YouTube video ID', async () => {
      mockRepo.findById.mockResolvedValue(existingTechTalk);

      await expect(
        service.updateTechTalk('tt-1', { youtubeVideoId: 'short' })
      ).rejects.toThrow(new AppError('Invalid YouTube video ID', HttpStatusCode.BAD_REQUEST));
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
    it('defaults to page 1, limit 20 when query parameters are omitted', async () => {
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

      const query = {} as any;
      const result = await service.listPublished(query);

      expect(mockRepo.findPublished).toHaveBeenCalledWith({ page: 1, limit: 20 });
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

    it('passes an invalid sort field through to the repository without throwing (permissive fallback)', async () => {
      mockRepo.findPublished.mockResolvedValue({ techTalks: [], total: 0 });

      const query = { page: 1, limit: 20, sort: 'invalidField', order: 'asc' };
      // Should NOT throw — buildSortOrder in the repository silently falls back to the default sort
      await expect(service.listPublished(query)).resolves.toEqual({
        techTalks: [],
        total: 0,
        page: 1,
        limit: 20,
      });
      expect(mockRepo.findPublished).toHaveBeenCalledWith(query);
    });

    it('passes an invalid sort order through to the repository without throwing (permissive fallback)', async () => {
      mockRepo.findPublished.mockResolvedValue({ techTalks: [], total: 0 });

      const query = { page: 1, limit: 20, sort: 'title', order: 'invalidOrder' };
      // Should NOT throw — buildSortOrder in the repository silently falls back to 'desc'
      await expect(service.listPublished(query)).resolves.toEqual({
        techTalks: [],
        total: 0,
        page: 1,
        limit: 20,
      });
      expect(mockRepo.findPublished).toHaveBeenCalledWith(query);
    });
  });

  describe('getTechTalkById', () => {
    const mockPublishedTalk = {
      id: 'tt-1',
      title: 'Published Talk',
      status: 'published',
    };
    const mockDraftTalk = {
      id: 'tt-2',
      title: 'Draft Talk',
      status: 'draft',
    };
    const mockUnpublishedTalk = {
      id: 'tt-3',
      title: 'Unpublished Talk',
      status: 'unpublished',
    };

    it('returns the Tech Talk when published, regardless of requester role', async () => {
      mockRepo.findById.mockResolvedValue(mockPublishedTalk);

      const resultAsUser = await service.getTechTalkById('tt-1', 'User');
      expect(resultAsUser).toEqual(mockPublishedTalk);

      const resultAnon = await service.getTechTalkById('tt-1');
      expect(resultAnon).toEqual(mockPublishedTalk);

      const resultAdmin = await service.getTechTalkById('tt-1', 'Admin');
      expect(resultAdmin).toEqual(mockPublishedTalk);
    });

    it('returns draft or unpublished Tech Talk for an Admin requester', async () => {
      mockRepo.findById.mockResolvedValue(mockDraftTalk);
      const draftResult = await service.getTechTalkById('tt-2', 'Admin');
      expect(draftResult).toEqual(mockDraftTalk);

      mockRepo.findById.mockResolvedValue(mockUnpublishedTalk);
      const unpubResult = await service.getTechTalkById('tt-3', 'Admin');
      expect(unpubResult).toEqual(mockUnpublishedTalk);
    });

    it('throws 403 for a non-Admin requester on a draft or unpublished Tech Talk', async () => {
      mockRepo.findById.mockResolvedValue(mockDraftTalk);
      await expect(service.getTechTalkById('tt-2', 'User')).rejects.toThrow(
        new AppError('Tech Talk not available', HttpStatusCode.FORBIDDEN)
      );

      mockRepo.findById.mockResolvedValue(mockUnpublishedTalk);
      await expect(service.getTechTalkById('tt-3')).rejects.toThrow(
        new AppError('Tech Talk not available', HttpStatusCode.FORBIDDEN)
      );
    });

    it('throws 404 for a non-existent id', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getTechTalkById('non-existent', 'Admin')).rejects.toThrow(
        new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND)
      );
    });
  });

  describe('deleteTechTalk', () => {
    it('should soft-delete an existing draft tech talk successfully', async () => {
      const mockTalk = { id: 'tt-123', title: 'Draft Talk', status: 'draft' };
      mockRepo.findById.mockResolvedValue(mockTalk);
      mockRepo.softDelete.mockResolvedValue({ ...mockTalk, deletedAt: new Date() });

      await service.deleteTechTalk('tt-123');

      expect(mockRepo.findById).toHaveBeenCalledWith('tt-123');
      expect(mockRepo.softDelete).toHaveBeenCalledWith('tt-123');
    });

    it('should soft-delete an existing published tech talk successfully (no status restriction)', async () => {
      const mockTalk = { id: 'tt-123', title: 'Published Talk', status: 'published' };
      mockRepo.findById.mockResolvedValue(mockTalk);
      mockRepo.softDelete.mockResolvedValue({ ...mockTalk, deletedAt: new Date() });

      await service.deleteTechTalk('tt-123');

      expect(mockRepo.findById).toHaveBeenCalledWith('tt-123');
      expect(mockRepo.softDelete).toHaveBeenCalledWith('tt-123');
    });

    it('should throw 404 error if tech talk does not exist, and not call softDelete', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteTechTalk('non-existent')).rejects.toThrow(
        new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND)
      );

      expect(mockRepo.findById).toHaveBeenCalledWith('non-existent');
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });
  });
});
