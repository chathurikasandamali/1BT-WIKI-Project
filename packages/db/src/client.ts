import 'dotenv/config';
import { PrismaClient } from '@repo/db/generated/prisma/client.js';
import { PrismaNeonHttp } from '@prisma/adapter-neon';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

declare global {
  // Allow global `var` declarations to avoid duplicate PrismaClient instances
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaNeonHttp(connectionString!, {
    arrayMode: false,
    fullResults: true,
  });
  return new PrismaClient({ adapter });
}

// Singleton: reuse in hot-reload environments (e.g., dev with tsx watch)
// In production (NODE_ENV=production), always create a fresh instance
export const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;
