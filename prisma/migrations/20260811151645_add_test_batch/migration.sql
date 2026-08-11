-- CreateEnum
CREATE TYPE "TestBatchStatus" AS ENUM ('PENDING_ACCEPTANCE', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "test_batches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labId" TEXT,
    "labLabel" TEXT,
    "sampleDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "TestBatchStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_batches_userId_status_idx" ON "test_batches"("userId", "status");

-- AddForeignKey
ALTER TABLE "test_batches" ADD CONSTRAINT "test_batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_batches" ADD CONSTRAINT "test_batches_labId_fkey" FOREIGN KEY ("labId") REFERENCES "labs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
