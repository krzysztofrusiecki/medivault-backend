import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

/**
 * Database seeding script.
 *
 * This file runs after migrations to populate the database with initial data.
 * Run with: pnpm prisma db seed
 */
async function main() {
  console.log("Starting database seeding...");

  // Clear existing data
  await prisma.user.deleteMany();
  console.log("Cleared existing users");

  // Hash passwords
  const password1 = await argon2.hash("Password123!");
  const password2 = await argon2.hash("SecurePass456!");
  const password3 = await argon2.hash("TestUser789!");

  // Create 3 sample users
  const user1 = await prisma.user.create({
    data: {
      email: "john.doe@medivault.com",
      passwordHash: password1,
      firstName: "John",
      lastName: "Doe",
      gender: "MALE",
      birthDate: new Date("1990-05-15"),
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "jane.smith@medivault.com",
      passwordHash: password2,
      firstName: "Jane",
      lastName: "Smith",
      gender: "FEMALE",
      birthDate: new Date("1992-08-22"),
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: "alex.johnson@medivault.com",
      passwordHash: password3,
      firstName: "Alex",
      lastName: "Johnson",
      gender: null,
      birthDate: new Date("1988-12-03"),
    },
  });

  console.log("Created 3 sample users:");
  console.log(`  - ${user1.email}`);
  console.log(`  - ${user2.email}`);
  console.log(`  - ${user3.email}`);
  console.log("Database seeding completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
