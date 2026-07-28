import UserRepository from '@repositories/userRepository.js';
import { AppError } from '@errors/AppError.js';
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

  return UserRepository.updateRole(userId, role);
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
