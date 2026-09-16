import { prisma } from '@repo/db';

const invalidatedAtByUserId = new Map<string, number>();

const markInvalidatedNow = (userId: string): number => {
  const invalidatedAtMs = Date.now();
  invalidatedAtByUserId.set(userId, invalidatedAtMs);
  return invalidatedAtMs;
};

const getInvalidatedAt = (userId: string): number | null =>
  invalidatedAtByUserId.get(userId) ?? null;

const deleteActiveSessions = async (userId: string): Promise<void> => {
  await prisma.session.deleteMany({ where: { userId } });
};

export default { markInvalidatedNow, getInvalidatedAt, deleteActiveSessions };
