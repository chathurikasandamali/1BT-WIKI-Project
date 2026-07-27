import { jest } from '@jest/globals';

jest.unstable_mockModule('@repo/db', () => ({
  prisma: {
    like: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
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
      (prisma.like.create as jest.Mock<any>).mockResolvedValue(mockLike);

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
      (prisma.like.create as jest.Mock<any>).mockRejectedValue(error);
      (prisma.like.findUnique as jest.Mock<any>).mockResolvedValue(mockLike);

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
      (prisma.like.create as jest.Mock<any>).mockRejectedValue(error);
      (prisma.like.findUnique as jest.Mock<any>).mockResolvedValue(null);

      await expect(LikeRepository.upsert(articleId, userId)).rejects.toThrow(error);

      expect(prisma.like.create).toHaveBeenCalled();
      expect(prisma.like.findUnique).toHaveBeenCalled();
    });

    it('should rethrow non-P2002 errors without calling findUnique', async () => {
      const error = new Error('Database connection failed');
      (prisma.like.create as jest.Mock<any>).mockRejectedValue(error);

      await expect(LikeRepository.upsert(articleId, userId)).rejects.toThrow(error);

      expect(prisma.like.create).toHaveBeenCalled();
      expect(prisma.like.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should call deleteMany with correct where clause', async () => {
      (prisma.like.deleteMany as jest.Mock<any>).mockResolvedValue({ count: 1 });

      await LikeRepository.remove(articleId, userId);

      expect(prisma.like.deleteMany).toHaveBeenCalledWith({
        where: { articleId, userId },
      });
    });
  });
});
