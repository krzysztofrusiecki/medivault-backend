-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analyteId" TEXT NOT NULL,
    "analyteUnitId" TEXT,
    "valueRaw" DECIMAL(20,10),
    "value" DECIMAL(20,10),
    "factorSnapshot" DECIMAL(20,10),
    "offsetSnapshot" DECIMAL(20,10),
    "valueText" TEXT,
    "sampleDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_results_userId_analyteId_sampleDate_idx" ON "test_results"("userId", "analyteId", "sampleDate");

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_analyteId_fkey" FOREIGN KEY ("analyteId") REFERENCES "analytes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_analyteUnitId_fkey" FOREIGN KEY ("analyteUnitId") REFERENCES "analyte_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
