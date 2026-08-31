import { prisma } from '@repo/db';
import type { User, UserRole } from '@/types/userTypes.js';

// ---------------------------------------------------------------------------
// Prisma select — mirrors the exact columns the service layer expects.
// The schema already defines camelCase field names, so no manual snake_case
// → camelCase mapping is required.
// ---------------------------------------------------------------------------

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  banned: true,
  banReason: true,
  banExpires: true,
} as const;

/**
 * Find a single user by their email address.
 * Returns null when no match is found.
 */
const findByEmail = async (email: string): Promise<User | null> => {
  const user = await prisma.user.findFirst({
    where: { email },
    select: USER_SELECT,
  });
  return user ?? null;
};

/**
 * Find a single user by their primary key (id).
 * Returns null when no match is found.
 */
const findById = async (userId: string): Promise<User | null> => {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: USER_SELECT,
  });
  return user ?? null;
};

const updateRole = async (id: string, role: string): Promise<User> => {
  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: USER_SELECT,
  });
  return user;
};

const updateBanStatus = async (
  id: string,
  data: { banned: boolean; banReason: string | null }
): Promise<User> => {
  const user = await prisma.user.update({
    where: { id },
    data: {
      banned: data.banned,
      banReason: data.banReason,
    },
    select: USER_SELECT,
  });
  return user;
};

const updateById = async (
  userId: string,
  updates: { name?: string; image?: string | null }
): Promise<User | null> => {
  if (updates.name === undefined && updates.image === undefined) {
    throw new Error('no valid fields to update');
  }

  const data: { name?: string; image?: string | null } = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.image !== undefined) data.image = updates.image;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: USER_SELECT,
  });
  return user ?? null;
};

/**
 * Fetch multiple users by their primary keys in a single query.
 * Returns an empty array when userIds is empty (avoids an unnecessary DB round-trip).
 *
 * Cross-role note: added by content-moderation-engineer for RV-06 batch author
 * enrichment — flag for user-account-engineer review.
 */
const findManyByIds = async (userIds: string[]): Promise<User[]> => {
  if (userIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: USER_SELECT,
  });
  return users;
};

/**
 * Find active users whose role exactly matches the supplied role.
 * A nullable banned value is treated as active, matching authentication behavior.
 */
const findActiveByRole = async (role: UserRole): Promise<User[]> => {
  const users = await prisma.user.findMany({
    where: {
      role,
      OR: [{ banned: false }, { banned: null }],
    },
    select: USER_SELECT,
  });
  return users;
};

export default {
  findByEmail,
  findById,
  findManyByIds,
  findActiveByRole,
  updateRole,
  updateBanStatus,
  updateById,
};
