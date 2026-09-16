import UserRepository from '@repositories/userRepository.js';
import { AppError } from '@errors/AppError.js';
import pusherClient from '@v1/lib/pusherClient.js';
import {
  PUSHER_ROLE_CHANGED_EVENT,
  pusherChannelName,
} from '@v1/lib/pusherEvents.js';
import type {
  User,
  CreateUserInput,
  UserRole,
  UpdateUserBanInput,
} from '@/types/userTypes.js';

// Accepted role values
const VALID_ROLES: UserRole[] = ['Admin', 'Reviewer', 'User'];

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

  console.log(
    `[DIAG][RoleChange] updateUserRole start: userId=${userId} role=${role}`
  );

  // Persist first — the DB is the source of truth. Only after the role update
  // succeeds do we broadcast so the affected user's open tabs are signed out.
  const updatedUser = await UserRepository.updateRole(userId, role);

  console.log(
    `[DIAG][RoleChange] DB role update committed: userId=${userId} role=${role}`
  );

  const channelName = pusherChannelName(userId);
  console.log(
    `[DIAG][RoleChange] Triggering Pusher channel=${channelName} ` +
      `event=${PUSHER_ROLE_CHANGED_EVENT} payload=${JSON.stringify({ role })}`
  );

  // Fire-and-forget real-time signal to every private-user-{userId} channel.
  // A Pusher failure is logged but never propagates — the role is already
  // committed, and the DB-backed role check on the next request enforces it.
  void pusherClient
    .trigger(channelName, PUSHER_ROLE_CHANGED_EVENT, { role })
    .then(() => {
      console.log(
        `[DIAG][RoleChange] Pusher trigger RESOLVED OK: channel=${channelName} event=${PUSHER_ROLE_CHANGED_EVENT}`
      );
    })
    .catch((error: unknown) => {
      console.error(
        `[DIAG][RoleChange] Pusher trigger REJECTED: channel=${channelName} event=${PUSHER_ROLE_CHANGED_EVENT}`,
        error
      );
      console.error(
        '[Pusher] Failed to trigger role-changed event:',
        error
      );
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
