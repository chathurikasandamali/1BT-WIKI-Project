// apps/api/src/services/profileService.ts

import UserRepository from '@repositories/userRepository.js';
import { AppError } from '@errors/AppError.js';
import { capitalizeRole } from '@/types/userTypes.js';
import type {
  UserProfile,
  ProfileUpdateInput,
  User,
} from '@/types/userTypes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mapToUserProfile = (user: User): UserProfile => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.image,
  role: capitalizeRole(user.role),
  isActive: user.banned !== true,
  createdAt: user.createdAt,
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's own profile.
 *
 * Business rules:
 *  - Throws AppError 404 if the user record cannot be found.
 *  - Maps raw DB columns to the safe `UserProfile` shape:
 *      image   → avatarUrl   (domain alias; null if not set)
 *      !banned → isActive    (null `banned` is treated as active/false)
 *  - Never leaks sensitive fields (emailVerified, banReason, banExpires, etc.)
 *
 * @param userId - The authenticated user's id (from req.user.userId)
 * @returns Safe UserProfile object
 * @throws AppError 404 — user record not found
 */
const getProfile = async (userId: string): Promise<UserProfile> => {
  const user = await UserRepository.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return mapToUserProfile(user);
};

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Update the authenticated user's profile.
 */
const updateProfile = async (
  userId: string,
  input: ProfileUpdateInput
): Promise<UserProfile> => {
  // Validate name
  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim() === '') {
      throw new AppError('Name cannot be empty', 400);
    }
    if (input.name.length > 255) {
      throw new AppError('Name cannot exceed 255 characters', 400);
    }
  }

  // Validate avatarUrl
  if (input.avatarUrl !== undefined && input.avatarUrl !== null) {
    try {
      new URL(input.avatarUrl);
    } catch {
      throw new AppError('Invalid avatarUrl format', 400);
    }
  }

  // Build safe updates object (ignoring disallowed fields like contactDetails)
  const updates: { name?: string; image?: string | null } = {};
  if (input.name !== undefined) {
    updates.name = input.name.trim();
  }
  if (input.avatarUrl !== undefined) {
    updates.image = input.avatarUrl;
  }

  const updatedUser = await UserRepository.updateById(userId, updates);

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  return mapToUserProfile(updatedUser);
};

export default { getProfile, updateProfile };
