import { jest } from '@jest/globals';
import { AppError } from '../../../errors/AppError.js';

const mockPrisma = {
  article: {
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
  notification: {
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.unstable_mockModule('@repo/db', () => ({
  prisma: mockPrisma,
}));

const { E2eCleanupService } = await import('../e2eCleanupService.js');

const E2E_AUTHOR_ID = '00000000-0000-4000-8000-000000000101';

describe('E2eCleanupService', () => {
  let service: any;
  const originalEnv = process.env;
  const validId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    service = new E2eCleanupService();

    // Set valid E2E environment
    process.env.NODE_ENV = 'test';
    process.env.E2E_TEST_MODE = 'true';
    process.env.E2E_DATABASE_CONFIRMED = 'true';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
    process.env.VERCEL_DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws 404 if NODE_ENV is not test', async () => {
    process.env.NODE_ENV = 'development';
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toThrow(AppError);
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 if E2E_TEST_MODE is not true', async () => {
    process.env.E2E_TEST_MODE = 'false';
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toThrow(AppError);
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 if E2E_DATABASE_CONFIRMED is not true', async () => {
    process.env.E2E_DATABASE_CONFIRMED = 'false';
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toThrow(AppError);
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 500 if DATABASE_URL mismatch', async () => {
    process.env.VERCEL_DATABASE_URL = 'postgres://different';
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toThrow(AppError);
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toMatchObject({ statusCode: 500 });
  });

  it('throws 403 if caller is not E2E Author', async () => {
    await expect(service.deleteArticle(validId, 'different-id')).rejects.toThrow(AppError);
    await expect(service.deleteArticle(validId, 'different-id')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 400 if UUID is invalid format', async () => {
    await expect(service.deleteArticle('invalid-uuid', E2E_AUTHOR_ID)).rejects.toThrow(AppError);
    await expect(service.deleteArticle('invalid-uuid', E2E_AUTHOR_ID)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns alreadyAbsent=true if article does not exist', async () => {
    (mockPrisma.article.findUnique as any).mockResolvedValue(null);

    const result = await service.deleteArticle(validId, E2E_AUTHOR_ID);

    expect(result).toEqual({
      articleId: validId,
      articleDeleteCount: 0,
      notificationDeleteCount: 0,
      alreadyAbsent: true,
      verifiedAbsent: true,
    });
  });

  it('throws 403 if article does not belong to E2E Author', async () => {
    (mockPrisma.article.findUnique as any).mockResolvedValue({
      id: validId,
      authorId: 'different-id',
      title: 'Cypress Draft Title',
    });

    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toThrow(AppError);
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 if article title lacks E2E prefix', async () => {
    (mockPrisma.article.findUnique as any).mockResolvedValue({
      id: validId,
      authorId: E2E_AUTHOR_ID,
      title: 'Real User Title',
    });

    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toThrow(AppError);
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deletes exact article and notifications successfully', async () => {
    (mockPrisma.article.findUnique as any)
      .mockResolvedValueOnce({
        id: validId,
        authorId: E2E_AUTHOR_ID,
        title: 'Cypress Draft 123',
      })
      .mockResolvedValueOnce(null); // Second call for verification

    (mockPrisma.notification.deleteMany as any).mockResolvedValue({ count: 2 });
    (mockPrisma.article.deleteMany as any).mockResolvedValue({ count: 1 });
    (mockPrisma.notification.count as any).mockResolvedValue(0);

    const result = await service.deleteArticle(validId, E2E_AUTHOR_ID);

    expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { referenceType: 'article', referenceId: validId },
    });
    expect(mockPrisma.article.deleteMany).toHaveBeenCalledWith({
      where: { id: validId },
    });

    expect(result).toEqual({
      articleId: validId,
      articleDeleteCount: 1,
      notificationDeleteCount: 2,
      alreadyAbsent: false,
      verifiedAbsent: true,
    });
  });

  it('throws 500 if verification fails after deletion', async () => {
    (mockPrisma.article.findUnique as any)
      .mockResolvedValueOnce({
        id: validId,
        authorId: E2E_AUTHOR_ID,
        title: 'Cypress Draft 123',
      })
      .mockResolvedValueOnce({
        id: validId,
      }); // Still exists during verification

    (mockPrisma.notification.deleteMany as any).mockResolvedValue({ count: 2 });
    (mockPrisma.article.deleteMany as any).mockResolvedValue({ count: 1 });
    (mockPrisma.notification.count as any).mockResolvedValue(0);

    const promise = service.deleteArticle(validId, E2E_AUTHOR_ID);
    await expect(promise).rejects.toThrow(AppError);
    
    // Setup for second assertion
    (mockPrisma.article.findUnique as any)
      .mockResolvedValueOnce({
        id: validId,
        authorId: E2E_AUTHOR_ID,
        title: 'Cypress Draft 123',
      })
      .mockResolvedValueOnce({
        id: validId,
      });
    
    await expect(service.deleteArticle(validId, E2E_AUTHOR_ID)).rejects.toMatchObject({ statusCode: 500 });
  });
});

