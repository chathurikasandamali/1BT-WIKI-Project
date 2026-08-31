// apps/api/src/repositories/notificationRepository.ts

import { prisma } from '@repo/db';
import { AppError } from '@errors/AppError.js';
import type {
  Notification,
  CreateNotificationInput,
} from '@models/notificationTypes.js';

// ---------------------------------------------------------------------------
// Prisma select and mapper
// ---------------------------------------------------------------------------

const NOTIFICATION_SELECT = {
  id: true,
  recipientId: true,
  title: true,
  referenceType: true,
  referenceId: true,
  type: true,
  message: true,
  isRead: true,
  readAt: true,
  deletedAt: true,
  createdAt: true,
} as const;

type PrismaNotification = typeof prisma.notification extends {
  findFirst: (...args: any) => Promise<infer R>;
}
  ? NonNullable<R>
  : any;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

const create = async (
  input: CreateNotificationInput
): Promise<Notification> => {
  try {
    const result = await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        title: input.notificationTitle,
        referenceType: input.notificationReferenceType as any,
        referenceId: input.referenceId,
        type: input.notificationType as any,
        message: input.message,
      },
      select: NOTIFICATION_SELECT,
    });

    return result as unknown as Notification;
  } catch (error) {
    throw new AppError('Database is unavailable', 503);
  }
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

const findById = async (id: string): Promise<Notification | null> => {
  try {
    const result = await prisma.notification.findFirst({
      where: { id, deletedAt: null },
      select: NOTIFICATION_SELECT,
    });

    return result ? (result as unknown as Notification) : null;
  } catch (error) {
    throw new AppError('Database is unavailable', 503);
  }
};

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

const list = async (
  recipientId: string,
  options: { limit: number; offset: number }
): Promise<Notification[]> => {
  try {
    const results = await prisma.notification.findMany({
      where: { recipientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      skip: options.offset,
      select: NOTIFICATION_SELECT,
    });

    return results as unknown as Notification[];
  } catch (error) {
    throw new AppError('Database is unavailable', 503);
  }
};

const markAsRead = async (
  id: string,
  recipientId: string
): Promise<Notification | null> => {
  try {
    // We must ensure the notification belongs to the user and isn't deleted.
    // Prisma update requires unique where. So we can either do updateMany or check first.
    // Actually, `updateMany` returns count. So let's find first, then update.
    const exists = await prisma.notification.findFirst({
      where: { id, recipientId, deletedAt: null },
    });

    if (!exists) return null;

    const result = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
      select: NOTIFICATION_SELECT,
    });

    return result ? (result as unknown as Notification) : null;
  } catch (error) {
    throw new AppError('Database is unavailable', 503);
  }
};

// ---------------------------------------------------------------------------
// Count
// ---------------------------------------------------------------------------

const countUnread = async (recipientId: string): Promise<number> => {
  try {
    return await prisma.notification.count({
      where: { recipientId, isRead: false, deletedAt: null },
    });
  } catch (error) {
    throw new AppError('Database is unavailable', 503);
  }
};

export default { create, findById, list, markAsRead, countUnread };
