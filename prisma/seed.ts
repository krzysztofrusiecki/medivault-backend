import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Database seeding script.
 *
 * This file runs after migrations to populate the database with initial data.
 * Currently set up for infrastructure only - no sample data is populated.
 *
 * To add seed data, implement the seeding logic below.
 * Run with: pnpm prisma db seed
 */
async function main() {
  // TODO: Add seed data as needed during feature development
  console.log('Database seeding completed.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
