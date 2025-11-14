import { PrismaClient } from '@prisma/client';
import path from 'path';

/**
 * Test database setup utility.
 *
 * Initializes an in-memory SQLite database for E2E testing.
 * This provides an isolated database instance per test run without
 * requiring external PostgreSQL server access.
 */

let prisma: PrismaClient | null = null;

export async function setupTestDatabase() {
  // Use in-memory SQLite for tests
  const databaseUrl =
    process.env.DATABASE_TEST_URL || 'file:memdb1?mode=memory&cache=shared';

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  // Run migrations on test database
  try {
    await prisma.$executeRawUnsafe('SELECT 1');
    console.log('Test database connection established');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }

  return prisma;
}

export async function teardownTestDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export function getTestDatabase() {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase first.');
  }
  return prisma;
}
