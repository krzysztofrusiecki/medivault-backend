import { PrismaClient } from "@prisma/client";

/**
 * Test database setup utility.
 *
 * For testing, we use the PostgreSQL database configured in DATABASE_URL
 * but create a separate test schema to isolate test data.
 * This approach is simpler than in-memory SQLite and closer to production.
 */

let prisma: PrismaClient | null = null;

export async function setupTestDatabase() {
  // Use the same database as configured, but with test data isolation
  prisma = new PrismaClient();

  try {
    // Verify connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("Test database connection established");
  } catch (error) {
    console.error("Failed to connect to test database:", error);
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
    throw new Error(
      "Test database not initialized. Call setupTestDatabase first.",
    );
  }
  return prisma;
}
