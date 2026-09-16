import UserRepository from '@repositories/userRepository.js';
import SessionRevocationRepository from '@repositories/sessionRevocationRepository.js';
import { AppError } from '@errors/AppError.js';
import type {
  User,
  UserRole,
  UpdateUserBanInput,
} from '@/types/userTypes.js';
import { UserRoleValue } from '@/types/userTypes.js';
import NotificationService from './notificationService.js';
import pusherClient from '@v1/lib/pusherClient.js';
import {
  PUSHER_FORCE_LOGOUT_EVENT,
  pusherChannelName,
} from '@v1/lib/pusherEvents.js';

// Accepted role values
const VALID_ROLES: UserRole[] = Object.values(UserRoleValue);

const updateUserRole = async (
  userId: string,
  role: UserRole
): Promise<User> => {
  if (!VALID_ROLES.includes(role)) {
    throw new AppError(`Role must be one of: ${VALID_ROLES.join(', ')}`, 400);
  }

  const existingUser = await UserRepository.findById(userId);
  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  const isDemotingAdmin =
    existingUser.role === UserRoleValue.Admin && role !== UserRoleValue.Admin;
  if (isDemotingAdmin && !existingUser.banned) {
    const activeAdmins = await UserRepository.findActiveByRole(
      UserRoleValue.Admin
    );
    if (activeAdmins.length <= 1) {
      throw new AppError(
        'Cannot change the role of the last active admin. Promote another user to Admin first.',
        400
      );
    }
  }

  if (existingUser.role === role) {
    return existingUser;
  }

  const updatedUser = await UserRepository.updateRole(userId, role);

  await SessionRevocationRepository.deleteActiveSessions(userId);
  SessionRevocationRepository.markInvalidatedNow(userId);

  // Persist the notification so it shows in the bell panel (title/message/
  // time) and bumps the unread count in real time via the existing
  // notification:new Pusher event — no new event needed for that part.
  //
  // NOTE: notificationReferenceType has no dedicated value for a role
  // change (would need a migration to add one), so 'review' is reused here
  // as the closest available admin-action type. referenceId is the user's
  // own id. The dropdown UI doesn't currently branch on this field, but a
  // future feature that does (e.g. "click to open the reference") would
  // need a real type added at that point.
  void NotificationService.send({
    recipientId: userId,
    notificationTitle: 'Your role has changed',
    notificationReferenceType: 'review',
    referenceId: userId,
    notificationType: 'info',
    message: `Admin has changed your user role to ${role}`,
  }).catch((error: unknown) => {
    console.error('[userService] Failed to send role-change notification:', error);
  });

  // Tell any open tab to sign out immediately so the user re-authenticates
  // under the new role.
  void pusherClient
    .trigger(pusherChannelName(userId), PUSHER_FORCE_LOGOUT_EVENT, {
      userId,
      newRole: role,
    })
    .catch((error: unknown) => {
      console.error('[userService] Failed to trigger force-logout event:', error);
    });

  return updatedUser;
};

const updateUserBanStatus = async (
  userId: string,
  input: UpdateUserBanInput
): Promise<User> => {
  const existingUser = await UserRepository.findById(userId);
  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  if (input.banned) {
    if (!input.banReason || input.banReason.trim().length === 0) {
      throw new AppError('Ban reason is required when banning a user', 400);
    }
  }

  return UserRepository.updateBanStatus(userId, {
    banned: input.banned,
    banReason: input.banned ? (input.banReason?.trim() ?? '') : null,
  });
};

export default { updateUserRole, updateUserBanStatus };
