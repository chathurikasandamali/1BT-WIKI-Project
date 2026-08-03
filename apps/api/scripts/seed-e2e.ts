/// <reference types="node" />
import { prisma } from '@repo/db';
import { E2E_AUTHOR, E2E_REVIEWER } from './e2e-identities.js';

async function seedE2E() {
  // 1. Validate safety guards
  if (process.env.NODE_ENV !== 'test') {
    console.error('ERROR: NODE_ENV must be "test" to run E2E seed.');
    process.exit(1);
  }

  if (process.env.E2E_TEST_MODE !== 'true') {
    console.error('ERROR: E2E_TEST_MODE must be "true" to run E2E seed.');
    process.exit(1);
  }

  if (process.env.E2E_DATABASE_CONFIRMED !== 'true') {
    console.error('ERROR: E2E_DATABASE_CONFIRMED must be "true" to run E2E seed.');
    process.exit(1);
  }

  console.log('Starting E2E seed against isolated database...');

  try {
    // 2. Upsert Author
    const author = await prisma.user.upsert({
      where: { id: E2E_AUTHOR.id },
      update: {
        email: E2E_AUTHOR.email,
        name: 'E2E Author',
        role: E2E_AUTHOR.role,
        emailVerified: true,
        banned: false,
      },
      create: {
        id: E2E_AUTHOR.id,
        name: 'E2E Author',
        email: E2E_AUTHOR.email,
        role: E2E_AUTHOR.role,
        emailVerified: true,
        banned: false,
      },
    });

    console.log(`✅ Upserted E2E Author: ${author.id}`);

    // 3. Upsert Reviewer
    const reviewer = await prisma.user.upsert({
      where: { id: E2E_REVIEWER.id },
      update: {
        email: E2E_REVIEWER.email,
        name: 'E2E Reviewer',
        role: E2E_REVIEWER.role,
        emailVerified: true,
        banned: false,
      },
      create: {
        id: E2E_REVIEWER.id,
        name: 'E2E Reviewer',
        email: E2E_REVIEWER.email,
        role: E2E_REVIEWER.role,
        emailVerified: true,
        banned: false,
      },
    });

    console.log(`✅ Upserted E2E Reviewer: ${reviewer.id}`);

    console.log('E2E seeding completed successfully.');
  } catch (error) {
    console.error('ERROR seeding E2E database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void seedE2E();
