-- AlterTable
ALTER TABLE "users" ADD COLUMN     "labId" TEXT;

-- CreateTable
CREATE TABLE "labs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "labs_name_key" ON "labs"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_labId_fkey" FOREIGN KEY ("labId") REFERENCES "labs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
