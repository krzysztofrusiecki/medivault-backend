-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'LAB_ADMIN', 'SUPER_ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
