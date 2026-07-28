// apps/api/src/services/__tests__/notificationService.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type {
  CreateNotificationInput,
  Notification,
} from '@models/notificationTypes.js';

// ── ESM mock registration — must be before any import of the service ────────

const mockCreate = jest.fn<any>();
const mockList = jest.fn<any>();
const mockMarkAsRead = jest.fn<any>();
const mockCountUnread = jest.fn<any>();

await jest.unstable_mockModule(
  '@repositories/notificationRepository.js',
  () => ({
    default: { 
      create: mockCreate, 
      list: mockList, 
      markAsRead: mockMarkAsRead,
      countUnread: mockCountUnread 
    },
  })
);

// Mock pusherClient so the service never tries to connect to Pusher during tests.
const mockPusherTrigger = jest.fn<any>().mockResolvedValue(undefined);
await jest.unstable_mockModule('@v1/lib/pusherClient.js', () => ({
  default: { trigger: mockPusherTrigger },
}));

// Import AFTER mock is registered (ESM requirement)
const { default: notificationService } =
  await import('../notificationService.js');

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const samplePayload: CreateNotificationInput = {
  recipientId: 'user-uuid-1',
  notificationTitle: 'Article approved',
  notificationReferenceType: 'article',
  referenceId: 'article-uuid-1',
  notificationType: 'success',
  message: 'Your article has been approved.',
};

const sampleNotification: Notification = {
  id: 'notif-uuid-1',
  ...samplePayload,
  isRead: false,
  readAt: null,
  deletedAt: null,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationService.send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call repository.create() with the exact payload', async () => {
    // Arrange
    mockCreate.mockResolvedValue({
      id: 'notif-uuid-1',
      ...samplePayload,
      isRead: false,
      readAt: null,
      deletedAt: null,
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
    });

    // Act
    await notificationService.send(samplePayload);

    // Assert
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(samplePayload);
  });

  it('should propagate repository errors (does not catch them)', async () => {
    // Arrange
    const dbError = new Error('Database is unavailable');
    mockCreate.mockRejectedValue(dbError);

    // Act + Assert
    await expect(notificationService.send(samplePayload)).rejects.toThrow(
      'Database is unavailable'
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('NotificationService.list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delegate userId and options to repository.list() and return its result', async () => {
    // Arrange
    const notifications = [sampleNotification];
    mockList.mockResolvedValue(notifications);

    // Act
    const result = await notificationService.list('user-uuid-1', {
      limit: 20,
      offset: 0,
    });

    // Assert
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith('user-uuid-1', {
      limit: 20,
      offset: 0,
    });
    expect(result).toBe(notifications);
  });

  it('should propagate repository errors (does not catch them)', async () => {
    // Arrange
    const dbError = new Error('Database is unavailable');
    mockList.mockRejectedValue(dbError);

    // Act + Assert
    await expect(
      notificationService.list('user-uuid-1', { limit: 20, offset: 0 })
    ).rejects.toThrow('Database is unavailable');

    expect(mockList).toHaveBeenCalledTimes(1);
  });
});

describe('NotificationService.markAsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delegate id and recipientId to repository.markAsRead() and return its result unchanged', async () => {
    // Arrange
    const readNotification: Notification = {
      ...sampleNotification,
      isRead: true,
      readAt: new Date('2026-07-13T09:10:00.000Z'),
    };
    mockMarkAsRead.mockResolvedValue(readNotification);

    // Act
    const result = await notificationService.markAsRead(
      'notif-uuid-1',
      'user-uuid-1'
    );

    // Assert
    expect(mockMarkAsRead).toHaveBeenCalledTimes(1);
    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-uuid-1', 'user-uuid-1');
    expect(result).toBe(readNotification);
  });

  it('should throw AppError(404) when repository.markAsRead() returns null', async () => {
    // Arrange
    mockMarkAsRead.mockResolvedValue(null);

    // Act + Assert
    await expect(
      notificationService.markAsRead('nonexistent-id', 'user-uuid-1')
    ).rejects.toThrow('Notification not found');

    expect(mockMarkAsRead).toHaveBeenCalledTimes(1);
  });

  it('should propagate repository errors (does not catch them)', async () => {
    // Arrange
    const dbError = new Error('Database is unavailable');
    mockMarkAsRead.mockRejectedValue(dbError);

    // Act + Assert
    await expect(
      notificationService.markAsRead('notif-uuid-1', 'user-uuid-1')
    ).rejects.toThrow('Database is unavailable');

    expect(mockMarkAsRead).toHaveBeenCalledTimes(1);
  });
});

describe('NotificationService.countUnread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delegate userId to repository.countUnread() and return its result unchanged', async () => {
    // Arrange
    const expectedCount = 5;
    mockCountUnread.mockResolvedValue(expectedCount);

    // Act
    const result = await notificationService.countUnread('user-uuid-1');

    // Assert
    expect(mockCountUnread).toHaveBeenCalledTimes(1);
    expect(mockCountUnread).toHaveBeenCalledWith('user-uuid-1');
    expect(result).toBe(expectedCount);
  });

  it('should propagate repository errors', async () => {
    // Arrange
    const dbError = new Error('Database is unavailable');
    mockCountUnread.mockRejectedValue(dbError);

    // Act + Assert
    await expect(notificationService.countUnread('user-uuid-1')).rejects.toThrow(
      'Database is unavailable'
    );

    expect(mockCountUnread).toHaveBeenCalledTimes(1);
  });
});
