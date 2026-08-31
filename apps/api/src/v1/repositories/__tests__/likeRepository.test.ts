import { jest } from '@jest/globals';

jest.unstable_mockModule('@repo/db', () => ({
  TechTalkStatus: { draft: 'draft', published: 'published', unpublished: 'unpublished' },
  prisma: {
    like: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, options: { code: string }) {
        super(message);
        this.code = options.code;
        this.name = 'PrismaClientKnownRequestError';
      }
    },
  },
}));

const { prisma, Prisma } = await import('@repo/db');
const prismaMock = jest.mocked(prisma);
const { default: LikeRepository } = await import('../likeRepository.js');

describe('LikeRepository', () => {
  const articleId = 'article-123';
  const userId = 'user-123';
  const mockLike = { id: 'like-1', articleId, userId, createdAt: new Date() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('should create a new like and return it with created: true', async () => {
      prismaMock.like.create.mockResolvedValue(mockLike);

      const result = await LikeRepository.upsert(articleId, userId);

      expect(prisma.like.create).toHaveBeenCalledWith({
        data: { articleId, userId },
      });
      expect(prisma.like.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual({ like: mockLike, created: true });
    });

    it('should find existing like and return it with created: false when P2002 error occurs', async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.8.0', meta: {} }
      );
      prismaMock.like.create.mockRejectedValue(error);
      prismaMock.like.findUnique.mockResolvedValue(mockLike);

      const result = await LikeRepository.upsert(articleId, userId);

      expect(prisma.like.create).toHaveBeenCalledWith({
        data: { articleId, userId },
      });
      expect(prisma.like.findUnique).toHaveBeenCalledWith({
        where: {
          articleId_userId: { articleId, userId },
        },
      });
      expect(result).toEqual({ like: mockLike, created: false });
    });

    it('should rethrow error if P2002 occurs but findUnique returns null', async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.8.0', meta: {} }
      );
      prismaMock.like.create.mockRejectedValue(error);
      prismaMock.like.findUnique.mockResolvedValue(null);

      await expect(LikeRepository.upsert(articleId, userId)).rejects.toThrow(error);

      expect(prisma.like.create).toHaveBeenCalled();
      expect(prisma.like.findUnique).toHaveBeenCalled();
    });

    it('should rethrow non-P2002 errors without calling findUnique', async () => {
      const error = new Error('Database connection failed');
      prismaMock.like.create.mockRejectedValue(error);

      await expect(LikeRepository.upsert(articleId, userId)).rejects.toThrow(error);

      expect(prisma.like.create).toHaveBeenCalled();
      expect(prisma.like.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should call deleteMany with correct where clause', async () => {
      prismaMock.like.deleteMany.mockResolvedValue({ count: 1 });

      await LikeRepository.remove(articleId, userId);

      expect(prisma.like.deleteMany).toHaveBeenCalledWith({
        where: { articleId, userId },
      });
    });
  });

  describe('findByArticleId', () => {
    it('should return likers mapped from user relation, ordered by most recent', async () => {
      prismaMock.like.findMany.mockResolvedValue([
        {
          id: 'like-2',
          articleId,
          userId: 'user-2',
          createdAt: new Date('2026-01-02'),
          user: { name: 'Bob', image: null },
        },
        {
          id: 'like-1',
          articleId,
          userId: 'user-1',
          createdAt: new Date('2026-01-01'),
          user: { name: 'Alice', image: 'https://img.com/alice.png' },
        },
      ] as any);

      const result = await LikeRepository.findByArticleId(articleId);

      expect(prisma.like.findMany).toHaveBeenCalledWith({
        where: { articleId },
        select: {
          id: true,
          articleId: true,
          userId: true,
          createdAt: true,
          user: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([
        {
          id: 'like-2',
          articleId,
          userId: 'user-2',
          createdAt: new Date('2026-01-02'),
          userName: 'Bob',
          userImage: null,
        },
        {
          id: 'like-1',
          articleId,
          userId: 'user-1',
          createdAt: new Date('2026-01-01'),
          userName: 'Alice',
          userImage: 'https://img.com/alice.png',
        },
      ]);
    });

    it('should return an empty array when nobody liked the article', async () => {
      prismaMock.like.findMany.mockResolvedValue([]);

      const result = await LikeRepository.findByArticleId(articleId);

      expect(result).toEqual([]);
    });
  });
});
