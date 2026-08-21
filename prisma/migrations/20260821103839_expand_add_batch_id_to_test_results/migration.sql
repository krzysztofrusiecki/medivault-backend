-- AlterTable
ALTER TABLE "test_results" ADD COLUMN     "batchId" TEXT;

-- CreateIndex
CREATE INDEX "test_results_batchId_idx" ON "test_results"("batchId");

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "test_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
