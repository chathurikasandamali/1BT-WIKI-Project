// apps/api/src/controllers/__tests__/notificationController.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── ESM mock registration — must be before any import of the controller ────────

const mockList = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockMarkAsRead = jest.fn<(...args: unknown[]) => Promise<unknown>>();

await jest.unstable_mockModule('@services/notificationService.js', () => ({
  default: { list: mockList, markAsRead: mockMarkAsRead },
}));

// Import AFTER mock is registered (ESM requirement)
const { default: notificationController } =
  await import('../notificationController.js');

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

// A minimal Request shape enough for our tests
const buildReq = (
  query: Record<string, string> = {},
  params: Record<string, string> = {}
): Partial<Request> => ({
  user: {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'User',
  },
  query,
  params,
});

const buildRes = (): Partial<Response> => {
  const res: Partial<Response> = {};
  // We cast the jest.fn() to the corresponding Express response method signature
  // to satisfy TypeScript while preserving the mock chaining behavior.
  res.status = jest.fn().mockReturnValue(res) as unknown as Response['status'];
  res.json = jest.fn().mockReturnValue(res) as unknown as Response['json'];
  return res;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationController.getNotifications', () => {
  // We cast mockNext to NextFunction to satisfy Express router typing
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn() as unknown as jest.MockedFunction<NextFunction>;
  });

  it('should call notificationService.list with req.user.userId and default pagination when req.query has no limit/offset', async () => {
    // Arrange
    // We cast to Request/Response here because the Express handler expects the full objects,
    // but our tests only need to provide partial implementations of the fields used.
    const req = buildReq() as Request;
    const res = buildRes() as Response;
    const mockNotifications = [{ id: 'notif-1' }];
    mockList.mockResolvedValue(mockNotifications);

    // Act
    await notificationController.getNotifications(req, res, mockNext);

    // Assert
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith('test-user-id', {
      limit: 20,
      offset: 0,
    });
  });

  it('should parse valid numeric limit and offset from req.query and pass them through to notificationService.list unchanged', async () => {
    // Arrange
    const req = buildReq({ limit: '5', offset: '10' }) as Request;
    const res = buildRes() as Response;
    const mockNotifications = [{ id: 'notif-2' }];
    mockList.mockResolvedValue(mockNotifications);

    // Act
    await notificationController.getNotifications(req, res, mockNext);

    // Assert
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith('test-user-id', {
      limit: 5,
      offset: 10,
    });
  });

  it('should clamp limit to a maximum of 100 when req.query.limit exceeds 100', async () => {
    // Arrange
    const req = buildReq({ limit: '500' }) as Request;
    const res = buildRes() as Response;
    const mockNotifications = [{ id: 'notif-3' }];
    mockList.mockResolvedValue(mockNotifications);

    // Act
    await notificationController.getNotifications(req, res, mockNext);

    // Assert
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith('test-user-id', {
      limit: 100,
      offset: 0,
    });
  });

  it('should fall back to default limit (20) when req.query.limit is a non-numeric string', async () => {
    // Arrange
    const req = buildReq({ limit: 'abc' }) as Request;
    const res = buildRes() as Response;
    const mockNotifications = [{ id: 'notif-4' }];
    mockList.mockResolvedValue(mockNotifications);

    // Act
    await notificationController.getNotifications(req, res, mockNext);

    // Assert
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith('test-user-id', {
      limit: 20,
      offset: 0,
    });
  });

  it('should fall back to default offset (0) when req.query.offset is negative or non-numeric', async () => {
    // Arrange
    const req = buildReq({ offset: '-5' }) as Request;
    const res = buildRes() as Response;
    const mockNotifications = [{ id: 'notif-5' }];
    mockList.mockResolvedValue(mockNotifications);

    // Act
    await notificationController.getNotifications(req, res, mockNext);

    // Assert
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith('test-user-id', {
      limit: 20,
      offset: 0,
    });
  });

  it('should respond with res.status(200) and res.json({ success: true, data: ... }) on success', async () => {
    // Arrange
    const req = buildReq() as Request;
    const res = buildRes() as Response;
    const mockNotifications = [{ id: 'notif-6' }];
    mockList.mockResolvedValue(mockNotifications);

    // Act
    await notificationController.getNotifications(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockNotifications,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next(err) with the original error when notificationService.list rejects/throws', async () => {
    // Arrange
    const req = buildReq() as Request;
    const res = buildRes() as Response;
    const testError = new Error('Service Failure');
    mockList.mockRejectedValue(testError);

    // Act
    await notificationController.getNotifications(req, res, mockNext);

    // Assert
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(testError);
  });
});

describe('NotificationController.markNotificationAsRead', () => {
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn() as unknown as jest.MockedFunction<NextFunction>;
  });

  it('should call notificationService.markAsRead with req.params.id and req.user.userId', async () => {
    const req = buildReq({}, { id: 'notif-1' }) as unknown as Request;
    const res = buildRes() as Response;
    const mockNotification = { id: 'notif-1', isRead: true };
    mockMarkAsRead.mockResolvedValue(mockNotification);

    await notificationController.markNotificationAsRead(req, res, mockNext);

    expect(mockMarkAsRead).toHaveBeenCalledTimes(1);
    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1', 'test-user-id');
  });

  it('should respond with res.status(200) and res.json({ success: true, data: ...}) on success', async () => {
    const req = buildReq({}, { id: 'notif-1' }) as unknown as Request;
    const res = buildRes() as Response;
    const mockNotification = { id: 'notif-1', isRead: true };
    mockMarkAsRead.mockResolvedValue(mockNotification);

    await notificationController.markNotificationAsRead(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockNotification,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next(err) with the original error when notificationService.markAsRead rejects/throws (e.g. AppError 404', async () => {
    const req = buildReq({}, { id: 'nonexistent-id' }) as unknown as Request;
    const res = buildRes() as Response;
    const testError = new Error('Notification not found');
    mockMarkAsRead.mockRejectedValue(testError);

    await notificationController.markNotificationAsRead(req, res, mockNext);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(testError);
  });
});
