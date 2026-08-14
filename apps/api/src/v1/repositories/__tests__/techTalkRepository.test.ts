import { jest } from '@jest/globals';
import { createTechTalk } from '@repo/shared';

jest.unstable_mockModule('@repo/db', () => ({
  TechTalkStatus: {
    draft: 'draft',
    published: 'published',
    unpublished: 'unpublished',
  },
  prisma: {
    techTalk: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const { prisma } = await import('@repo/db');
const prismaMock = jest.mocked(prisma);
const { default: techTalkRepository } =
  await import('../techTalkRepository.js');

describe('TechTalkRepository', () => {
  const mockTalk = createTechTalk({
    id: 'tt-1',
    title: 'Modern Architecture',
    presenters: ['Alice'],
    tags: [],
    eventDate: new Date('2026-09-01T10:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAll', () => {
    it('returns techTalks and total for all statuses when no filter is provided', async () => {
      prismaMock.techTalk.findMany.mockResolvedValue([mockTalk] as any);
      prismaMock.techTalk.count.mockResolvedValue(1);

      const result = await techTalkRepository.listAll({});

      expect(prisma.techTalk.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          orderBy: { eventDate: 'desc' },
          skip: 0,
          take: 20,
        })
      );
      expect(prisma.techTalk.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(result).toEqual({ techTalks: [mockTalk], total: 1 });
    });

    it('does not apply a status filter, so draft and unpublished tech talks are included', async () => {
      prismaMock.techTalk.findMany.mockResolvedValue([]);
      prismaMock.techTalk.count.mockResolvedValue(0);

      await techTalkRepository.listAll({});

      expect(prisma.techTalk.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        })
      );
      expect(prisma.techTalk.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('excludes soft-deleted records via deletedAt: null', async () => {
      prismaMock.techTalk.findMany.mockResolvedValue([]);
      prismaMock.techTalk.count.mockResolvedValue(0);

      await techTalkRepository.listAll({ search: 'React' });

      expect(prisma.techTalk.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            title: { contains: 'React', mode: 'insensitive' },
          },
        })
      );
      expect(prisma.techTalk.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          title: { contains: 'React', mode: 'insensitive' },
        },
      });
    });

    it('applies sort/order and pagination', async () => {
      prismaMock.techTalk.findMany.mockResolvedValue([]);
      prismaMock.techTalk.count.mockResolvedValue(0);

      await techTalkRepository.listAll({
        page: 2,
        limit: 10,
        sort: 'title',
        order: 'asc',
      });

      expect(prisma.techTalk.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' },
          skip: 10,
          take: 10,
        })
      );
    });

    it('combines search and sort without a status filter', async () => {
      prismaMock.techTalk.findMany.mockResolvedValue([]);
      prismaMock.techTalk.count.mockResolvedValue(0);

      await techTalkRepository.listAll({
        page: 1,
        limit: 20,
        search: 'React',
        sort: 'eventDate',
        order: 'desc',
      });

      expect(prisma.techTalk.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            title: { contains: 'React', mode: 'insensitive' },
          },
          orderBy: { eventDate: 'desc' },
        })
      );
    });
  });

  describe('unpublish', () => {
    it('updates a published tech talk to unpublished in a single conditional update', async () => {
      const unpublishedTalk = { ...mockTalk, status: 'unpublished' };
      prismaMock.techTalk.update.mockResolvedValue(unpublishedTalk as any);

      const result = await techTalkRepository.unpublish('tt-1');

      expect(prisma.techTalk.update).toHaveBeenCalledTimes(1);
      expect(prisma.techTalk.update).toHaveBeenCalledWith({
        where: {
          id: 'tt-1',
          status: 'published',
        },
        data: { status: 'unpublished' },
      });
      expect(result).toEqual(unpublishedTalk);
    });

    it('propagates P2025 when the tech talk is missing or not published', async () => {
      const error = new Error('Record to update not found');
      (error as any).code = 'P2025';
      prismaMock.techTalk.update.mockRejectedValue(error);

      await expect(
        techTalkRepository.unpublish('non-existent')
      ).rejects.toThrow(error);

      expect(prisma.techTalk.update).toHaveBeenCalledTimes(1);
    });
  });
});
