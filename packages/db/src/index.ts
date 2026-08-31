/**
 * @repo/db
 *
 * Public surface of the shared database package.
 * All consuming apps/packages should import from "@repo/db" only —
 * never directly from the generated Prisma internals.
 */

// Re-export the singleton PrismaClient instance
export { prisma, default } from './client.js';

// Re-export all Prisma-generated types, enums, and the Prisma namespace
export * from '@repo/db/generated/prisma/client.js';
