import { prisma } from '@repo/db';
import type { User, CreateUserInput } from '@/types/userTypes.js';

// ---------------------------------------------------------------------------
// Prisma select
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

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

const getAllUsers = async (): Promise<User[]> => {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: USER_SELECT,
  });
};

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

const createAdminUser = async (data: CreateUserInput): Promise<User> => {
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      emailVerified: false,
      image: data.image ?? null,
      role: data.role ?? 'User',
    },
    select: USER_SELECT,
  });
};

export default { getAllUsers, createAdminUser };
