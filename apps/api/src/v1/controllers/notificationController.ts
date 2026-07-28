// apps/api/src/controllers/notificationController.ts

import type { Request, Response, NextFunction } from 'express';
import notificationService from '@services/notificationService.js';
import { NotificationBuilder } from '@v1/lib/NotificationBuilder.js';

// ---------------------------------------------------------------------------
// GET /api/v1/notifications
// ---------------------------------------------------------------------------

/**
 * Return paginated notifications for the authenticated user.
 *
 * Requires: `authenticate` middleware upstream (sets req.user).
 *
 * Query params:
 *   - limit  (default 20, max 100)
 *   - offset (default 0)
 *
 * Response: 200 { success: true, data: Notification[] }
 */
const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.user is guaranteed to exist — authenticate middleware runs first
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = req.user!.userId;

    // Parse pagination — lenient: fall back to safe defaults on bad input
    const parsedLimit = Number(req.query.limit);
    const parsedOffset = Number(req.query.offset);

    let limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.floor(parsedLimit)
        : 20;
    const offset =
      Number.isFinite(parsedOffset) && parsedOffset >= 0
        ? Math.floor(parsedOffset)
        : 0;

    // Clamp limit to max 100
    if (limit > 100) {
      limit = 100;
    }

    const notifications = await notificationService.list(userId, {
      limit,
      offset,
    });

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

const markNotificationAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const count = await notificationService.countUnread(userId);
    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

const testNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const notificationPayload = new NotificationBuilder()
      .forUser(userId)
      .testNotification('Hello from notification test route')
      .build();

    await notificationService.send(notificationPayload);

    res.status(200).json({
      success: true,
      message: 'Test notification sent',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getNotifications,
  markNotificationAsRead,
  getUnreadCount,
  testNotification,
};
