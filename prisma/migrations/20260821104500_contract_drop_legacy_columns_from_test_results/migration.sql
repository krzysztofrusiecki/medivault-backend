-- Contract step of the MV-23 expand/contract migration. Requires every
-- TestResult to already have a batchId, or "SET NOT NULL" below fails.
-- Run `pnpm db:backfill-test-result-batches` after the prior
-- (20260821103839_expand_add_batch_id_to_test_results) migration and
-- before this one — do not deploy them back-to-back without it.

-- DropForeignKey
ALTER TABLE "test_results" DROP CONSTRAINT "test_results_batchId_fkey";

-- DropForeignKey
ALTER TABLE "test_results" DROP CONSTRAINT "test_results_userId_fkey";

-- DropIndex
DROP INDEX "test_results_batchId_idx";

-- DropIndex
DROP INDEX "test_results_userId_analyteId_sampleDate_idx";

-- AlterTable
ALTER TABLE "test_results" DROP COLUMN "sampleDate",
DROP COLUMN "userId",
ALTER COLUMN "batchId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "test_results_batchId_analyteId_idx" ON "test_results"("batchId", "analyteId");

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "test_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

