// apps/api/src/repositories/__tests__/notificationRepository.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type {
  Notification,
  CreateNotificationInput,
} from '@models/notificationTypes.js';

// ── ESM mock registration — must be before any import of the repository ─────

const mockCreate = jest.fn<any>();
const mockFindFirst = jest.fn<any>();
const mockFindMany = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockCount = jest.fn<any>();

await jest.unstable_mockModule('@repo/db', () => ({
  prisma: {
    notification: {
      create: mockCreate,
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      update: mockUpdate,
      count: mockCount,
    },
  },
}));

// Import AFTER mock is registered (ESM requirement)
const { default: NotificationRepository } =
  await import('../notificationRepository.js');

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** A raw DB row as returned by pg (snake_case columns). */
const makeDbRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'notif-uuid-1',
  recipient_id: 'user-uuid-1',
  notification_title: 'Article approved',
  notification_reference_type: 'article',
  reference_id: 'article-uuid-1',
  notification_type: 'success',
  message: 'Your article has been approved.',
  is_read: false,
  read_at: null,
  deleted_at: null,
  created_at: new Date('2026-07-01T00:00:00.000Z'),
  ...overrides,
});

/** The expected camelCase entity after mapping. */
const expectedEntity: Notification = {
  id: 'notif-uuid-1',
  recipientId: 'user-uuid-1',
  notificationTitle: 'Article approved',
  notificationReferenceType: 'article',
  referenceId: 'article-uuid-1',
  notificationType: 'success',
  message: 'Your article has been approved.',
  isRead: false,
  readAt: null,
  deletedAt: null,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
};

const sampleInput: CreateNotificationInput = {
  recipientId: 'user-uuid-1',
  notificationTitle: 'Article approved',
  notificationReferenceType: 'article',
  referenceId: 'article-uuid-1',
  notificationType: 'success',
  message: 'Your article has been approved.',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationRepository.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should build correct parameterized SQL and return mapped entity', async () => {
    // Arrange
    mockCreate.mockResolvedValue(expectedEntity);

    // Act
    const result = await NotificationRepository.create(sampleInput);

    // Assert — prisma create called with expected data and select
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const [createArgs] = mockCreate.mock.calls[0] as [any];
    expect(createArgs.data).toEqual({
      recipientId: sampleInput.recipientId,
      title: sampleInput.notificationTitle,
      referenceType: sampleInput.notificationReferenceType,
      referenceId: sampleInput.referenceId,
      type: sampleInput.notificationType,
      message: sampleInput.message,
    });

    // Assert — returned entity
    expect(result).toEqual(expectedEntity);
  });
});

describe('NotificationRepository.findById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no row is found', async () => {
    // Arrange
    mockFindFirst.mockResolvedValue(null);

    // Act
    const result = await NotificationRepository.findById('nonexistent-id');

    // Assert
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });

  it('should exclude soft-deleted rows (deleted_at IS NULL in WHERE clause)', async () => {
    // Arrange
    mockFindFirst.mockResolvedValue(null);

    // Act
    await NotificationRepository.findById('some-id');

    // Assert — soft-delete filter used in where clause
    const [findArgs] = mockFindFirst.mock.calls[0] as [any];
    expect(findArgs.where).toEqual({ id: 'some-id', deletedAt: null });
  });

  it('should return mapped entity when a matching row is found', async () => {
    // Arrange
    mockFindFirst.mockResolvedValue(expectedEntity);

    // Act
    const result = await NotificationRepository.findById('notif-uuid-1');

    // Assert
    expect(result).toEqual(expectedEntity);
    expect(mockFindFirst).toHaveBeenCalledTimes(1);

    const [findArgs] = mockFindFirst.mock.calls[0] as [any];
    expect(findArgs.where).toEqual({ id: 'notif-uuid-1', deletedAt: null });
  });
});

describe('NotificationRepository.list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should build correct parameterized SQL and return mapped entities', async () => {
    // Arrange
    const item1 = expectedEntity;
    const item2 = {
      ...expectedEntity,
      id: 'notif-uuid-2',
      notificationTitle: 'New comment',
      notificationType: 'info',
      message: 'Someone commented on your article.',
    };
    mockFindMany.mockResolvedValue([item1, item2]);

    // Act
    const result = await NotificationRepository.list('user-uuid-1', {
      limit: 20,
      offset: 0,
    });

    // Assert — prisma findMany called with expected args
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];
    expect(findManyArgs.where).toEqual({
      recipientId: 'user-uuid-1',
      deletedAt: null,
    });
    expect(findManyArgs.take).toEqual(20);
    expect(findManyArgs.skip).toEqual(0);

    // Assert — returned entities
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(item1);
    expect(result[1]).toEqual(item2);
  });

  it('should return an empty array when no rows are found', async () => {
    // Arrange
    mockFindMany.mockResolvedValue([]);

    // Act
    const result = await NotificationRepository.list('user-uuid-1', {
      limit: 10,
      offset: 0,
    });

    // Assert
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });
});

describe('NotificationRepository.markAsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should build correct parameterized UPDATE SQL scoped by id and recipientId, excluding soft-deleted rows', async () => {
    const readEntity = {
      ...expectedEntity,
      isRead: true,
      readAt: new Date('2026-07-13T09:10:00.000Z'),
    };
    mockFindFirst.mockResolvedValue(readEntity);
    mockUpdate.mockResolvedValue(readEntity);

    const result = await NotificationRepository.markAsRead(
      'notif-uuid-1',
      'user-uuid-1'
    );

    expect(mockFindFirst).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    const [updateArgs] = mockUpdate.mock.calls[0] as [any];
    expect(updateArgs.where).toEqual({ id: 'notif-uuid-1' });
    expect(updateArgs.data).toEqual({ isRead: true, readAt: expect.any(Date) });

    expect(result).toEqual(readEntity);
  });

  it('should return null no matching row is found(wrong id, wrong owner, or soft-deleted)', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await NotificationRepository.markAsRead(
      'nonexistent-id',
      'user-uuid-1'
    );

    // Assert
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });

  it('should throw AppError(503) when the database query fails', async () => {
    // Arrange
    // Simulate DB error during findFirst
    mockFindFirst.mockRejectedValue(new Error('connection reset'));

    // Act & Assert
    await expect(
      NotificationRepository.markAsRead('notif-uuid-1', 'user-uuid-1')
    ).rejects.toThrow('Database is unavailable');
  });
});

describe('NotificationRepository.countUnread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call prisma.notification.count with correct where clause and return the count', async () => {
    // Arrange
    const expectedCount = 5;
    mockCount.mockResolvedValue(expectedCount);

    // Act
    const result = await NotificationRepository.countUnread('user-uuid-1');

    // Assert
    expect(mockCount).toHaveBeenCalledTimes(1);
    const [countArgs] = mockCount.mock.calls[0] as [any];
    expect(countArgs.where).toEqual({
      recipientId: 'user-uuid-1',
      isRead: false,
      deletedAt: null,
    });
    expect(result).toBe(expectedCount);
  });

  it('should throw AppError(503) when the database query fails', async () => {
    // Arrange
    mockCount.mockRejectedValue(new Error('connection reset'));

    // Act & Assert
    await expect(NotificationRepository.countUnread('user-uuid-1')).rejects.toThrow(
      'Database is unavailable'
    );
  });
});
